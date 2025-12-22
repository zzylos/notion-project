# Codebase Refactoring Checklist

A comprehensive checklist of refactoring and cleanup tasks identified through codebase analysis.

**Total Issues Identified: 92**

---

## Phase 1: Quick Wins (Low Effort, High Impact)

### Extract Duplicated Code to Shared Utilities

- [x] **Extract `typeIcons` object** - ✅ Created `src/utils/icons.ts`
  - Updated all 5 components to use shared utility

- [x] **Centralize default property mappings** - ✅ Moved to `src/constants.ts`
  - NotionConfigModal now imports from constants

### Create Shared UI Components

- [x] **Create `<StatusBadge />` component** - ✅ `src/components/ui/StatusBadge.tsx`
  - Supports size variants, optional label, animation for in-progress

- [x] **Create `<ProgressBar />` component** - ✅ `src/components/ui/ProgressBar.tsx`
  - Supports size variants, optional label

- [x] **Create `<OwnerAvatar />` component** - ✅ `src/components/ui/OwnerAvatar.tsx`
  - Supports size variants, optional name/email display

- [x] **Create `isOverdue()` utility function** - ✅ `src/utils/dateUtils.ts`
  - Also added `formatDate()` and `getRelativeTime()` helpers

### Move Hardcoded Values to Constants

- [x] **Create centralized constants file** at `src/constants.ts` ✅
  - [x] Canvas layout dimensions (CANVAS.HORIZONTAL_SPACING, etc.)
  - [x] Cache timeout (NOTION.CACHE_TIMEOUT)
  - [x] Max tree depth (TREE.MAX_DEPTH)
  - [x] Pagination page size (NOTION.PAGE_SIZE)
  - [x] View modes list (VIEW_MODES)

### Remove Unused Code

- [x] **Removed `getStatusColorByIndex()`** - ✅ Deleted from colors.ts
- [x] **Removed `statusLabels` legacy export** - ✅ Deleted from colors.ts
- [x] **Removed `statusHexColors`** - ✅ Deleted from colors.ts
- [x] **Removed `dynamicColorPalette`** - ✅ Was only used by removed function
- [x] **Review `assignees` field in WorkItem** - ✅ Added JSDoc documentation, kept for future multi-assignee support
- [x] **Review `dependencies` field** - ✅ Added JSDoc documentation, kept for future dependency tracking feature
- [x] **Verify all lucide-react imports are used** - ✅ Verified all imports are used in NotionConfigModal

---

## Phase 2: High Impact Refactoring

### Split Large Components

- [x] **Refactor `NotionConfigModal.tsx`** (461 → ~300 lines) ✅
  - [x] Extract `<ApiKeySection />` - `src/components/common/modal/ApiKeySection.tsx`
  - [x] Extract `<DatabaseConfigSection />` - `src/components/common/modal/DatabaseConfigSection.tsx`
  - [x] Extract `<PropertyMappingsSection />` - `src/components/common/modal/PropertyMappingsSection.tsx`

- [x] **Refactor `CanvasView.tsx`** (381 → 200 lines, -47%) ✅
  - [x] Extract `calculateLayout()` to `src/utils/layoutCalculator.ts`
  - [x] Extract `<CanvasLegend />` - `src/components/canvas/CanvasLegend.tsx`
  - [x] Extract `<CanvasControls />` - `src/components/canvas/CanvasControls.tsx`

- [ ] **Refactor `DetailPanel.tsx`** (369 lines)
  - [ ] Extract `<DetailHeader />`
  - [ ] Extract `<StatusSection />`
  - [ ] Extract `<RelationshipsSection />`
  - [ ] Extract `<MetadataSection />`
  - Target: Main component ~80 lines

- [ ] **Refactor `notionService.ts`** (618 lines)
  - [ ] Extract `src/services/extractors/propertyExtractor.ts`
  - [ ] Extract `src/services/extractors/workItemBuilder.ts`
  - [ ] Extract `src/utils/propertyFinder.ts`
  - Target: Main service ~150 lines

### Simplify Complex Functions

- [x] **Refactor `findProperty()` in notionService.ts** ✅
  - Centralized property aliases to `src/constants.ts` (PROPERTY_ALIASES)
  - Updated getPropertyAliases to use centralized config

- [x] **Refactor `getStatusCategory()` in colors.ts** ✅
  - Replaced 60+ lines of nested if-includes with STATUS_CATEGORY_KEYWORDS mapping object
  - Added caching for performance (statusCategoryCache)
  - Added comprehensive JSDoc documentation

- [x] **Document and simplify `getTreeNodes()` in useStore.ts** ✅
  - Added comprehensive JSDoc with algorithm overview
  - Documented safety features (cycle detection, depth limiting)
  - Added inline comments for buildTree helper

### Improve Error Handling

- [x] **Add specific Notion API error parsing** - ✅ Added `parseNotionError()` method
  - Parses 401 (auth), 403 (access), 404 (not found), 429 (rate limit), 500+ (server errors)
  - Returns user-friendly, actionable error messages

- [ ] **Add error boundaries to view components**
  - KanbanView, ListView, TimelineView assume valid data
  - Add validation or error boundaries

- [ ] **Add debug logging for property extraction fallbacks** - `notionService.ts` (lines 239-258)
  - Silent fallbacks make debugging difficult

- [ ] **Improve modal submission error messages** - `NotionConfigModal.tsx` (lines 129-186)
  - Show specific validation errors per database

- [ ] **Handle fullscreen API errors gracefully** - `CanvasView.tsx` (lines 187-189)
  - Show notification when fullscreen unavailable

- [ ] **Distinguish abort vs real errors** - `App.tsx` (lines 103-109)
  - Check `error.name === 'AbortError'` before showing failure

---

## Phase 3: Code Organization & Patterns

### Create Custom Hooks

- [x] **Create `src/hooks/` directory** ✅ with:
  - [x] `useTimeout.ts` - Managed timeout with automatic cleanup
  - [x] `useFetch.ts` - AbortController management for fetch operations
  - [x] `useDataChanged.ts` - Track when data key changes (avoids infinite loops)
  - [x] `useLocalStorage.ts` - Type-safe localStorage with JSON serialization
  - [x] `index.ts` - Barrel export for all hooks

### Standardize Patterns

- [x] **Standardize date formatting** ✅
  - Already had `formatDate(date, format)` utility in `src/utils/dateUtils.ts`

- [x] **Standardize loading/empty states** ✅
  - [x] Created `<EmptyState />` - `src/components/ui/EmptyState.tsx`
  - [x] Created `<LoadingState />` - `src/components/ui/LoadingState.tsx`
  - Supports variants (default, search, filter, data) and sizes (sm, md, lg)

- [ ] **Standardize callback patterns**
  - TreeView uses optional callbacks, KanbanView uses direct state mutation
  - Ensure consistent component interfaces

- [x] **Create generic `toggleArrayItem()` utility** ✅
  - Created `src/utils/arrayUtils.ts` with toggleArrayItem, includesItem, unique

### Reorganize File Structure

- [ ] **Split `colors.ts`** (272 lines) into:
  - `src/utils/colors/colors.ts` - Color definitions
  - `src/utils/colors/statusColors.ts` - Status-specific colors
  - `src/utils/colors/typeColors.ts` - Type-specific colors
  - `src/utils/labels/index.ts` - All label mappings

- [x] **Create `/components/ui/` directory** ✅ for UI primitives:
  - [x] StatusBadge.tsx - Dynamic status badge with animation
  - [x] ProgressBar.tsx - Progress visualization
  - [x] OwnerAvatar.tsx - Avatar with fallback
  - [x] EmptyState.tsx - Empty state messaging
  - [x] LoadingState.tsx - Loading indicators
  - [x] index.ts - Barrel export

---

## Phase 4: Performance Optimization

- [ ] **Optimize items storage** - `useStore.ts` (line 237)
  - Items stored as Map but repeatedly converted to Array
  - Consider storing as array with index Map for O(1) lookups

- [ ] **Memoize `getTreeNodes()` calls**
  - Currently computed on every store access
  - Add memoization at call sites

- [ ] **Memoize DetailPanel path calculation** - `DetailPanel.tsx` (line 58)
  - `getItemPath()` called on every render
  - Use `useMemo` with `selectedItemId` dependency

- [ ] **Pre-compute status colors** - `colors.ts` (lines 124-137)
  - Cache works but computed on each call
  - Pre-compute during app initialization

- [ ] **Optimize CanvasView layout triggers** - `CanvasView.tsx` (lines 201-224)
  - Layout recalculated when `selectedItemId` changes
  - Only recalculate on data changes, not selection changes

- [ ] **Consider debounced persistence** - `useStore.ts` (lines 369-386)
  - Full Set/Map serialized on every change
  - Add debounce to reduce JSON.stringify overhead

---

## Phase 5: Accessibility Fixes

### Missing Labels & Text

- [ ] **Add alt text to avatar elements**
  - TreeNode (lines 134-141) - missing alt/title
  - Add `title` attribute to all avatar divs

- [x] **Add aria-labels to icon-only buttons** - `CanvasControls.tsx` ✅
  - Added `aria-label` to Reset Layout and Fullscreen buttons

- [x] **Add label to search field** - `FilterPanel.tsx` ✅
  - Added hidden `<label>` with `sr-only` class
  - Added `aria-label` to search input

### Modal Accessibility

- [x] **Improve modal accessibility** - `NotionConfigModal.tsx` ✅ (partial)
  - Added `aria-label` to API key input
  - Added `aria-invalid` to database inputs
  - TODO: Add full focus trap and ESC key

### Keyboard Navigation

- [x] **Add visible focus indicators** - `FilterPanel.tsx` ✅
  - Added `focus:ring-2 focus:ring-blue-500` to all filter buttons
  - Added `focus:ring-offset-1` for better visibility

- [x] **Make filter buttons keyboard navigable** - `FilterPanel.tsx` ✅
  - Changed filter groups to `<fieldset>` with `<legend>`
  - Added `aria-pressed` state to toggle buttons
  - Added `role="group"` with `aria-label` to button groups

- [ ] **Make Kanban cards keyboard accessible** - `KanbanView.tsx`

---

## Phase 6: TypeScript Improvements

- [ ] **Complete `NotionPropertyValue` type** - `notionService.ts` (lines 12-28)
  - Add missing types: `url`, `rollup`, etc.

- [ ] **Use shared Owner type consistently**
  - FilterPanel (line 43) uses inline object type
  - Always import from `src/types/index.ts`

- [x] **Add explicit return types to helper functions** ✅
  - Added return type to getTreeNodes(): TreeNode[]

- [ ] **Add stricter filter state types** - `types/index.ts` (lines 56-67)
  - Use `readonly ItemType[]` instead of `ItemType[]`

- [x] **Add comprehensive JSDoc to DatabaseConfig type** ✅
  - Added detailed JSDoc with @example to DatabaseConfig
  - Added JSDoc to PropertyMappings, NotionConfig, all types

---

## Phase 7: Documentation

- [ ] **Document `calculateLayout()` algorithm** - `layoutCalculator.ts`
  - Add JSDoc with pseudocode explaining tree layout algorithm

- [ ] **Document property extraction strategies** - `notionService.ts` (lines 175-224)
  - `findProperty()` has 5 fallback strategies with no comments

- [x] **Document status categorization logic** - `colors.ts` ✅
  - Added JSDoc to STATUS_CATEGORY_KEYWORDS mapping
  - Added comprehensive JSDoc to getStatusCategory() with @example

- [x] **Add JSDoc to key functions** ✅
  - [x] `getTreeNodes()` - Added algorithm overview, safety features, performance notes
  - [ ] `pageToWorkItem()` - transformation logic
  - [ ] `buildRelationships()` - orphaned item handling

- [ ] **Document configuration system** - `config.ts`
  - Env variable names and precedence

- [x] **Add field-level comments to types** - `types/index.ts` ✅
  - Added JSDoc to all WorkItem fields
  - Added JSDoc to Owner, TreeNode, FilterState, DatabaseConfig, PropertyMappings, NotionConfig
  - Documented deprecated fields

---

## Phase 8: Testing

### Unit Tests

- [ ] **Test notionService**
  - Property extraction logic
  - Cache behavior
  - Error handling

- [ ] **Test store mutations** - `useStore.ts`
  - `getTreeNodes()` logic
  - Circular reference detection
  - Filter calculations

- [ ] **Test utility functions**
  - `colors.ts` - status categorization
  - Date utilities
  - Layout calculations

### Component Tests

- [ ] **Test view components render correctly**
  - TreeView, CanvasView, KanbanView, ListView, TimelineView

- [ ] **Test filter interactions** - `FilterPanel.tsx`

- [ ] **Test error states display**

### Integration Tests

- [ ] **Test data flow**: Notion API → Store → Views
- [ ] **Test filter combinations**
- [ ] **Test view switching**

### E2E Tests

- [ ] **Test Notion connection flow**
- [ ] **Test demo data flow**
- [ ] **Test full user workflow**

---

## Summary by Priority

| Priority | Category | Issue Count | Effort |
|----------|----------|-------------|--------|
| 🔴 High | Code Duplication | 8 | Medium |
| 🔴 High | Complex Functions | 5 | High |
| 🔴 High | Large Components | 4 | High |
| 🔴 High | Error Handling | 6 | Medium |
| 🔴 High | Testing Gaps | 5 | Very High |
| 🟡 Medium | Inconsistent Patterns | 6 | Medium |
| 🟡 Medium | State Issues | 4 | Medium |
| 🟡 Medium | Performance | 7 | Medium |
| 🟡 Medium | Organization | 3 | High |
| 🟡 Medium | Accessibility | 7 | Medium |
| 🟡 Medium | Missing Types | 5 | Low |
| 🟡 Medium | Documentation | 7 | Low |
| 🟢 Low | Unused Code | 7 | Low |
| 🟢 Low | Hardcoded Values | 7 | Low |

**Recommended Order**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
