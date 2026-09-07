# Technical Analysis — EPMCDME-13142 (frontend: xWiki datasource type)

Research done inline (the `tech-analyst` subagent hit a session limit and produced no file).
All paths are repo-relative; line numbers are from the branch base (`main` @ `926312160`).

## Closest analogue

**Confluence** (`INDEX_TYPES.CONFLUENCE = 'confluence'`).

Rationale — the xWiki contract needs exactly the Confluence shape:

| xWiki field | Confluence equivalent | Notes |
|---|---|---|
| `space` (required) | `cql` (required) | single required scope string |
| `wiki` (optional, default `"xwiki"`) | — | extra optional string; closest precedent is `wiki_name` on Azure DevOps Wiki |
| `setting_id` (credential) | `setting_id` | same `IntegrationSection` wiring |
| `embedding_model` | `embedding_model` | shared |
| `cron_expression` | `cron_expression` | shared |
| `project_space_visible` | `project_space_visible` | shared, in `getBaseRequestFields` |

Confluence also uses the **object-argument** store method (`createKBIndexConfluence(indexConfig)`), which
is the cleanest of the create methods — Jira/Xray/ADO use long positional argument lists.

Azure DevOps Wiki is a secondary reference for the *optional second field* (`wikiName`) and for
`credentialType` being different from the index type — not needed here (see below).

## Codebase Findings

### 1. Where an index type is registered

`src/constants/dataSources.ts:22-35` — `INDEX_TYPES` const object. This is the single source that
drives, automatically and without further edits:

- **Type selector dropdown** — `DataSourceTypeSelector.tsx:52-71` maps `Object.keys(INDEX_TYPES)`
  (excluding `PROVIDER`) into options, labels via `humanize()`, `orderBy` label asc.
  Optional `badge: 'NEW'` list at lines 61-67.
- **List filters** — `DataSourceFilters.tsx:99-118` maps the same keys, value via `getFullIndexType()`.
- **Scheduling visibility** — `DataSourceForm.tsx:69-78` `shouldShowScheduling()` requires membership
  in `INDEX_TYPES` and absence from `blockedReindexingIndexTypes`.
- **Health-check dispatch** — `useCreateIndex.ts:96-103` passes `data.indexType` if it is in
  `INDEX_TYPES`, else literal `'provider'`.
- **Provider fallback branch** — `DataSourceForm.tsx:617-618` renders `IndexTypeField.Provider` for
  anything *not* in `INDEX_TYPES`. **A new type that is added to `INDEX_TYPES` but has no explicit
  render branch renders nothing at all.**

`IndexType` union type is derived at `dataSources.ts:42`.

### 2. Complete Confluence wiring (files to mirror)

| Concern | File | Detail |
|---|---|---|
| Constant | `src/constants/dataSources.ts:25` | `CONFLUENCE: 'confluence'` |
| Type predicate | `src/utils/indexing.ts:44-46` | `isConfluenceIndex()` — uses `.includes('confluence')` |
| Index-type ↔ endpoint | `src/utils/indexing.ts:~113` | `getIndexTypeCode()` strips `knowledge_base_`; `getFullIndexType()` prepends it |
| Creation form | `IndexTypeField/IndexTypeConfluence.tsx` | 1 `Controller` field + `IntegrationSection` + `FormAutocomplete` embeddings |
| Form registry | `IndexTypeField/index.ts:18,33` | default-export object keyed by component name |
| Render branch | `DataSourceForm.tsx:503-521` | `field.value === INDEX_TYPES.CONFLUENCE && <IndexTypeField.Confluence …/>` |
| Validation | `hooks/useEditPopupForm.ts:177-180` | `cql` conditional `.required()` on `indexType` |
| `setting_id` required list | `hooks/useEditPopupForm.ts:193-208` | array of index types that require an integration |
| Form defaults (create) | `hooks/useEditPopupForm.ts:352` | `cql: ''` |
| Form defaults (edit) | `hooks/useEditPopupForm.ts:406` | `cql: defaults?.confluence?.cql ?? ''` |
| Credential filtering | `hooks/useEditPopup.ts:52` | `filteredSettings[INDEX_TYPES.CONFLUENCE] = getSettingOptions(INDEX_TYPES.CONFLUENCE)` |
| Credential auto-select | `hooks/useEditPopup.ts:112-125` | when exactly 1 credential exists, auto-set `setting_id`; gated by an explicit index-type list |
| Request build | `hooks/useCreateIndex.ts:258-272` | `createOrUpdateConfluenceIndex()` — spread `getBaseRequestFields` + type fields |
| Create/update dispatch | `hooks/useCreateIndex.ts:132-133` | `switch (values.indexType)` |
| Health-check options | `hooks/useCreateIndex.ts:89` | per-type map of extra health-check payload |
| Store create | `src/store/dataSources.ts:367-369` | `createKBIndexConfluence(indexConfig)` → `POST v1/index/knowledge_base/confluence` |
| Store update | `src/store/dataSources.ts:277-288` | generic `updateKBIndex(indexType, body, fullReindex, incrementalReindex)` → `PUT v1/index/knowledge_base/{code}` |
| Details view | `DataSourceDetails.tsx:520-527` | `indexType === INDEX_TYPES.CONFLUENCE && <row>CQL expression</row>` |
| Response types | `src/types/entity/dataSource.ts:171` (`DataSourceDetailsResponse.confluence: any`), `:112-135` (`DataSource`, typed sub-objects) | `DataSource` has typed optional sub-objects for ADO/SharePoint; `DataSourceDetailsResponse` uses `any` for the older ones |
| Reindex capability | `pages/dataSources/utils/dataSourceUtils.ts:75,110,181-189,261-266` | `canFullReindex`, `canForceReindex`, `performFullReindex`, `performResumeIndexing` |
| Edit-page guard | `DataSourceEditPage.tsx:57` | `isConfluenceIndex(item)` in an "is editable" predicate |
| Icon | `DataSourceTypeIcon.tsx:19,34` | `@/assets/icons/confluence.svg?react`; map falls back to `IconCode` |
| Label | `src/utils/helpers.ts:114-142` | `humanize()` — special-cases `xray`/`google`/`sharepoint`/`svn`, else capitalize per `_`-segment |

### 3. Credential side — **already implemented**

`XWIKI` is already a first-class credential type in the UI. No new credential work is required:

- `src/utils/settingsUIConfig.ts:58` — `const XWIKI_URL = dynDefault('xwiki', 'url')`
- `src/utils/settingsUIConfig.ts:671-703` — full `xwiki` entry in `CREDENTIAL_UI_MAPPING`:
  `displayName: 'xWiki'`, `serverEnum: 'XWiki'`, fields `url` (required + URL validation),
  `use_bearer` (switch), `username` (shown when `!use_bearer`, required for basic auth),
  `token` (sensitive, required, placeholder flips on `use_bearer`).
- `src/store/appInfo.ts:29` — `xwikiconfig: { credentialType: 'xwiki', fields: ['url', 'use_bearer'] }`
  feeds server-side defaults/placeholders.
- `src/utils/settings.ts:~168` — `getCredentialType()` maps any name containing `xwiki` → `'xwiki'`.

Note the UI credential has **four** fields (`url`, `use_bearer`, `username`, `token`); the ticket text
mentions three (`url`, `token`, `username`). `use_bearer` is a pre-existing UI-side auth-mode toggle.
Out of scope to change.

**Credential lookup key**: `userSettingsStore.indexSettings()` (`src/store/userSettings.ts:153-178`)
groups settings by `setting.credential_type.toLowerCase()`. Since `INDEX_TYPES.XWIKI` will be the
string `'xwiki'` and the credential type is `'xwiki'`, `getSettingOptions(INDEX_TYPES.XWIKI)` works
with **no** `credentialType` override on `IntegrationSection` — same as Confluence/Jira, unlike
Azure DevOps Wiki which passes `credentialType="azuredevops"`.

### 4. Icon convention

`src/assets/icons/*.svg`, imported with the `?react` suffix (vite-plugin-svgr) as a React component,
mapped in `DataSourceTypeIcon.tsx`. `ls src/assets/icons | grep -i wiki` → **no xwiki asset exists**.
The map has `?? IconCode` as fallback, so an unmapped type degrades gracefully to the generic code
icon (this is what Azure DevOps Wiki/Work Item already do — both map to `IconCode`).

### 5. Testing

- Framework: **vitest**, two projects declared in `vitest.workspace.ts`:
  - `unit` — `**/__tests__/**/*.test.tsx` excluding `*.integration.test.*`, mocks Valtio + stores.
  - `integration` — `**/__tests__/**/*.integration.test.tsx`, real Valtio + real stores + mocked API.
- Commands: `npm run test:unit`, `npm run test:integration`, `npm test` (both),
  `npm run lint`, `npm run typecheck`, `npm run build` (typecheck + vite build).
  Pre-commit gate: `npm run check:pre-commit` = typecheck + lint.
  Also enforced: `npm run license-headers:check` — **every new source file needs the Apache-2.0 header**.
- Relevant existing tests:
  - `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` (104 lines) — drives the
    real create page, selects a datasource type, asserts fields/validation. Google Docs is the example.
  - `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx` (127 lines) — renders details
    for a given `index_type` and asserts rows.
  - `.../hooks/__tests__/useEditPopupForm.validation.test.ts` — direct Yup schema assertions; cheapest
    place to cover the `space` required rule.
  - `src/pages/dataSources/__tests__/constants.test.ts` — plain constant/util assertions.
  - `src/utils/__tests__/helpers.test.ts` — where a `humanize('xwiki')` case belongs.
- SVG imports must be mocked in unit tests: `vi.mock('@/assets/icons/x.svg?react', () => ({ default: () => null }))`.

## Risk Indicators

1. **Add-to-`INDEX_TYPES`-only is a trap.** Adding the constant instantly surfaces the type in the
   creation dropdown *and* the list filter, but with no render branch in `DataSourceForm.tsx:424-628`
   the form body is empty. Constant and render branch must land together.
2. **`isConfluenceIndex` uses substring matching** (`index_type.includes('confluence')`). A new
   `isXWikiIndex` must use `INDEX_TYPES.XWIKI` and be aware that `'knowledge_base_xwiki'.includes('xwiki')`
   is true — safe here, but no other type contains `xwiki` as a substring, so no collision.
3. **`humanize('xwiki')` yields `"Xwiki"`**, not `"xWiki"`. The label appears in the type dropdown,
   the filter list, and `getIndexTypeDisplay` output. `humanize()` already carries four special cases
   (`xray`, `google`, `sharepoint`, `svn`); a fifth is the established pattern. `capitalize()` is applied
   per `_`-segment, so there is no way to get lowercase-leading `xWiki` without a special case.
4. **Two separate lists must both be updated for `setting_id`:**
   `useEditPopupForm.ts:193-208` (required validation) and `useEditPopup.ts:112-125` (single-credential
   auto-select). Missing the second is silent — the user just has to pick manually.
   Contract says `setting_id` is *optional* on the API; Confluence/Jira/ADO all mark it required in
   the UI. **Open question for the spec: follow the analogue (required) or the contract (optional)?**
5. **`filteredSettings` map** (`useEditPopup.ts:50-63`) must gain an `xwiki` key, otherwise
   `hasNoSettings()` returns `true` forever and the dropdown never renders — only the
   "Add User Integration" button shows.
6. **Reindex predicates are opt-in allowlists.** `canFullReindex` / `canForceReindex`
   (`dataSourceUtils.ts:65-118`) end with `return !isKBIndex(item)` — a `knowledge_base_*` type that is
   not explicitly listed gets **no reindex actions at all**. Same for `performFullReindex`'s
   `else if` chain (falls through to `updateApplicationIndex`, which is wrong for a KB index) and
   `DataSourceEditPage.tsx:57`'s editability predicate.
7. ~~`guardrail_assignments` / `timezone` may not be accepted.~~ **Resolved** — see "Live contract
   verification" below. Both are on the request schema; `getBaseRequestFields` is safe as-is.
8. **Health check is implemented for xWiki** and must be wired. `useCreateIndex.ts:85-103` runs a
   health check for *every* type before create. `DatasourceHealthCheckRequest` accepts `space` and
   `wiki`, so xWiki needs an entry in the `healthCheckOptions` map — **and** the options parameter
   type on `dataSourceStore.healthCheckDatasource` (`src/store/dataSources.ts:310-319`) needs
   `space`/`wiki` added, plus the corresponding conditional spread at `:326-333`. Omitting this
   silently posts no space and the pre-create validation is useless.
9. ~~Unknown edit-mode response shape.~~ **Resolved** — the backend returns `xwiki: { space, wiki }`.
10. **`DataSourceDetailsResponse.confluence` is `any`.** Newer types (`sharepoint`, `azure_devops_wiki`)
    use structured optional sub-objects on `DataSource`. Prefer the newer, typed style for `xwiki`.
11. **License headers** — CI check; every new `.tsx`/`.ts` file needs the Apache-2.0 block.
12. ~~`compareFormData` may enumerate fields explicitly.~~ **Resolved** — it does a generic
    `lodash/isEqual` over the whole form object with a few normalizations
    (`compareFormData.ts:24-49`). New fields are covered automatically; no change needed.

## Live contract verification (backend branch on :8080)

Fetched `http://localhost:8080/openapi.json` and read the generated schemas. Everything below is
observed, not assumed.

**`POST /v1/index/knowledge_base/xwiki` → `IndexKnowledgeBaseXWikiRequest`**
required: `name`, `project_name`, `description`, `space`

| field | schema |
|---|---|
| `name` | string, 4..50, `^[a-zA-Z0-9][\w-]*$` |
| `project_name` | string |
| `description` | string, 1..500 |
| `space` | string, minLength 1 |
| `wiki` | string, minLength 1, **default `"xwiki"`** |
| `project_space_visible` | bool \| null, default `false` |
| `setting_id` | string \| null |
| `embedding_model` | string \| null |
| `cron_expression` | string \| null |
| `guardrail_assignments` | `GuardrailAssignmentItem[]` \| null |
| `timezone` | string \| null |

Matches the ticket verbatim, and additionally confirms `guardrail_assignments` + `timezone` are
accepted — so the shared `getBaseRequestFields` spread needs no special-casing.

**`PUT /v1/index/knowledge_base/xwiki` → `UpdateKnowledgeBaseXWikiRequest`**
required: `name`, `project_name`; optional: `space`, `wiki`, `setting_id`, `new_project_name`,
`description` (default `""`), `project_space_visible`, `cron_expression`, `guardrail_assignments`,
`timezone`. Note `embedding_model` is **not** on the update schema — same as the other KB types.

**Response** — `IndexInfo.xwiki` → `XWikiIndexInfo { space: string (required), wiki: string (default "xwiki") }`.
So the edit-form prefill path is `defaults?.xwiki?.space` / `defaults?.xwiki?.wiki`, and the details
view reads `dataSource.xwiki?.space` / `?.wiki`.

**Health check** — `DatasourceHealthCheckRequest` already carries `space` and `wiki`
(both optional, `wiki` defaulting to `"xwiki"`) alongside the existing `cql`/`jql`/`wiki_query`/etc.
xWiki health checking is implemented backend-side and must be wired from the UI (risk #8).
