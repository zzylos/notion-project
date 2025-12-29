import { Router, type Request, type Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { getDataStore } from '../services/dataStore.js';
import { getNotion } from '../services/notion.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/index.js';

const router = Router();

/**
 * Whether we are in setup mode (no token configured yet).
 * Once a token is received via verification or set via API, this becomes false.
 */
let isSetupMode = !process.env.NOTION_WEBHOOK_SECRET;

/**
 * Webhook verification token received from Notion during subscription setup.
 * This should be set via environment variable after initial verification.
 */
let verificationToken: string | null = process.env.NOTION_WEBHOOK_SECRET || null;

/**
 * Notion webhook event types we handle
 */
type NotionEventType =
  | 'page.content_updated'
  | 'page.created'
  | 'page.deleted'
  | 'page.locked'
  | 'page.unlocked'
  | 'page.moved'
  | 'page.undeleted'
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted'
  | 'data_source.schema_updated'
  | 'database.schema_updated';

/**
 * Notion webhook event payload structure
 */
interface NotionWebhookEvent {
  type: NotionEventType;
  timestamp: string;
  workspace_id: string;
  subscription_id: string;
  integration_id: string;
  authors: Array<{
    id: string;
    type: 'user' | 'bot';
  }>;
  attempt_number: number;
  entity: {
    id: string;
    type: 'page' | 'database' | 'comment';
  };
  data?: Record<string, unknown>;
}

/**
 * Notion verification payload (sent during subscription setup)
 */
interface NotionVerificationPayload {
  verification_token: string;
}

/**
 * Check if payload is a verification request
 */
function isVerificationPayload(body: unknown): body is NotionVerificationPayload {
  return (
    typeof body === 'object' &&
    body !== null &&
    'verification_token' in body &&
    typeof (body as NotionVerificationPayload).verification_token === 'string'
  );
}

/**
 * Check if payload is a webhook event
 */
function isWebhookEvent(body: unknown): body is NotionWebhookEvent {
  return (
    typeof body === 'object' &&
    body !== null &&
    'type' in body &&
    'entity' in body &&
    typeof (body as NotionWebhookEvent).type === 'string' &&
    typeof (body as NotionWebhookEvent).entity === 'object'
  );
}

/**
 * Validate webhook signature using HMAC-SHA256.
 * SECURITY: Rejects all requests if no token is configured (unless in setup mode).
 */
function validateSignature(payload: string, signature: string | undefined): boolean {
  if (!verificationToken) {
    // Only allow unsigned requests in setup mode (no token ever configured)
    if (isSetupMode) {
      logger.webhook.warn(
        'No verification token configured - in setup mode, signature validation skipped'
      );
      logger.webhook.warn(
        'SECURITY: Configure NOTION_WEBHOOK_SECRET after receiving verification token'
      );
      return true;
    }
    // Token was configured but is now missing - reject request
    logger.webhook.error('Verification token not configured - rejecting request');
    return false;
  }

  if (!signature) {
    logger.webhook.warn('No signature provided in request');
    return false;
  }

  try {
    const calculatedSignature = `sha256=${createHmac('sha256', verificationToken)
      .update(payload)
      .digest('hex')}`;

    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const calcBuffer = Buffer.from(calculatedSignature);

    // Ensure buffers are same length before comparison
    if (sigBuffer.length !== calcBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, calcBuffer);
  } catch (error) {
    logger.webhook.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Normalize a Notion UUID to consistent format (with dashes).
 * Logs warnings for invalid UUIDs.
 */
function normalizeUuid(id: string): string {
  if (!id || typeof id !== 'string') {
    logger.webhook.warn('normalizeUuid received invalid input:', typeof id);
    return '';
  }

  const clean = id.replace(/-/g, '').toLowerCase();

  if (clean.length !== 32) {
    logger.webhook.warn(`Invalid UUID length (${clean.length} chars, expected 32): ${id}`);
    return id;
  }

  // Validate hex characters
  if (!/^[0-9a-f]+$/.test(clean)) {
    logger.webhook.warn(`Invalid UUID format (non-hex characters): ${id}`);
    return id;
  }

  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

/**
 * Handle page update events by fetching fresh data from Notion.
 * Returns success/failure status for better observability.
 *
 * Type determination logic:
 * 1. If item exists in store, use its existing type
 * 2. If item is new, let NotionService infer type from parent database
 */
async function handlePageUpdate(pageId: string): Promise<{ success: boolean; error?: string }> {
  const store = getDataStore();
  const notion = getNotion();

  try {
    const normalizedId = normalizeUuid(pageId);
    const existingItem = store.get(normalizedId);

    // For existing items, use known type. For new items, let fetchItem infer from parent DB.
    const itemType = existingItem?.type; // undefined for new items triggers inference

    logger.webhook.debug(
      `Fetching page ${pageId} (type: ${itemType || 'to be inferred from parent database'})`
    );
    const updatedItem = await notion.fetchItem(pageId, itemType);

    store.upsert(updatedItem);
    logger.webhook.info(
      `Updated item: ${updatedItem.id} (${updatedItem.title}, type: ${updatedItem.type})`
    );
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.webhook.error(`Failed to fetch page ${pageId}: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Handle page deletion events
 */
function handlePageDelete(pageId: string): void {
  const store = getDataStore();
  const normalizedId = normalizeUuid(pageId);

  if (store.delete(normalizedId)) {
    logger.webhook.info(`Deleted item: ${normalizedId}`);
  } else {
    logger.webhook.debug(`Item not found for deletion: ${normalizedId}`);
  }
}

/**
 * Process a webhook event asynchronously.
 * Returns processing result for observability.
 */
async function processWebhookEvent(
  event: NotionWebhookEvent
): Promise<{ handled: boolean; success: boolean; error?: string }> {
  const { type, entity } = event;

  // Handle page update events
  const updateEvents = [
    'page.content_updated',
    'page.created',
    'page.undeleted',
    'page.unlocked',
    'page.moved',
  ];
  if (updateEvents.includes(type) && entity.type === 'page') {
    const result = await handlePageUpdate(entity.id);
    return { handled: true, success: result.success, error: result.error };
  }

  // Handle page deletion
  if (type === 'page.deleted' && entity.type === 'page') {
    handlePageDelete(entity.id);
    return { handled: true, success: true };
  }

  // Handle database schema changes
  if (type === 'data_source.schema_updated' || type === 'database.schema_updated') {
    logger.webhook.info(`Database schema updated: ${entity.id}`);
    return { handled: true, success: true };
  }

  // Log other events
  logger.webhook.debug(`Unhandled event type: ${type}`);
  return { handled: false, success: true };
}

/**
 * Handle verification request from Notion
 */
function handleVerificationRequest(token: string, res: Response): void {
  logger.webhook.info('Received verification token. Configure NOTION_WEBHOOK_SECRET:');
  logger.webhook.info(`NOTION_WEBHOOK_SECRET=${token}`);

  verificationToken = token;
  // Exit setup mode - from now on, signature validation is required
  isSetupMode = false;

  const response: ApiResponse<{ received: boolean; message: string }> = {
    success: true,
    data: {
      received: true,
      message:
        'Verification token received. Set NOTION_WEBHOOK_SECRET env var and verify in Notion UI.',
    },
  };
  res.status(200).json(response);
}

/**
 * Extended Request type with raw body buffer for signature verification.
 * The raw body is captured by the express.json verify function in index.ts.
 */
interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

/**
 * POST /api/webhook
 *
 * Receives webhook events from Notion.
 */
router.post('/', async (req: RequestWithRawBody, res: Response) => {
  // Handle verification request
  if (isVerificationPayload(req.body)) {
    handleVerificationRequest(req.body.verification_token, res);
    return;
  }

  // Validate signature using the raw body buffer (not JSON.stringify which may differ)
  // Notion computes HMAC against the exact bytes sent, so we must use the original
  const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(req.body);
  const signature = req.headers['x-notion-signature'] as string | undefined;

  if (!req.rawBody) {
    logger.webhook.warn(
      'Raw body not captured - falling back to JSON.stringify (may cause signature mismatch)'
    );
  }

  if (!validateSignature(rawBody, signature)) {
    logger.webhook.warn('Invalid webhook signature');
    res.status(401).json({ success: false, error: 'Invalid signature' });
    return;
  }

  // Validate event structure
  if (!isWebhookEvent(req.body)) {
    logger.webhook.warn('Invalid webhook payload structure');
    res.status(400).json({ success: false, error: 'Invalid payload' });
    return;
  }

  const event = req.body;
  logger.webhook.info(`Received event: ${event.type} for ${event.entity.type} ${event.entity.id}`);

  // Respond immediately (Notion expects quick response)
  res.status(200).json({ success: true, data: { received: true } });

  // Process event asynchronously
  try {
    const result = await processWebhookEvent(event);
    if (!result.success) {
      logger.webhook.warn(`Event ${event.type} processed with errors: ${result.error}`);
    }
    if (!result.handled) {
      logger.webhook.debug(`Event ${event.type} was not handled (no matching handler)`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.webhook.error(`Unexpected error processing event ${event.type}: ${errorMessage}`);
  }
});

/**
 * GET /api/webhook/status
 *
 * Check webhook configuration status
 */
router.get('/status', (_req: Request, res: Response) => {
  const store = getDataStore();
  const stats = store.getStats();

  const response: ApiResponse<{
    configured: boolean;
    hasVerificationToken: boolean;
    storeStats: typeof stats;
  }> = {
    success: true,
    data: {
      configured: !!verificationToken,
      hasVerificationToken: !!verificationToken,
      storeStats: stats,
    },
  };

  res.json(response);
});

/**
 * POST /api/webhook/set-token
 *
 * Manually set the verification token (alternative to env var).
 * SECURITY: Only available in development mode or if ALLOW_MANUAL_TOKEN_SET is true.
 */
router.post('/set-token', (req: Request, res: Response) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowManualSet = process.env.ALLOW_MANUAL_TOKEN_SET === 'true';

  if (!isDevelopment && !allowManualSet) {
    logger.webhook.warn('Attempted to set token in production without ALLOW_MANUAL_TOKEN_SET=true');
    res.status(403).json({
      success: false,
      error:
        'Token configuration via API is disabled in production. Set NOTION_WEBHOOK_SECRET environment variable instead.',
    });
    return;
  }

  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ success: false, error: 'Token is required' });
    return;
  }

  // Validate token format (should be a reasonable length string)
  if (token.length < 10 || token.length > 500) {
    res.status(400).json({ success: false, error: 'Invalid token format' });
    return;
  }

  verificationToken = token;
  // Exit setup mode - from now on, signature validation is required
  isSetupMode = false;
  logger.webhook.info('Verification token set manually');

  res.json({ success: true, data: { configured: true } });
});

export default router;
