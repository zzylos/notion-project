# Bug Analysis Checklist

This checklist contains bugs and issues found during code analysis, sorted from most severe to least severe.

## Summary

| Severity | Count | Description                                           |
| -------- | ----- | ----------------------------------------------------- |
| High     | 0     | Critical bugs that cause crashes or data loss         |
| Moderate | 1     | Bugs that affect functionality but have workarounds   |
| Low      | 1     | Minor issues with minimal impact                      |
| Info     | 2     | Code quality improvements and security considerations |

---

## Bugs to Fix

### Moderate Severity

- [x] **Rate Limiter Interval Memory Leak** _(FIXED)_
  - **File:** `server/src/middleware/rateLimit.ts:23-32`
  - **Description:** The cleanup `setInterval` never calls `.unref()`, which could prevent graceful Node.js process shutdown. The process will remain alive as long as this interval is running, even if all other work is complete.
  - **Impact:** Could cause issues during server shutdown/restart in production environments.
  - **Fix:** Added `.unref()` to the interval to allow the process to exit gracefully.
  - **Comparison:** The webhook route (`server/src/routes/webhook.ts:40-42`) correctly uses `.unref()`.

### Low Severity

- [x] **Invalid Date Handling in getStats** _(FIXED)_
  - **File:** `src/store/useStore.ts:337-341`
  - **Description:** The overdue check `new Date(item.dueDate) < now` doesn't validate that the date is valid before comparison. If `dueDate` is a malformed string, `new Date()` returns `Invalid Date`, and the comparison will always be `false`.
  - **Impact:** Items with malformed due dates won't be counted in the overdue statistics.
  - **Fix:** Now uses the existing `parseDate` utility from `dateUtils.ts` for consistent date validation.
  - **Comparison:** Other parts of the codebase (e.g., `TimelineView.tsx`, `TreeNode.tsx`) correctly use `parseDate` and `isOverdue` utilities.

---

## Code Quality / Security Considerations (Info)

These are not bugs but worth noting for future improvements:

### Security

- [ ] **API Key Stored in localStorage**
  - **File:** `src/store/useStore.ts` (persist middleware)
  - **Description:** The Notion API key is persisted to localStorage for convenience. While this enables the app to remember credentials across sessions, localStorage is accessible via JavaScript and could be exposed through XSS attacks.
  - **Current Mitigation:** The app recommends using backend API mode for production (`VITE_USE_BACKEND_API=true`), which keeps the API key on the server.
  - **Recommendation:** Consider adding a warning in the UI when using direct mode in production.

### Code Quality

- [ ] **Deprecated filterMode Property**
  - **File:** `src/types/index.ts:97-102`
  - **Description:** The `filterMode` property in `FilterState` is marked as deprecated since v2.0 with plans to remove in v3.0. Legacy support code exists in the filter logic.
  - **Impact:** No functional impact; maintenance overhead.
  - **Recommendation:** Consider removing in the next major version.

---

## Verification

All fixes should be verified by:

1. Running `npm run build` - no TypeScript errors
2. Running `npm run lint` - no ESLint errors
3. Running `npm run test:run` - all tests pass
4. Running `cd server && npm run test:run` - all server tests pass

---

## Analysis Summary

The codebase is well-structured with:

- Proper error handling in most places
- Good use of TypeScript for type safety
- Comprehensive test coverage
- Clear separation of concerns (services, hooks, components)
- Proper circular reference detection in tree building
- Memory leak prevention with useRef cleanup patterns in React components

The two bugs identified are minor but should be fixed for production readiness.
