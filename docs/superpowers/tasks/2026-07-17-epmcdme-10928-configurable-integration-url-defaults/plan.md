# EPMCDME-10928: Configurable Integration Field Defaults — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch `GET /v1/tools/configs` at app startup and use backend-provided defaults to make
integration form fields deployment-configurable — covering URL defaults, URL placeholder text, and
non-URL fields (auth_type, cloud/is_cloud, use_bearer).

**Architecture:** A new `fetchToolConfigs()` method on `appInfoStore` fetches the backend config
array after user authentication and populates `toolFieldDefaults: Record<string, string | boolean>`
and `toolFieldPlaceholders: Record<string, string>`. A module-level `extractConfigEntry` helper
processes each array element, keeping `fetchToolConfigs` within the SonarJS complexity limit.
Three factory functions in `settingsUIConfig.ts` (`dynDefault`, `dynDefaultBool`, `dynPlaceholder`)
produce closures that read from the store at render time. 15 named URL constants hold `dynDefault`
closures reused by both `defaultUrl` (list display) and `defaultValue` (form pre-fill). Non-URL
fields are wired inline. keycloak and xray form fields are renamed to `base_url` to match the
backend canonical name; `getSettingCredsURL` handles both `url` and `base_url` stored keys.

**Tech Stack:** TypeScript, Valtio (proxy store), Vitest, json-server (mock)

## Global Constraints

- Test runner: `npm run test -- --run`
- Commit prefix: `EPMCDME-10928:`
- URL fields return `''` when unconfigured (no hardcoded fallback strings)
- Boolean fields return `false` when unconfigured
- `false` is a valid stored default and must not be skipped

---

### Task 1: Widen types in `settingsUI.ts`

**Files:**
- Modify: `src/types/settingsUI.ts`

- [x] Widen `CredentialTypeConfig.defaultUrl` to `string | (() => string)`
- [x] Widen `CredentialFieldConfig.defaultValue` to `string | boolean | (() => string | boolean)`
- [x] TypeScript compiles clean

Test-first: no — pure type change, no runtime behaviour.

---

### Task 2: Add `toolFieldDefaults`, `toolFieldPlaceholders`, and `fetchToolConfigs()` to `appInfoStore`

**Files:**
- Modify: `src/store/appInfo.ts`
- Create/modify: `src/store/__tests__/appInfo.test.ts`

- [x] Define `TOOL_CONFIG_FIELD_MAP` with `fields[]` arrays covering 15 integrations; uses `genericgitconfig` / `genericazuredevopsconfig` (backend generic class names); removed `gitlabconfig` / `azuredevopsgitconfig` entries
- [x] Extract `extractConfigEntry` as a module-level helper (cognitive complexity guard)
- [x] Add `toolFieldDefaults` and `toolFieldPlaceholders` to the store interface and initialiser
- [x] Implement `fetchToolConfigs`: iterate array, call `extractConfigEntry` per entry, assign both stores atomically
- [x] Tests cover: standard URL fields, `base_url` fields (keycloak/xray), boolean fields (cloud/use_bearer), string fields (auth_type), placeholder extraction, `false` stored correctly, empty/null default skipped, unknown config key skipped, network error swallowed, multi-field entry, empty/null array element skipped

Test-first: yes — wrote failing tests before implementation.

---

### Task 3: Call `fetchToolConfigs()` after user authentication

**Files:**
- Modify: `src/hooks/appLevel/useInitialDataFetch.tsx`

- [x] Fire-and-forget call placed after `fetchCustomerConfig()` (user is authenticated at that point)

Test-first: no — integration plumbing, no logic.

---

### Task 4: Replace hardcoded defaults with factory functions in `settingsUIConfig.ts`

**Files:**
- Modify: `src/utils/settingsUIConfig.ts`

- [x] Add `dynDefault`, `dynDefaultBool`, `dynPlaceholder` factories (no fallback strings)
- [x] Define 15 named URL constants (`JIRA_URL`, `GIT_URL`, …) using `dynDefault`
- [x] Update all 15 credential type entries: `defaultUrl` references named constant, URL field gets `defaultValue` and `placeholder` from factories
- [x] Rename keycloak field `url` → `base_url`; `defaultUrl: KEYCLOAK_URL`
- [x] Rename xray field `url` → `base_url`; `defaultUrl: XRAY_URL`
- [x] Wire non-URL defaults: `jira.is_cloud` → `dynDefaultBool('jira', 'cloud')`, `confluence.is_cloud` → `dynDefaultBool('confluence', 'cloud')`, `git.auth_type` → `dynDefault('git', 'auth_type')`, `email.auth_type` → `dynDefault('email', 'auth_type')`, `xwiki.use_bearer` → `dynDefaultBool('xwiki', 'use_bearer')`

Test-first: no — factory functions are thin closures; covered by integration tests in Task 5.

---

### Task 4a: Pre-fill URL form fields from deployment-configured defaults in `SettingsForm.tsx`

**Files:**
- Modify: `src/pages/integrations/components/SettingsForm/SettingsForm.tsx`

- [x] Resolve function-type `defaultValue` in `getCredentialDefaults`
- [x] Filter empty/null/undefined stored values in `getInitialCredentialValues` so edit forms fall back to configured defaults
- [x] Add reactive backfill effect: subscribe to `toolFieldDefaults` via `useSnapshot`; when store transitions from empty to populated after mount, call `reset(getCredentialDefaults(credentialType))` once (guarded by `useRef` and `!initialCredentialValues`) — fixes `auth_type` select not pre-selecting on slow networks

Test-first: no — behaviour verified manually via mock server.

---

### Task 5: Update `getSettingCredsURL()` in `settings.ts`; extend tests

**Files:**
- Modify: `src/utils/settings.ts`
- Modify: `src/utils/__tests__/settings.test.ts`

- [x] `getSettingCredsURL` finds both `url` and `base_url` stored keys
- [x] Guard against empty thunk return: `|| defaultUrl || ''`
- [x] `URL_DEFAULTS_CASES` uses `storeField` (store key) separate from `urlField` (UI field); keycloak/xray use `base_url` for both
- [x] Parametrized `it.each` for URL default/placeholder/no-backend tests across all 15 integrations
- [x] Parametrized `it.each` for non-URL boolean defaults (is_cloud, use_bearer) with `storeField` to distinguish UI field key from backend store key
- [x] Parametrized `it.each` for non-URL string defaults (auth_type)
- [x] Four `getSettingCredsURL` "backend returned nothing" tests for url-only, keycloak (base_url), xray (base_url), empty-stored-url cases

Test-first: yes — wrote failing tests before each extension.

---

### Task 6: Extend mock server fixture

**Files:**
- Modify: `mock-server/db.json`

- [x] Add `cloud`, `auth_type`, `use_bearer` fields to relevant config entries
- [x] Add `placeholder` fields to URL entries
- [x] Fixture exercises all 15 mapped configs in local dev

Test-first: no — fixture only.
