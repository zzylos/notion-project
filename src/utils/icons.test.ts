import { describe, it, expect } from 'vitest';
import { typeIcons, getTypeIcon } from './icons';
import { Target, AlertCircle, Lightbulb, Palette, FolderKanban } from 'lucide-react';
import type { ItemType } from '../types';

describe('typeIcons', () => {
  it('should have an icon for each item type', () => {
    const itemTypes: ItemType[] = ['mission', 'problem', 'solution', 'design', 'project'];

    for (const type of itemTypes) {
      expect(typeIcons[type]).toBeDefined();
    }
  });

  it('should map correct icons to types', () => {
    expect(typeIcons.mission).toBe(Target);
    expect(typeIcons.problem).toBe(AlertCircle);
    expect(typeIcons.solution).toBe(Lightbulb);
    expect(typeIcons.design).toBe(Palette);
    expect(typeIcons.project).toBe(FolderKanban);
  });
});

describe('getTypeIcon', () => {
  it('should return correct icon for mission type', () => {
    expect(getTypeIcon('mission')).toBe(Target);
  });

  it('should return correct icon for problem type', () => {
    expect(getTypeIcon('problem')).toBe(AlertCircle);
  });

  it('should return correct icon for solution type', () => {
    expect(getTypeIcon('solution')).toBe(Lightbulb);
  });

  it('should return correct icon for design type', () => {
    expect(getTypeIcon('design')).toBe(Palette);
  });

  it('should return correct icon for project type', () => {
    expect(getTypeIcon('project')).toBe(FolderKanban);
  });

  it('should return a valid React component', () => {
    const Icon = getTypeIcon('mission');
    // Lucide icons are ForwardRef objects, not plain functions
    // Just verify it's defined and matches the expected icon
    expect(Icon).toBeDefined();
    expect(Icon).toBe(Target);
  });
});
