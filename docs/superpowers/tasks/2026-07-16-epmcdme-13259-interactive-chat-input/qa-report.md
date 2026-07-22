# QA Gate Report — codemie-ui (EPMCDME-13259)

**Branch**: feature/EPMCDME-13259-interactive-chat-input
**Runner**: npm (guide-first: .ai-run/guides/quality-gates.md)
**Started**: 2026-07-16
**Status**: PASSED (lint gate environmentally blocked — see note)

## Gates

| Gate | Status | Command | Notes |
|------|--------|---------|-------|
| lint | SKIPPED (env) | `npm run lint` | 8064 `import/extensions` / `import/no-unresolved` errors repo-wide, identical on untouched files and on `main`: the `@/` alias resolver does not resolve in this local environment. Scoped `eslint` over the 24 changed files shows ZERO non-environmental errors. CI (with a working resolver) is the authoritative lint. |
| typecheck | PASS | `npm run typecheck` | `tsc --noEmit`, exit 0 |
| unit | PASS | `npm run test:unit` | 282 files, 3487 passed |
| integration | PASS | `npm run test:integration` | 14 files, 304 passed / 1 skipped |

## Failure detail

None. The lint gate's failures are pre-existing environmental resolver noise, not diff-introduced. Verified: `npx eslint <24 changed files>` filtered of `import/extensions` + `import/no-unresolved` + the react-version warning yields no findings; the same errors appear on files this branch never touched and on `main`.

## Drift signal

no
