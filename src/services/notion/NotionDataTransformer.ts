/**
 * NotionDataTransformer - Transforms Notion pages to WorkItem objects.
 *
 * Responsible for:
 * - Converting Notion pages to WorkItem format
 * - Building parent-child relationships
 */

import type { NotionPage } from '../../types/notion';
import type { WorkItem, ItemType, DatabaseConfig, PropertyMappings } from '../../types';
import { NotionPropertyMapper } from './NotionPropertyMapper';
import { logger } from '../../utils/logger';

export class NotionDataTransformer {
  private propertyMapper: NotionPropertyMapper;
  private debugMode: boolean;

  constructor(propertyMapper: NotionPropertyMapper, debugMode = false) {
    this.propertyMapper = propertyMapper;
    this.debugMode = debugMode;
  }

  /**
   * Convert a Notion page to a WorkItem with a specified type
   */
  pageToWorkItem(
    page: NotionPage,
    itemType: ItemType,
    defaultMappings?: PropertyMappings,
    dbConfig?: DatabaseConfig
  ): WorkItem {
    const mappings = this.propertyMapper.getMappings(defaultMappings, dbConfig);
    const props = page.properties;

    // Log property names once per database type
    this.propertyMapper.logPropertyNames(itemType, props);

    const title = this.propertyMapper.extractTitle(props, mappings.title);
    const status = this.propertyMapper.extractStatus(props, mappings.status);
    const priority = this.propertyMapper.extractSelect(props, mappings.priority);
    const progress = this.propertyMapper.extractNumber(props, mappings.progress);
    const dueDate = this.propertyMapper.extractDate(props, mappings.dueDate);
    const people = this.propertyMapper.extractPeople(props, mappings.owner);
    const parentRelations = this.propertyMapper.extractRelation(props, mappings.parent);
    const tags = this.propertyMapper.extractMultiSelect(props, mappings.tags);

    return {
      id: page.id,
      title: title || 'Untitled',
      type: itemType,
      status: this.propertyMapper.mapToItemStatus(status),
      priority: this.propertyMapper.mapToPriority(priority),
      progress: progress ?? undefined,
      owner: people[0],
      assignees: people,
      parentId: parentRelations.length > 0 ? parentRelations[0] : undefined,
      children: [],
      description: '',
      dueDate: dueDate ?? undefined,
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
      notionPageId: page.id,
      notionUrl: page.url,
      tags,
    };
  }

  /**
   * Build parent-child relationships across all items.
   * Returns the count of orphaned items (items with parentId pointing to non-existent parents)
   */
  buildRelationships(items: WorkItem[]): number {
    const itemMap = new Map(items.map(item => [item.id, item]));
    const orphanedItems: Array<{ id: string; title: string; parentId: string }> = [];

    for (const item of items) {
      if (item.parentId) {
        const parent = itemMap.get(item.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(item.id);
        } else {
          // Track orphaned items (have parentId but parent not found)
          orphanedItems.push({ id: item.id, title: item.title, parentId: item.parentId });
        }
      }
    }

    // Always log orphaned items warning if any are found
    if (orphanedItems.length > 0) {
      logger.warn(
        'Notion',
        `${orphanedItems.length} orphaned items (parent not found). ` +
          `This may indicate missing databases or cross-database relations that couldn't be resolved.`
      );
      if (this.debugMode) {
        logger.table('Notion', orphanedItems);
      }
    }

    return orphanedItems.length;
  }

  /**
   * Transform multiple pages to WorkItems
   */
  transformPages(
    pages: NotionPage[],
    itemType: ItemType,
    defaultMappings?: PropertyMappings,
    dbConfig?: DatabaseConfig
  ): WorkItem[] {
    return pages
      .filter(page => 'properties' in page)
      .map(page => this.pageToWorkItem(page, itemType, defaultMappings, dbConfig));
  }
}

export const notionDataTransformer = new NotionDataTransformer(
  new NotionPropertyMapper(import.meta.env.DEV),
  import.meta.env.DEV
);
