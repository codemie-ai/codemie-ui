# QA Gate Report — share-token-file-refs

**Branch**: EPMCDME-12708_share-token-file-refs
**Runner**: npm (guide-first, `.ai-run/guides/quality-gates.md`)
**Started**: 2026-08-25T10:16:44Z
**Status**: BLOCKED

**Reinstalled from lock file before trusting any gate** (`npm ci`) — the checkout's `node_modules`
was stale prior to this: `src/utils/__tests__/tooltip.test.ts` deterministically failed before the
reinstall and deterministically passed after it, on files this branch never touched. All gate runs
below are from the post-`npm ci` state.

## Gates

| Gate | Status | Command | Notes |
|------|--------|---------|-------|
| lint | PASS | `npm run lint` | Exit 0, no output after the file list (only a pre-existing eslint-plugin-react version warning). All 6 files this branch touches independently confirmed clean via `npx eslint <files>`. |
| typecheck | PASS | `npm run typecheck` | Exit 0, silent output. |
| license-check | SKIPPED | `npm run license-check` | No dependency added, removed, or moved (`git diff origin/main...HEAD -- package.json package-lock.json` is empty) — matches the guide's Skip-if condition. |
| secrets-check | PASS | `npm run secrets:check` | `no leaks found`. |
| unit | PASS | `npm run test:unit` | `Test Files 431 passed (431)`, `Tests 4689 passed (4689)`, exit 0. |
| integration | FAIL | `npm run test:integration` | `Test Files 1 failed \| 36 passed (37)`, `Tests 1 failed \| 486 passed \| 1 skipped (488)`, exit 1. See Failure detail. |

No UI gate — `.ai-run/guides/quality-gates.md` (the authoritative gate source for this repo) does
not define one, and guide-first resolution takes precedence over generic runner-detection.

## Failure detail

`src/pages/skills/__tests__/SkillsListPagePagination.integration.test.tsx` — `SkillsListPage -
Marketplace tab - Pagination > reloads marketplace skills when per-page selection changes`:

```
Error: Unable to fire a "click" event - please provide a DOM element.
 ❯ createEvent node_modules/@testing-library/dom/dist/events.js:27:11
 ❯ Function.createEvent.<computed> [as click] node_modules/@testing-library/dom/dist/events.js:106:38
 ❯ Function.fireEvent.<computed> [as click] node_modules/@testing-library/dom/dist/events.js:110:68
 ❯ Function.click node_modules/@testing-library/react/dist/fire-event.js:15:52
 ❯ src/pages/skills/__tests__/SkillsListPagePagination.integration.test.tsx:230:15
    228|
    229|     const perPageSelect = document.getElementById('per-page') as HTMLE…
    230|     fireEvent.click(perPageSelect)
       |               ^
    231|     fireEvent.click(screen.getByLabelText('24 items'))
```

**Confirmed pre-existing and unrelated to this change:**

- This branch touches only `src/utils/utils.ts`, `src/utils/__tests__/utils.test.ts`,
  `src/hooks/useFileUpload.tsx`, `src/hooks/__tests__/useFileUpload.test.tsx`, `src/store/files.ts`,
  `src/store/__tests__/files.test.ts` (per `git diff origin/main...HEAD --stat`). Nothing under
  `src/pages/skills/` is touched, and `SkillsListPagePagination.integration.test.tsx` has no
  dependency on any of the six changed files.
- **Confirmed flaky, not deterministically broken**: running this test file in isolation 3 times
  in a row on this branch (`npx vitest run
  src/pages/skills/__tests__/SkillsListPagePagination.integration.test.tsx --project integration`)
  gave FAIL, PASS, FAIL — the DOM-element-not-found error in `fireEvent.click` is a timing/race issue
  in the test itself (the `per-page` select element is apparently not always mounted/queryable at the
  moment the test fires the click).
- **Also reproduced on `origin/main`**, independent of this branch: checked out `origin/main` into a
  clean worktree, ran `npm ci`, then ran the same test file in isolation 3 times — it failed all 3
  times (`1 failed | 14 passed (15)`). This confirms the flake/failure is pre-existing on `main` and
  is not introduced or affected by this change.

## Drift signal

no

## Result returned to caller

```json
{
  "passed": false,
  "blocked_gate": "integration",
  "drift_detected": false,
  "gate_plan": "docs/superpowers/tasks/2026-08-25-share-token-file-refs/gate-plan.json"
}
```
