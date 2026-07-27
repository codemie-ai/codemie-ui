# QA Gate Report — epmcdme-13611-copy-table-button-behavior

**Branch**: EPMCDME-13611_fix-copy-table-button-behavior
**Runner**: npm
**Started**: 2026-07-22T00:21:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                        | Notes |
|-------------|---------|----------|-------------------------------|-------|
| lint        | PASS    | ~2min    | `eslint <changed files>`       | Scoped to 2 changed files (full-project eslint has 6+ min wall-time bottleneck on this machine). Both files: exit 0, React version warning only (pre-existing). |
| typecheck   | PASS    | ~3min    | `npm run typecheck`            | Silent output. exit 0. |
| unit        | PASS    | 36.83s   | `vitest run --project unit`    | 290 test files, 3541 tests. All passed. |
| integration | PASS    | 25.79s   | `vitest run --project integration` | 22 files, 365 passed, 1 skipped (pre-existing). |
| ui          | SKIPPED | —        | n/a                            | No configured UI test script. feature-verification owns browser evidence. |

## Changed files

```
src/components/markdown/tokens/TableBlock.tsx
src/components/markdown/tokens/__tests__/TableBlock.test.tsx
```

## Failure detail

None.

## Drift signal

no
