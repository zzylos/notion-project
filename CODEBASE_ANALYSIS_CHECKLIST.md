# Codebase Analysis Checklist

> Generated: 2025-12-22
> Total Issues: 44 (2 Critical, 3 High, 23 Medium, 16 Low)

---

## 🔴 Critical Issues (2)

### Security
- [ ] **API Key Exposure via CORS Proxy** - `src/services/notionService.ts:53-64`
  - API key is sent through third-party CORS proxy (corsproxy.io), exposing it to that service
  - **Fix**: For production, use a backend proxy to keep API keys server-side

### Race Conditions
- [ ] **Race Condition in notionService Cache** - `src/services/notionService.ts:527-533`
  - Multiple simultaneous `fetchAllItems` calls could race on the cache
  - **Fix**: Add a pending request tracker to prevent duplicate in-flight requests

---

## 🟠 High Issues (3)

### React Infinite Loop Risks
- [ ] **Potential Infinite Loop in CanvasView useEffect** - `src/components/canvas/CanvasView.tsx:98`
  - `setNodes` and `setEdges` from `useNodesState` in dependencies could cause infinite loops
  - **Fix**: Remove `setNodes` and `setEdges` from dependencies (they're stable from React Flow hooks)

- [ ] **Missing useCallback Dependency in CanvasView** - `src/components/canvas/CanvasView.tsx:114-123`
  - `handleResetLayout` depends on frequently-changing `filteredItems` and `selectedItemId`
  - **Fix**: Use `useCallback` with proper dependencies and memoize filteredItems upstream

### Logic Bugs
- [ ] **Division by Zero Risk in layoutCalculator** - `src/utils/layoutCalculator.ts:65`
  - `avgChildX = childXSum / childCount` lacks validation that childCount > 0
  - **Fix**: Add guard: `if (childCount === 0) return x;`

---

## 🟡 Medium Issues (23)

### Type Safety (4)
- [ ] **Loose Type in loadData Parameter** - `src/App.tsx:45`
  - Uses `typeof notionConfig` which can be error-prone
  - **Fix**: Change to `config: NotionConfig | null`

- [ ] **Missing Type Guard in notionService** - `src/services/notionService.ts:5-29`
  - `NotionPropertyValue` type is incomplete (missing `rollup`, `last_edited_by`, etc.)
  - **Fix**: Expand union type to include all Notion property value types

- [ ] **Implicit Any in Zustand Store Computed Methods** - `src/store/useStore.ts:211-415`
  - `getTreeNodes`, `getFilteredItems`, `getStats` lack explicit return type annotations
  - **Fix**: Add explicit return types: `getTreeNodes: (): TreeNode[] => { ... }`

- [ ] **Missing Type Guard in store updateItem** - `src/store/useStore.ts:105`
  - `updateItem` doesn't verify item exists before updating
  - **Fix**: Add early return if item doesn't exist

### React Issues (4)
- [ ] **Circular Dependency in useFetch Hook** - `src/hooks/useFetch.ts:50`
  - `createNew` depends on `abort` which is recreated each render
  - **Fix**: Use `useCallback` for `abort` without dependencies

- [ ] **Missing Cleanup in useLocalStorage Hook** - `src/hooks/useLocalStorage.ts:57`
  - `storedValue` in dependencies causes frequent callback recreation
  - **Fix**: Use a ref instead of including storedValue in dependencies

- [ ] **Missing Null Check in ListView** - `src/components/views/ListView.tsx:41-84`
  - Missing null check for virtualized `item` at line 42
  - **Fix**: Add `if (!item) return null;` before rendering

- [ ] **Memory Leak Potential in App Component** - `src/App.tsx:97-101`
  - `expandTimeoutRef` could accumulate if `loadData` called rapidly
  - **Fix**: Track all timeout references in a ref Map

### Logic Bugs (5)
- [ ] **Inefficient Array Spread in TimelineView** - `src/components/views/TimelineView.tsx:10`
  - `[...items].sort()` creates new array on every render
  - **Fix**: Wrap in useMemo: `useMemo(() => [...items].sort(...), [items])`

- [ ] **Missing Parent Validation in notionService** - `src/services/notionService.ts:413`
  - `parentId: parentRelations[0]` assumes array is not empty
  - **Fix**: `parentId: parentRelations.length > 0 ? parentRelations[0] : undefined`

- [ ] **No Validation of dueDate Format** - `src/components/views/TimelineView.tsx:12`
  - `new Date(item.dueDate)` could throw on invalid string
  - **Fix**: Add try-catch or date validation utility

- [ ] **Unsafe notionUrl Validation** - `src/components/common/DetailPanel.tsx:340`
  - Only checks if URL includes 'notion.so', doesn't validate proper URL format
  - **Fix**: Use URL constructor: `try { new URL(item.notionUrl); }`

- [ ] **Insufficient URL Validation (Security)** - `src/components/common/DetailPanel.tsx:340`
  - Simple string contains check could be XSS vector
  - **Fix**: Validate hostname: `new URL(item.notionUrl).hostname.endsWith('notion.so')`

### Performance Issues (5)
- [ ] **Redundant Status Calculations in StatsOverview** - `src/components/common/StatsOverview.tsx:19-46`
  - `inProgressCount` and `completedCount` iterate over `stats.byStatus` twice
  - **Fix**: Combine into single useMemo returning an object

- [ ] **Inefficient Status Array Creation in FilterPanel** - `src/components/filters/FilterPanel.tsx:20-23`
  - Status array creation with spread/Set happens every render
  - **Fix**: Ensure useMemo dependencies are correct: `[items]` only

- [ ] **Unnecessary Re-renders in CanvasView** - `src/components/canvas/CanvasView.tsx:80-111`
  - Multiple useEffect hooks updating state could cause cascading re-renders
  - **Fix**: Batch setNodes and setEdges calls together

- [ ] **TreeNode Memoization Not Effective** - `src/components/tree/TreeNode.tsx:18`
  - `onNodeClick` prop recreated every TreeView render, defeats memo benefit
  - **Fix**: Wrap `onNodeClick` handler in useCallback in TreeView

- [ ] **Unoptimized KanbanView Status Ordering** - `src/components/views/KanbanView.tsx:10-23`
  - Status ordering creates new arrays on every render
  - **Fix**: Ensure dependency array is limited to `[allItems]`

### Error Handling (5)
- [ ] **Unhandled Progress Callback Errors** - `src/App.tsx:70-87`
  - `onProgress` callback invoked without error handling
  - **Fix**: Wrap in try-catch: `try { onProgress?.(...) } catch (e) { console.error(...) }`

- [ ] **Network Error Handling in notionService** - `src/services/notionService.ts:148-151`
  - Only handles HTTP errors, not network failures/timeouts/CORS issues
  - **Fix**: Add specific handling: `if (error instanceof TypeError)`

- [ ] **Incomplete Error Context in notionService** - `src/services/notionService.ts:570`
  - Error logging doesn't include database context that failed
  - **Fix**: Include `dbConfig.type` in error log

- [ ] **No Validation of JSON Parse Results** - `src/services/notionService.ts:98-104`
  - Parsed JSON not validated for expected fields
  - **Fix**: Add field existence checks after parsing

- [ ] **Generic Error Messages** - `src/App.tsx:108`
  - Error message doesn't inform user of actual problem
  - **Fix**: Include error: `` setError(`Failed to load: ${error.message}`) ``

---

## 🟢 Low Issues (16)

### Type Safety (2)
- [ ] **Unsafe Type Assertion in DetailPanel** - `src/components/common/DetailPanel.tsx:304`
  - `React.createElement(typeIcons[parent.type], ...)` could fail if type invalid
  - **Fix**: Validate parent.type before using as key

- [ ] **Unsafe Optional Children Access** - `src/components/common/DetailPanel.tsx:54-56`
  - Children could theoretically be null despite type guard
  - **Fix**: Use `children?.filter(...)?.map(...) || []`

### Code Quality (7)
- [ ] **Excessive React.createElement Usage** - `src/components/common/DetailPanel.tsx:304`
  - Using `React.createElement` instead of JSX is less readable
  - **Fix**: Use JSX syntax: `<ParentIcon className={...} />`

- [ ] **Duplicate Status Checking Logic** - `src/components/tree/TreeNode.tsx:40`
  - `getStatusCategory` called twice when could be calculated once
  - **Fix**: Extract to const: `const statusCategory = getStatusCategory(item.status);`

- [ ] **Unused Variable in notionService** - `src/services/notionService.ts:414`
  - `children: []` initialized but never used
  - **Fix**: Remove or populate from relationships

- [ ] **Magic Numbers in Components** - `src/components/tree/TreeNode.tsx:24`
  - `level * 24` hardcodes indent value
  - **Fix**: Use constant: `const indentPx = level * TREE.INDENT_PX;`

- [ ] **Missing Error Boundary for ListView** - `src/components/views/ListView.tsx:6`
  - Could crash if virtualization fails
  - **Fix**: Wrap with ErrorBoundary in parent component

- [ ] **Inconsistent Date Formatting** - `TimelineView.tsx:47`, `DetailPanel.tsx:227-232`
  - Different date formatting in different components
  - **Fix**: Centralize in dateUtils.ts

- [ ] **Missing Pagination Info Display** - `src/components/views/ListView.tsx:88-92`
  - Pagination footer only shows for 100+ items
  - **Fix**: Always show item count in header

### Accessibility (1)
- [ ] **Missing Accessibility Labels** - `src/components/tree/TreeNode.tsx:56`
  - Expand/collapse button lacks aria-label
  - **Fix**: Add `aria-label={isExpanded ? "Collapse" : "Expand"}`

### Security (1)
- [ ] **Missing rel Attribute for External Links** - `src/components/tree/TreeNode.tsx:148-158`
  - External links use `target="_blank"` - verify `rel="noopener noreferrer"` is present
  - **Fix**: Verify all external links have proper rel attributes

### Misc (5)
- [ ] **Unsafe Optional Chaining in DetailPanel** - `src/components/common/DetailPanel.tsx:54-56`
  - Filter result not thoroughly validated
  - **Fix**: Add validation for `c.id` existence

- [ ] **Missing useCallback in TreeView** - `src/components/tree/TreeView.tsx:24`
  - `onNodeClick` handler recreated on every render
  - **Fix**: Wrap in useCallback

- [ ] **Unused expandToItem in DetailPanel** - `src/components/common/DetailPanel.tsx:30`
  - Function extracted but never used on initial render
  - **Note**: Appears intentional for on-demand navigation

- [ ] **Inconsistent Export Patterns** - Various files
  - Some use default exports, others named exports
  - **Fix**: Standardize export pattern across codebase

- [ ] **Missing JSDoc Comments** - Service and utility files
  - Complex functions lack documentation
  - **Fix**: Add JSDoc for public APIs

---

## Summary by Category

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 1 | 0 | 1 | 1 | 3 |
| Race Conditions | 1 | 0 | 0 | 0 | 1 |
| React Issues | 0 | 2 | 4 | 2 | 8 |
| Type Safety | 0 | 0 | 4 | 2 | 6 |
| Logic Bugs | 0 | 1 | 4 | 0 | 5 |
| Performance | 0 | 0 | 5 | 0 | 5 |
| Error Handling | 0 | 0 | 5 | 1 | 6 |
| Code Quality | 0 | 0 | 0 | 7 | 7 |
| Accessibility | 0 | 0 | 0 | 1 | 1 |
| Misc | 0 | 0 | 0 | 2 | 2 |

---

## Recommended Priority Order

1. **First**: Fix Critical issues (security and race conditions)
2. **Second**: Fix High issues (infinite loops and division by zero)
3. **Third**: Fix Medium React issues (memory leaks, missing deps)
4. **Fourth**: Fix Medium type safety and logic bugs
5. **Fifth**: Performance optimizations
6. **Last**: Low priority code quality and accessibility improvements

---

## Quick Wins (Easy Fixes)

These can be fixed quickly with minimal risk:
- [ ] Add null checks in ListView
- [ ] Add aria-labels for accessibility
- [ ] Extract duplicate `getStatusCategory` calls
- [ ] Wrap `onNodeClick` in useCallback
- [ ] Add useMemo to TimelineView sort
- [ ] Improve error messages with actual error details
