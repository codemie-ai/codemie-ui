# Technical Research

**Task**: oauth integration types credential serverEnum jira confluence auth method persistence
**Generated**: 2026-09-03
**Research path**: filesystem (codegraph MCP not available — fell back to filesystem Explore threads)

---

## 1. Original Context

EPMCDME-14587 (Sub-Bug, Critical, parent EPMCDME-13527) — "Jira and Confluence OAuth integrations should reuse existing integration types after saving".

Summary: Jira and Confluence OAuth integrations are currently saved with SEPARATE OAuth-specific integration types (JiraOAuth / ConfluenceOAuth) instead of reusing the existing generic Jira and Confluence integration types.

Current behaviour: During creation the UI shows credential types "Jira" and "Confluence". A "Use OAuth 2.0 sign-in" toggle switches the effective credentialType from 'jira' to 'jiraoauth' (and 'confluence' to 'confluenceoauth'). After saving, the persisted integration type is JiraOAuth / ConfluenceOAuth (a distinct serverEnum/type), not Jira / Confluence.

Expected behaviour (Acceptance Criteria):
  - Jira OAuth integrations saved under the EXISTING Jira integration type; Confluence OAuth under the existing Confluence type.
  - NO separate JiraOAuth / ConfluenceOAuth integration type created or exposed after saving.
  - OAuth represented as an authentication METHOD / FLOW within the existing Jira and Confluence integration scopes (not a distinct type).
  - Saved OAuth integrations discoverable by existing Jira / Confluence type filters.
  - Assistant available-tools settings can discover/select them via existing type mappings.
  - Existing non-OAuth Jira/Confluence flows keep working (no regression).

This is a CROSS-REPO change. Research BOTH repositories:
  - Frontend: /Users/batyrkhan_mekin/develop/mscc/codemie-dev/codemie-ui (React/TS). Relevant: src/utils/settingsUIConfig.ts (CREDENTIAL_UI_MAPPING — jiraoauth/confluenceoauth/gitlaboauth entries, serverEnum 'JiraOAuth'/'ConfluenceOAuth'), src/pages/integrations/components/SettingsForm/SettingsForm.tsx (OAuth toggle: OAUTH_VARIANT_BY_BASE_TYPE, oauthVariantType, showOAuthToggle, handleOAuthToggle, handleCredentialTypeChange), src/constants/integration.ts (JIRA_OAUTH_CREDENTIAL_TYPE='jiraoauth' etc., OAUTH_VARIANT_BY_BASE_TYPE, OAUTH_VARIANT_CREDENTIAL_TYPES, getBaseTypeForOAuthVariant), src/hooks/useIntegrationTypeOptions.ts, src/utils/settings.ts.
  - Backend: /Users/batyrkhan_mekin/develop/mscc/codemie-dev/codemie (Python/FastAPI). Find how integration credential types / serverEnum are defined and persisted, where JiraOAuth / ConfluenceOAuth types are declared, how an integration's type is stored, how OAuth auth is distinguished, and what would represent "OAuth as an auth method/flow within the existing Jira/Confluence type" (e.g. an auth_type / auth_method field on the credential rather than a distinct type enum value). Identify the credential/integration model, the enum of integration types, the create/save endpoint, and any mapping used by Assistant available-tools discovery.

CRITICAL CONTEXT — reconcile with in-progress work: the current codemie-ui branch (EPMCDME-14587_remove-new-types-fix-bugs) has just RESTORED (uncommented) the jiraoauth/confluenceoauth/gitlaboauth CREDENTIAL_UI_MAPPING entries and the OAuth sign-in toggle (they had been commented out under EPMCDME-14586), and added human-readable field labels (EPMCDME-14580). That restoration REINTRODUCES the separate OAuth types that THIS ticket (14587) wants removed/folded in. Analyze the tension: does satisfying 14587 mean the UI should NOT expose jiraoauth/confluenceoauth as distinct saved types, but instead keep 'jira'/'confluence' as the saved type while carrying an OAuth auth flag? Determine the minimal correct design across both repos.

---

## 2. Codebase Findings

> The single most important finding: **the OAuth-ness of a Jira/Confluence integration is encoded ENTIRELY in the persisted `credential_type` value** (`JiraOAuth` / `ConfluenceOAuth` — a distinct enum member) on both sides. There is **no `auth_type`/`auth_method` field on the persisted Settings row** to carry OAuth as a flag. Therefore this ticket cannot be resolved frontend-only. See Design Verdict below.

### Existing Implementations

**FRONTEND** (`/Users/batyrkhan_mekin/develop/mscc/codemie-dev/codemie-ui`)

- `src/constants/integration.ts:37-57` — the folding constants:
  - `JIRA_OAUTH_CREDENTIAL_TYPE = 'jiraoauth'`, `CONFLUENCE_OAUTH_CREDENTIAL_TYPE = 'confluenceoauth'`, `GITLAB_OAUTH_CREDENTIAL_TYPE = 'gitlaboauth'`
  - `OAUTH_VARIANT_BY_BASE_TYPE = { jira: 'jiraoauth', confluence: 'confluenceoauth' }` (GitLab intentionally excluded — no shared base type)
  - `OAUTH_VARIANT_CREDENTIAL_TYPES` — Set used to hide variants from the type select
  - `getBaseTypeForOAuthVariant(type)` — reverse lookup `jiraoauth → jira`
- `src/utils/settingsUIConfig.ts` — `CREDENTIAL_UI_MAPPING`. OAuth variants are SEPARATE keyed entries, each carrying its **own `serverEnum`**: `jiraoauth → serverEnum:'JiraOAuth'` (~:1017), `confluenceoauth → serverEnum:'ConfluenceOAuth'` (~:1042), `gitlaboauth → serverEnum:'GitLabOAuth'` (~:986). They differ from base entries by having app-credential fields (`client_id`/`client_secret`/`callback_base_url`) instead of a token, plus an explicit `serverEnum`.
- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx:289-314` — the OAuth toggle. `baseCredentialType = getBaseTypeForOAuthVariant(credentialType) ?? credentialType`; `oauthVariantType = OAUTH_VARIANT_BY_BASE_TYPE[baseCredentialType]`; `handleOAuthToggle(useOAuth)` calls `handleCredentialTypeChange(useOAuth ? oauthVariantType : baseCredentialType)` — i.e. **it swaps the whole effective `credentialType` state to `'jiraoauth'`, not an auth flag**. The select always displays `baseCredentialType`.
- `src/utils/settings.ts:106-109` — `getOriginalCredentialType()` returns `credConfig?.serverEnum || capitalize(value)`; this is what turns `'jiraoauth'` into the persisted `'JiraOAuth'`.
- `src/hooks/useIntegrationTypeOptions.ts` + `src/utils/settings.ts` — build the type-filter option list from `Object.keys(getCredentialUIMapping(...))` mapped through `getOriginalCredentialType`; the list therefore contains BOTH `Jira` and a separate `JiraOAuth` option.
- `src/store/userSettings.ts:158` — `createUserSetting` POSTs to `v1/settings/user`; PUT to `v1/settings/user/${id}`.

**BACKEND** (`/Users/batyrkhan_mekin/develop/mscc/codemie-dev/codemie`)

- `src/codemie_tools/base/models.py:108-110` — `CredentialTypes(str, Enum)` declares OAuth variants as **distinct members**: `GITLAB_OAUTH="GitLabOAuth"`, `JIRA_OAUTH="JiraOAuth"`, `CONFLUENCE_OAUTH="ConfluenceOAuth"` (alongside `JIRA="Jira"`, `CONFLUENCE="Confluence"`).
- `src/codemie/rest_api/models/settings.py:254` — persistence model: `credential_type: CredentialTypes = SQLField(index=True)` plus `credential_values: List[CredentialValues]`. **No `auth_type`/`auth_method`/`flow` column** on `SettingsBase` / `SettingRequest`.
- `src/codemie/rest_api/routers/settings.py` — POST/PUT `/settings/user`, body = `SettingRequest`; `credential_type` is persisted verbatim into the indexed column.
- `src/codemie/service/settings/settings.py` — `SettingsService`: OAuth dispatch and config resolution keyed off the distinct enum members:
  - `__CREDENTIAL_CONFIG_TO_TYPE` (~:222): `JiraConfig → JIRA`, `ConfluenceConfig → CONFLUENCE` (base types).
  - `_inject_oauth_config_values` (~:816-840): sets `values.setdefault("auth_type","oauth")` (+ `integration_id`, `acting_user_id`, `cloud=True`) ONLY when `credential_type in (GITLAB_OAUTH, JIRA_OAUTH, CONFLUENCE_OAUTH)`.
  - `_oauth_app_keys` (~:771-773), `_oauth_settings_service` (~:791-802), token cleanup (~:579-586) — all branch on the distinct OAuth enum members.
  - `_lookup_setting.oauth_fallback_by_config` (~:870-873): `{JiraConfig: JIRA_OAUTH, ConfluenceConfig: CONFLUENCE_OAUTH, GitlabConfig: GITLAB_OAUTH}` — a Jira toolkit already falls back to a `JiraOAuth`-typed setting.
- `src/codemie/service/{jira_oauth,confluence_oauth,gitlab_oauth}/` — per-provider service packages (settings_service, token_manager, flow_service, constants).
- `src/codemie/service/oauth/provider_adapters.py:419-465` — `JiraOAuthProviderAdapter` / `ConfluenceOAuthProviderAdapter` (extend `_AtlassianOAuthProviderAdapterBase`).
- `src/codemie_tools/core/project_management/jira/models.py:55-63` — **the enabling seam**: `JiraConfig.auth_type: str = Field(default="pat", ...)` ('pat' | 'oauth'); same on `confluence/models.py:57` and `vcs/gitlab/models.py:43`. Tools already branch on `config.auth_type == "oauth"` (`jira/tools.py:132,139`, `confluence/tools.py:99`, `gitlab/tools.py:120,134`). The **tool runtime already treats OAuth as a method within the existing type** — only the settings/enum/persistence + OAuth-service dispatch layer forces a separate persisted type.

### Architecture and Layers Affected

- **Frontend — UI config / constants**: `settingsUIConfig.ts` (CREDENTIAL_UI_MAPPING), `constants/integration.ts` (folding constants), `settings.ts` (`getOriginalCredentialType`).
- **Frontend — form/presentation**: `SettingsForm.tsx` (OAuth toggle → payload), `useIntegrationTypeOptions.ts` (type-filter options).
- **Frontend — store/API**: `store/userSettings.ts` (create/update payload + OAuth connect/disconnect methods).
- **Backend — domain enum**: `codemie_tools/base/models.py` (`CredentialTypes`).
- **Backend — persistence model**: `rest_api/models/settings.py` (`Settings` / `SettingRequest`).
- **Backend — API/router**: `rest_api/routers/settings.py` (create/save endpoint).
- **Backend — service/business-logic**: `service/settings/settings.py` (OAuth dispatch, config injection, lookup fallback), `service/{jira,confluence}_oauth/*`, `service/oauth/provider_adapters.py`.
- **Backend — assistant tool discovery**: `service/assistant/assistant_integration_validator.py` → `credential_validator.py` → `ToolMetadataService.resolve_config` → `SettingsService.get_config`.
- **DB/persistence — migration**: `src/external/alembic/versions/300e51656562_add_oauth_credential_types.py` (Postgres enum values already persisted).

### Integration Points

- FE → BE contract: single `credential_type` field on the `v1/settings/user` payload carries the type as a serverEnum string. There is **no auth-method field in the contract today** — the fold-back must add one (or a `credential_values` convention) that both sides agree on.
- Assistant available-tools discovery already resolves Jira/Confluence toolkits to base types and relies on `oauth_fallback_by_config` to also match the `*_OAUTH` rows. Type filters (`useIntegrationTypeOptions` FE; `Settings.get_all(credential_type=...)` BE) match on **exact enum value**, so a `JiraOAuth` row does NOT match a `Jira` filter — this is the direct cause of AC "discoverable by existing Jira/Confluence type filters".
- Shared Atlassian OAuth callback: `jira_oauth.py:49` gates the callback on `JIRA_OAUTH_ENABLED or CONFLUENCE_OAUTH_ENABLED` — one `/v1/atlassian-oauth/callback` serves both providers.

### Patterns and Conventions

- Credential types are a single `str`-Enum (`CredentialTypes`) used as the DB discriminator column; adding/removing members requires an Alembic enum migration (pattern: `300e51656562_add_oauth_credential_types.py`; value-rewrite pattern: `c3d4e5f6a7b8_migrate_assistant_project_mapping_to_settings.py`).
- Tool configs already model auth as a method via `auth_type: 'pat' | 'oauth'` on `JiraConfig`/`ConfluenceConfig`/`GitlabConfig` — the target-state pattern for "OAuth as an auth method within the existing type".
- FE folding convention (already partly built): OAuth variant hidden from the type select, surfaced via an in-form toggle; `getBaseTypeForOAuthVariant` reverse-maps. The gap is the **persisted** value, not the select UX.
- **GitLab OAuth is intentionally OUT of scope** — no shared base type; it stays a standalone credential type (`integration.ts:41-43`). Scope this ticket to Jira/Confluence only.

### Design Verdict — Frontend-only vs cross-repo

**Cross-repo backend change is REQUIRED. This cannot be resolved frontend-only.** Evidence:

1. `Settings` / `SettingRequest` has a single `credential_type` enum column and **no place to store an OAuth auth flag** — sending `credential_type:'Jira'` + an auth field would drop the flag on the floor.
2. OAuth behaviour is keyed off the distinct enum members in many backend sites (`_oauth_app_keys`, `_oauth_settings_service`, `_inject_oauth_config_values`, token cleanup, `_lookup_setting` fallback). If the persisted type became `Jira` with no discriminator, all of these branches break — OAuth config injection (`auth_type=oauth`, `integration_id`, `acting_user_id`, `cloud=True`) would stop, and token cleanup/lookup would fail.

**Minimal correct design** (to be finalised in the planning phase, not decided here):
- Add a persisted discriminator the backend reads — either a new `auth_type`/`auth_method` field on `SettingsBase`/`SettingRequest`, OR standardise on an `auth_type='oauth'` key inside `credential_values` (the tool-config layer already uses `auth_type`).
- Rewire the backend OAuth branches from `credential_type == *_OAUTH` to that discriminator; keep persisted `credential_type` as base `Jira`/`Confluence`.
- Frontend: keep the in-form toggle UX but change the submitted payload so `credential_type` resolves to the **base** serverEnum (`Jira`/`Confluence`) while the OAuth-ness travels in the new discriminator field / credential value (stop mapping `jiraoauth → 'JiraOAuth'` via `getOriginalCredentialType`).
- Data migration: rewrite existing `JiraOAuth`/`ConfluenceOAuth` settings rows into `Jira`/`Confluence` rows carrying the OAuth discriminator, then retire the standalone enum values.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- FE `.ai-run/guides/integration/ticket-flow.md` — pipeline ticket-state sync only; NOT OAuth/credential types. No FE OAuth/credential guide exists.
- BE `.ai-run/guides/integration/` — `jira-integration.md`, `confluence-integration.md`, `cloud-integrations.md`, `external-services.md`, `mcp-integration.md`, `xray-integration.md`, `google-docs-integration.md`, `llm-providers.md`, `request-hedging.md`. The jira/confluence guides are the relevant reads for backend integration-type semantics. **No dedicated OAuth-credential-type guide** — conventions for this task are derived from code.
- Prior SDLC-light artifact sets in `docs/superpowers/tasks/` are load-bearing history:
  - `2026-08-31-reuse-existing-jira-confluence-integration-types/` — the ORIGINAL 14587 "fold OAuth into base type" work (`.state.json`, `code-review.diff`, `code-review-check.diff`).
  - `2026-09-01-comment-out-oauth-switchers/` — the 14586 hide/comment-out work.
  - `2026-09-02-epmcdme-14580-oauth-field-titles/` — the 14580 field-title fix restored in the current branch.
  - `2026-09-03-epmcdme-14587-reuse-oauth-integration-types/` — the CURRENT run (only `.state.json` so far).

### Architectural Decisions

- The fold-OAuth-into-base-type decision is codified IN CODE, not an ADR: `constants/integration.ts:41-57` (`OAUTH_VARIANT_BY_BASE_TYPE`, `OAUTH_VARIANT_CREDENTIAL_TYPES`, `getBaseTypeForOAuthVariant`; GitLab intentionally excluded) and `SettingsForm.tsx:289-314` (in-form toggle, variants filtered out of the select).
- Backend still defines the separate serverEnum types the ticket wants folded (`codemie_tools/base/models.py:108-110`) and services keyed on them under `service/{jira,confluence,gitlab}_oauth/`.
- Recent git history (branch `EPMCDME-14587_remove-new-types-fix-bugs`) confirms the revert-then-restore tension:
  - `8d7fb7d5c` EPMCDME-14587: "Restore OAuth integration types and add human-readable field titles" — reinstated the separate OAuth CREDENTIAL_UI_MAPPING entries + toggle + 14580 labels.
  - `5881dce29` / `ff02c716f` EPMCDME-14586: hid / commented-out the OAuth switchers.
  - `a48d464ae` EPMCDME-13527: original OAuth feature.

### Derived Conventions

- No TODO/FIXME/HACK markers in the OAuth source; decisions are recorded as explanatory NOTE-style comments (verbatim, load-bearing):
  - `constants/integration.ts:41-43` — "…OAuth variant is folded into the base type's form via an in-form toggle instead of appearing as its own item in the credential-type select. GitLab OAuth is intentionally excluded — it has no shared base type and stays a standalone credential type."
  - `SettingsForm.tsx:289-291` — "OAuth-variant folding: Jira/Confluence expose their OAuth flavour through an in-form toggle … the effective credentialType can be the base type ('jira') or its OAuth variant ('jiraoauth'). The select always shows the base type."
  - `SettingsForm.tsx:244-246` — "…OAuth integrations are saved with app credentials only; each user connects their own token afterwards via the per-user OAuth flow, so there is no sign-in (oauth_state) to require here."

---

## 4. Testing Landscape

### Existing Coverage

**Frontend** (Vitest 1.6.1 + jsdom 24.1.3 + @testing-library; no Jest):
- `src/utils/__tests__/settings.test.ts` — `CREDENTIAL_UI_MAPPING`, `getOriginalCredentialType`, `getCredentialType`, `getAvailableCredentialsTypes`, plus an OAuth-field-title block (jiraoauth/confluenceoauth, EPMCDME-14580). `getOriginalCredentialType` tests only cover aws/gcp/github — NOT jira/confluence OAuth folding.
- `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx` — OAuth save flow, currently only `gitlaboauth`; asserts `payload.credential_type === 'GitLabOAuth'` (`:87`).
- `src/store/__tests__/userSettings.test.ts` — connect/disconnect Jira/Confluence OAuth + scope-aware cache invalidation.
- `src/hooks/__tests__/useJiraConnect.test.ts`, `useConfluenceConnect.test.ts`, `useOAuth.test.ts`; `OAuthTestAction.test.tsx`; `utils/__tests__/jiraAuth.test.ts`, `confluenceAuth.test.ts`, `oauthConnectAggregate.test.ts`.

**Backend** (pytest 8.3.1 + pytest-asyncio 0.23.7 + pytest-mock + pytest-httpx; session-autouse `mock_database_engine`):
- `tests/codemie_tools/base/test_models.py` — `CredentialTypes` enum tests, but **no assertions on `JiraOAuth`/`ConfluenceOAuth` values**.
- `tests/codemie/service/settings/test_settings_service.py` — settings service (OAuth cleanup, `JiraConfig→JIRA_OAUTH` / `ConfluenceConfig→CONFLUENCE_OAUTH` mapping).
- `tests/codemie/service/settings/test_settings_request_validator.py`, `test_jira_oauth_get_config_gate.py`, `test_confluence_oauth_get_config_gate.py`, `test_sharepoint_auth_switch.py`, `test_gitlab_oauth_delete_cleans_tokens.py`.
- `tests/codemie/rest_api/routers/test_user_settings_crud.py` — create/update/delete endpoint, but create cases use `AWS`/`JIRA` only — **none exercise JiraOAuth/ConfluenceOAuth**.
- `tests/codemie/rest_api/routers/test_atlassian_oauth_connect.py`, `test_jira_oauth_shared_callback.py`; `tests/codemie/service/{jira_oauth,confluence_oauth}/*`; `tests/codemie/service/oauth/adapters/test_provider_adapters.py`.
- Tool discovery: `tests/codemie_tools/base/test_toolkit_provider.py`, `tests/codemie/rest_api/routers/test_tool.py`, `tests/codemie/agents/test_smart_tool_selection.py`.

### Testing Framework and Patterns

- FE: `vi.fn()` module mocks of `@/utils/settings`; `@testing-library` render + async user interaction; SettingsForm tests pass `credentialType` as a prop and assert on the submitted payload shape (ideal seam for a "saves as base type + oauth flag" assertion).
- BE: `@pytest.mock.patch` on `mock_create_setting`/service classes; `credential_type=CredentialTypes.X` construction; async via pytest-asyncio; session-scoped autouse DB-engine mock; per-module `conftest.py` in tool test dirs.

### Coverage Gaps

**Frontend:**
- `src/constants/integration.ts` — NO dedicated test; the folding logic (`OAUTH_VARIANT_BY_BASE_TYPE`, `getBaseTypeForOAuthVariant`) is untested.
- `src/hooks/useIntegrationTypeOptions.ts` — NO test file (builds the type-select options that must hide OAuth variants).
- `src/utils/settingsUIConfig.ts` — NO test file.
- SettingsForm OAuth-as-auth-method toggle for jira/confluence — only `gitlaboauth` is covered.
- `getOriginalCredentialType` folding `jiraoauth → Jira` / `confluenceoauth → Confluence` — not asserted.

**Backend:**
- `CredentialTypes.JIRA_OAUTH`/`CONFLUENCE_OAUTH` values untested — removing them has no direct guard.
- `settings.py` OAuth-variant→base-type collapse (mapping ~:872-873, token cleanup ~:582-586) — no targeted test.
- `test_user_settings_crud.py` — no create case for a JiraOAuth/ConfluenceOAuth (or folded jira+oauth-method) setting; the persistence path this task changes is uncovered.
- Assistant tool discovery — no test asserting jira/confluence toolkits resolve when OAuth is an auth method of the base type rather than a separate `*OAuth` type.

---

## 5. Configuration and Environment

### Environment Variables

- Backend (`src/codemie/configs/config.py`): `JIRA_OAUTH_ENABLED`, `CONFLUENCE_OAUTH_ENABLED`, `GITLAB_OAUTH_ENABLED` (bool, default False, ~:441-467); `JIRA_OAUTH_SCOPES`, `CONFLUENCE_OAUTH_SCOPES`, `GITLAB_OAUTH_SCOPES`; `OAUTH_ALLOW_INSECURE_TOKEN_STORAGE` (fail-closed dev switch); `OAUTH_CALLBACK_ALLOWED_BASE_URLS`; `GITLAB_OAUTH_DEFAULT_INSTANCE_URL`, `GITLAB_OAUTH_ALLOWED_INSTANCE_URLS`, `SHAREPOINT_OAUTH_*`, `GOOGLE_OAUTH_CLIENT_ID/SECRET`. `client_id`/`client_secret`/`callback_base_url` are supplied per-integration via the UI (stored on the Settings row), NOT env (comments ~:439-454). No OAuth entries in backend `.env.example`.
- Frontend: NO OAuth-specific env vars — OAuth type wiring is compile-time constants. Only generic `VITE_API_URL`, `VITE_ENV`, `VITE_APP_VERSION`, `VITE_SUFFIX`, `window._env_.VITE_ENV`.

### Configuration Files

- `src/codemie/configs/config.py` — OAuth enable-flags + scopes; redirect URIs are computed properties (`jira_oauth_redirect_uri`/`confluence_oauth_redirect_uri` BOTH resolve to shared `/v1/atlassian-oauth/callback`; GitLab → `/v1/gitlab-oauth/callback`, ~:979-1008).
- `src/external/alembic/versions/300e51656562_add_oauth_credential_types.py` — the migration that added `GITLAB_OAUTH`/`JIRA_OAUTH`/`CONFLUENCE_OAUTH` to the Postgres `credentialtypes` enum on `codemie.settings.credential_type` (~:74-85); downgrade backs up + deletes those rows (~:92-104).

### Feature Flags and Deployment Concerns

- The three backend booleans act as feature flags (`*_OAUTH_ENABLED`), consumed in `service/oauth_security.py:65-100`, `service/oauth/token_port.py:72`, and the `jira_oauth.py`/`confluence_oauth.py`/`gitlab_oauth.py` routers. Note: `jira_oauth.py:49` gates the shared Atlassian callback on `JIRA_OAUTH_ENABLED or CONFLUENCE_OAUTH_ENABLED`.
- **Data migration required**: existing OAuth integrations are persisted as their own `credential_type` enum values (`JiraOAuth`/`ConfluenceOAuth`), NOT as base rows with an OAuth flag. Folding back requires rewriting those rows into `Jira`/`Confluence` rows carrying the new OAuth discriminator, preserving OAuth token/`credential_values`, then retiring the standalone enum values. No existing backfill script does this; reference patterns: `300e51656562_...` (enum add) and `c3d4e5f6a7b8_migrate_assistant_project_mapping_to_settings.py` (row-value rewrite).

---

## 6. Risk Indicators

- **Cross-repo coordination + shared contract change**: FE and BE must agree on a new persisted OAuth discriminator; deploy ordering matters (backend must accept/read the discriminator before the frontend stops sending `JiraOAuth`/`ConfluenceOAuth`). Contract mismatch would silently break OAuth config injection.
- **Data migration on a Critical prod bug**: existing `JiraOAuth`/`ConfluenceOAuth` settings rows must be rewritten to base type + OAuth flag without losing OAuth tokens/app credentials. Irreversible-ish; the only downgrade pattern (`300e51656562`) DELETES these rows. High blast radius, no existing fold-back script.
- **Enum-member removal is guardless**: `CredentialTypes.JIRA_OAUTH`/`CONFLUENCE_OAUTH` have no test assertions (`test_models.py`), so removing/retiring them won't be caught by tests. Many services still branch on these members (`settings.py` OAuth injection/cleanup/lookup, `service/{jira,confluence}_oauth/*`, `provider_adapters.py`) — each is a regression site if the persisted type changes but the branch condition is not migrated.
- **In-progress branch tension (14586 ↔ 14587)**: the current branch just RESTORED the separate OAuth CREDENTIAL_UI_MAPPING entries + toggle (`8d7fb7d5c`), which 14586 had commented out. 14587 must fold these in, not simply re-hide them — the in-form toggle UX is desired; only the persisted `credential_type` value must change. Risk of re-litigating 14586's revert.
- **Assistant available-tools discovery relies on `_lookup_setting.oauth_fallback_by_config`** keyed on the OAuth enum members (`settings.py:870-873`). If persisted type becomes base `Jira`/`Confluence` but the fallback/`_inject_oauth_config_values` still key on `*_OAUTH`, OAuth tool discovery silently stops injecting `auth_type=oauth`/`integration_id`/`acting_user_id` and tools fall back to PAT — a subtle, security-relevant regression.
- **Type filters match exact enum value** on both FE (`useIntegrationTypeOptions`) and BE (`Settings.get_all(credential_type=...)`) — the AC "discoverable by existing Jira/Confluence filters" is directly gated on the persisted value; partial fixes will fail this AC.
- **Coverage gaps at the exact change sites**: `constants/integration.ts`, `useIntegrationTypeOptions.ts`, `settingsUIConfig.ts` have no tests; BE create-endpoint and toolkit-discovery lack OAuth-as-method cases. New tests must be authored first (TDD) since the changed paths are currently unguarded.
- **Positive enabler (reduces risk)**: the tool-config layer already models OAuth as a method (`JiraConfig/ConfluenceConfig/GitlabConfig.auth_type='oauth'`, tools branch on `config.auth_type == "oauth"`). The target state already exists at the tool runtime; only the settings/enum/persistence + OAuth-service dispatch layer forces a separate type.
- **Scope discipline**: GitLab OAuth is intentionally standalone (no base type) — do NOT fold it; touching it would exceed ticket scope.
- **codegraph not available**: research was filesystem-only across two repos; backend line numbers are approximate (`~:`) and should be re-verified during implementation.

---

## 7. Summary for Complexity Assessment

This is a **cross-repo (frontend + backend + database migration)** Critical bug fix, not a frontend-only tweak. Research confirms the OAuth-ness of a Jira/Confluence integration is encoded entirely in the persisted `credential_type` enum value (`JiraOAuth`/`ConfluenceOAuth`), and the persisted `Settings`/`SettingRequest` model has **no `auth_type`/`auth_method` column** to carry OAuth as a flag. Satisfying the acceptance criteria ("OAuth as an auth method within the existing Jira/Confluence type", "discoverable by existing type filters") therefore requires: (a) a backend persisted discriminator (new field on `SettingsBase`/`SettingRequest` or a standardised `auth_type='oauth'` key in `credential_values`); (b) rewiring every backend site that currently branches on `credential_type == *_OAUTH` (`settings.py` OAuth-config injection, app-key/settings-service dispatch, token cleanup, `_lookup_setting` fallback, plus `service/{jira,confluence}_oauth/*` and `provider_adapters.py`); (c) a frontend change so the submitted `credential_type` resolves to the base serverEnum (`Jira`/`Confluence`) while keeping the existing in-form OAuth toggle UX; and (d) an Alembic data migration to rewrite existing `JiraOAuth`/`ConfluenceOAuth` rows into base rows with the discriminator, then retire the standalone enum members. Estimated file change surface is broad but shallow: roughly 4-6 frontend files (`settingsUIConfig.ts`, `constants/integration.ts`, `settings.ts`, `SettingsForm.tsx`, `useIntegrationTypeOptions.ts`) and 6-10 backend files/modules plus one migration.

**Technical novelty is low-to-moderate** — the target pattern already exists at the tool-config runtime (`JiraConfig/ConfluenceConfig.auth_type='oauth'`, tools already branch on it), so this is a re-plumbing of an existing seam rather than a new pattern. The novelty and risk concentrate in the **data migration** (irreversible-leaning, must preserve OAuth tokens, only prior downgrade pattern deletes these rows) and in the **contract/deploy ordering** between the two repos.

**Test coverage posture is weak-to-mixed at the exact change sites.** Frontend: `constants/integration.ts`, `useIntegrationTypeOptions.ts`, and `settingsUIConfig.ts` have no tests; SettingsForm OAuth save is only covered for GitLab. Backend: `CredentialTypes.JIRA_OAUTH/CONFLUENCE_OAUTH` values are unasserted, the create-integration endpoint has no OAuth case, and toolkit discovery has no OAuth-as-method assertion. Because the changed paths are currently unguarded, TDD tests must be authored first. **Key risk factors for scoring**: cross-repo shared-contract change, irreversible-leaning data migration on a Critical prod bug, multiple guardless backend branch-condition rewrites (OAuth config injection is security-relevant — silent PAT fallback if missed), exact-match type-filter discovery gating the AC, and the active 14586↔14587 revert/restore tension in the current branch.
