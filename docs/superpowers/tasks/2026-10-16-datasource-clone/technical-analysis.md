# Technical Research

**Task**: datasource data-source clone index assistant workflow clone prefill permissions (EPMCDME-15790)
**Generated**: 2026-10-16
**Research path**: filesystem

---

## 1. Original Context

Jira EPMCDME-15790 "Add a Clone action to create a Data Source from an existing Data Source template". Add a Clone action (Data Sources list and details pages) that opens the Data Source creation flow prefilled with the source's applicable configuration; user supplies unique name, edits values, saves -> new independent Data Source; original unchanged; respects existing permissions (view source + create); existing create/edit/indexing flows must not regress. Affected areas per ticket: list/details pages, action controls, creation flow/form prefill, config validation, creation backend/API, permission validation. Acceptance criteria: (1) users with create permission see Clone for datasources they can view; (2) Clone opens creation flow prefilled; (3) user can edit prefilled values; (4) unique name required, existing validation rules apply; (5) save creates separate datasource; (6) independence between clone and source; (7) respects existing access permissions; (8) no regression in create/edit/indexing. Reference: Clone already exists for assistants and workflows in both repos — compare against those implementations (how is prefill done, frontend-only vs backend endpoint, what is stripped). KEY QUESTION to answer explicitly: is a backend change required, or are frontend-only changes enough? Check in particular: whether GET datasource returns all fields needed for prefill (credentials/secrets/integration ids/settings, masked values, per-type config such as git/confluence/jira/file/google/provider), fields that must be excluded on clone (id, status, indexing state, project/created_by, etc.), whether the create API/validation accepts the prefilled payload, how permissions (view vs create, project scoping) are enforced, and whether file-type datasources (uploaded files) can be cloned frontend-only.

---

## 2. Codebase Findings

Repos: `codemie` (Python/FastAPI, SQLModel/Postgres, Poetry) and `codemie-ui` (React 18/TS, Vite, Valtio, react-hook-form + Yup). Paths below: BE = `C:/Epam/codemie-dev/codemie/src/codemie`, UI = `C:/Epam/codemie-dev/codemie-ui/src`.

### Existing Implementations (reference Clone: assistants / workflows) — frontend-only prefill
- Workflow: `UI/pages/workflows/components/WorkflowActions.tsx` and `WorkflowsList.tsx` add a "Clone" menu item that does `router.push({name:'clone-workflow', params:{id}})` (route const `CLONE_WORKFLOW` in `UI/constants/routes.ts:33`; router entry `UI/router.tsx:458`). `UI/pages/workflows/NewWorkflowPage.tsx:141-153` detects `isCloning = !!id`, calls `workflowsStore.getWorkflow(id)` (plain GET) and sets template `{...data, id:null, name:null}`; headline "Clone Workflow". Saved through the normal create call. No backend clone endpoint.
- Assistant: `AssistantActions.tsx:105-109` and `AssistantCard.tsx:150` route to `clone-assistant` (`router.tsx:181`). Visibility via `useAssistantFeatures().clone` (`UI/pages/chat/hooks/useAssistantFeatures.ts`) — type-based only (A2A/Bedrock opt out), NOT an ability check. `NewAssistantPage.tsx:56-147` GETs the assistant and `buildTemplate()` blanks `name, slug, id, timestamps`, resets `project` unless user-visible, nulls toolkit/tool `settings`. Create reuses the normal endpoint; only the BE addition is optional telemetry `source_assistant_id` -> `_update_source_clone_count` in `BE/rest_api/routers/assistant/management.py:65,165` (best-effort, swallowed errors, plus `AssistantCloneEventRepository`, alembic migration `9b9b4c585e54`). That is analytics, not needed for functionality.
- Datasource list/detail action surfaces: `UI/pages/dataSources/components/DataSourceActions.tsx` (`menuActions` array with `hidden:` flags; Edit/Delete use `canEdit`/`canDelete`), `UI/pages/dataSources/components/DataSourceDetails.tsx:221-260,440-470` (button row, Edit via `router.push('/data-sources/${id}/edit')`). `DataSourcesPage.tsx:99,125` has "Create Datasource" -> `/data-sources/create`.
- Datasource routes: `UI/router.tsx:292-330` (`dataSourceRoutes`, each wrapped in `FeatureGuard`; create/edit/details/list). Titles/help maps in `UI/constants/pageTitles.ts`, `helpLinks.ts` (assistant/workflow clone are registered there).
- Create page: `UI/pages/dataSources/DataSourceCreatePage.tsx` renders `DataSourceForm` with NO `index` prop; edit page `DataSourceEditPage.tsx` fetches `dataSourceStore.getIndexDetails(id)` (`GET v1/index/{id}`, `UI/store/dataSources.ts:204`) and passes `index` + `isEditing`.
- Form: `UI/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx` (746 lines), `hooks/useEditPopupForm.ts` (Yup schemas + prefill in `resetInitFormValues`, which maps GET fields -> form values and forces `isEditing:true`, runs only when `defaults.id` set), `hooks/useCreateIndex.ts` (per-type create/update branching on `!!index`), per-type fields in `IndexTypeField/*` (Git, Svn, Confluence, Jira, Xray, XWiki, AzureDevOps wiki/work item, SharePoint, Google, File, Provider, Faq).

CRITICAL coupling: in `DataSourceForm.tsx`, `index` truthiness is overloaded as "edit mode": name input `disabled={!!index}` (l.367), type selector `hidden={!!index}` (l.434), `{!index && <Divider/>}`, Google field only when `!index`, `useIndexCreation({index})` picks update vs create (`getIndexEditContext`: `isEditMode = !!index`), and `useEditPopupForm` sets `isEditing:true` which switches Yup to `makeEditingSchema` (drops `name`, relaxes `googleDoc`, `sharepointAccessToken`, csv fields, file min-count). Passing the source as `index` would therefore PUT/update the original — a clone needs a separate prefill path (new prop, e.g. `cloneFrom`, mapping to initial values with `isEditing:false`, `name:''`, and `index` undefined).

### Architecture and Layers Affected
UI: routing (`router.tsx`, `constants/routes.ts`, pageTitles/helpLinks), page (new clone page or create page reading route param), action controls (`DataSourceActions`, `DataSourceDetails`), form prefill (`useEditPopupForm`, `DataSourceForm`, `IndexTypeField/*`), store (`dataSourceStore.getIndexDetails`, existing create methods `createApplicationGitIndex`, `createKBIndex*`, `createProviderIndex`). BE (only if chosen): `rest_api/routers/index/*`, `service/index/index_service.py`, `service/provider/datasource/*`, `service/datasource/file_datasource_service.py`.

### Integration Points
- GET `v1/index/{id}` (`BE/rest_api/routers/index/queries.py:144-173`): returns `IndexInfo.model_dump()` (+`user_abilities`, `guardrail_assignments`, `cron_expression`, `timezone`) after `Ability(user).can(Action.READ, index)`. Includes `setting_id`, `link/branch/files_filter`, `confluence/jira/xray/xwiki/azure_devops_*/sharepoint` sub-objects, `embeddings_model`, `summarization_model`, `prompt`, `project_space_visible`, `vcs_type`, `index_type`, `provider_fields{provider_id,toolkit_id,base_params,create_params,otp}`, `uploaded_files` (names only). `processed_files` is truncated and `processing_info` partly nulled.
- Create endpoints (existing, one per type): `POST /application/{app}/index` (git, `application_access_check`), svn, `/index/knowledge_base/{confluence,jira,xray,xwiki,google,azure_devops_*,sharepoint,git_faq}`, `POST /index/knowledge_base/file` (multipart `files`), `POST /index/provider?toolkit_id&provider_name` (body = plain `dict`).
- Integrations are referenced by `setting_id` only (no credentials inline in IndexInfo), so integration ids prefill safely; backend revalidates (git: `_validate_git_credentials` in `routers/index/_common.py:112`; healthCheck call `dataSourceStore.healthCheckDatasource` runs before every create in `useCreateIndex.createIndex`).

### Patterns and Conventions
- Create-vs-update branching lives in `useCreateIndex.ts`, one `createOrUpdate<Type>Index` per type; name lowercased for git/svn/faq.
- Feature routes use route-name constants + `FeatureGuard`; menu items use `hidden:` flags; icons `copy.svg` (`CloneIcon`/`CloneSvg`; DataSourceActions already imports it as `CopySvg` for "Copy ID" — name collision to avoid).
- Guides: UI `.ai-run/guides/` (routing-patterns, form-patterns, state-management); BE `.ai-run/guides/api/`, `.../development/security-patterns.md`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
Both repos have `.ai-run/guides/` (UI: architecture/routing-patterns.md, patterns/form-patterns.md, components/component-patterns.md, testing/testing-patterns.md; BE: api/rest-api-patterns.md, integration/*, testing/*). Not read in depth; AGENTS.md says load P0 guide before implementing. Prior story docs: `codemie-ui/docs/stories/`, `docs/stories/` (format reference).

### Architectural Decisions
None recorded for datasource clone. Inline notes in code: `useCreateIndex.ts` comments on empty `wiki` omit and `setting_id` '' vs undefined semantics; `useEditPopupForm.ts` comment that git integration is optional for public repos.

### Derived Conventions
Clone for assistants/workflows = route + fetch + strip identity + reuse create (frontend-only).

---

## 4. Testing Landscape

### Existing Coverage
UI (`UI/pages/dataSources/`): `__tests__/DataSourceCreatePage.integration.test.tsx`, `DataSourcesPage.accessibility.test.tsx`, `components/__tests__/DataSourceActions.accessibility.test.tsx`, `DataSourceDetails.test.tsx`, `components/DataSourceForm/hooks/__tests__/{useCreateIndex.xwiki,useEditPopupForm,useEditPopupForm.validation}.test.ts`, `utils/__tests__/*`. Clone reference tests: `pages/workflows/__tests__/NewWorkflowPage.test.tsx`, `WorkflowActions.test.tsx`, `pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` (35 clone mentions), `AssistantActions.accessibility.test.tsx`.
BE: `codemie/tests/codemie/rest_api/routers/test_index.py`, `test_index_git_faq.py`, `test_index_git_validation.py`.

### Testing Framework and Patterns
UI: Vitest + React Testing Library (`unit` and `integration` projects), Valtio stores mocked. BE: pytest (`pytest.ini`).

### Coverage Gaps
No test for form prefill of non-edit mode, no test for create-from-existing; `useCreateIndex` has tests only for xwiki; no tests for DataSourceDetails action button row beyond `DataSourceDetails.test.tsx`.

---

## 5. Configuration and Environment

### Environment Variables
None specific found. File upload limit comes from `appInfoStore.fileDatasourceMaxUploadCount` (UI `getFileDatasourceMaxUploadCount`).

### Configuration Files
`UI/constants/dataSources.ts` (`INDEX_TYPES`, `blockedReindexingIndexTypes` = file, provider; `SHAREPOINT_AUTH_TYPES`), `UI/constants/settings.ts` (`MASKED_VALUE = '**********'`, equals BE `MASKED_VALUE = "*"*10`).

### Feature Flags and Deployment Concerns
`FEATURE_FLAGS.DATASOURCES` / `CODE_INDEXING` guard datasource routes (`router.tsx:286`). No migration/deployment change implied by frontend-only approach.

---

## 6. Risk Indicators

- Permission model has no CREATE action: BE `core/ability.py` `Action` = READ/WRITE/DELETE only; UI `utils/entity.ts` offers `canView/canEdit/canDelete`. "Create permission" is effectively "has a project to create in" (`application_access_check` on git/svn/`has_access_to_application` on file project change). Clone visibility = list shows only readable items already; AC1 needs a UI rule for "can create" (no existing helper found; assistants use none). Speculative: reuse "user has at least one visible project" (`userStore.isUserVisibleProject`) and fall back to the create-form's `ProjectSelector`.
- BE gap (pre-existing, not clone-specific): KB create endpoints (confluence/jira/xray/file/provider etc.) do NOT run `application_access_check`; project scoping on those relies on UI project selector. Clone inherits it; Speculative: mention in spec, don't fix unless required.
- Secrets: GET exposes no plaintext credentials for most types (only `setting_id` reference — safe to prefill). Provider datasources: `provider_fields.base_params/create_params` come back encrypted (`encrypt_datasource_provider_fields`), UI masks SECRET fields with `MASKED_VALUE` (`IndexProviderForm.tsx:104`). Create path `createOrUpdateProviderIndex` sends masked value verbatim (the skip-masked guard exists only for edit), and BE create (`provider_datasource_creation_service`) has no `_filter_masked_fields` (used only in update service). So a naive clone would store `**********` as the secret. A frontend-only clone must blank SECRET fields (user re-enters) or skip masked values — acceptable UX but a real correctness trap. Truly copying the secret would REQUIRE a backend change.
- Provider extras: `provider_fields` also holds autofilled UUID params and `otp`; on clone, UUID params must not be copied (BE autofills when absent only if not in `provider_values`; `_extract_params` takes `existing_values` only on update). Provider schema may be deleted (`isProviderDeleted` in form) -> must block/handle clone. Code-exploration (AICE) providers and Bedrock-vendor datasources (`index_type` bedrock; `_validate_remote_entities_and_raise`) are vendor/managed and likely not cloneable.
- File type: GET returns only `uploaded_files` (filenames). Create API `POST /index/knowledge_base/file` requires multipart `files` (UploadFile list processed by `FileDatasourceService.process_files_batch`); there is no endpoint to create from existing stored files, and the UI cannot re-fetch the files from GET. Frontend-only CANNOT clone file contents. Options: Speculative: (a) exclude/hide Clone for `file` type, (b) clone settings only and require re-upload (csv params are also not stored/returned -> defaults), or (c) add a BE endpoint to copy stored files (BE change, storage copy semantics, independence).
- Form overload of `index` (see Section 2) is the main frontend risk: wrong wiring turns "Save" into an update of the source (violates AC6/8). `name` uniqueness is only enforced server-side (`_index_unique_check` -> 409 per project+name); Yup does not check. Name field must start empty (also `nameManuallyEdited`/`compareFormData` unsaved-changes logic in `DataSourceForm.tsx:160`).
- Fields to exclude on clone: `id, repo_name/name, date, update_date, current_state, complete_state, current__chunks_state, processed_files, processing_info, error, completed, text, full_name, is_fetching, is_queued, tokens_usage, created_by, updated_by, last_reindex_triggered_at, user_abilities, aice_datasource_id`; `guardrail_assignments` and `cron_expression/timezone` are optional to carry (guardrail assignments from GET are entity-specific; verify they contain no source id). Project: keep only if user can access it (assistant clone resets non-visible projects). SharePoint with Microsoft OAuth auth needs a fresh access token (`sharepointAccessToken` required in create schema, never stored) -> user must re-sign-in.
- Hidden-field mapping: `resetInitFormValues` already maps all per-type fields, but it hardcodes `repoIndexType: INDEX_TYPE_CODE`, `csv*` defaults, `docsGeneration` absent; confirm Git summarization options (`repoIndexType`) and git_faq/`vcs_type` mapping (`getIndexTypeCode`) survive prefill.
- Telemetry optional: assistants track `source_assistant_id`; datasources have no equivalent (no need to add).

---

## 7. Summary for Complexity Assessment

KEY ANSWER: for all non-secret, non-file datasource types a frontend-only change is sufficient and matches the assistant/workflow precedent (GET existing -> strip identity -> prefill create form -> existing per-type create endpoints, which already validate name uniqueness, integration ids, health check and project access). Surface: add route + page wiring, a Clone item in `DataSourceActions.tsx`, a button in `DataSourceDetails.tsx`, route/title/help constants, and a non-edit prefill path in `DataSourceForm`/`useEditPopupForm` (the main refactor, because `index` currently doubles as the edit-mode switch across ~10 places in the form and `useCreateIndex`). About 6-9 UI files plus tests; zero BE files for the base scope.

A backend change becomes necessary only for (1) cloning file-type datasources with their uploaded content (create endpoint requires multipart upload; GET returns filenames only) and (2) copying provider SECRET values (GET returns ciphertext; UI masks; create path does not ignore masked values). Without BE work the spec must define degraded behaviour: hide Clone for file/bedrock/managed providers (or clone settings and require re-upload) and blank provider secrets. Permissions have no CREATE ability, and KB create endpoints lack `application_access_check`, so "view + create" must be expressed in UI terms (READ already enforced by GET; project access by project selector and git/file endpoints).

Technical novelty is low (established pattern), test posture is thin around form prefill and `useCreateIndex`, and the principal risks are accidental update of the source, masked-secret persistence, and OAuth/token-only fields. Complexity: UI-only medium; with file/secret copy via BE, medium-high.

---

## 8. External References

None named by the task

## Addendum (2026-10-16) — Bedrock and code-exploration (AICE) verification

Corrects the earlier "likely not cloneable" note for both types.

- **Bedrock (`knowledge_base_bedrock`) — hide Clone (verified).** Rows are imported from AWS settings (`BE/service/aws_bedrock/bedrock_knowledge_base_service.py:569`), not created through the create flow; there is no create endpoint, and the UI create form does not offer Bedrock. `IndexInfo` has a unique constraint on (`bedrock_aws_settings_id`, `bedrock_knowledge_base_id`) (`BE/rest_api/models/index.py:396`), so a copy pointing at the same knowledge base is rejected. `_validate_remote_entities_and_raise` (`BE/rest_api/routers/index/queries.py:447`) is a GET-time existence check, not a clone blocker; the earlier citation as a blocker was wrong.
- **Code exploration (AICE) — cloneable through the generic provider flow.** Same `POST /index/provider` path; the schema service turns `code_analysis_datasource_ids` into a project-filtered multiselect (`provider_datasource_schema_service.py:145,164`), and the form already resets it when the selection no longer matches the project. `aice_datasource_id` is derived at list time (`index_service.py:220`), not copied. Edge case: AICE rows created by provider import (`provider_datasource_import_service.py`) may inherit their project from a containing workspace; verify clone behaviour for them at implementation.
- **File type (decided: option 3).** Clone shown; form prefilled with settings; file list empty; user uploads files before saving. Frontend-only.
- Backend change: still not required.
