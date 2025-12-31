import { describe, it, expect } from 'vitest';
import { toggleArrayItem, unique } from './arrayUtils';

describe('arrayUtils', () => {
  describe('toggleArrayItem', () => {
    it('should add item if not present', () => {
      const array = ['a', 'b'];
      const result = toggleArrayItem(array, 'c');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should remove item if present', () => {
      const array = ['a', 'b', 'c'];
      const result = toggleArrayItem(array, 'b');
      expect(result).toEqual(['a', 'c']);
    });

    it('should not mutate original array', () => {
      const original = ['a', 'b'];
      toggleArrayItem(original, 'c');
      expect(original).toEqual(['a', 'b']);
    });

    it('should work with empty array', () => {
      const result = toggleArrayItem([], 'a');
      expect(result).toEqual(['a']);
    });

    it('should work with single element array - add', () => {
      const result = toggleArrayItem(['a'], 'b');
      expect(result).toEqual(['a', 'b']);
    });

    it('should work with single element array - remove', () => {
      const result = toggleArrayItem(['a'], 'a');
      expect(result).toEqual([]);
    });

    it('should work with numbers', () => {
      expect(toggleArrayItem([1, 2, 3], 4)).toEqual([1, 2, 3, 4]);
      expect(toggleArrayItem([1, 2, 3], 2)).toEqual([1, 3]);
    });

    it('should work with objects using reference equality', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const obj3 = { id: 3 };
      const array = [obj1, obj2];

      // Adding new object reference
      expect(toggleArrayItem(array, obj3)).toEqual([obj1, obj2, obj3]);

      // Removing existing object reference
      expect(toggleArrayItem(array, obj1)).toEqual([obj2]);

      // Different object with same value won't match
      expect(toggleArrayItem(array, { id: 1 })).toEqual([obj1, obj2, { id: 1 }]);
    });

    it('should handle first element removal', () => {
      const result = toggleArrayItem(['a', 'b', 'c'], 'a');
      expect(result).toEqual(['b', 'c']);
    });

    it('should handle last element removal', () => {
      const result = toggleArrayItem(['a', 'b', 'c'], 'c');
      expect(result).toEqual(['a', 'b']);
    });
  });

  describe('unique', () => {
    it('should remove duplicates', () => {
      expect(unique(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    });

    it('should preserve order of first occurrence', () => {
      expect(unique(['c', 'a', 'b', 'a', 'c'])).toEqual(['c', 'a', 'b']);
    });

    it('should work with empty array', () => {
      expect(unique([])).toEqual([]);
    });

    it('should work with no duplicates', () => {
      expect(unique(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should work with all duplicates', () => {
      expect(unique(['a', 'a', 'a'])).toEqual(['a']);
    });

    it('should work with numbers', () => {
      expect(unique([1, 2, 1, 3, 2, 1])).toEqual([1, 2, 3]);
    });

    it('should not mutate original array', () => {
      const original = ['a', 'a', 'b'];
      unique(original);
      expect(original).toEqual(['a', 'a', 'b']);
    });

    it('should use strict equality for objects', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 1 };
      // Same reference appears twice - deduplicated
      expect(unique([obj1, obj1])).toEqual([obj1]);
      // Different references - both kept
      expect(unique([obj1, obj2])).toEqual([obj1, obj2]);
    });

    it('should handle single element', () => {
      expect(unique(['a'])).toEqual(['a']);
    });
  });
});
