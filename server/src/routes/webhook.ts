import { Router, type Request, type Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { getDataStore } from '../services/dataStore.js';
import { getNotion } from '../services/notion.js';
import { logger } from '../utils/logger.js';
import { normalizeUuid } from '../utils/uuid.js';
import type { ApiResponse } from '../types/index.js';
// Note: Request is augmented with rawBody via types/express.d.ts (global declaration)

const router = Router();

/**
 * Idempotency cache to prevent duplicate webhook processing.
 * Maps event key (timestamp + entity.id + type) to processing timestamp.
 * Entries expire after 5 minutes to prevent memory bloat.
 * Limited to MAX_CACHED_EVENTS entries to bound memory usage.
 */
const processedEvents = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes
const IDEMPOTENCY_CLEANUP_INTERVAL_MS = 60 * 1000; // Clean up every 60 seconds
const MAX_CACHED_EVENTS = 10000; // Maximum number of events to cache

/** Minimum length for verification tokens */
const MIN_TOKEN_LENGTH = 10;
/** Maximum length for verification tokens */
const MAX_TOKEN_LENGTH = 500;

/**
 * Clean up expired entries from the idempotency cache.
 * Called both on new events and periodically via interval.
 * Also enforces MAX_CACHED_EVENTS limit by evicting oldest entries.
 */
function cleanupExpiredEvents(): void {
  const now = Date.now();
  let cleanedCount = 0;

  // First, remove expired entries
  for (const [key, timestamp] of processedEvents.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) {
      processedEvents.delete(key);
      cleanedCount++;
    }
  }

  // If still over limit, evict oldest entries
  if (processedEvents.size > MAX_CACHED_EVENTS) {
    const entries = Array.from(processedEvents.entries());
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1] - b[1]);
    // Remove oldest entries until under limit
    const toRemove = entries.slice(0, processedEvents.size - MAX_CACHED_EVENTS);
    for (const [key] of toRemove) {
      processedEvents.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.webhook.debug(`Cleaned up ${cleanedCount} idempotency cache entries`);
  }
}

// Start periodic cleanup to prevent memory leaks when webhooks are idle
const cleanupInterval = setInterval(cleanupExpiredEvents, IDEMPOTENCY_CLEANUP_INTERVAL_MS);
// Allow Node.js to exit even if interval is running (don't keep process alive)
cleanupInterval.unref();

/**
 * Generate a unique key for a webhook event for idempotency checking.
 * Uses timestamp + entity.id + event type to create a unique identifier.
 */
function getEventKey(event: NotionWebhookEvent): string {
  return `${event.timestamp}:${event.entity.id}:${event.type}`;
}

/**
 * Check if an event has already been processed (idempotency check).
 * Returns true if the event was already processed recently.
 */
function isEventAlreadyProcessed(event: NotionWebhookEvent): boolean {
  const key = getEventKey(event);
  const processedAt = processedEvents.get(key);

  if (processedAt) {
    // Event was already processed
    return true;
  }

  // Mark as processed
  processedEvents.set(key, Date.now());

  // Also clean up on event processing (belt and suspenders)
  cleanupExpiredEvents();

  return false;
}

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
 * Valid entity types that Notion can send
 */
const VALID_ENTITY_TYPES = ['page', 'database', 'comment'] as const;

/**
 * Check if payload is a valid webhook event.
 * Validates required fields including entity.id and entity.type.
 */
function isWebhookEvent(body: unknown): body is NotionWebhookEvent {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const event = body as Record<string, unknown>;

  // Check required top-level fields
  if (typeof event.type !== 'string' || event.type.length === 0) {
    return false;
  }

  if (typeof event.entity !== 'object' || event.entity === null) {
    return false;
  }

  const entity = event.entity as Record<string, unknown>;

  // Validate entity.id exists and is a non-empty string
  if (typeof entity.id !== 'string' || entity.id.length === 0) {
    logger.webhook.warn('Webhook event missing entity.id');
    return false;
  }

  // Validate entity.type is a valid type
  if (
    typeof entity.type !== 'string' ||
    !VALID_ENTITY_TYPES.includes(entity.type as (typeof VALID_ENTITY_TYPES)[number])
  ) {
    logger.webhook.warn(`Webhook event has invalid entity.type: ${entity.type}`);
    return false;
  }

  return true;
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

    // Capture the existing updatedAt timestamp before the async fetch
    const existingUpdatedAt = existingItem?.updatedAt;

    // For existing items, use known type. For new items, let fetchItem infer from parent DB.
    const itemType = existingItem?.type; // undefined for new items triggers inference

    logger.webhook.debug(
      `Fetching page ${pageId} (type: ${itemType || 'to be inferred from parent database'})`
    );
    const updatedItem = await notion.fetchItem(pageId, itemType);

    // Check if the store was updated concurrently (by another webhook or API call)
    // Only upsert if the fetched item is newer or the item didn't exist
    const currentItem = store.get(normalizedId);
    const currentUpdatedAt = currentItem?.updatedAt;

    // If the item was updated concurrently and the concurrent update is newer, skip this update
    if (
      currentUpdatedAt &&
      existingUpdatedAt &&
      currentUpdatedAt !== existingUpdatedAt &&
      new Date(currentUpdatedAt) > new Date(updatedItem.updatedAt)
    ) {
      logger.webhook.debug(
        `Skipping stale update for ${normalizedId} - store has newer data ` +
          `(store: ${currentUpdatedAt}, fetched: ${updatedItem.updatedAt})`
      );
      return { success: true };
    }

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
 * POST /api/webhook
 *
 * Receives webhook events from Notion.
 * Note: rawBody is available on Request via type augmentation in types/express.d.ts
 */
router.post('/', async (req: Request, res: Response) => {
  // Handle verification request
  if (isVerificationPayload(req.body)) {
    handleVerificationRequest(req.body.verification_token, res);
    return;
  }

  // Validate signature using the raw body buffer (not JSON.stringify which may differ)
  // Notion computes HMAC against the exact bytes sent, so we must use the original
  const signature = req.headers['x-notion-signature'] as string | undefined;

  // SECURITY: Reject requests without raw body capture - JSON.stringify may differ from original
  // This prevents potential signature bypass via middleware misconfiguration
  if (!req.rawBody) {
    // Only allow in setup mode when we're waiting for verification token
    if (!isSetupMode) {
      logger.webhook.error(
        'Raw body not captured - rejecting request to prevent signature bypass. ' +
          'Check that express.json middleware is configured with rawBody capture.'
      );
      res.status(500).json({
        success: false,
        error: 'Server configuration error: raw body not captured',
      });
      return;
    }
    logger.webhook.warn(
      'Raw body not captured in setup mode - proceeding with JSON.stringify (setup only)'
    );
  }

  const rawBody = req.rawBody?.toString('utf8') || JSON.stringify(req.body);

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

  // Idempotency check - skip duplicate events (e.g., from Notion retries)
  if (isEventAlreadyProcessed(event)) {
    logger.webhook.info(
      `Skipping duplicate event: ${event.type} for ${event.entity.id} (already processed)`
    );
    res.status(200).json({ success: true, data: { received: true, duplicate: true } });
    return;
  }

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
 * SECURITY:
 * - Only available in development mode or if ALLOW_MANUAL_TOKEN_SET is true
 * - Requires ADMIN_API_KEY header for authentication when enabled
 * - Token is stored in memory only and will be lost on server restart
 *
 * WARNING: Token set via this endpoint is NOT persisted. It will be lost on server restart.
 * For production, set NOTION_WEBHOOK_SECRET environment variable instead.
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

  // Require admin API key authentication when configured
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (adminApiKey) {
    const providedKey = req.headers['x-admin-api-key'] as string | undefined;
    // Use timing-safe comparison to prevent timing attacks
    const isValidKey =
      providedKey &&
      providedKey.length === adminApiKey.length &&
      timingSafeEqual(Buffer.from(providedKey), Buffer.from(adminApiKey));

    if (!isValidKey) {
      logger.webhook.warn('Attempted to set token without valid admin API key');
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or missing admin API key',
      });
      return;
    }
  } else if (!isDevelopment) {
    // In production without ADMIN_API_KEY configured, require it to be set
    logger.webhook.warn('ADMIN_API_KEY not configured - rejecting set-token request for security');
    res.status(403).json({
      success: false,
      error:
        'ADMIN_API_KEY environment variable must be configured to use this endpoint in production',
    });
    return;
  }

  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ success: false, error: 'Token is required' });
    return;
  }

  // Validate token format (should be a reasonable length string)
  if (token.length < MIN_TOKEN_LENGTH || token.length > MAX_TOKEN_LENGTH) {
    res.status(400).json({ success: false, error: 'Invalid token format' });
    return;
  }

  verificationToken = token;
  // Exit setup mode - from now on, signature validation is required
  isSetupMode = false;
  logger.webhook.info('Verification token set manually');
  logger.webhook.warn(
    'Token stored in memory only - will be lost on restart. ' +
      'Add NOTION_WEBHOOK_SECRET to .env for persistence.'
  );

  res.json({
    success: true,
    data: {
      configured: true,
      warning: 'Token stored in memory only. Add NOTION_WEBHOOK_SECRET to .env for persistence.',
    },
  });
});

export default router;
