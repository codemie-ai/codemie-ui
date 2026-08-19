# QA Gate Report — epmcdme-14276-btn-position

**Branch**: EPMCDME-14276_inconsistent_btn_position
**Runner**: npm
**Started**: 2026-08-19T13:08:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~5s | `npm run lint` | No errors. Pre-existing React-version advisory warning only. |
| typecheck | PASS | ~8s | `npm run typecheck` | Silent output, exit 0. Confirmed again after post-review fixes. |
| license-check | SKIPPED | — | `npm run license-check` | No dependency added, removed, or moved. |
| secrets | PASS | ~2s | `npm run secrets:check` | `no leaks found` |
| unit | PASS | 37s | `npm run test:unit` | 418 test files, 4522 tests passed. |
| integration | PASS | 23s | `npm run test:integration` | 36 test files, 479 passed, 1 skipped (pre-existing). |

## Post-review fixes (commits 10920a7c5, 0dbb322fe)

Three follow-up items addressed after visual review:
1. **SharePoint spacing** — added `mt-4` to auth RadioGroup wrapper so a gap appears between "Model used for embeddings" and "Authentication Method:".
2. **Button alignment** — `IntegrationSection` flex container now uses `flex-1` only when `isDropdownShown`, so both buttons sit left-aligned together when no integration dropdown is present (instead of split left/right).
3. **Git embeddings full width** — changed `grid-cols-2` to conditional `grid-cols-1`/`grid-cols-2` based on `isCodeSummarization` so the embeddings model field is always full width when no summarization model is shown.

## Drift signal

no
