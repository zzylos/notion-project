import { describe, it, expect } from 'vitest';
import { typeIcons } from './icons';
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
