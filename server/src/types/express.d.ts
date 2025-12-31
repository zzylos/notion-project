/**
 * Express type extensions for the server.
 *
 * Extends the Express Request type to include custom properties
 * used by middleware in this application.
 */

import { type Request } from 'express';

/**
 * Extended Express Request with rawBody buffer.
 * Used for webhook signature verification.
 *
 * @example
 * import type { RequestWithRawBody } from '../types/express.js';
 *
 * app.post('/webhook', (req: RequestWithRawBody, res) => {
 *   const rawBody = req.rawBody;
 *   // Verify signature using rawBody...
 * });
 */
export interface RequestWithRawBody extends Request {
  /**
   * Raw body buffer captured before JSON parsing.
   * Used for HMAC signature verification of webhooks.
   */
  rawBody?: Buffer;
}

// Augment the Express namespace to add rawBody to all requests
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}
