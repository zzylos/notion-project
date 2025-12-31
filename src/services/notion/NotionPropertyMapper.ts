/**
 * NotionPropertyMapper - Client-side wrapper for shared PropertyMapper.
 *
 * This module provides a client-specific wrapper around the shared PropertyMapper,
 * configured with browser-specific settings (debug mode based on Vite env).
 *
 * For the core property extraction logic, see shared/propertyMapper.ts.
 */

import { PropertyMapper, PROPERTY_ALIASES } from '../../../shared';
import { logger } from '../../utils/logger';

/**
 * Client-side NotionPropertyMapper.
 *
 * Extends the shared PropertyMapper with:
 * - Browser-specific debug mode detection (import.meta.env.DEV)
 * - Client logger integration
 *
 * All property extraction methods are inherited from the shared PropertyMapper.
 */
export class NotionPropertyMapper extends PropertyMapper {
  constructor(debugMode = import.meta.env.DEV) {
    // Create a logger adapter that matches the PropertyMapperLogger interface
    const loggerAdapter = {
      info: (message: string, data?: unknown) => logger.notion.info(message, data),
      debug: (message: string, data?: unknown) => logger.notion.debug(message, data),
      table: (data: object[]) => logger.table('Notion', data),
    };

    super(PROPERTY_ALIASES, loggerAdapter, debugMode);
  }
}

/**
 * Default client-side property mapper instance.
 * Configured with debug mode in development.
 */
export const notionPropertyMapper = new NotionPropertyMapper();

// Re-export the base class for type checking
export { PropertyMapper } from '../../../shared';
