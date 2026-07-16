# QA Gate Report — EPMCDME-13243

**Branch**: EPMCDME-13243_add_table_copy_btn
**Runner**: npm (guide-first mode — .ai-run/guides/quality-gates.md)
**Started**: 2026-07-10T09:57:00Z
**Status**: BLOCKED (pre-existing integration failure, unrelated to this branch)

## Gates

| Gate        | Status  | Command                   | Notes |
|-------------|---------|---------------------------|-------|
| lint        | PASS    | `npm run lint`            | Exit 0; informational React version warning only |
| typecheck   | PASS    | `npm run typecheck`       | Silent exit 0 |
| unit        | PASS    | `npm run test:unit`       | 255 files, 3340 tests — includes 3 new TableBlock tests |
| integration | FAIL    | `npm run test:integration`| 2 files failed, 5 tests failed — **PRE-EXISTING** |

## Pre-existing Failure Detail

The integration failures are in `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx` and are confirmed pre-existing: the same failures reproduce when our branch changes are stashed (reverted), meaning they exist on the baseline and are not caused by this PR.

**Error**: `TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal.` in `react-router` during a navigation test — unrelated to markdown token rendering or clipboard functionality.

**Affected test**: `AssistantDetailsPage - Integration > Navigation (Back Button) > redirects to the assistants list in one click when opened via a human-readable slug URL without history`

**Our changed files** (not involved in any failure):
- `src/components/markdown/MarkdownTokens.tsx`
- `src/components/markdown/tokens/TableBlock.tsx`
- `src/components/markdown/tokens/__tests__/TableBlock.test.tsx`

## Drift signal

no
