# Codebase Refactoring Checklist

> Generated: 2024-12-24
> Status: In Progress

## Overview

This checklist tracks refactoring and cleanup tasks for the Notion Opportunity Tree Visualizer codebase. Tasks are organized by priority level.

---

## Phase 1: Critical (Blocks Maintainability)

### Component Complexity

- [x] **Split FilterPanel** (538 lines → 196 lines) into subcomponents:
  - [x] Extract `SearchBar`
  - [x] Extract `CollapsibleSection`
  - [x] Extract `FilterModeToggle`
  - [x] Extract `TypeFilterSection`
  - [x] Extract `StatusFilterSection`
  - [x] Extract `PriorityFilterSection`
  - [x] Extract `OwnerFilterSection`
  - [x] Extract `ActiveFiltersBar`

### Service Architecture

- [x] **Decompose NotionService** (1101 lines → ~350 lines) into focused classes:
  - [x] Extract `NotionPropertyMapper` (property extraction logic)
  - [x] Extract `NotionDataTransformer` (page → WorkItem conversion)
  - [x] Extract `NotionCacheManager` (cache/localStorage handling)
  - [x] Keep core `NotionService` for orchestration

### Code Consistency

- [x] **Replace direct console.\* calls with logger utility** (34 instances found)
  - [x] notionService.ts (14 calls)
  - [x] App.tsx (2 calls)
  - [x] useStore.ts (4 calls)
  - [x] useLocalStorage.ts (3 calls)
  - [x] config.ts (4 calls)
  - [x] CanvasView.tsx (3 calls)
  - [x] ErrorBoundary.tsx (1 call)

### Build Configuration

- [x] **Fix ESLint configuration** - verified lint command works
- [x] **Add path aliases to tsconfig.json** for cleaner imports
  - [x] Added `@/*`, `@components/*`, `@utils/*`, `@services/*`, `@hooks/*`, `@store`, `@types`
  - [x] Configured Vite resolve aliases

---

## Phase 2: High Priority (Improves Quality Significantly)

### Testing

- [x] Add component tests for large components:
  - [x] FilterPanel tests (10 tests)
  - [ ] CanvasView tests
  - [ ] DetailPanel tests
  - [ ] TreeView tests
- [x] Add store integration tests (24 tests)
- [ ] Add service tests with mocked Notion API

### Performance

- [x] Optimize `connectedItemIds` calculation in CanvasView (BFS, iterative)
- [x] Add memoization for store computed values (useStoreSelectors hooks)
- [ ] Optimize TreeView node counting

### Code Organization

- [x] Create barrel exports (index.ts) for major directories:
  - [x] src/components/index.ts
  - [x] src/components/common/index.ts
  - [x] src/components/canvas/index.ts
  - [x] src/components/tree/index.ts
  - [x] src/components/views/index.ts
  - [x] src/components/filters/index.ts
  - [x] src/utils/index.ts
  - [x] src/services/index.ts
  - [x] Updated src/components/ui/index.ts

---

## Phase 3: Medium Priority (Technical Debt)

### Type Safety

- [x] Move Notion API types from notionService.ts to types/notion.ts
- [x] Implement discriminated unions for NotionPropertyValue
- [x] Export missing types from services

### Code Deduplication

- [ ] Consolidate duplicate PROPERTY_ALIASES (client/server)
- [ ] Share Notion types between client and server

### Error Handling

- [ ] Standardize error handling patterns across services
- [ ] Use ApiError class consistently

### Validation

- [ ] Add max/min length validation for API keys
- [ ] Add batch validation helper

---

## Phase 4: Low Priority (Polish)

### Documentation & Developer Experience

- [ ] Add Storybook for component documentation
- [ ] Create component playground for testing

### Utils Reorganization

- [ ] Group related utilities into subdirectories
- [ ] Consolidate single-function files

### Monitoring

- [ ] Add performance monitoring for large datasets
- [ ] Implement error telemetry service

---

## Metrics Summary

| Metric            | Before          | After      | Target         |
| ----------------- | --------------- | ---------- | -------------- |
| FilterPanel       | 538 lines       | 196 lines  | < 200 lines ✅ |
| NotionService     | 1101 lines      | ~350 lines | < 400 lines ✅ |
| Test Files        | 3               | 5          | 15+            |
| Test Count        | ~74             | 108        | 100+ ✅        |
| Console.log Usage | 34 direct calls | 0          | 0 ✅           |
| Barrel Exports    | 3               | 10         | 10+ ✅         |

---

## Progress Log

### 2024-12-24 (Session 2)

- [x] Fixed ESLint configuration (installed missing dependencies)
- [x] Decomposed NotionService into 3 focused classes:
  - NotionPropertyMapper: Property extraction and mapping
  - NotionDataTransformer: Page to WorkItem conversion
  - NotionCacheManager: Dual-layer caching (memory + localStorage)
- [x] Created src/types/notion.ts for Notion API types
- [x] Optimized connectedItemIds in CanvasView (BFS, iterative approach)
- [x] Added memoized store selectors (useStoreSelectors hooks)
- [x] Added store integration tests (24 tests)
- [x] Added FilterPanel component tests (10 tests)
- [x] Fixed broken utility exports in src/utils/index.ts

### 2024-12-24 (Session 1)

- [x] Initial codebase analysis completed
- [x] Refactoring checklist created
- [x] Replaced all 34 console.\* calls with logger utility
- [x] Added barrel exports for all major directories (10 total)
- [x] Added path aliases to tsconfig.json and vite.config.ts
- [x] Split FilterPanel into 8 focused subcomponents
