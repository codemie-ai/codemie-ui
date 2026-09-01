# QA Gate Report — EPMCDME-14586 (comment out OAuth switchers)

**Branch**: EPMCDME-14586_comment-out-oauth-switchers · **Runner**: npm (guide-first) · **Status**: PASSED

| Gate | Status | Notes |
|------|--------|-------|
| lint | PASS | exit 0 (no orphaned symbols) |
| type-check | PASS | tsc --noEmit exit 0 |
| license-check | N/A | no dependency changes |
| secrets | PASS | no leaks found |
| unit | PASS | 463 files, 4915 passed, 1 skipped (gitlaboauth save test intentionally skipped) |
| integration | PASS | 39 files, 496 passed, 1 skipped |
| ui | SKIPPED | covered by unit; ui=false |

## Drift signal
no
