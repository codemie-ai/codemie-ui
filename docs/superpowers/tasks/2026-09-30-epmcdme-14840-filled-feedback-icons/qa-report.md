# QA Gate Report — 2026-09-30-epmcdme-14840-filled-feedback-icons

**Branch**: EPMCDME-14840_like-icon-dark-theme (HEAD 8afd76282)
**Runner**: guide-first (`.ai-run/guides/quality-gates.md`)
**Started**: 2026-09-30
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | 26s | `npm run lint` | clean |
| typecheck | PASS | 19s | `npm run typecheck` | clean |
| license | SKIPPED | — | `npm run license-check` | guide: skip if no dependency changed |
| secrets | PASS | 8s | `npm run secrets:check` | no leaks found |
| unit | PASS | 172s | `LC_ALL=en_US.UTF-8 npm run test:unit:slnt` | 615 files, 6300 passed, 1 skipped |
| integration | PASS | 100s | `LC_ALL=en_US.UTF-8 npm run test:integration:slnt` | 48 files, 547 passed, 1 skipped |
| ui | PASS | — | live app on branch code (:5173), both themes | computed style: dark liked #F2F0EF filled, dark disliked #FE3B4C filled rotated; light liked #007AFF filled, light disliked #FE3B4C filled rotated; unselected = outline |

## Drift signal

no
