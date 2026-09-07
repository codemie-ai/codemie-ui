# Implementation Analysis: EPMCDME-13142 (frontend: xWiki datasource type)

## Size: M (19/36)

### Dimension Scores

| Dimension            | Score | Label | Note |
|----------------------|-------|-------|------|
| Component Scope      | 5     | XL    | red flag applied (4 → 5) |
| Requirements Clarity | 3     | M     | red flag applied (2 → 3) |
| Technical Risk       | 2     | S     | |
| File Change Estimate | 5     | XL    | |
| Dependencies         | 1     | XS    | |
| Affected Layers      | 3     | M     | |

Base total before red flags: 17. After red flags: **19/36 → M**.

---

### Component Scope: XL (5)

Base **L (4)**, bumped by the shared-utilities red flag.

Additive change, but it fans out across the entire datasource feature area inside a single subsystem:

- `src/constants/dataSources.ts` — `INDEX_TYPES.XWIKI`
- `src/utils/indexing.ts` — `isXWikiIndex()`
- `IndexTypeField/IndexTypeXWiki.tsx` (new) + `IndexTypeField/index.ts` registry entry
- `DataSourceForm.tsx` — render branch
- `hooks/useEditPopupForm.ts` — validation rule, `setting_id`-required list, create + edit defaults
- `hooks/useEditPopup.ts` — `filteredSettings` key, single-credential auto-select list
- `hooks/useCreateIndex.ts` — request builder, dispatch switch, `healthCheckOptions`
- `src/store/dataSources.ts` — `createKBIndexXWiki`, widened `healthCheckDatasource` options
- `DataSourceDetails.tsx`, `src/types/entity/dataSource.ts`
- `pages/dataSources/utils/dataSourceUtils.ts` — 4 reindex predicates
- `DataSourceEditPage.tsx` editability guard, `DataSourceTypeIcon.tsx`

No new abstractions — every touch point has an exact Confluence precedent.

### Requirements Clarity: M (3)

Base **S (2)**, bumped by the "similar to X but different" red flag.

Contract is live-verified, not assumed (`openapi.json` on the backend branch): `space` required, `wiki`
optional with default `"xwiki"`, `guardrail_assignments` + `timezone` accepted by the shared
`getBaseRequestFields` spread, read path returns `IndexInfo.xwiki { space, wiki }`.

Open items for the spec:
1. API marks `setting_id` optional; every UI analogue (Confluence/Jira/ADO) marks it required. Follow the analogue or the contract?
2. No `xwiki.svg` asset exists. Ship one, or accept the `IconCode` fallback (as Azure DevOps Wiki already does)?

### Technical Risk: S (2)

Exact analogue exists, contract verified, purely additive, trivially reversible. No auth, security,
performance, streaming, or migration surface. Residual risk is **omission-shaped, not design-shaped**:

- `canFullReindex` / `canForceReindex` / `performFullReindex` / `performResumeIndexing` are opt-in
  allowlists ending in `return !isKBIndex(item)` — an unlisted KB type silently gets no reindex actions,
  and `performFullReindex` falls through to `updateApplicationIndex`, which is wrong for a KB index.
- `useEditPopup.filteredSettings` without an `xwiki` key makes `hasNoSettings()` permanently true — the
  credential dropdown never renders.
- Adding the constant without the `DataSourceForm` render branch surfaces the type in the dropdown and
  filter with an **empty form body**.
- `healthCheckDatasource` options type must gain `space`/`wiki`, else pre-create validation silently no-ops.

### File Change Estimate: XL (5)

~15 source files modified across 6+ directories, 1–2 new source files (`IndexTypeXWiki.tsx`, optional
`xwiki.svg`), plus ~4 test files (`helpers.test.ts`, `useEditPopupForm.validation.test.ts`,
`DataSourceDetails.test.tsx`, `DataSourceCreatePage.integration.test.tsx`). Modified count sits at the top
of the XL band; the low new-file count keeps it out of XXL.

### Dependencies: XS (1)

No new packages, no version changes, no config or env additions.

### Affected Layers: M (3)

Frontend-only repo — UI components + form-state/validation hooks + store/API-client and entity types.
No DB, no infra, **no cross-system work**: the xWiki backend endpoints already ship, and the `xwiki`
credential type is already fully implemented (`settingsUIConfig.ts:671-703`, `appInfo.ts:29`,
`getCredentialType`). `getSettingOptions(INDEX_TYPES.XWIKI)` resolves with no `credentialType` override.

---

### Red Flags Applied

- **Touches core shared utilities → Component Scope 4 → 5.** `humanize()` in `src/utils/helpers.ts` is
  used app-wide and needs a fifth special case so the label reads `xWiki`, not `Xwiki`; `src/utils/indexing.ts`
  gains a new shared predicate.
- **"Similar to X but different" → Requirements Clarity 2 → 3.** Specified as a Confluence mirror, but the
  field set differs (required `space` + optional `wiki` vs. a single `cql`), and the `setting_id` question is open.

### Red Flags Considered and NOT Applied

- **"Integration with new external service"** — not applied. From the UI's perspective there is no new
  external service: the UI only calls the existing CodeMie REST API through the established store pattern,
  and the xWiki credential type already exists client-side. The actual external integration is backend-side
  and already delivered.
- Migrate/refactor, real-time/streaming, performance, security/compliance, auth, DB schema, data migration,
  multiple workflows/agents — none apply.

### Routing

**`superpowers:brainstorming`** — M (19/36).

The two open questions (`setting_id` required vs. optional, icon asset vs. fallback) and the set of
silent-failure allowlists are worth 20 minutes of design alignment before a plan is written. The score is
robust at the routing boundary: even without the Component Scope red flag the total is 18, still M.
