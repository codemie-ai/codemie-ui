# QA Gate Report — EPMCDME-15965

**Branch**: EPMCDME-15965_skill-bundle-limits-ui
**Tip under test**: bb57fed12 (source identical to cd2ee4373)
**Runner**: npm (gates taken from `.ai-run/guides/quality-gates.md`, run one at a time)
**Run**: 2026-10-14 20:22–20:30 local
**Status**: PASSED (automated gates). Harness gate: see caveat below.

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | 27s | `npm run lint` | exit 0 |
| typecheck | PASS | 20s | `npm run typecheck` | exit 0 |
| license-check | SKIPPED | — | `npm run license-check` | guide: skip if no dependency added, removed or moved; none changed |
| secrets | PASS | 22s | `npm run secrets:check` | output read, not just exit code: `no leaks found`, ~152 MB scanned |
| unit | PASS | 333s | `npm run test:unit:slnt` | `Test Files 691 passed (691)`, `Tests 6999 passed \| 1 skipped (7000)` |
| integration | PASS | 106s | `npm run test:integration:slnt` | `Test Files 49 passed (49)`, `Tests 558 passed \| 1 skipped (559)` |
| test-harness | PASS (earlier tip, see caveat) | 14m57s | `npm run test-harness` | `93 passed, 21 rerun in 896.90s` — result supplied by the user from `dist/harness.txt` |

## Test harness caveat

The harness log finished at 19:37:48, so the run started around 19:22. The last source commit, `cd2ee4373` (local bundle warning computed with the backend seed rules), was committed at 20:11, after that run. The harness result therefore covers the code up to `5b4961202` at most, and the log does not state which build the stack served. It is not evidence for the branch tip. Re-run `npm run test-harness` against the tip before opening the MR.

Other observations from that log:
- 21 reruns (flaky-then-passed), including skills tests `test_create_skill_via_web_form_minimal_fields` (2 reruns) and `test_import_zip_bundle_with_multiple_md_files_shows_friendly_error` (1 rerun). Not attributed to this change.
- No harness test exercises a ZIP bundle with a warning or the limit text.
- `dist/harness.txt` is git-ignored; the log itself is not committed.

## Failure detail

None.

## Drift signal

no — spec.md and plan.md were synced to the implementation (Task 4, backend-aligned warning) before this run.
