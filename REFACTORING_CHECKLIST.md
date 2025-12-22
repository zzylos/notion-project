# Codebase Refactoring Checklist

A comprehensive checklist of refactoring and cleanup tasks identified through codebase analysis.

**Total Issues Identified: 92**

---

## Phase 1: Quick Wins (Low Effort, High Impact)

### Extract Duplicated Code to Shared Utilities

- [ ] **Extract `typeIcons` object** - Duplicated in 5 files
  - `src/components/tree/TreeNode.tsx` (lines 22-28)
  - `src/components/canvas/CanvasNode.tsx` (lines 26-32)
  - `src/components/common/DetailPanel.tsx` (lines 32-38)
  - `src/components/filters/FilterPanel.tsx` (lines 16-22)
  - `src/components/common/StatsOverview.tsx`
  - **Solution**: Create `src/utils/icons.ts`

- [ ] **Centralize default property mappings** - Duplicated in 2 files
  - `src/services/notionService.ts` (lines 157-166)
  - `src/components/common/NotionConfigModal.tsx` (lines 30-39)
  - **Solution**: Move to `src/constants.ts`

### Create Shared UI Components

- [ ] **Create `<StatusBadge />` component**
  - Status color/rendering duplicated across TreeNode, CanvasNode, DetailPanel, KanbanView
  - **Location**: `src/components/ui/StatusBadge.tsx`

- [ ] **Create `<ProgressBar />` component**
  - Progress bar rendering duplicated in 4 files
  - TreeNode (lines 124-131), CanvasNode (lines 107-120), DetailPanel (lines 183-188), ListView (lines 68-77)
  - **Location**: `src/components/ui/ProgressBar.tsx`

- [ ] **Create `<OwnerAvatar />` component**
  - Owner avatar rendering duplicated in TreeNode, CanvasNode, DetailPanel
  - **Location**: `src/components/ui/OwnerAvatar.tsx`

- [ ] **Create `isOverdue()` utility function**
  - Overdue date checking duplicated in DetailPanel (lines 232-234), TimelineView (line 33), TreeNode (line 148)
  - **Location**: `src/utils/dateUtils.ts`

### Move Hardcoded Values to Constants

- [ ] **Create centralized constants file** at `src/constants.ts`
  - [ ] Canvas layout dimensions from `CanvasView.tsx` (lines 29-32)
  - [ ] Cache timeout from `notionService.ts` (line 70)
  - [ ] Max tree depth from `useStore.ts` (line 177)
  - [ ] Pagination page size from `notionService.ts` (line 398)
  - [ ] View modes list from `Header.tsx` and `FilterPanel.tsx`

### Remove Unused Code

- [ ] **Remove or document `getStatusColorByIndex()`** - `src/utils/colors.ts` (lines 140-145)
- [ ] **Review `statusLabels` legacy export** - `src/utils/colors.ts` (lines 214-220)
- [ ] **Deprecate `statusHexColors`** - `src/utils/colors.ts` (lines 262-263)
- [ ] **Review `assignees` field in WorkItem** - `src/types/index.ts` (line 30) - populated but never displayed
- [ ] **Review `dependencies` field** - `src/types/index.ts` (line 41) - not used
- [ ] **Verify all lucide-react imports are used** - `NotionConfigModal.tsx` (line 2)

---

## Phase 2: High Impact Refactoring

### Split Large Components

- [ ] **Refactor `NotionConfigModal.tsx`** (461 lines)
  - [ ] Extract `<ApiKeySection />`
  - [ ] Extract `<DatabaseConfigSection />`
  - [ ] Extract `<PropertyMappingsSection />`
  - Target: Main component ~100 lines

- [ ] **Refactor `CanvasView.tsx`** (381 lines)
  - [ ] Extract `calculateLayout()` to `src/utils/layoutCalculator.ts`
  - [ ] Extract `<CanvasLegend />` component
  - [ ] Extract `<CanvasControls />` component
  - Target: Main component ~250 lines

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

- [ ] **Refactor `findProperty()` in notionService.ts** (lines 175-224)
  - 50 lines with 5 fallback strategies
  - Break into: `findPropertyByName()`, `findPropertyByAlias()`, `findPropertyByType()`, `findPropertyByRelation()`

- [ ] **Refactor `getStatusCategory()` in colors.ts** (lines 60-121)
  - 60+ lines with nested string includes
  - Replace with mapping object for performance

- [ ] **Document and simplify `getTreeNodes()` in useStore.ts** (lines 173-232)
  - Complex recursive function with no documentation
  - Add comprehensive JSDoc

### Improve Error Handling

- [ ] **Add specific Notion API error parsing** - `notionService.ts` (line 109)
  - Parse 401 (auth), 404 (permissions), 429 (rate limit) errors
  - Show actionable error messages to users

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

- [ ] **Create `src/hooks/` directory** with:
  - [ ] `useTimeout.ts` - Consolidate timeout ref patterns from App.tsx, CanvasView.tsx
  - [ ] `useFetch.ts` - Handle abort controller management from App.tsx
  - [ ] `useDataChanged.ts` - Consolidate prevDataKeyRef pattern from CanvasView.tsx
  - [ ] `useLocalStorage.ts` - Type-safe localStorage access

### Standardize Patterns

- [ ] **Standardize date formatting**
  - DetailPanel uses `.toLocaleDateString('en-US', {...})`
  - TimelineView uses `.toLocaleDateString()` default
  - Create `formatDate(date, format)` utility in `src/utils/dateUtils.ts`

- [ ] **Standardize loading/empty states**
  - TreeView (lines 46-52) and TimelineView (lines 21-25) have different patterns
  - Create `<EmptyState />` and `<LoadingState />` components

- [ ] **Standardize callback patterns**
  - TreeView uses optional callbacks, KanbanView uses direct state mutation
  - Ensure consistent component interfaces

- [ ] **Create generic `toggleArrayItem()` utility**
  - Filter toggle functions in FilterPanel.tsx (lines 50-84) follow same pattern
  - Location: `src/utils/arrayUtils.ts`

### Reorganize File Structure

- [ ] **Split `colors.ts`** (272 lines) into:
  - `src/utils/colors/colors.ts` - Color definitions
  - `src/utils/colors/statusColors.ts` - Status-specific colors
  - `src/utils/colors/typeColors.ts` - Type-specific colors
  - `src/utils/labels/index.ts` - All label mappings

- [ ] **Create `/components/ui/` directory** for UI primitives:
  - Badge.tsx
  - StatusBadge.tsx
  - ProgressBar.tsx
  - OwnerAvatar.tsx
  - EmptyState.tsx
  - LoadingState.tsx

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

- [ ] **Add aria-labels to icon-only buttons** - `CanvasView.tsx` (lines 344-359)
  - Add `aria-label="Reset layout"`, etc.

- [ ] **Add label to search field** - `FilterPanel.tsx` (line 100)
  - Input has placeholder but no associated `<label>`

### Modal Accessibility

- [ ] **Fix modal accessibility** - `NotionConfigModal.tsx`
  - Add `role="dialog"`, `aria-modal="true"`
  - Add focus trap
  - Add ESC key to close

### Keyboard Navigation

- [ ] **Add visible focus indicators**
  - Buttons use `:hover` but no visible `:focus` state
  - Add consistent focus ring styling

- [ ] **Make filter buttons keyboard navigable** - `FilterPanel.tsx`

- [ ] **Make Kanban cards keyboard accessible** - `KanbanView.tsx`

---

## Phase 6: TypeScript Improvements

- [ ] **Complete `NotionPropertyValue` type** - `notionService.ts` (lines 12-28)
  - Add missing types: `url`, `rollup`, etc.

- [ ] **Use shared Owner type consistently**
  - FilterPanel (line 43) uses inline object type
  - Always import from `src/types/index.ts`

- [ ] **Add explicit return types to helper functions**
  - TreeNode component, useStore helper methods
  - Improves clarity and catches errors

- [ ] **Add stricter filter state types** - `types/index.ts` (lines 56-67)
  - Use `readonly ItemType[]` instead of `ItemType[]`

- [ ] **Add comprehensive JSDoc to DatabaseConfig type**

---

## Phase 7: Documentation

- [ ] **Document `calculateLayout()` algorithm** - `CanvasView.tsx` (lines 39-157)
  - Add JSDoc with pseudocode explaining tree layout algorithm

- [ ] **Document property extraction strategies** - `notionService.ts` (lines 175-224)
  - `findProperty()` has 5 fallback strategies with no comments

- [ ] **Document status categorization logic** - `colors.ts` (lines 60-121)
  - Explain why specific keywords map to categories

- [ ] **Add JSDoc to key functions**
  - `getTreeNodes()` - recursive function
  - `pageToWorkItem()` - transformation logic
  - `buildRelationships()` - orphaned item handling

- [ ] **Document configuration system** - `config.ts`
  - Env variable names and precedence

- [ ] **Add field-level comments to types** - `types/index.ts`
  - What is notionPageId vs notionUrl?

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
