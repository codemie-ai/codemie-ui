# QA Report — EPMCDME-8560

**Branch:** `EPMCDME-8560_announce-added-file-row`
**Merge base:** `dd238122749d047ebd381f1329c7f753b958a6d9` (main)
**Date:** 2026-08-07

## Gates

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | **PASS** (0 errors; pre-existing "React version not specified" warning only) |
| Typecheck | `npm run typecheck` | **PASS** (`tsc --noEmit`, no output) |
| Unit tests | `npm run test:unit` | **PASS** — 368 files, 4249 tests |
| Integration tests | `npm run test:integration` | **PASS** — 35 files, 465 passed / 1 skipped |
| Commit hooks | husky pre-commit (lint-staged, `license-headers:check`, `secrets:check`, `sonar-local`) | **PASS** on all 3 commits — 0 missing license headers, gitleaks found no leaks, Sonar skipped (no `SONAR_TOKEN` locally) |

## New coverage added by this change

| File | Tests | What they lock in |
|---|---|---|
| `src/components/form/RecordInput/__tests__/RecordInput.test.tsx` | 5 new (14 total) | Empty region on mount (auto-seed not announced); add announces new count; remove announces remaining count; last-row removal + re-seed announces; a repeated identical message lands in a previously empty region so it is re-announced |
| `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` | 5 new (9 total) | Empty region on initial render; add announces total; remove announces remaining; last file removed announces "No files selected"; already-uploaded files counted in the total |

All new tests were observed failing before implementation (RED) and passing after (GREEN).

## Feature verification

`feature-verification` was **not** run: this change is screen-reader-only (`sr-only` live regions, no
visual or layout change), so browser screenshots cannot evidence it — a before/after capture is
pixel-identical by design. Verification is therefore manual, with a screen reader:

1. Data Sources → Create Datasource → type **File** → add a file → "1 of 10 files selected"; remove it → "No files selected".
2. Integrations → Credential Type **MCP** → "Add Environment Variable" → "Row added. 2 rows total."; delete a row → "Row removed. N row(s) total."; delete the last remaining row → announced again (not silent).
3. Opening either form announces nothing.

## Known gaps

- No automated screen-reader (AT) verification exists in this repo — no axe tooling, no a11y CI gate,
  and `plugin:jsx-a11y/recommended` is not extended (only `no-redundant-roles` is active). The new RTL
  role assertions are the first live-region coverage in the suite.
- `npm run test-harness` (`uvx codemie-test-harness --sanity-ui`) has **not** been run yet — required
  green before opening the MR.
