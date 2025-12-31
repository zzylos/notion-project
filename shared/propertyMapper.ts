/**
 * Shared PropertyMapper - Handles property extraction from Notion pages.
 *
 * This module provides property extraction logic used by both client and server.
 * It's environment-agnostic and accepts dependencies via constructor injection.
 *
 * Responsible for:
 * - Finding properties by name with fuzzy matching (exact, case-insensitive, aliases)
 * - Extracting typed values from Notion property objects
 * - Mapping Notion status/priority values to application types
 *
 * @example
 * // In client code:
 * import { PropertyMapper } from '../shared/propertyMapper';
 * const mapper = new PropertyMapper(PROPERTY_ALIASES, logger);
 *
 * // In server code:
 * import { PropertyMapper } from '../../shared/propertyMapper.js';
 * const mapper = new PropertyMapper(PROPERTY_ALIASES, logger);
 */

import type {
  NotionPropertyValue,
  Owner,
  PropertyMappings,
  DatabaseConfig,
  Priority,
  NamespaceLogger,
} from './types.js';
import { normalizeUuid } from './utils.js';
import { DEFAULT_PROPERTY_MAPPINGS } from './constants.js';

/**
 * Minimal logger interface for property mapper.
 * Allows the mapper to work with any logger implementation.
 */
export interface PropertyMapperLogger {
  info(message: string, data?: unknown): void;
  debug?(message: string, data?: unknown): void;
  table?(data: object[], columns?: string[]): void;
}

/**
 * PropertyMapper - Environment-agnostic property extraction from Notion pages.
 *
 * Usage:
 * - Create an instance with property aliases and optional logger
 * - Use extraction methods to get typed values from Notion properties
 * - All methods are safe to call with missing or malformed data
 */
export class PropertyMapper {
  private aliases: Record<string, string[]>;
  private logger: PropertyMapperLogger | null;
  private loggedDatabases = new Set<string>();
  private debugMode: boolean;

  /**
   * Create a new PropertyMapper instance.
   *
   * @param aliases - Property name aliases for fuzzy matching
   * @param logger - Optional logger for debug output
   * @param debugMode - Enable debug logging (default: false)
   */
  constructor(
    aliases: Record<string, string[]>,
    logger?: PropertyMapperLogger | NamespaceLogger | null,
    debugMode = false
  ) {
    this.aliases = aliases;
    this.logger = logger ?? null;
    this.debugMode = debugMode;
  }

  /**
   * Clear logged databases tracking (useful when config changes).
   */
  clearLoggedDatabases(): void {
    this.loggedDatabases.clear();
  }

  /**
   * Get the effective mappings for a database (default + overrides).
   *
   * @param defaultMappings - The default mappings to use as base
   * @param dbConfig - Optional database config with mapping overrides
   * @returns The merged property mappings
   */
  getMappings(
    defaultMappings: PropertyMappings | undefined,
    dbConfig?: DatabaseConfig
  ): PropertyMappings {
    const defaults = defaultMappings || DEFAULT_PROPERTY_MAPPINGS;

    if (!dbConfig?.mappings) {
      return defaults;
    }

    return { ...defaults, ...dbConfig.mappings };
  }

  /**
   * Find property by name with case-insensitive and alias matching.
   *
   * Search order:
   * 1. Exact match on mapping name
   * 2. Case-insensitive match on mapping name
   * 3. Case-insensitive match on aliases
   * 4. Fallback by property type (if specified)
   * 5. Special case: find any relation for parent properties
   *
   * @param props - The properties object from a Notion page
   * @param mappingName - The property name to search for
   * @param fallbackType - Optional fallback property type to search for
   * @returns The found property value or null
   */
  findProperty(
    props: Record<string, NotionPropertyValue>,
    mappingName: string,
    fallbackType?: string
  ): NotionPropertyValue | null {
    // First try exact match
    if (props[mappingName]) {
      return props[mappingName];
    }

    // Try case-insensitive match
    const lowerMapping = mappingName.toLowerCase();
    for (const [key, value] of Object.entries(props)) {
      if (key.toLowerCase() === lowerMapping) {
        return value;
      }
    }

    // Try common aliases
    const propertyAliases = this.getPropertyAliases(mappingName);
    for (const alias of propertyAliases) {
      const lowerAlias = alias.toLowerCase();
      for (const [key, value] of Object.entries(props)) {
        if (key.toLowerCase() === lowerAlias) {
          return value;
        }
      }
    }

    // Try to find by type
    if (fallbackType) {
      for (const value of Object.values(props)) {
        if (value.type === fallbackType) {
          return value;
        }
      }
    }

    // Special case: for relation properties, find ANY relation
    if (fallbackType === 'relation' || mappingName.toLowerCase() === 'parent') {
      for (const value of Object.values(props)) {
        if (value.type === 'relation') {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Get aliases for a property name.
   */
  private getPropertyAliases(mappingName: string): string[] {
    return this.aliases[mappingName] || [];
  }

  /**
   * Check if a property has a non-null value.
   *
   * @param prop - The Notion property value to check
   * @returns True if the property has a meaningful value
   */
  hasPropertyValue(prop: NotionPropertyValue): boolean {
    switch (prop.type) {
      case 'select':
        return prop.select !== null;
      case 'status':
        return prop.status !== null;
      case 'relation':
        return (prop.relation?.length ?? 0) > 0;
      case 'people':
        return (prop.people?.length ?? 0) > 0;
      case 'number':
        return prop.number !== null;
      case 'date':
        return prop.date !== null;
      default:
        return true;
    }
  }

  /**
   * Log property names once per database for debugging.
   * Only logs in debug mode and only once per database type.
   *
   * @param databaseType - The type/name of the database being logged
   * @param props - The properties object from a Notion page
   */
  logPropertyNames(databaseType: string, props: Record<string, NotionPropertyValue>): void {
    if (!this.debugMode || !this.logger) return;

    const dbKey = databaseType;
    if (this.loggedDatabases.has(dbKey)) return;
    this.loggedDatabases.add(dbKey);

    const propertyInfo = Object.entries(props).map(([name, value]) => ({
      name,
      type: value.type,
      hasValue: this.hasPropertyValue(value),
    }));

    this.logger.info(`[Debug] ${databaseType.toUpperCase()} database properties:`);
    if (this.logger.table) {
      this.logger.table(propertyInfo);
    }
  }

  /**
   * Extract title from properties.
   * Handles both 'title' and 'rich_text' property types.
   *
   * @param props - The properties object from a Notion page
   * @param mappingName - The property name for the title field
   * @returns The extracted title string, or empty string if not found
   */
  extractTitle(props: Record<string, NotionPropertyValue>, mappingName: string): string {
    const mapped = this.findProperty(props, mappingName);
    if (mapped) {
      if (mapped.type === 'title' && mapped.title) {
        return mapped.title
          .filter(t => t && typeof t.plain_text === 'string')
          .map(t => t.plain_text)
          .join('');
      }
      if (mapped.type === 'rich_text' && mapped.rich_text) {
        return mapped.rich_text
          .filter(t => t && typeof t.plain_text === 'string')
          .map(t => t.plain_text)
          .join('');
      }
    }

    // Fallback: find ANY title property
    for (const value of Object.values(props)) {
      if (value.type === 'title' && value.title && value.title.length > 0) {
        return value.title
          .filter(t => t && typeof t.plain_text === 'string')
          .map(t => t.plain_text)
          .join('');
      }
    }

    return '';
  }

  /**
   * Extract select or status value from properties.
   * Handles both 'select' and 'status' property types (Notion uses both).
   *
   * @param props - The properties object from a Notion page
   * @param mappingName - The property name for the select field
   * @returns The selected value name, or null if not found
   */
  extractSelect(props: Record<string, NotionPropertyValue>, mappingName: string): string | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop) return null;

    if (prop.type === 'select' && prop.select) {
      return prop.select.name;
    }
    if (prop.type === 'status' && prop.status) {
      return prop.status.name;
    }

    return null;
  }

  /**
   * Extract status from properties.
   * Alias for extractSelect - kept for semantic clarity in calling code.
   *
   * @param props - The properties object from a Notion page
   * @param mappingName - The property name for the status field
   * @returns The status value name, or null if not found
   */
  extractStatus(props: Record<string, NotionPropertyValue>, mappingName: string): string | null {
    return this.extractSelect(props, mappingName);
  }

  /**
   * Extract multi-select values from properties.
   *
   * @param props - The properties object from a Notion page
   * @param mappingName - The property name for the multi-select field
   * @returns Array of selected value names, or empty array if not found
   */
  extractMultiSelect(props: Record<string, NotionPropertyValue>, mappingName: string): string[] {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'multi_select' || !prop.multi_select) return [];
    return prop.multi_select.map(s => s.name);
  }

  /**
   * Extract number from properties.
   *
   * @param props - The properties object from a Notion page
   * @param mappingName - The property name for the number field
   * @returns The number value, or null if not found
   */
  extractNumber(props: Record<string, NotionPropertyValue>, mappingName: string): number | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'number') return null;
    return prop.number ?? null;
  }

  /**
   * Extract date from properties.
   *
   * @param props - The properties object from a Notion page
   * @param mappingName - The property name for the date field
   * @returns The date start string (ISO format), or null if not found
   */
  extractDate(props: Record<string, NotionPropertyValue>, mappingName: string): string | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'date' || !prop.date) return null;
    return prop.date.start;
  }

  /**
   * Extract people from properties.
   *
   * @param props - The properties object from a Notion page
   * @param mappingName - The property name for the people field
   * @returns Array of Owner objects, or empty array if not found
   */
  extractPeople(props: Record<string, NotionPropertyValue>, mappingName: string): Owner[] {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'people' || !prop.people) return [];
    return prop.people
      .filter(p => p && p.id)
      .map(p => ({
        id: p.id,
        name: typeof p.name === 'string' && p.name.length > 0 ? p.name : 'Unknown',
        email: p.person?.email,
        avatar: p.avatar_url,
      }));
  }

  /**
   * Extract relation IDs from properties.
   * Normalizes IDs to ensure consistent format for parent-child matching.
   *
   * @param props - The properties object from a Notion page
   * @param mappingName - The property name for the relation field
   * @returns Array of normalized relation IDs, or empty array if not found
   */
  extractRelation(props: Record<string, NotionPropertyValue>, mappingName: string): string[] {
    const prop = this.findProperty(props, mappingName, 'relation');
    if (!prop || prop.type !== 'relation' || !prop.relation) return [];
    return prop.relation
      .filter(r => r && r.id && typeof r.id === 'string')
      .map(r => normalizeUuid(r.id))
      .filter(id => id.length > 0);
  }

  /**
   * Map Notion status to ItemStatus (preserves original value).
   *
   * @param notionStatus - The status string from Notion
   * @returns The normalized status string, defaulting to 'Not Started'
   */
  mapToItemStatus(notionStatus: string | null): string {
    return notionStatus?.trim() || 'Not Started';
  }

  /**
   * Map Notion priority string to Priority type.
   * Supports various naming conventions (P0-P4, Critical, High, Medium, Low, etc.)
   *
   * @param notionPriority - The priority string from Notion
   * @returns The mapped Priority value, or undefined if not recognized
   */
  mapToPriority(notionPriority: string | null): Priority | undefined {
    if (!notionPriority) return undefined;

    const normalized = notionPriority.toLowerCase().trim();

    const priorityMap: Record<string, Priority> = {
      p0: 'P0',
      p1: 'P1',
      p2: 'P2',
      p3: 'P3',
      p4: 'P3',
      critical: 'P0',
      highest: 'P0',
      urgent: 'P0',
      blocker: 'P0',
      high: 'P1',
      important: 'P1',
      medium: 'P2',
      normal: 'P2',
      moderate: 'P2',
      low: 'P3',
      minor: 'P3',
      trivial: 'P3',
      lowest: 'P3',
    };

    if (priorityMap[normalized]) {
      return priorityMap[normalized];
    }

    // Partial matches
    if (normalized.includes('critical') || normalized.includes('urgent')) return 'P0';
    if (normalized.includes('high')) return 'P1';
    if (normalized.includes('medium') || normalized.includes('normal')) return 'P2';
    if (normalized.includes('low')) return 'P3';

    return undefined;
  }
}
