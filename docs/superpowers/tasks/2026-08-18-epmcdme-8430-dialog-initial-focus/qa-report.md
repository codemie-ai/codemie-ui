# QA Report — EPMCDME-8430

**Branch:** EPMCDME-8430_dialog-initial-focus  
**Date:** 2026-08-18  
**Status:** PASSED

## Gates

| Gate | Command | Result |
|------|---------|--------|
| Lint | `npm run lint -- --max-warnings=0 src/components/Popup/Popup.tsx src/components/Popup/__tests__/Popup.test.tsx` | ✅ PASS (0 errors, 0 warnings) |
| Typecheck | `npx tsc --noEmit --project tsconfig.json` | ✅ PASS (0 errors) |
| Unit tests | `npx vitest run src/components/Popup/__tests__/Popup.test.tsx` | ✅ PASS (18/18) |

## Test summary

18 tests passed (12 existing + 6 new focus-management tests).

New tests added in `describe('focus management', ...)`:
- moves focus to the close button when the dialog opens
- does not move focus when visible is false
- focuses the first visible focusable when hideClose is true
- returns focus to the trigger when the dialog closes
- only focuses the newly opened dialog when two are stacked
- focuses the close button when headerContent is used instead of header
