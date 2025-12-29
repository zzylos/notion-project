import { Router, type Request, type Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { getDataStore } from '../services/dataStore.js';
import { getNotion } from '../services/notion.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse } from '../types/index.js';

const router = Router();

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
 * Validate webhook signature using HMAC-SHA256
 */
function validateSignature(payload: string, signature: string | undefined): boolean {
  if (!verificationToken) {
    logger.webhook.warn('No verification token configured, skipping signature validation');
    return true; // Allow if no token configured (for initial setup)
  }

  if (!signature) {
    logger.webhook.warn('No signature provided in request');
    return false;
  }

  try {
    const calculatedSignature = `sha256=${createHmac('sha256', verificationToken)
      .update(payload)
      .digest('hex')}`;

    return timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(signature));
  } catch (error) {
    logger.webhook.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Normalize a Notion UUID to consistent format (with dashes).
 */
function normalizeUuid(id: string): string {
  if (!id || typeof id !== 'string') {
    return '';
  }
  const clean = id.replace(/-/g, '').toLowerCase();
  if (clean.length !== 32) return id;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

/**
 * Handle page update events by fetching fresh data from Notion
 */
async function handlePageUpdate(pageId: string): Promise<void> {
  const store = getDataStore();
  const notion = getNotion();

  try {
    const normalizedId = normalizeUuid(pageId);
    const existingItem = store.get(normalizedId);
    const itemType = existingItem?.type || 'project';
    const updatedItem = await notion.fetchItem(pageId, itemType);

    store.upsert(updatedItem);
    logger.webhook.info(`Updated item: ${updatedItem.id} (${updatedItem.title})`);
  } catch (error) {
    logger.webhook.error(`Failed to fetch page ${pageId}:`, error);
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
 * Process a webhook event asynchronously
 */
async function processWebhookEvent(event: NotionWebhookEvent): Promise<void> {
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
    await handlePageUpdate(entity.id);
    return;
  }

  // Handle page deletion
  if (type === 'page.deleted' && entity.type === 'page') {
    handlePageDelete(entity.id);
    return;
  }

  // Handle database schema changes
  if (type === 'data_source.schema_updated' || type === 'database.schema_updated') {
    logger.webhook.info(`Database schema updated: ${entity.id}`);
    return;
  }

  // Log other events
  logger.webhook.debug(`Unhandled event type: ${type}`);
}

/**
 * Handle verification request from Notion
 */
function handleVerificationRequest(token: string, res: Response): void {
  logger.webhook.info('Received verification token. Configure NOTION_WEBHOOK_SECRET:');
  logger.webhook.info(`NOTION_WEBHOOK_SECRET=${token}`);

  verificationToken = token;

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
 * POST /api/webhook
 *
 * Receives webhook events from Notion.
 */
router.post('/', async (req: Request, res: Response) => {
  // Handle verification request
  if (isVerificationPayload(req.body)) {
    handleVerificationRequest(req.body.verification_token, res);
    return;
  }

  // Validate signature
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-notion-signature'] as string | undefined;

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
    await processWebhookEvent(event);
  } catch (error) {
    logger.webhook.error(`Error processing event ${event.type}:`, error);
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
 * Manually set the verification token (alternative to env var)
 */
router.post('/set-token', (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ success: false, error: 'Token is required' });
    return;
  }

  verificationToken = token;
  logger.webhook.info('Verification token set manually');

  res.json({ success: true, data: { configured: true } });
});

export default router;
