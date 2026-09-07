# QA Gate Report — ui-xwiki-datasource

**Branch**: EPMCDME-13142_ui-xwiki-datasource
**Merge base**: main
**Runner**: npm (guide-first, from `.ai-run/guides/quality-gates.md`)
**Started**: 2026-08-06
**Status**: BLOCKED (on pre-existing failures unrelated to this change — see below)

## Gates

| Gate | Status | Duration | Command | Notes |
|---|---|---|---|---|
| Lint | PASS | 19s | `npm run lint` | Exit 0. Only the pre-existing eslint-plugin-react version warning. |
| Type-check | PASS | 14s | `npm run typecheck` | Exit 0, silent. |
| Unit Tests | FAIL | ~90s | `npm run test:unit` | 6 failed / 4219. All 6 are pre-existing and unrelated — see below. |
| Integration Tests | PASS | ~70s | `npm run test:integration` | 469 passed, 1 skipped, 35 files. |

No gate defined a **Skip if** condition that applies: the diff touches `src/` and modifies `.ts`/`.tsx`, so all four were in scope and all four were run.

## Failure detail

`npm run test:unit` — 6 failing tests across 4 files:

- `src/utils/__tests__/analyticsFormatters.test.ts` — `formatMetricValue` currency and locale-separator formatting
- `src/pages/workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx` — spending metrics formatting
- `src/pages/skills/components/__tests__/SkillInstructions.test.tsx` — character counter with maxContentLength
- `src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx` — formatted release date

**These are pre-existing and not caused by this branch.** Verified directly: checked out `main` and ran the same four files, which produced the identical `6 failed | 40 passed` result.

**Root cause (recorded so future runs do not re-derive it).** This is repo hygiene, not a mystery. The
suites assert en-US formatting, but the production code formats with the *machine's* locale:

- `src/utils/analyticsFormatters.ts:31` — `Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })` for `MetricFormat.CURRENCY`
- `src/utils/analyticsFormatters.ts:50` — `value.toLocaleString()` for plain numbers

Passing `undefined` as the locale makes `Intl` fall back to the host locale. On this machine
`Intl.DateTimeFormat().resolvedOptions()` resolves to `uk-UA` / `Europe/Kiev`, which uses a
non-breaking-space group separator and a comma decimal separator, so every assertion written against
`1,234.56`-style output fails. The `WorkflowExecutionInfoPopup` spending test fails through the same
`formatMetricValue` path; `SkillInstructions` and `ReleaseNotesPage` fail for the same class of reason
(locale-formatted counter and date).

**Consequence: these four suites are red out of the box on any non-en-US machine, on every branch.**
The fix — pinning an explicit locale in the formatter or in the test setup — belongs to its own ticket,
not to an xWiki datasource change.

This branch's own tests all pass. The diff touches none of the four failing files, and none of the four exercise any code path this change modifies.

## Change-owned test results

| Suite | Result |
|---|---|
| `src/pages/dataSources` (unit) | 98 passed, 11 files |
| `src/pages/dataSources` (integration) | 13 passed, 2 files |
| `src/utils/__tests__/helpers.test.ts` | 35 passed (3 new) |
| `src/utils/__tests__/indexing.test.ts` | 3 passed (new file) |
| `.../hooks/__tests__/useCreateIndex.xwiki.test.ts` | 9 passed (new file) |

Unit test count rose from 4210 on `main` to 4219 here — 9 added, 0 broken.

## Drift signal

no — the implementation matches the spec and plan; no type signatures or method names referenced in the spec have diverged.

## Outcome

Mechanically the Unit gate is `FAIL`, so the overall status is `BLOCKED` per the gate table. The block
is entirely attributable to the 4 locale-dependent test files documented above, which fail identically
on `main` for a known reason.

**Resolved: the known-failing baseline is accepted** (user decision, 2026-08-06). This branch is
considered QA-clear — lint, typecheck and integration all pass, and the unit suite passes everything
except the pre-existing locale baseline. Fixing `toLocaleString(undefined, …)` is tracked separately.

## Feature verification

**PASSED** — completed 2026-08-06 against the running stack (UI `:5173`, API `:8080`, xWiki `:8888`),
driven through the real browser UI in an authenticated session.

| # | Check | Result |
|---|---|---|
| 1 | xWiki appears in the Datasource Type selector | PASS — labelled `xWiki` (not `Xwiki`), carries the `NEW` badge |
| 2 | Form renders the xWiki fields | PASS — `Space`, `Wiki (optional)`, `Integration for xWiki`, embeddings selector |
| 3 | Name auto-generated from the type | PASS — `xwiki-2026-08-06_11-48` |
| 4 | Schedule section shown for xWiki | PASS — Reindex Type + Expression present (the implicit `shouldShowScheduling` gate) |
| 5 | Integration dropdown lists xWiki credentials | PASS — two found; auto-select correctly did **not** fire (fires only at exactly one) |
| 6 | Create with **Wiki left blank** | PASS — created, indexing completed |
| 7 | Backend default applied to the blank wiki | PASS — details shows `Wiki: xwiki`, confirming the key was omitted rather than sent as `""` (CR-001 fix) |
| 8 | Indexed document count | PASS — `Processed Documents Count: 7`, Failed: 0 |
| 9 | Details view rows | PASS — `Space: KB`, `Wiki: xwiki`, type `xWiki` |
| 10 | Edit form prefill | PASS — `Space` = `KB`, `Wiki (optional)` = `xwiki`, integration preselected, Name disabled, type selector hidden |
| 11 | **Health-check `url` error routing (CR-002)** | PASS — see below |
| 12 | Unsaved-changes guard | PASS — prompted on Cancel after changing the integration |
| 13 | List type filter | PASS — `?index_type=knowledge_base_xwiki`, returns only xWiki datasources |
| 14 | Full Reindex action offered and works | PASS — confirm dialog, then `Updated` advanced 8:49:46 → 8:54:32, status COMPLETED |
| 15 | Incremental reindex correctly absent | PASS — action menu offers View Details / Edit / Full Reindex / Copy ID / Export / Delete only |

### CR-002 verified against a deliberately misconfigured credential

Switching the datasource to the `xwiki-wrongurl-13142` integration and saving produced, simultaneously:

- the top banner: `Failed to connect to xWiki: HTTP 404 for /rest/wikis/xwiki/spaces. Check the xWiki base URL: a 404 on /rest usually means the URL is missing the /xwiki prefix, or carries one the instance does not use.`
- **and an inline error directly beneath the `Integration for xWiki` selector**: `Check the base URL of the xWiki integration. Some instances serve REST at /rest/..., others under /xwiki/rest/... - the URL must match.`

The backend's `field_error: "url"` therefore reaches the user next to the control that owns it, carrying
the backend's help text. Before the fix this was a silent no-op — `setError('url')` targeted a field that
does not exist on this form, so only the banner appeared. The save was correctly blocked and the stored
datasource left untouched.

### Minor observation (not a defect, outside spec)

The left-hand list **filter** shows `xWiki` without a `NEW` badge, while `X-ray`, `Azure Devops Work
Item` and `SharePoint` carry one there. `DataSourceFilters.tsx` keeps its own badge list, separate from
`DataSourceTypeSelector.tsx`. The spec scoped the badge to the type selector only, so this matches the
agreed scope — noted purely as a visual inconsistency for a future tidy-up.
