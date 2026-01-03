/**
 * Tests for PropertyMapper - shared property extraction from Notion pages.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropertyMapper } from './propertyMapper';
import type { NotionPropertyValue, DatabaseConfig } from './types';
import { DEFAULT_PROPERTY_MAPPINGS, PROPERTY_ALIASES } from './constants';

describe('PropertyMapper', () => {
  let mapper: PropertyMapper;

  beforeEach(() => {
    mapper = new PropertyMapper(PROPERTY_ALIASES);
  });

  describe('constructor', () => {
    it('should create instance without logger', () => {
      const m = new PropertyMapper({});
      expect(m).toBeInstanceOf(PropertyMapper);
    });

    it('should create instance with logger', () => {
      const logger = { info: vi.fn() };
      const m = new PropertyMapper({}, logger);
      expect(m).toBeInstanceOf(PropertyMapper);
    });

    it('should create instance with debug mode', () => {
      const logger = { info: vi.fn() };
      const m = new PropertyMapper({}, logger, true);
      expect(m).toBeInstanceOf(PropertyMapper);
    });
  });

  describe('getMappings', () => {
    it('should return default mappings when no overrides', () => {
      const result = mapper.getMappings(DEFAULT_PROPERTY_MAPPINGS);
      expect(result).toEqual(DEFAULT_PROPERTY_MAPPINGS);
    });

    it('should use DEFAULT_PROPERTY_MAPPINGS when undefined passed', () => {
      const result = mapper.getMappings(undefined);
      expect(result).toEqual(DEFAULT_PROPERTY_MAPPINGS);
    });

    it('should merge database config overrides', () => {
      const dbConfig: DatabaseConfig = {
        databaseId: 'test-id',
        type: 'project',
        mappings: { status: 'CustomStatus' },
      };
      const result = mapper.getMappings(DEFAULT_PROPERTY_MAPPINGS, dbConfig);
      expect(result.status).toBe('CustomStatus');
      expect(result.title).toBe(DEFAULT_PROPERTY_MAPPINGS.title);
    });

    it('should return defaults when dbConfig has no mappings', () => {
      const dbConfig: DatabaseConfig = {
        databaseId: 'test-id',
        type: 'project',
      };
      const result = mapper.getMappings(DEFAULT_PROPERTY_MAPPINGS, dbConfig);
      expect(result).toEqual(DEFAULT_PROPERTY_MAPPINGS);
    });
  });

  describe('findProperty', () => {
    const props: Record<string, NotionPropertyValue> = {
      Status: { id: '1', type: 'select', select: { name: 'Done' } },
      'Custom Name': { id: '2', type: 'title', title: [{ plain_text: 'Test' }] },
      Parent: { id: '3', type: 'relation', relation: [{ id: 'parent-id' }] },
    };

    it('should find property by exact match', () => {
      const result = mapper.findProperty(props, 'Status');
      expect(result).toEqual(props.Status);
    });

    it('should find property by case-insensitive match', () => {
      const result = mapper.findProperty(props, 'status');
      expect(result).toEqual(props.Status);
    });

    it('should find property by alias', () => {
      // 'State' is an alias for 'Status'
      const propsWithState: Record<string, NotionPropertyValue> = {
        State: { id: '1', type: 'select', select: { name: 'Active' } },
      };
      const result = mapper.findProperty(propsWithState, 'Status');
      expect(result).toEqual(propsWithState.State);
    });

    it('should return null when property not found', () => {
      const result = mapper.findProperty(props, 'NonExistent');
      expect(result).toBeNull();
    });

    it('should find by fallback type', () => {
      const result = mapper.findProperty(props, 'NonExistent', 'relation');
      expect(result).toEqual(props.Parent);
    });

    it('should find any relation for parent property', () => {
      const propsWithRelation: Record<string, NotionPropertyValue> = {
        'Random Relation': { id: '1', type: 'relation', relation: [{ id: 'rel-id' }] },
      };
      const result = mapper.findProperty(propsWithRelation, 'parent');
      expect(result).toEqual(propsWithRelation['Random Relation']);
    });
  });

  describe('hasPropertyValue', () => {
    it('should return true for non-null select', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'select', select: { name: 'Test' } };
      expect(mapper.hasPropertyValue(prop)).toBe(true);
    });

    it('should return false for null select', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'select', select: null };
      expect(mapper.hasPropertyValue(prop)).toBe(false);
    });

    it('should return true for non-null status', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'status', status: { name: 'Done' } };
      expect(mapper.hasPropertyValue(prop)).toBe(true);
    });

    it('should return false for null status', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'status', status: null };
      expect(mapper.hasPropertyValue(prop)).toBe(false);
    });

    it('should return true for non-empty relation', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'relation', relation: [{ id: 'x' }] };
      expect(mapper.hasPropertyValue(prop)).toBe(true);
    });

    it('should return false for empty relation', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'relation', relation: [] };
      expect(mapper.hasPropertyValue(prop)).toBe(false);
    });

    it('should return true for non-empty people', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'people', people: [{ id: 'user1' }] };
      expect(mapper.hasPropertyValue(prop)).toBe(true);
    });

    it('should return false for empty people', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'people', people: [] };
      expect(mapper.hasPropertyValue(prop)).toBe(false);
    });

    it('should return true for non-null number', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'number', number: 42 };
      expect(mapper.hasPropertyValue(prop)).toBe(true);
    });

    it('should return false for null number', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'number', number: null };
      expect(mapper.hasPropertyValue(prop)).toBe(false);
    });

    it('should return true for non-null date', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'date', date: { start: '2024-01-01' } };
      expect(mapper.hasPropertyValue(prop)).toBe(true);
    });

    it('should return false for null date', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'date', date: null };
      expect(mapper.hasPropertyValue(prop)).toBe(false);
    });

    it('should return true for other types by default', () => {
      const prop: NotionPropertyValue = { id: '1', type: 'checkbox', checkbox: true };
      expect(mapper.hasPropertyValue(prop)).toBe(true);
    });
  });

  describe('extractTitle', () => {
    it('should extract title from title property', () => {
      const props: Record<string, NotionPropertyValue> = {
        Name: { id: '1', type: 'title', title: [{ plain_text: 'Hello World' }] },
      };
      const result = mapper.extractTitle(props, 'Name');
      expect(result).toBe('Hello World');
    });

    it('should join multiple title segments', () => {
      const props: Record<string, NotionPropertyValue> = {
        Name: {
          id: '1',
          type: 'title',
          title: [{ plain_text: 'Hello' }, { plain_text: ' World' }],
        },
      };
      const result = mapper.extractTitle(props, 'Name');
      expect(result).toBe('Hello World');
    });

    it('should extract title from rich_text property', () => {
      const props: Record<string, NotionPropertyValue> = {
        Name: { id: '1', type: 'rich_text', rich_text: [{ plain_text: 'Rich Text' }] },
      };
      const result = mapper.extractTitle(props, 'Name');
      expect(result).toBe('Rich Text');
    });

    it('should find any title property as fallback', () => {
      const props: Record<string, NotionPropertyValue> = {
        RandomTitle: { id: '1', type: 'title', title: [{ plain_text: 'Fallback' }] },
      };
      const result = mapper.extractTitle(props, 'NonExistent');
      expect(result).toBe('Fallback');
    });

    it('should return empty string when no title found', () => {
      const props: Record<string, NotionPropertyValue> = {
        Status: { id: '1', type: 'select', select: { name: 'Done' } },
      };
      const result = mapper.extractTitle(props, 'Name');
      expect(result).toBe('');
    });

    it('should filter out invalid title segments', () => {
      const props: Record<string, NotionPropertyValue> = {
        Name: {
          id: '1',
          type: 'title',
          title: [{ plain_text: 'Valid' }, null as unknown as { plain_text: string }],
        },
      };
      const result = mapper.extractTitle(props, 'Name');
      expect(result).toBe('Valid');
    });
  });

  describe('extractSelect', () => {
    it('should extract value from select property', () => {
      const props: Record<string, NotionPropertyValue> = {
        Priority: { id: '1', type: 'select', select: { name: 'High' } },
      };
      const result = mapper.extractSelect(props, 'Priority');
      expect(result).toBe('High');
    });

    it('should extract value from status property', () => {
      const props: Record<string, NotionPropertyValue> = {
        Status: { id: '1', type: 'status', status: { name: 'In Progress' } },
      };
      const result = mapper.extractSelect(props, 'Status');
      expect(result).toBe('In Progress');
    });

    it('should return null when property not found', () => {
      const props: Record<string, NotionPropertyValue> = {};
      const result = mapper.extractSelect(props, 'Status');
      expect(result).toBeNull();
    });

    it('should return null for null select', () => {
      const props: Record<string, NotionPropertyValue> = {
        Priority: { id: '1', type: 'select', select: null },
      };
      const result = mapper.extractSelect(props, 'Priority');
      expect(result).toBeNull();
    });
  });

  describe('extractStatus', () => {
    it('should be an alias for extractSelect', () => {
      const props: Record<string, NotionPropertyValue> = {
        Status: { id: '1', type: 'status', status: { name: 'Done' } },
      };
      expect(mapper.extractStatus(props, 'Status')).toBe('Done');
    });
  });

  describe('extractMultiSelect', () => {
    it('should extract values from multi_select', () => {
      const props: Record<string, NotionPropertyValue> = {
        Tags: { id: '1', type: 'multi_select', multi_select: [{ name: 'Bug' }, { name: 'Feature' }] },
      };
      const result = mapper.extractMultiSelect(props, 'Tags');
      expect(result).toEqual(['Bug', 'Feature']);
    });

    it('should return empty array when property not found', () => {
      const props: Record<string, NotionPropertyValue> = {};
      const result = mapper.extractMultiSelect(props, 'Tags');
      expect(result).toEqual([]);
    });

    it('should return empty array for wrong type', () => {
      const props: Record<string, NotionPropertyValue> = {
        Tags: { id: '1', type: 'select', select: { name: 'Single' } },
      };
      const result = mapper.extractMultiSelect(props, 'Tags');
      expect(result).toEqual([]);
    });
  });

  describe('extractNumber', () => {
    it('should extract number value', () => {
      const props: Record<string, NotionPropertyValue> = {
        Progress: { id: '1', type: 'number', number: 75 },
      };
      const result = mapper.extractNumber(props, 'Progress');
      expect(result).toBe(75);
    });

    it('should return null when property not found', () => {
      const props: Record<string, NotionPropertyValue> = {};
      const result = mapper.extractNumber(props, 'Progress');
      expect(result).toBeNull();
    });

    it('should return null for null number', () => {
      const props: Record<string, NotionPropertyValue> = {
        Progress: { id: '1', type: 'number', number: null },
      };
      const result = mapper.extractNumber(props, 'Progress');
      expect(result).toBeNull();
    });

    it('should return null for wrong type', () => {
      const props: Record<string, NotionPropertyValue> = {
        Progress: { id: '1', type: 'select', select: { name: '50%' } },
      };
      const result = mapper.extractNumber(props, 'Progress');
      expect(result).toBeNull();
    });
  });

  describe('extractDate', () => {
    it('should extract date start value', () => {
      const props: Record<string, NotionPropertyValue> = {
        DueDate: { id: '1', type: 'date', date: { start: '2024-12-31' } },
      };
      const result = mapper.extractDate(props, 'DueDate');
      expect(result).toBe('2024-12-31');
    });

    it('should return null when property not found', () => {
      const props: Record<string, NotionPropertyValue> = {};
      const result = mapper.extractDate(props, 'DueDate');
      expect(result).toBeNull();
    });

    it('should return null for null date', () => {
      const props: Record<string, NotionPropertyValue> = {
        DueDate: { id: '1', type: 'date', date: null },
      };
      const result = mapper.extractDate(props, 'DueDate');
      expect(result).toBeNull();
    });
  });

  describe('extractPeople', () => {
    it('should extract people with all properties', () => {
      const props: Record<string, NotionPropertyValue> = {
        Owner: {
          id: '1',
          type: 'people',
          people: [
            {
              id: 'user-1',
              name: 'John Doe',
              avatar_url: 'https://example.com/avatar.jpg',
              person: { email: 'john@example.com' },
            },
          ],
        },
      };
      const result = mapper.extractPeople(props, 'Owner');
      expect(result).toEqual([
        {
          id: 'user-1',
          name: 'John Doe',
          avatar: 'https://example.com/avatar.jpg',
          email: 'john@example.com',
        },
      ]);
    });

    it('should use "Unknown" for missing name', () => {
      const props: Record<string, NotionPropertyValue> = {
        Owner: {
          id: '1',
          type: 'people',
          people: [{ id: 'user-1' }],
        },
      };
      const result = mapper.extractPeople(props, 'Owner');
      expect(result[0].name).toBe('Unknown');
    });

    it('should return empty array when property not found', () => {
      const props: Record<string, NotionPropertyValue> = {};
      const result = mapper.extractPeople(props, 'Owner');
      expect(result).toEqual([]);
    });

    it('should filter out people without id', () => {
      const props: Record<string, NotionPropertyValue> = {
        Owner: {
          id: '1',
          type: 'people',
          people: [
            { id: 'user-1', name: 'Valid' },
            { id: '', name: 'Invalid Empty' },
            null as unknown as { id: string },
          ],
        },
      };
      const result = mapper.extractPeople(props, 'Owner');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user-1');
    });
  });

  describe('extractRelation', () => {
    it('should extract and normalize relation IDs', () => {
      const props: Record<string, NotionPropertyValue> = {
        Parent: {
          id: '1',
          type: 'relation',
          relation: [{ id: '12345678123412341234123456789abc' }],
        },
      };
      const result = mapper.extractRelation(props, 'Parent');
      expect(result).toEqual(['12345678-1234-1234-1234-123456789abc']);
    });

    it('should handle already-normalized UUIDs', () => {
      const props: Record<string, NotionPropertyValue> = {
        Parent: {
          id: '1',
          type: 'relation',
          relation: [{ id: '12345678-1234-1234-1234-123456789abc' }],
        },
      };
      const result = mapper.extractRelation(props, 'Parent');
      expect(result).toEqual(['12345678-1234-1234-1234-123456789abc']);
    });

    it('should return empty array when property not found', () => {
      const props: Record<string, NotionPropertyValue> = {};
      const result = mapper.extractRelation(props, 'Parent');
      expect(result).toEqual([]);
    });

    it('should filter out invalid relations', () => {
      const props: Record<string, NotionPropertyValue> = {
        Parent: {
          id: '1',
          type: 'relation',
          relation: [
            { id: 'valid-uuid' },
            { id: '' },
            null as unknown as { id: string },
          ],
        },
      };
      const result = mapper.extractRelation(props, 'Parent');
      expect(result).toHaveLength(1);
    });
  });

  describe('mapToItemStatus', () => {
    it('should trim and return status', () => {
      expect(mapper.mapToItemStatus('  In Progress  ')).toBe('In Progress');
    });

    it('should return "Not Started" for null', () => {
      expect(mapper.mapToItemStatus(null)).toBe('Not Started');
    });

    it('should return "Not Started" for empty string', () => {
      expect(mapper.mapToItemStatus('')).toBe('Not Started');
    });
  });

  describe('mapToPriority', () => {
    it('should map P0-P3 variants', () => {
      expect(mapper.mapToPriority('P0')).toBe('P0');
      expect(mapper.mapToPriority('p1')).toBe('P1');
      expect(mapper.mapToPriority('P2')).toBe('P2');
      expect(mapper.mapToPriority('p3')).toBe('P3');
      expect(mapper.mapToPriority('P4')).toBe('P3'); // P4 maps to P3
    });

    it('should map word-based priorities', () => {
      expect(mapper.mapToPriority('Critical')).toBe('P0');
      expect(mapper.mapToPriority('highest')).toBe('P0');
      expect(mapper.mapToPriority('URGENT')).toBe('P0');
      expect(mapper.mapToPriority('High')).toBe('P1');
      expect(mapper.mapToPriority('Medium')).toBe('P2');
      expect(mapper.mapToPriority('Low')).toBe('P3');
    });

    it('should handle partial matches', () => {
      expect(mapper.mapToPriority('Very Critical')).toBe('P0');
      expect(mapper.mapToPriority('High Priority')).toBe('P1');
      expect(mapper.mapToPriority('Medium Level')).toBe('P2');
      expect(mapper.mapToPriority('Very Low')).toBe('P3');
    });

    it('should return undefined for null', () => {
      expect(mapper.mapToPriority(null)).toBeUndefined();
    });

    it('should return undefined for unknown priority', () => {
      expect(mapper.mapToPriority('Unknown')).toBeUndefined();
    });
  });

  describe('logPropertyNames', () => {
    it('should not log when debug mode is off', () => {
      const logger = { info: vi.fn(), table: vi.fn() };
      const m = new PropertyMapper({}, logger, false);
      m.logPropertyNames('test', { Prop: { id: '1', type: 'select' } });
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should log only once per database type', () => {
      const logger = { info: vi.fn(), table: vi.fn() };
      const m = new PropertyMapper({}, logger, true);
      const props = { Prop: { id: '1', type: 'select' } };

      m.logPropertyNames('test', props);
      m.logPropertyNames('test', props);

      expect(logger.info).toHaveBeenCalledTimes(1);
    });

    it('should log different database types separately', () => {
      const logger = { info: vi.fn(), table: vi.fn() };
      const m = new PropertyMapper({}, logger, true);
      const props = { Prop: { id: '1', type: 'select' } };

      m.logPropertyNames('type1', props);
      m.logPropertyNames('type2', props);

      expect(logger.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearLoggedDatabases', () => {
    it('should allow re-logging after clear', () => {
      const logger = { info: vi.fn(), table: vi.fn() };
      const m = new PropertyMapper({}, logger, true);
      const props = { Prop: { id: '1', type: 'select' } };

      m.logPropertyNames('test', props);
      m.clearLoggedDatabases();
      m.logPropertyNames('test', props);

      expect(logger.info).toHaveBeenCalledTimes(2);
    });
  });
});
