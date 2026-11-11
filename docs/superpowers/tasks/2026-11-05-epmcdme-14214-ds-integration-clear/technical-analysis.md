# Technical Research

**Task**: datasource form integration clear
**Generated**: 2026-11-05
**Research path**: filesystem (two repos: `repos/codemie-ui` = UI, `repos/codemie` = BE; both on `EPMCDME-14214_fix-ds-integration-clear-on-edit`, no commits ahead of `main`)

---

## 1. Original Context

lets quickly fix https://jiraeu.epam.com/browse/EPMCDME-14214. 
issues: clicking clear button on ds form causes it to be cleared only on create page. on edit page it changes to default integration.
Backend seems to not accept empty integration not being set at all

---

## 2. Codebase Findings

### Existing Implementations

**Purpose A: "When I click X on the integration select, the field shows empty"**
- UI `IntegrationSelectDropdown.tsx:107-110` (`src/pages/assistants/components/AssistantForm/components/Toolkits/`). PrimeReact `Select showClear`. On clear `e.target.value` is null, so `settingsDefinitions.find(...)!` returns `undefined`, and the code calls `onChange(undefined)`. The `!` is false at runtime. It is shared with 10 other consumers (assistant toolkits, MCP, MissingIntegrationsModal, MCPTestIntegrationModal, UserMapping).
- UI `IntegrationSection.tsx:94-115` (`DataSourceForm/IndexTypeField/shared/`). A RHF `Controller name="setting_id"` with `onChange={(setting) => settingField.onChange(setting?.id)}` at :112, so a clear writes **`undefined`** to the form. Every datasource type that has an integration uses it. Git (`IndexTypeGit.tsx:179`) and Git FAQ (`IndexTypeFaq.tsx:133`) pass `isRequired={false}`.
- react-hook-form 7.56.4 (`node_modules/react-hook-form/dist/index.esm.mjs`):
  - `useController` :363 passes `defaultValue = get(_formValues, name, ...)`, which is the field value at the Controller's **first render**.
  - `useWatch` :317 stores that in `useRef(defaultValue)`, and :326 re-emits through `generateWatchOutput` :289 → `get(formValues, name, defaultValue)`.
  - `get` :74-77 returns `defaultValue` when the value is `undefined`. So a Controller whose value is set to `undefined` shows its mount-time value again.
- **Root cause (UI display):**
  - Edit page: `DataSourceForm.tsx:323` renders a Spinner while `isInitializing`. `useEditPopupForm.ts:438-441` runs `reset(mapDetailsToFormValues(...))` on mount (`mapDetailsToFormValues.ts:86` `setting_id: defaults?.setting_id ?? ''`). The Controller therefore mounts after reset, with the **saved** setting_id as its mount-time value. Clear → `undefined` → the saved integration reappears.
  - Create page: mount-time value is `''` (`useEditPopupForm.ts:406`), so the clear shows empty.

**Purpose B: "My cleared choice reaches the backend"** (`useCreateIndex.ts`, `useIndexCreation`)
- After a clear the submitted `values.setting_id` is `undefined`. RHF form state really holds `undefined`; only the display falls back.
- Git update :207: `values.setting_id || (index.setting_id ? '' : request.setting_id)` sends `''` when a saved one existed. The comment there records the intent.
- Git create :190: `undefined`, which `JSON.stringify` omits.
- Git FAQ update :232: `''` only inside `withReindex`. `hasSourceChanged` :65 compares `(values.setting_id ?? '') !== (index.setting_id ?? '')`, so a clear forces `withReindex`.
- Git FAQ create :245 and Google :293: `|| undefined`.
- Confluence :320, XWiki :336, Jira :365, Xray :393, AzDO wiki :421, work item :449 and SVN :544 send `values.setting_id` raw, so a clear is omitted.
- SharePoint :497/:510.
- Yup `useEditPopupForm.ts:219-236` makes setting_id required for JIRA/XRAY/CONFLUENCE/XWIKI/AZDO×2/GOOGLE and SharePoint-integration mode. GIT and GIT_FAQ are excluded on purpose (comment cites `_validate_git_credentials`). SVN is not in the list, but its `IntegrationSection` defaults to `isRequired=true`.

**Purpose C: "Backend stores 'no integration' when I clear it"**
- BE `IndexInfo.update_index`, `src/codemie/rest_api/models/index.py:942`: `if setting_id: self.setting_id = setting_id`. Both `''` and `None` are **ignored**, so a stored integration can never be removed through it. It has 15 call sites in 10 files: `kb_atlassian`, `kb_azure_devops`, `kb_xwiki`, `kb_google`, `kb_sharepoint`, `kb_git_faq`, `_repository_support`, `jira_datasource_processor`, `file_datasource_service` and `models/index.py`.
- Git update `PUT /application/{app}/index/{repo}`, `code_repositories.py:311-380`:
  - When `request.name` is set (:373), it calls `_handle_index_and_repository_update` (`_repository_support.py:103-143`).
  - The `index_patch` includes `setting_id=''` when the field was sent, and `update_index` ignores it.
  - The repo loop (:136-142) skips only `None`, so `GitRepo.setting_id = ''`.
  - `_validate_git_credentials(setting_id=repository.setting_id)` (`_common.py:112-130`) then runs a public-access probe. Empty or omitted is **not rejected** unless the repo is private (422 "Repository Not Publicly Accessible").
  - Result: GitRepo is cleared and IndexInfo is not. `CodeDatasourceProcessor._init_loader` (`datasource/code/code_datasource_processor.py:114`) reads `self.index.setting_id`, so reindex keeps using the old credentials, and the details the UI loads still show the old integration.
- Git FAQ update `kb_git_faq.py:133-135` maps `''` to `None` ("empty string means integration cleared"), then calls `update_index(setting_id=None)`, which is a no-op at index.py:942. The test `tests/codemie/rest_api/routers/test_index_git_faq.py:176-200` mocks `update_index` and asserts only the kwarg, so it passes while the real clear does not happen.
- SVN `_repository_support.py:84,92-99`: same split. `update_index` ignores the value; the svn repo gets `''`.
- Atlassian/AzDO/XWiki reindex paths use `request.setting_id or kb_index.setting_id` (`kb_atlassian.py:253,307,422`, `kb_azure_devops.py:135,245`, `kb_xwiki.py:153`). SharePoint uses `request.setting_id if request.setting_id is not None else kb_index.setting_id` (`kb_sharepoint.py:171,225`).
- Request models: `UpdateIndexRequest.setting_id: Optional[str] = None` (`models/index.py:1597`), and the same for all KB update requests (:1454-1785).

**Other touched code**
- UI `useEditPopup.ts:107-139`: an effect on `[projectName, indexType]`. When exactly one integration option exists, it `setValue('setting_id', options[0].id)` for JIRA/XRAY/CONFLUENCE/XWIKI/**GIT**/SVN/AZDO×2/SHAREPOINT/GOOGLE. It does not react to a clear. It re-runs when `reset` changes `indexType` away from the form default `GIT` (`useEditPopupForm.ts:383`), so on edit it can override the saved value for a non-Git type with a single option.

### Decisions Already in the Code
- `''` is the established "cleared" sentinel and absent/`None` means "keep". It shows in the comments at UI `useCreateIndex.ts:205-207,229-232` and BE `kb_git_faq.py:134`. The alternative (`None` meaning clear) conflicts with `update_index` callers that pass `None` for "not provided" (`kb_atlassian`/`kb_azure_devops`/`kb_xwiki` `or kb_index.setting_id`), and with the tests `test_index.py:799-883` ("uses_stored_setting_id_when_request_setting_id_is_none").
- Git update uses PATCH semantics through `model_fields_set` (`_repository_support.py:119-121,136-137`). Recorded reason: none found.
- `update_index` uses truthy guards for most fields (description, embeddings_model, setting_id). It uses `"key" in kwargs` for prompt and files_filter (index.py:917-923), which is the existing way to allow clearing.
- Git and Git FAQ need no integration for public repos (Yup comment `useEditPopupForm.ts:222-224`; `_common.py:125-133`).

### Task Statements Checked Against the Code
- "cleared only on create page; on edit page it changes to default integration": **holds**. The RHF mount-time default fallback explains it (Purpose A). The "default" is the integration that was in the form when the Controller mounted: the saved one, or the one `useEditPopup` auto-selected.
- "Backend seems to not accept empty integration / not being set at all": **holds in effect, not as rejection**. No validator rejects `''` or omission (only private Git repos get a 422). An omitted value keeps the old one by design. `''` is silently dropped for `IndexInfo` at `index.py:942`, while GitRepo/SVNRepo store `''`.

### Consumers of Changed Contracts
- `IndexInfo.update_index(setting_id=...)` guard at index.py:942: 15 callers (listed above). Callers that pass `request.setting_id or kb.setting_id` never send `''`. Git (`_repository_support.py:119`), SVN (:84) and Git FAQ (`kb_git_faq.py:135`, which sends `None`) pass the raw request value. Google, File and the Jira processor call it with other fields.
- `IntegrationSelectDropdown` `onChange(undefined)` on clear has 10 non-datasource consumers. Only the datasource `IntegrationSection` feeds a RHF Controller with the mount-time fallback.
- Readers of the stored `IndexInfo.setting_id`: `code_datasource_processor.py:114`, `index_encrypted_settings_service.py:51,91`, `kb_git_faq.py:191,231`, `kb_google.py:161,223`, and the details response the UI maps at `mapDetailsToFormValues.ts:86`.

### Architecture and Layers Affected
- UI: form component (`IntegrationSection`), shared select (`IntegrationSelectDropdown`), form hooks (`useEditPopupForm`, `useEditPopup`, `useCreateIndex`).
- BE: routers (`code_repositories`, `_repository_support`, `kb_git_faq`) and the model (`IndexInfo.update_index`).

### Integration Points
- UI → `dataSourceStore.updateApplicationIndex` / `updateKBIndex` / `updateApplicationSvnIndex` → BE `PUT /v1/application/{app}/index/{repo}`, `PUT /v1/index/knowledge_base/*`.
- BE Git → `GitBatchLoader.test_public_access`, `SettingsService.get_git_creds`.

### Patterns and Conventions
- RHF `Controller` + yupResolver, `mode: 'onChange'`. Valtio `userSettingsStore.settings` provides the options.
- BE Pydantic `model_fields_set` to tell "sent" from "default".

---

## 3. Documentation Findings

### Guides and Architecture Docs
UI `AGENTS.md` and `.ai-run/guides/` cover form patterns (`patterns/form-patterns.md`) and testing (`testing/testing-patterns.md`). BE `.ai-run/guides/` exists (api/, data/, testing/). Neither guide addresses integration clearing.

### Architectural Decisions
- Prior attempt `origin/EPMCDME-14214_fix-git-datasource-integration-clearing` (UI only, 6 commits 2026-08-19..28, unmerged, not in BE):
  - `IntegrationSection` `setting?.id ?? ''`. This would avoid the RHF fallback, because `''` is not `undefined`.
  - Drops GIT from the `useEditPopup` auto-select list.
  - Removes the `!` in the dropdown.
  - Adds tests (IntegrationSelectDropdown, IntegrationSection, useEditPopup, useCreateIndex) and an unrelated MarkdownTokens key change.
  - Its spec states "Backend changes out of scope — the existing endpoint already accepts `setting_id: ""`". That is **contradicted** by `index.py:942`: the endpoint accepts `''` and drops it for IndexInfo.

### Derived Conventions
`''` = cleared, absent = keep, applied at the UI request builder (see Decisions).

---

## 4. Testing Landscape

### Existing Coverage
- UI (Vitest + RTL): `IntegrationSection.test.tsx` (no-settings, dropdown and refresh states; **no clear case**). Also `IntegrationSelectDropdown.test.tsx`, `IntegrationSelector.test.tsx`, `useEditPopupForm*.test.ts`, `useCreateIndex.xwiki.test.ts`.
- BE (pytest): `tests/codemie/rest_api/models/test_index_info.py:82-145` (update_index sets setting_id="test-id"; no clear case), `test_index.py:360,418` (Git update field mapping), `test_index.py:799-883` (stored-fallback reindex), `test_index_git_validation.py`, `test_index_git_faq.py:176` (mocked clear).

### Testing Framework and Patterns
UI: Vitest `unit`/`integration` projects and `renderHook`. BE: pytest with `@patch` of router collaborators and `app_client`.

### Coverage Gaps
- UI: the clear→display path on the edit page (Controller mounted after reset), and the payload after a clear in `useCreateIndex` for edit.
- BE: `update_index` with `''`/`None` for setting_id against a real model, and the end-to-end Git update clear (IndexInfo plus GitRepo).

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
None. Ignore the uncommitted BE `datasource/loader/git_loader.py` change (local workaround).

---

## 6. Risk Indicators

- The `index.py:942` guard is shared by 15 callers. Some pass `None` meaning "not provided" (see Consumers), so a semantics change there spreads beyond Git.
- After a Git clear today, GitRepo (`''`) and IndexInfo (old id) disagree. Reindex uses `index.setting_id` (`code_datasource_processor.py:114`), while the credential validation uses `repository.setting_id`.
- `test_index_git_faq.py:176` asserts a clear that does not happen in the real model (mocked `update_index`).
- `useEditPopup.ts:121-135` auto-select (includes GIT) can override the saved integration on edit after `reset` changes `indexType`. It is a separate "default integration" path from the clear bug (Existing Implementations → Other touched code).
- `IntegrationSelectDropdown` is shared by about 10 non-datasource consumers. Changing its clear payload affects assistant and MCP forms.
- Speculative: required types (Jira/Confluence etc.) show the saved integration after a clear while Yup reports "Integration is required". That inconsistency would surface once the display is fixed.
- The prior branch's assumption that "BE already accepts `''`" is contradicted (Section 3).

---

## 7. Summary for Complexity Assessment

The bug has two independent causes, one per repo.

In codemie-ui, the datasource `IntegrationSection` writes `undefined` into a react-hook-form Controller when the clear icon is clicked. RHF 7.56 then falls back to the value the Controller had at first render. On the edit page that value is the saved integration, because the form only renders after `reset(details)`. On the create page it is `''`. The request builders in `useCreateIndex.ts` already turn a cleared Git/Git FAQ value into `''` on update. The other types send it raw (omitted), and most of them are blocked by the Yup required rule anyway.

In codemie, `IndexInfo.update_index` (`models/index.py:942`) assigns `setting_id` only when truthy. So the `''` the UI sends for Git, the `None` that Git FAQ maps to, and SVN's value never clear the stored integration. GitRepo/SVNRepo do store `''`, which leaves the repo and the index inconsistent, and the Git reindex reads the index's stale value. The backend rejects nothing (only a private Git repo without credentials gets a 422).

The change surface is small: one or two UI files (`IntegrationSection.tsx`, possibly `useEditPopup.ts`) and one or two BE files (`models/index.py`, `kb_git_faq.py`). There are no new patterns. The main risk is the shared `update_index` guard, which has 15 callers with mixed `None` meanings. Test posture: there are UI and BE tests around these files, but none cover a real clear on edit, and the BE Git FAQ clear test is mocked. A prior unmerged UI-only attempt exists (`origin/EPMCDME-14214_fix-git-datasource-integration-clearing`). It normalizes the clear to `''` and drops GIT from auto-select, and it wrongly assumes the backend already accepts `''`.

---

## 8. External References

- `https://jiraeu.epam.com/browse/EPMCDME-14214` was not fetched (no Jira access from the filesystem path). The ticket text used is the task_context summary only.
