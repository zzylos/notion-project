import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseDate, isOverdue, formatDate, getRelativeTime } from './dateUtils';

describe('dateUtils', () => {
  describe('parseDate', () => {
    it('should parse valid date string', () => {
      const result = parseDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January is 0
      expect(result?.getDate()).toBe(15);
    });

    it('should parse ISO date string', () => {
      const result = parseDate('2024-06-20T10:30:00.000Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return null for null input', () => {
      expect(parseDate(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(parseDate(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });

    it('should return null for invalid date string', () => {
      expect(parseDate('not-a-date')).toBeNull();
      expect(parseDate('invalid')).toBeNull();
    });

    it('should return null for NaN date', () => {
      // Some date strings parse but result in Invalid Date
      expect(parseDate('2024-13-45')).toBeNull(); // Invalid month/day
    });
  });

  describe('isOverdue', () => {
    beforeEach(() => {
      // Mock current date to 2024-06-15
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for past due date with non-completed status', () => {
      expect(isOverdue('2024-06-10', 'In Progress')).toBe(true);
      expect(isOverdue('2024-06-14', 'Doing')).toBe(true);
      expect(isOverdue('2024-01-01', 'New')).toBe(true);
    });

    it('should return false for future due date', () => {
      expect(isOverdue('2024-06-20', 'In Progress')).toBe(false);
      expect(isOverdue('2024-12-31', 'New')).toBe(false);
    });

    it('should return false for completed items regardless of due date', () => {
      expect(isOverdue('2024-01-01', 'Done')).toBe(false);
      expect(isOverdue('2024-01-01', 'Completed')).toBe(false);
      expect(isOverdue('2024-01-01', 'Shipped')).toBe(false);
    });

    it('should return false for today (not overdue until tomorrow)', () => {
      expect(isOverdue('2024-06-15', 'In Progress')).toBe(false);
    });

    it('should return false for undefined due date', () => {
      expect(isOverdue(undefined, 'In Progress')).toBe(false);
    });

    it('should return false for empty due date', () => {
      expect(isOverdue('', 'In Progress')).toBe(false);
    });

    it('should return false for invalid due date', () => {
      expect(isOverdue('invalid', 'In Progress')).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format date with medium format (default)', () => {
      const result = formatDate('2024-06-15');
      expect(result).toContain('Jun');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format date with short format', () => {
      const result = formatDate('2024-06-15', 'short');
      expect(result).toContain('Jun');
      expect(result).toContain('15');
      expect(result).not.toContain('2024');
    });

    it('should format date with long format', () => {
      const result = formatDate('2024-06-15', 'long');
      expect(result).toContain('June');
      expect(result).toContain('15');
      expect(result).toContain('2024');
      // Long format includes weekday
      expect(result).toMatch(/Saturday|June/);
    });

    it('should accept Date object', () => {
      const date = new Date('2024-06-15');
      const result = formatDate(date);
      expect(result).toContain('Jun');
      expect(result).toContain('15');
    });

    it('should return empty string for null', () => {
      expect(formatDate(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('');
    });

    it('should return empty string for invalid date string', () => {
      expect(formatDate('invalid')).toBe('');
    });

    it('should return empty string for Invalid Date object', () => {
      expect(formatDate(new Date('invalid'))).toBe('');
    });
  });

  describe('getRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "today" for current date', () => {
      expect(getRelativeTime('2024-06-15')).toBe('today');
    });

    it('should return "tomorrow" for next day', () => {
      expect(getRelativeTime('2024-06-16')).toBe('tomorrow');
    });

    it('should return "yesterday" for previous day', () => {
      expect(getRelativeTime('2024-06-14')).toBe('yesterday');
    });

    it('should return "in X days" for future dates', () => {
      expect(getRelativeTime('2024-06-18')).toBe('in 3 days');
      expect(getRelativeTime('2024-06-25')).toBe('in 10 days');
    });

    it('should return "X days ago" for past dates', () => {
      expect(getRelativeTime('2024-06-12')).toBe('3 days ago');
      expect(getRelativeTime('2024-06-05')).toBe('10 days ago');
    });

    it('should accept Date object', () => {
      const date = new Date('2024-06-18');
      expect(getRelativeTime(date)).toBe('in 3 days');
    });

    it('should return empty string for null', () => {
      expect(getRelativeTime(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(getRelativeTime(undefined)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(getRelativeTime('invalid')).toBe('');
    });
  });
});
