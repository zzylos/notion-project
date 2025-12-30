import { describe, it, expect } from 'vitest';
import {
  getStatusCategory,
  getStatusColors,
  getStatusStyle,
  getStatusHexColor,
  getProgressColor,
  getUniqueStatuses,
  typeColors,
  priorityColors,
  typeLabels,
  priorityLabels,
} from './colors';

describe('colors utility', () => {
  describe('getStatusCategory', () => {
    it('should categorize completed statuses', () => {
      expect(getStatusCategory('Done')).toBe('completed');
      expect(getStatusCategory('Completed')).toBe('completed');
      expect(getStatusCategory('Finished')).toBe('completed');
      expect(getStatusCategory('Closed')).toBe('completed');
      expect(getStatusCategory('Resolved')).toBe('completed');
      expect(getStatusCategory('Shipped')).toBe('completed');
      expect(getStatusCategory('Deployed')).toBe('completed');
      expect(getStatusCategory('Live')).toBe('completed');
      expect(getStatusCategory('Released')).toBe('completed');
      expect(getStatusCategory('Launched')).toBe('completed');
    });

    it('should categorize blocked statuses', () => {
      expect(getStatusCategory('Blocked')).toBe('blocked');
      expect(getStatusCategory('On Hold')).toBe('blocked');
      expect(getStatusCategory('Waiting')).toBe('blocked');
      expect(getStatusCategory('Stuck')).toBe('blocked');
      expect(getStatusCategory('Paused')).toBe('blocked');
      expect(getStatusCategory('Duplicate')).toBe('blocked');
      expect(getStatusCategory('Wontfix')).toBe('blocked');
      expect(getStatusCategory('Cancelled')).toBe('blocked');
      expect(getStatusCategory('Canceled')).toBe('blocked');
    });

    it('should categorize in-review statuses', () => {
      expect(getStatusCategory('In Review')).toBe('in-review');
      expect(getStatusCategory('Testing')).toBe('in-review');
      expect(getStatusCategory('QA')).toBe('in-review');
      expect(getStatusCategory('Verification')).toBe('in-review');
      expect(getStatusCategory('Post Mortem')).toBe('in-review');
      expect(getStatusCategory('Postmortem')).toBe('in-review');
      expect(getStatusCategory('Staging')).toBe('in-review');
      expect(getStatusCategory('Approval')).toBe('in-review');
    });

    it('should categorize in-progress statuses', () => {
      expect(getStatusCategory('In Progress')).toBe('in-progress');
      expect(getStatusCategory('Doing')).toBe('in-progress');
      expect(getStatusCategory('Active')).toBe('in-progress');
      expect(getStatusCategory('WIP')).toBe('in-progress');
      expect(getStatusCategory('Working')).toBe('in-progress');
      expect(getStatusCategory('Development')).toBe('in-progress');
      expect(getStatusCategory('Solutioning')).toBe('in-progress');
      expect(getStatusCategory('Prioritized')).toBe('in-progress');
      expect(getStatusCategory('Scheduled')).toBe('in-progress');
      expect(getStatusCategory('Analysis/Research')).toBe('in-progress');
      expect(getStatusCategory('Implementation')).toBe('in-progress');
      expect(getStatusCategory('Coding')).toBe('in-progress');
      expect(getStatusCategory('Building')).toBe('in-progress');
    });

    it('should default to not-started for unknown statuses', () => {
      expect(getStatusCategory('Unknown')).toBe('not-started');
      expect(getStatusCategory('Custom Status')).toBe('not-started');
      expect(getStatusCategory('New')).toBe('not-started');
      expect(getStatusCategory('Backlog')).toBe('not-started');
      expect(getStatusCategory('')).toBe('not-started');
    });

    it('should be case-insensitive', () => {
      expect(getStatusCategory('DONE')).toBe('completed');
      expect(getStatusCategory('done')).toBe('completed');
      expect(getStatusCategory('Done')).toBe('completed');
      expect(getStatusCategory('IN PROGRESS')).toBe('in-progress');
    });

    it('should handle whitespace', () => {
      expect(getStatusCategory('  Done  ')).toBe('completed');
      expect(getStatusCategory('In  Progress')).toBe('in-progress');
    });

    it('should cache results for performance', () => {
      // Call twice with same status - second call should use cache
      const result1 = getStatusCategory('In Progress');
      const result2 = getStatusCategory('In Progress');
      expect(result1).toBe(result2);
      expect(result1).toBe('in-progress');
    });
  });

  describe('getStatusColors', () => {
    it('should return correct color set for completed status', () => {
      const colors = getStatusColors('Done');
      expect(colors).toHaveProperty('bg');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('dot');
      expect(colors.bg).toContain('green');
    });

    it('should return correct color set for in-progress status', () => {
      const colors = getStatusColors('In Progress');
      expect(colors.bg).toContain('blue');
    });

    it('should return correct color set for blocked status', () => {
      const colors = getStatusColors('Blocked');
      expect(colors.bg).toContain('red');
    });

    it('should return correct color set for in-review status', () => {
      const colors = getStatusColors('In Review');
      expect(colors.bg).toContain('amber');
    });

    it('should return correct color set for not-started status', () => {
      const colors = getStatusColors('New');
      expect(colors.bg).toContain('slate');
    });

    it('should cache results for performance', () => {
      const result1 = getStatusColors('Done');
      const result2 = getStatusColors('Done');
      expect(result1).toBe(result2); // Same object reference
    });
  });

  describe('getStatusStyle', () => {
    it('should return complete style information', () => {
      const style = getStatusStyle('In Progress');
      expect(style).toHaveProperty('category', 'in-progress');
      expect(style).toHaveProperty('colors');
      expect(style).toHaveProperty('isInProgress', true);
      expect(style).toHaveProperty('isCompleted', false);
      expect(style).toHaveProperty('isBlocked', false);
    });

    it('should set isCompleted flag correctly', () => {
      const style = getStatusStyle('Done');
      expect(style.isCompleted).toBe(true);
      expect(style.isInProgress).toBe(false);
      expect(style.isBlocked).toBe(false);
    });

    it('should set isBlocked flag correctly', () => {
      const style = getStatusStyle('Blocked');
      expect(style.isBlocked).toBe(true);
      expect(style.isInProgress).toBe(false);
      expect(style.isCompleted).toBe(false);
    });
  });

  describe('getStatusHexColor', () => {
    it('should return hex color for completed status', () => {
      const hex = getStatusHexColor('Done');
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(hex).toBe('#22c55e'); // green
    });

    it('should return hex color for in-progress status', () => {
      const hex = getStatusHexColor('In Progress');
      expect(hex).toBe('#3b82f6'); // blue
    });

    it('should return hex color for blocked status', () => {
      const hex = getStatusHexColor('Blocked');
      expect(hex).toBe('#ef4444'); // red
    });

    it('should return hex color for in-review status', () => {
      const hex = getStatusHexColor('In Review');
      expect(hex).toBe('#f59e0b'); // amber
    });

    it('should return hex color for not-started status', () => {
      const hex = getStatusHexColor('New');
      expect(hex).toBe('#94a3b8'); // slate
    });
  });

  describe('getProgressColor', () => {
    it('should return green for high progress (>= 80)', () => {
      expect(getProgressColor(80)).toBe('bg-green-500');
      expect(getProgressColor(100)).toBe('bg-green-500');
      expect(getProgressColor(95)).toBe('bg-green-500');
    });

    it('should return blue for medium-high progress (>= 50)', () => {
      expect(getProgressColor(50)).toBe('bg-blue-500');
      expect(getProgressColor(79)).toBe('bg-blue-500');
      expect(getProgressColor(65)).toBe('bg-blue-500');
    });

    it('should return amber for medium-low progress (>= 25)', () => {
      expect(getProgressColor(25)).toBe('bg-amber-500');
      expect(getProgressColor(49)).toBe('bg-amber-500');
      expect(getProgressColor(30)).toBe('bg-amber-500');
    });

    it('should return slate for low progress (< 25)', () => {
      expect(getProgressColor(0)).toBe('bg-slate-400');
      expect(getProgressColor(24)).toBe('bg-slate-400');
      expect(getProgressColor(10)).toBe('bg-slate-400');
    });
  });

  describe('getUniqueStatuses', () => {
    it('should extract unique statuses in order of first occurrence', () => {
      const items = [
        { status: 'In Progress' },
        { status: 'Done' },
        { status: 'In Progress' },
        { status: 'Blocked' },
        { status: 'Done' },
      ];
      const result = getUniqueStatuses(items);
      expect(result).toEqual(['In Progress', 'Done', 'Blocked']);
    });

    it('should handle empty array', () => {
      const result = getUniqueStatuses([]);
      expect(result).toEqual([]);
    });

    it('should handle single item', () => {
      const result = getUniqueStatuses([{ status: 'Done' }]);
      expect(result).toEqual(['Done']);
    });

    it('should work with Map values', () => {
      const map = new Map([
        ['1', { status: 'A' }],
        ['2', { status: 'B' }],
        ['3', { status: 'A' }],
      ]);
      const result = getUniqueStatuses(map.values());
      expect(result).toEqual(['A', 'B']);
    });
  });

  describe('typeColors', () => {
    it('should have colors for all item types', () => {
      const types = ['mission', 'problem', 'solution', 'design', 'project'] as const;
      for (const type of types) {
        expect(typeColors[type]).toHaveProperty('bg');
        expect(typeColors[type]).toHaveProperty('text');
        expect(typeColors[type]).toHaveProperty('border');
        expect(typeColors[type]).toHaveProperty('icon');
      }
    });
  });

  describe('priorityColors', () => {
    it('should have colors for all priorities', () => {
      const priorities = ['P0', 'P1', 'P2', 'P3'] as const;
      for (const priority of priorities) {
        expect(priorityColors[priority]).toHaveProperty('bg');
        expect(priorityColors[priority]).toHaveProperty('text');
        expect(priorityColors[priority]).toHaveProperty('border');
      }
    });

    it('should have red for P0 (critical)', () => {
      expect(priorityColors.P0.bg).toContain('red');
    });
  });

  describe('typeLabels', () => {
    it('should have labels for all item types', () => {
      expect(typeLabels.mission).toBe('Mission');
      expect(typeLabels.problem).toBe('Problem');
      expect(typeLabels.solution).toBe('Solution');
      expect(typeLabels.design).toBe('Design');
      expect(typeLabels.project).toBe('Project');
    });
  });

  describe('priorityLabels', () => {
    it('should have labels for all priorities', () => {
      expect(priorityLabels.P0).toBe('Critical');
      expect(priorityLabels.P1).toBe('High');
      expect(priorityLabels.P2).toBe('Medium');
      expect(priorityLabels.P3).toBe('Low');
    });
  });
});
