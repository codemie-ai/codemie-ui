# EPMCDME-14214 Datasource Integration Clear on Edit — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clearing the integration on the datasource edit form stays cleared in the UI and, for optional-integration types (Git, Git FAQ, SVN), is persisted as "no integration" on the backend.

**Architecture:** On the backend, `IndexInfo.update_index` treats `setting_id == ''` as "clear", stored as `None`. Its `None` or omitted value still means "keep". Git FAQ stops turning `''` into `None` before the call. On the UI, the datasource `IntegrationSection` writes `''` on clear, so react-hook-form (RHF) no longer falls back to the mount-time value, and `useEditPopup` stops auto-selecting on edit.

**Tech Stack:** BE Python/FastAPI/SQLModel, pytest. UI React/TS, react-hook-form 7.56, Vitest + RTL.

**Requirements source:** inline (EPMCDME-14214). Research: `technical-analysis.md` in this folder.

## Acceptance criteria

- [ ] Edit page: clicking clear on the integration select leaves it empty. It does not revert to the saved or a default integration while the user stays on the form.
- [ ] Saving an edited Git, Git FAQ or SVN datasource after a clear stores `setting_id = None` on `IndexInfo`, and the GitRepo/SVNRepo `setting_id` is empty (falsy). Reindex runs with no credentials.
- [ ] Required-integration types (Jira, Xray, Confluence, XWiki, AzDO wiki/work item, Google, SharePoint-integration) still show "Integration is required" after a clear.
- [ ] Create-page behavior is unchanged.
- [ ] Edit page: auto-select never overrides the saved value or a cleared value.

## Global Constraints

- Repos: BE `repos/codemie`, UI `repos/codemie-ui`, both on branch `EPMCDME-14214_fix-ds-integration-clear-on-edit`.
- Commit per task using the repository's existing convention (`EPMCDME-14214: <summary>`).
- BE: do not stage or touch `src/codemie/datasource/loader/git_loader.py` or the stray `NUL` file.
- BE contract for `update_index(setting_id=...)`: `''` clears (stored `None`), and `None`/omitted keeps. Do not add new parameters or flags.
- BE: no new GitRepo/SVNRepo clearing code. The existing repo assignment loops in `_repository_support.py` already write `''`. Change production code there only if a Task 1 test proves it is needed.
- UI: do not change `IntegrationSelectDropdown` or `IntegrationSelector`.
- `origin/EPMCDME-14214_fix-git-datasource-integration-clearing` is a reference only.
- Test commands: BE `poetry run pytest <path> -v`. UI `npx vitest run --project unit <path>`.

## Caller check (`update_index` setting_id guard)

None of the 15 callers relies on `''` meaning "not provided":

- Atlassian (`kb_atlassian.py:240,333,409`), AzDO (`kb_azure_devops.py:122,232`), XWiki (`kb_xwiki.py:140`), SharePoint (`kb_sharepoint.py:273`), SVN (`_repository_support.py:84`) and Git (`:117` via `index_patch`) pass `request.setting_id` raw. Every request model defaults it to `None`.
- Google, File (`file_datasource_service.py:197`) and the Jira processor do not pass `setting_id`. Git FAQ passes `None` today (changed in Task 2).
- Clients:
  - UI: sends `''` for SharePoint only on create (`useCreateIndex.ts:510`). The SharePoint update omits `setting_id` for Microsoft auth (:485-497).
  - IaC: `converters.ts:268` sends `settingId || undefined`.
  - Python SDK: has no `''` default.
- Tests: only `test_index_git_faq.py:185` sends `''`, and it is rewritten in Task 2.

## Review Focus

1. A Git, SVN or Git FAQ update with `setting_id: null` or with the field omitted keeps the stored integration (Tasks 1 and 2 tests).
2. A Jira datasource cleared on edit gets a validation error, and the saved integration does not reappear (Task 3 test).
3. A cleared value stays empty after another field changes and the form re-renders (Task 3 test).
4. Clearing a datasource that never had an integration is a no-op with no error (Task 1 test).
5. An API client that sends `''` to a required-type update (Jira, Confluence, SharePoint) now clears the integration, and the SharePoint reindex at `kb_sharepoint.py:171,225` then resolves `''`. The UI never sends this, because Yup blocks it. This is accepted under the new contract, so a reviewer should not flag it as a regression.

---

### Task 1 (BE `repos/codemie`): `update_index` treats `''` as clear; Git and SVN coverage

**Files:**
- Modify `src/codemie/rest_api/models/index.py:942-943`.
- Test `tests/codemie/rest_api/models/test_index_info.py`.
- Test `tests/codemie/rest_api/routers/test_index.py` (Git).
- Test the new `tests/codemie/rest_api/routers/test_repository_support.py` (SVN).

**Interfaces:** Produces `update_index(setting_id='')`, which sets `self.setting_id = None`. With `setting_id=None` the value is unchanged, and with a non-empty id it is replaced. The signature does not change.

Test-first: yes — `test_update_index_empty_setting_id_clears` fails because `if setting_id:` drops `''` and the value stays `"old"`.

- [ ] Model tests next to `test_update_index_fields_should_be_updated` use the `index_info` and `mock_update_path` fixtures and start from `setting_id="old"`:
  - `test_update_index_empty_setting_id_clears`: after `setting_id=""`, the value is `None`.
  - `test_update_index_none_setting_id_keeps_value`: the value stays `"old"`.
  - `test_update_index_empty_setting_id_when_already_none`: no error, the value stays `None`.
- [ ] Git route tests copy the decorators and fixtures from `test_update_index_omitted_fields_not_assigned_to_repository` (`test_index.py:426`). `mock_filter` returns a real `IndexInfo(setting_id="old", ...)` with `BaseModelWithSQLSupport.update` patched, and the repo is `m_git_repo.setting_id = "old"`.
  - `test_update_index_empty_setting_id_clears_index_and_repo`: payload `{"name": DEMO, "setting_id": ""}`. Assert `index.setting_id is None` and `not m_git_repo.setting_id`.
  - `test_update_index_null_setting_id_keeps_integration`: payload `"setting_id": None`. Assert both values stay `"old"`.
- [ ] SVN tests: call `_update_svn_index_and_repo_fields` directly with a real `IndexInfo` (update patched), a `MagicMock` `svn_repo` with `setting_id="old"`, and `UpdateIndexRequest(name="r", setting_id=...)`.
  - `test_update_svn_fields_empty_setting_id_clears_index_and_repo`: with `""`, the index is `None` and the repo is falsy.
  - `test_update_svn_fields_none_setting_id_keeps_integration`: both stay `"old"`.
- [ ] Run the tests and confirm that the empty-string cases fail. Change :942-943 to `if setting_id is not None: self.setting_id = setting_id or None`. Run the new tests plus `test_index_info.py` and `test_index.py` and confirm they pass. The stored-fallback tests at `test_index.py:799-939` must stay green.

### Task 2 (BE `repos/codemie`): Git FAQ update performs a real clear

**Files:** Modify `src/codemie/rest_api/routers/index/kb_git_faq.py:133-135`. Test `tests/codemie/rest_api/routers/test_index_git_faq.py:166-196`.

**Interfaces:** Consumes the Task 1 contract (`''` clears).

Test-first: yes — the rewritten `test_update_faq_clears_integration_with_empty_string` fails because the route passes `None` and the real `IndexInfo` keeps `"old-integration-id"`.

- [ ] Rewrite the test.
  - `mock_filter` returns a real `IndexInfo(project_name="test_project", repo_name="test_faq_index", index_type=<git faq type>, link="https://github.com/o/r", setting_id="old-integration-id")`. Patch `codemie.rest_api.models.base.BaseModelWithSQLSupport.update`.
  - Assert status 200 and `index.setting_id is None`.
  - Assert `mock_validate.assert_not_called()`, so reindex runs with no credentials.
  - Assert that `mock_build` received the same index.
  - Add `test_update_faq_null_setting_id_keeps_integration`: the request omits `setting_id`, other source fields stay as they are, and the index keeps `"old-integration-id"`.
- [ ] Run the tests and confirm they fail. Replace `request.setting_id or None` with `request.setting_id`, and update the comment so it says `''` reaches `update_index` and clears there. Run `test_index_git_faq.py` and confirm it passes.

### Task 3 (UI `repos/codemie-ui`): clear in `IntegrationSection` writes `''`

**Files:** Modify `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/IntegrationSection.tsx:112`. Test `.../shared/__tests__/IntegrationSection.test.tsx`.

**Interfaces:** After a clear, the form's `setting_id` is `''`, never `undefined`. The `useCreateIndex.ts` builders already handle `''`: Git update :207, Git FAQ :232, SVN :544 sends it raw.

Test-first: yes — after a clear in a form mounted with `setting_id: 's-1'`, the selector still shows "My Confluence".

- [ ] Extend `TestWrapper` with an optional `defaultValues` prop, passed to `useForm`, and a `getValues` spy prop.
  - `restores nothing after clear when mounted with a saved integration`: mount with `{ setting_id: 's-1' }`, click the PrimeReact clear icon. Assert the placeholder shows, "My Confluence" is absent and `getValues('setting_id') === ''`.
  - `stays empty after an unrelated re-render`: rerender the wrapper after the clear and assert the placeholder still shows.
  - Required-type check: wire `yupResolver` with the `setting_id` rule from `useEditPopupForm.ts:219-236` for `indexType: 'confluence'`. Trigger validation and assert "Integration is required".
- [ ] Run the tests and confirm they fail. Change the `onChange` to `settingField.onChange(setting?.id ?? '')`. Run them and confirm they pass.

### Task 4 (UI `repos/codemie-ui`): no auto-select on the edit page

**Files:** Modify `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopup.ts:107-139`. Test the new file `.../hooks/__tests__/useEditPopup.test.ts`.

**Interfaces:** No signature change. The effect reads `getValues('isEditing')`, which `reset(mapDetailsToFormValues(..., { isEditing: true }))` sets on edit.

Test-first: yes — with `isEditing: true`, `indexType: 'jira'` and exactly one Jira option, `setValue('setting_id', <option id>)` is still called.

- [ ] Use `renderHook` with mocked `userSettingsStore`/`valtio.useSnapshot`, and stub `getValues`/`setValue`/`watch`.
  - `does not auto-select on edit`: with `isEditing: true`, assert `setValue` is never called with `'setting_id'`.
  - `still auto-selects on create`: with `isEditing: false`, assert `setValue('setting_id', 'only-id')`.
- [ ] Run the tests and confirm they fail. Make the single-option branch return early when `getValues('isEditing')` is true. Leave the `else if` project-change branch unchanged. Run the tests and confirm they pass.
