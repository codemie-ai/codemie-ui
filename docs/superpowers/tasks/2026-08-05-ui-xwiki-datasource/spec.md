# Spec — EPMCDME-13142: xWiki datasource type (frontend)

**Branch**: `EPMCDME-13142_ui-xwiki-datasource`
**Scope**: frontend only. Backend ships in codemie `!3935`; its contract was verified live against
`http://localhost:8080/openapi.json` (see `technical-analysis.md` → "Live contract verification").

## Goal

Add xWiki as a selectable knowledge-base datasource type, wired end to end: creation form, edit form,
details view, types, constants, store, list filter, and reindex actions.

## Approach

Mirror the **Confluence** datasource type field-for-field, substituting Confluence's single required
`cql` with xWiki's required `space` plus optional `wiki` (default `"xwiki"`). Confluence is the exact
structural analogue — same credential-backed `IntegrationSection`, same embeddings selector, same cron
scheduling, same `project_space_visible` — and its store method takes a config object rather than a
long positional argument list.

No redesign of the datasource UI. No new abstractions.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| `setting_id` requiredness | **Required in the UI** | API marks it optional, but Confluence/Jira/Xray/ADO all require it. A missing credential fails inline instead of server-side. |
| Icon | **`IconCode` fallback** | No official xWiki asset; Azure DevOps Wiki and Work Item already use the same fallback. A branded icon can land separately. |
| Help notes placement | **Credential form only** (`settingsUIConfig.ts`) | Both notes describe `url` / `token` / `username`, which are credential fields — not datasource-form fields. |
| `NEW` badge | **Yes** | Matches the four most recent types (X-ray, ADO Work Item, SharePoint, SVN). |
| Form field names | **`xwikiSpace` / `xwikiWiki`** | `FormValues` is one flat namespace shared by all types. Bare `space` is the key most likely to collide later — Confluence has spaces, SharePoint has sites. Follows the existing `sharepointAuthType` / `sharepointCustomClientId` / `sharepointTenantId` precedent. Mapped to the API's `space` / `wiki` at request-build time. |

## Behavior

### Creation
Selecting **xWiki** in the datasource type dropdown shows:
- **Space** — text input, required, placeholder shows a realistic space key.
- **Wiki** — text input, optional, placeholder `xwiki`; left empty the field is omitted and the backend
  default (`"xwiki"`) applies.
- **Integration for xWiki** — `IntegrationSection` bound to the existing `xwiki` credential type,
  required. Auto-selected when the project has exactly one xWiki credential.
- **Model used for embeddings** — standard `FormAutocomplete`.
- **Schedule** — the shared cron field, shown because xWiki is in `INDEX_TYPES` and absent from
  `blockedReindexingIndexTypes`.

Submitting runs the existing pre-create health check (now carrying `space` and `wiki`, which the
backend's `DatasourceHealthCheckRequest` already accepts), then `POST /v1/index/knowledge_base/xwiki`.

### Editing
The edit form prefills `xwikiSpace` / `xwikiWiki` from the response's `xwiki: { space, wiki }` block and
saves through the generic `updateKBIndex('xwiki', …)` → `PUT /v1/index/knowledge_base/xwiki`.
`name` stays disabled, as for every type.

### Details view
Two rows under the type-specific section: **Space** and **Wiki** (falling back to `xwiki` when unset).

### List
xWiki appears in the type filter (derived from `INDEX_TYPES`) and in the type selector with a `NEW`
badge. Full reindex and force reindex are available; incremental reindex is not (Jira/Xray only).

### Label
`humanize('xwiki')` gains a fifth special case returning `xWiki` — without it the dropdown, the filter,
and `getIndexTypeDisplay` all read `Xwiki`.

### Credential help text
The existing `xwiki` entry in `CREDENTIAL_UI_MAPPING` gains user guidance:
- **Base URL** is the wiki root. Some instances serve the wiki at the domain root, others under an
  `/xwiki` path — enter whichever the target instance uses.
- **Authentication**: username + password always works. A token only works if the target xWiki has the
  token plugin installed; without it, fall back to username + password.

No change to the credential's fields (`url`, `use_bearer`, `username`, `token`) — only added guidance.

## Request/response contract

`POST /v1/index/knowledge_base/xwiki` — required `name`, `project_name`, `description`, `space`;
optional `wiki`, `setting_id`, `embedding_model`, `cron_expression`, `project_space_visible`,
`guardrail_assignments`, `timezone`. The last two come from the shared `getBaseRequestFields` and are
confirmed present on the backend schema, so no special-casing is needed.

`PUT /v1/index/knowledge_base/xwiki` — required `name`, `project_name`; optional `space`, `wiki`,
`setting_id`, `new_project_name`, `description`, `project_space_visible`, `cron_expression`,
`guardrail_assignments`, `timezone`. `embedding_model` is **not** on the update schema, matching the
other KB types.

Response: `xwiki: { space: string, wiki: string }`.

## Files

| Layer | File | Change |
|---|---|---|
| Constants | `src/constants/dataSources.ts` | `XWIKI: 'xwiki'` in `INDEX_TYPES` |
| Utils | `src/utils/helpers.ts` | `humanize` special case → `xWiki` |
| Utils | `src/utils/indexing.ts` | `isXWikiIndex()` |
| Form | `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeXWiki.tsx` | **new** component |
| Form | `.../IndexTypeField/index.ts` | register `XWiki` |
| Form | `.../DataSourceForm/DataSourceForm.tsx` | render branch |
| Form state | `.../hooks/useEditPopupForm.ts` | schema, defaults, edit prefill, `setting_id` required-list |
| Form state | `.../hooks/useEditPopup.ts` | `filteredSettings` key, credential auto-select list |
| Request | `.../hooks/useCreateIndex.ts` | health-check options, switch case, `createOrUpdateXWikiIndex` |
| Store | `src/store/dataSources.ts` | `createKBIndexXWiki`, widen `healthCheckDatasource` options with `space`/`wiki` |
| Types | `src/types/entity/dataSource.ts` | `xwiki?: { space, wiki }` on `DataSource` and `DataSourceDetailsResponse` |
| Read | `.../components/DataSourceDetails.tsx` | Space / Wiki rows |
| Read | `.../utils/dataSourceUtils.ts` | `canFullReindex`, `canForceReindex`, `performFullReindex` |
| Read | `.../DataSourceEditPage.tsx` | editability predicate |
| Read | `.../components/DataSourceTypeSelector.tsx` | `NEW` badge |
| Credential | `src/utils/settingsUIConfig.ts` | help notes on the existing `xwiki` entry |

## Risks

The danger in this task is **silent half-wiring**, not design difficulty. Four gates decide xWiki's
behavior, and three of them are opt-in allowlists that fail quietly when missed:

1. `useEditPopup.filteredSettings` — missing key means the credential dropdown never renders; the user
   sees only "Add User Integration".
2. `dataSourceUtils.canFullReindex` / `canForceReindex` — both end in `return !isKBIndex(item)`, so an
   unlisted `knowledge_base_*` type gets **no** reindex actions.
3. `useEditPopupForm` `setting_id` required-list **and** `useEditPopup` auto-select list are separate;
   missing the second is invisible — the user just picks manually.
4. `shouldShowScheduling` in `DataSourceForm.tsx` is the inverse: a **denylist**
   (`blockedReindexingIndexTypes = {FILE, PROVIDER}`) plus an `INDEX_TYPES` membership test. Adding the
   `XWIKI` constant therefore switches the cron field **on** as a side effect. That default is correct
   and intended, but it is enabled implicitly rather than declared, so it needs explicit coverage.

Also: adding the constant without the `DataSourceForm` render branch surfaces xWiki in the dropdown
with an empty form body. Constant and branch must land together.

## Testing

TDD. Six specs:

1. `src/utils/__tests__/helpers.test.ts` — `humanize('xwiki') === 'xWiki'`.
2. `.../hooks/__tests__/useEditPopupForm.validation.test.ts` — `space` required when `indexType` is
   xWiki; not required for other types.
3. `src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts` (new) — a completed xWiki index
   passes `canFullReindex`; an in-progress one passes `canForceReindex`.
4. `.../components/__tests__/DataSourceDetails.test.tsx` — Space and Wiki rows render for
   `knowledge_base_xwiki`.
5. `.../__tests__/DataSourceCreatePage.integration.test.tsx` — selecting xWiki reveals the Space field
   and the integration section; the POST body matches the verified schema.
6. `.../__tests__/DataSourceCreatePage.integration.test.tsx` — selecting xWiki reveals the **schedule
   field**, and a set cron expression reaches the POST body as `cron_expression`. Covers the
   `shouldShowScheduling` denylist gate, which is enabled implicitly; the backend accepts
   `cron_expression` on both POST and PUT, and incremental-refresh behavior is one of the three review
   gates named on this ticket.

Beyond unit/integration coverage, the feature is verified against the running stack: UI on `:5173`,
API on `:8080`, live xWiki on `:8888` (space `KB`, 7 pages) — create a real xWiki datasource end to end
and confirm it indexes.

## Out of scope

- Changing the `xwiki` credential's fields, or the `use_bearer` toggle.
- A branded xWiki icon asset.
- Any backend change.
