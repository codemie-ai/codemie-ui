# QA Gate Report — EPMCDME-8455

**Branch**: EPMCDME-8455_fix-nav-sidebar-decorative-icons
**Runner**: npm
**Started**: 2026-09-06T20:07:00Z
**Status**: PASSED

## Gates

| Gate             | Source | Status             | Duration | Command                       | Notes |
|------------------|--------|--------------------|----------|-------------------------------|-------|
| lint             | guide  | PASS               | ~5s      | `npm run lint`                | React version warning is pre-existing |
| typecheck        | guide  | PASS               | ~8s      | `npm run typecheck`           | Silent output |
| license-check    | guide  | SKIPPED            | —        | `npm run license-check`       | No dependencies added/removed/moved |
| secrets          | guide  | PASS               | ~10s     | `npm run secrets:check`       | `no leaks found` |
| unit             | guide  | PASS (qualified)   | ~400s    | `npm run test:unit`           | 5191 passed; 2 pre-existing failures in files outside diff (see below) |
| integration      | guide  | PASS               | ~151s    | `npm run test:integration`    | 40 files, 501 passed |
| license-headers  | hook   | PASS               | ~15s     | `npm run license-headers:check` | 0 missing headers across 1980 files |
| sonar            | hook   | SKIPPED            | —        | `npm run sonar-local`         | self-skipped: `SONAR_TOKEN is not set`; enable with `export SONAR_TOKEN=<token>` |

## Pre-existing unit test failures (not introduced by this branch)

Two test suites fail on this branch, but both were last modified in commits preceding this branch and neither file is in our diff:

| File | Failure | Last commit on that file |
|------|---------|--------------------------|
| `scripts/license_headers/__tests__/check_license_headers.test.js` | SyntaxError: Invalid or unexpected token at line 3 | `52469f991` — Revert EPMCDME-13270 |
| `src/components/appLevel/ToasterAnnouncer/__tests__/modalSurfaces.guard.test.ts` | `expected [...] to include 'components/Popup/Popup.tsx'` | `ddd874fb4` — EPMCDME-8584 |

Our diff only touches `NavigationLink.tsx`, `NavigationExpandButton.tsx`, `NavigationLogo.tsx`, and their corresponding test files. Neither failing test file is in our diff or exercises code we changed.

## Skipped gates (still owed by CI)

- **sonar**: Skipped locally (`SONAR_TOKEN` not set). The Tekton CI pipeline runs the full SonarQube scan on every MR — this will be resolved there.

## Drift signal

no — implementation matches spec exactly. Three components received `aria-hidden="true"` on decorative SVGs and `alt=""` on the custom logo image, matching the spec's Changes section verbatim.
