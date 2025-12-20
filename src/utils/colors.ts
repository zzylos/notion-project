import type { ItemStatus, ItemType, Priority } from '../types';

// Status colors
export const statusColors: Record<ItemStatus, { bg: string; text: string; border: string; dot: string }> = {
  'not-started': {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
  },
  'in-progress': {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  'blocked': {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    dot: 'bg-red-500',
  },
  'in-review': {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  'completed': {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    dot: 'bg-green-500',
  },
};

// Type colors
export const typeColors: Record<ItemType, { bg: string; text: string; border: string; icon: string }> = {
  'mission': {
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    border: 'border-violet-300',
    icon: 'text-violet-600',
  },
  'problem': {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: 'text-red-600',
  },
  'solution': {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: 'text-blue-600',
  },
  'design': {
    bg: 'bg-fuchsia-100',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-300',
    icon: 'text-fuchsia-600',
  },
  'project': {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-300',
    icon: 'text-cyan-600',
  },
};

// Priority colors
export const priorityColors: Record<Priority, { bg: string; text: string; border: string }> = {
  'P0': {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-400',
  },
  'P1': {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-400',
  },
  'P2': {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-400',
  },
  'P3': {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
  },
};

// Get status label
export const statusLabels: Record<ItemStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  'blocked': 'Blocked',
  'in-review': 'In Review',
  'completed': 'Completed',
};

// Get type label
export const typeLabels: Record<ItemType, string> = {
  'mission': 'Mission',
  'problem': 'Problem',
  'solution': 'Solution',
  'design': 'Design',
  'project': 'Project',
};

// Get priority label
export const priorityLabels: Record<Priority, string> = {
  'P0': 'Critical',
  'P1': 'High',
  'P2': 'Medium',
  'P3': 'Low',
};

// Progress bar color based on completion
export const getProgressColor = (progress: number): string => {
  if (progress >= 80) return 'bg-green-500';
  if (progress >= 50) return 'bg-blue-500';
  if (progress >= 25) return 'bg-amber-500';
  return 'bg-slate-400';
};

// SVG colors for tree lines (hex values)
export const statusHexColors: Record<ItemStatus, string> = {
  'not-started': '#94a3b8',
  'in-progress': '#3b82f6',
  'blocked': '#ef4444',
  'in-review': '#f59e0b',
  'completed': '#22c55e',
};

export const typeHexColors: Record<ItemType, string> = {
  'mission': '#7c3aed',
  'problem': '#dc2626',
  'solution': '#2563eb',
  'design': '#d946ef',
  'project': '#0891b2',
};
