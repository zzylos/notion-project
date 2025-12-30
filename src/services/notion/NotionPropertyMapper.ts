/**
 * NotionPropertyMapper - Handles property extraction from Notion pages.
 *
 * Responsible for:
 * - Finding properties by name with fuzzy matching
 * - Extracting typed values from Notion property objects
 * - Mapping Notion status/priority values to application types
 */

import type { NotionPropertyValue } from '../../types/notion';
import type { Owner, PropertyMappings, DatabaseConfig, ItemStatus, Priority } from '../../types';
import { PROPERTY_ALIASES } from '../../constants';
import { logger } from '../../utils/logger';

export class NotionPropertyMapper {
  private debugMode: boolean;
  private loggedDatabases = new Set<string>();

  constructor(debugMode = false) {
    this.debugMode = debugMode;
  }

  /**
   * Clear logged databases (useful when config changes)
   */
  clearLoggedDatabases(): void {
    this.loggedDatabases.clear();
  }

  /**
   * Get the effective mappings for a database (default + overrides)
   */
  getMappings(
    defaultMappings: PropertyMappings | undefined,
    dbConfig?: DatabaseConfig
  ): PropertyMappings {
    const defaults = defaultMappings || {
      title: 'Name',
      status: 'Status',
      priority: 'Priority',
      owner: 'Owner',
      parent: 'Parent',
      progress: 'Progress',
      dueDate: 'Deadline',
      tags: 'Tags',
    };

    if (!dbConfig?.mappings) {
      return defaults;
    }

    return { ...defaults, ...dbConfig.mappings };
  }

  /**
   * Find property by name with case-insensitive and alias matching
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
    const aliases = this.getPropertyAliases(mappingName);
    for (const alias of aliases) {
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
   * Get aliases for a property name
   */
  private getPropertyAliases(mappingName: string): string[] {
    return PROPERTY_ALIASES[mappingName] || [];
  }

  /**
   * Check if a property has a non-null value
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
   * Log property names once per database for debugging
   */
  logPropertyNames(databaseType: string, props: Record<string, NotionPropertyValue>): void {
    if (!this.debugMode) return;

    const dbKey = databaseType;
    if (this.loggedDatabases.has(dbKey)) return;
    this.loggedDatabases.add(dbKey);

    const propertyInfo = Object.entries(props).map(([name, value]) => ({
      name,
      type: value.type,
      hasValue: this.hasPropertyValue(value),
    }));

    logger.info('Notion', `[Debug] ${databaseType.toUpperCase()} database properties:`);
    logger.table('Notion', propertyInfo);
  }

  /**
   * Extract title from properties
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
   */
  extractStatus(props: Record<string, NotionPropertyValue>, mappingName: string): string | null {
    return this.extractSelect(props, mappingName);
  }

  /**
   * Extract multi-select values from properties
   */
  extractMultiSelect(props: Record<string, NotionPropertyValue>, mappingName: string): string[] {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'multi_select' || !prop.multi_select) return [];
    return prop.multi_select.map(s => s.name);
  }

  /**
   * Extract number from properties
   */
  extractNumber(props: Record<string, NotionPropertyValue>, mappingName: string): number | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'number') return null;
    return prop.number ?? null;
  }

  /**
   * Extract date from properties
   */
  extractDate(props: Record<string, NotionPropertyValue>, mappingName: string): string | null {
    const prop = this.findProperty(props, mappingName);
    if (!prop || prop.type !== 'date' || !prop.date) return null;
    return prop.date.start;
  }

  /**
   * Extract people from properties
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
   * Normalize a Notion UUID to consistent format (with dashes).
   * Notion sometimes returns IDs with or without dashes depending on context.
   */
  normalizeUuid(id: string): string {
    // Validate input
    if (!id || typeof id !== 'string') {
      return '';
    }

    // Remove any existing dashes and convert to lowercase
    const clean = id.replace(/-/g, '').toLowerCase();

    // If it's not a valid UUID length, return as-is
    if (clean.length !== 32) return id;

    // Insert dashes in standard UUID positions: 8-4-4-4-12
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  }

  /**
   * Extract relation IDs from properties.
   * Normalizes IDs to ensure consistent format for parent-child matching.
   */
  extractRelation(props: Record<string, NotionPropertyValue>, mappingName: string): string[] {
    const prop = this.findProperty(props, mappingName, 'relation');
    if (!prop || prop.type !== 'relation' || !prop.relation) return [];
    return prop.relation
      .filter(r => r && r.id && typeof r.id === 'string')
      .map(r => this.normalizeUuid(r.id))
      .filter(id => id.length > 0);
  }

  /**
   * Map Notion status to ItemStatus (preserves original value)
   */
  mapToItemStatus(notionStatus: string | null): ItemStatus {
    return notionStatus?.trim() || 'Not Started';
  }

  /**
   * Map Notion priority string to Priority type
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

export const notionPropertyMapper = new NotionPropertyMapper(import.meta.env.DEV);
