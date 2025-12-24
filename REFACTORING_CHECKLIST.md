# Codebase Refactoring Checklist

This document outlines areas identified for refactoring and cleanup, organized by priority.

## Priority 1: High (Code Quality & Bugs)

### 1.1 Duplicate Methods in NotionPropertyMapper

- **File**: `src/services/notion/NotionPropertyMapper.ts`
- **Issue**: `extractSelect()` and `extractStatus()` methods have identical implementations
- **Fix**: Refactored `extractStatus` to call `extractSelect` internally, eliminating duplication
- **Status**: [x] Completed

### 1.2 Magic Numbers

- **Files**: `server/src/services/cache.ts`, `shared/constants.ts`
- **Issue**: Hardcoded values scattered throughout codebase
- **Fix**: Added `CACHE.FORCE_REFRESH_MAX_WAIT_MS` and `CACHE.REFRESH_POLL_INTERVAL_MS` to shared constants
- **Status**: [x] Completed

### 1.3 Server Logging Inconsistency

- **File**: `server/src/services/cache.ts`, `server/src/utils/logger.ts`
- **Issue**: Used `console.log/info/warn/error` instead of a centralized logger
- **Fix**: Created `server/src/utils/logger.ts` with `createLogger()` utility, updated cache.ts to use `logger.cache`
- **Status**: [x] Completed

## Priority 2: Medium (Consistency & Maintainability)

### 2.1 Complex IIFE Pattern in getFilteredItems

- **File**: `src/store/useStore.ts`
- **Issue**: `getFilteredItems` uses an IIFE (`(() => {...})()`) for `matchesFilters` which reduces readability
- **Fix**: Extracted to a separate `itemMatchesFilters()` helper function
- **Status**: [x] Completed

### 2.2 Missing Barrel Exports

- **Directories**: `src/components/*/`
- **Issue**: Components not re-exported from index files
- **Finding**: Barrel exports already exist for all component directories
- **Status**: [x] Already Complete

### 2.3 Unused Exports & Dead Code

- **Files**: `src/utils/colors.ts`
- **Issue**: Some exported functions/types may not be used
- **Fix**: Added `@deprecated` JSDoc tags to `statusColors` and `getStatusLabel` (kept for backwards compatibility)
- **Status**: [x] Completed

### 2.4 Inconsistent Type Imports

- **Files**: Various components
- **Issue**: Mix of `import type` and regular imports for types
- **Finding**: Already using `import type` consistently throughout the codebase
- **Status**: [x] Already Complete

## Priority 3: Low (Minor Improvements)

### 3.1 Add Missing TypeScript Strictness

- **Files**: Various
- **Issue**: Some places use implicit `any` or could benefit from stricter typing
- **Finding**: No `any` types or `@ts-ignore` comments found in source code
- **Status**: [x] Already Complete

### 3.2 Documentation Consistency

- **Files**: Various
- **Issue**: Some functions have JSDoc, others don't
- **Status**: [ ] Future improvement

### 3.3 Test Coverage Gaps

- **Areas**:
  - Server-side code (`server/src/`) has no visible tests
  - Some UI components lack integration tests
- **Status**: [ ] Future improvement

### 3.4 Component Props Interface Naming

- **Files**: Various components
- **Issue**: Some use `Props` suffix, others use component name + `Props`
- **Status**: [ ] Future improvement

---

## Summary of Changes Made

1. **NotionPropertyMapper.ts**: Refactored duplicate `extractSelect`/`extractStatus` methods
2. **shared/constants.ts**: Added `CACHE` constants for timeout values
3. **server/src/services/cache.ts**: Updated to use shared constants and new logger
4. **server/src/utils/logger.ts**: Created server-side logger utility
5. **src/store/useStore.ts**: Extracted IIFE into `itemMatchesFilters()` helper function
6. **src/utils/colors.ts**: Added deprecation notices to unused exports

## Verification

All changes verified with:

- `npm run typecheck` - TypeScript checks pass
- `npm run test:run` - All 338 tests pass
- `npm run lint` - No errors (1 pre-existing warning about TanStack Virtual)

---

## Notes

### What NOT to Change

The following patterns are intentional and should not be "fixed":

- LRU cache pattern in `colors.ts` (prevents memory leaks)
- Lazy loading of heavy components in `App.tsx` (performance optimization)
- IIFE for STATUS_TO_GROUP Map creation in `constants.ts` (one-time computation)
- Error boundary usage patterns (intentional isolation)

### Code Quality Metrics (After)

- Frontend LOC: ~6,982
- Test LOC: ~4,057
- Test Coverage: 50%+ threshold
- ESLint errors: 0
- ESLint warnings: 1 (pre-existing TanStack Virtual warning)
- TypeScript strict mode: enabled
