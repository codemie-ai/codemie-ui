# Technical Research

**Task**: settingsUIConfig credential form label rename azuredevops
**Generated**: 2026-07-29T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Review the recent label rename in EPMCDME-10926: the AzureDevOps credential form field previously labeled "URL" was renamed to "Hostname" in settingsUIConfig.ts. The underlying field key remains `url`, the Yup validator remains `.url()`, the placeholder and defaultValue are unchanged. Only `label` changed from 'URL' to 'Hostname', and the validation error message changed from 'URL is required' to 'Hostname is required'.

---

## 2. Codebase Findings

### Existing Implementations

- `src/utils/settingsUIConfig.ts` — single source of truth for all credential form field definitions; exports `CREDENTIAL_UI_MAPPING`; the AzureDevOps `url` field now carries `label: 'Hostname'` and `required('Hostname is required')`; `dynPlaceholder`/`dynDefault` factory calls and `.url()` validator are unchanged
- `src/types/settingsUI.ts` — TypeScript type definitions for `CredentialFieldConfig`, `CredentialTypeConfig`, `CredentialUIMap`; `label` is typed as `string | ((values) => string)` and is optional
- `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` — React render component; reads `config.label` directly and passes it to `<Input>`; falls back to a `getLabel(placeholder)` derivation only when `label` is absent on the field config
- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` — parent form component; passes `credentialFields` entries from `CREDENTIAL_UI_MAPPING` to `<CredentialFields>`; re-mounts on credential type switch via `key={credentialType}`
- `src/utils/settings.ts` — utility functions that iterate `CREDENTIAL_UI_MAPPING`; provides `defaultValue`/`placeholder` resolution helpers for credential fields
- `src/store/appInfo.ts` — MobX store supplying `toolFieldDefaults` and `toolFieldPlaceholders` consumed by the `dynDefault`/`dynPlaceholder` factory closures in `settingsUIConfig.ts`
- `src/store/dataSources.ts` — references the `azuredevops` credential type for datasource integration logic; unaffected by the label rename
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeAzureDevOpsWiki.tsx` — AzureDevOps Wiki datasource form; unaffected by label rename
- `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeAzureDevOpsWorkItem.tsx` — AzureDevOps WorkItem datasource form; unaffected by label rename

### Architecture and Layers Affected

- **Config definition layer** — `settingsUIConfig.ts`: the only file changed by EPMCDME-10926; all credential field metadata (label, placeholder, defaultValue, Yup schema, sensitive, shouldShow, testable) lives here
- **Type layer** — `types/settingsUI.ts`: `CredentialFieldConfig.label` is optional; no type change required for this rename
- **Runtime defaults layer** — `store/appInfo.ts`: supplies backend-injected `toolFieldDefaults`/`toolFieldPlaceholders`; not touched by label rename
- **Form render layer** — `CredentialFields.tsx`: consumes `label` from the config; no code change required; the updated string propagates automatically
- **Validation layer** — Yup schemas inline in `settingsUIConfig.ts`; the `required()` message was updated from `'URL is required'` to `'Hostname is required'`; `.url('Value must be a valid URL')` is unchanged

### Integration Points

- `settingsUIConfig.ts` → `store/appInfo.ts` via `dynDefault`/`dynPlaceholder` closures (runtime backend defaults)
- `settingsUIConfig.ts` → `types/settingsUI.ts` (enum and interface imports)
- `CredentialFields.tsx` → `types/settingsUI.ts` (`CredentialFieldConfig`, `CredentialComponentType`)
- `SettingsForm.tsx` → `CredentialFields.tsx` (renders `credentialFields` prop from `CREDENTIAL_UI_MAPPING`)
- `settings.ts` → `settingsUIConfig.ts` (imports `CREDENTIAL_UI_MAPPING` for utility iteration)
- `CredentialFields.test.tsx` → `settingsUIConfig.ts` (imports `CREDENTIAL_UI_MAPPING` to test Yup validators directly)
- No external service calls, API endpoints, or backend field keys are affected — the field key `url` and the API payload binding are unchanged

### Patterns and Conventions

- **Label override pattern**: the `label` field is optional on `CredentialFieldConfig`; when absent, `CredentialFields.tsx` derives the display label from the placeholder string via `getLabel()`; when present (as with `azuredevops.url`), it is used verbatim
- **Required-message convention**: validation error messages follow the `'<FieldLabel> is required'` pattern; the rename from `'URL is required'` to `'Hostname is required'` follows this convention exactly
- **Secondary validator message is label-independent**: `.url('Value must be a valid URL')` is a shared string across all URL-validated fields and was correctly left unchanged
- **AzureDevOps is unique**: among all credential types, `azuredevops` is the only one using `label: 'Hostname'`; every other integration with a URL-style field uses `label: 'URL'` or omits `label` (e.g. `jira`, `confluence`, `sonar`, `servicenow`, `xwiki`, `zephyrscale`, `sharepoint`, `reportportal`, `elastic`, `email`)
- **`testable: false`** is set on the `azuredevops` entry — no connection-test button is rendered; the field label is only visible in the credential creation/edit form
- **No i18n layer**: all label strings are hardcoded inline in `settingsUIConfig.ts`; there are no translation key files to update

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `C:/EPAM/codemie/codemie-dev/codemie-ui/.ai-run/guides/project.md` — project metadata and Jira adapter config only; no coverage of settings UI or credential forms
- `C:/EPAM/codemie/codemie-dev/codemie-ui/.ai-run/guides/quality-gates.md` — CI validation commands (lint, typecheck, unit, integration tests); relevant for post-change verification, not for form structure
- No guides exist covering credential form structure, `settingsUIConfig.ts` conventions, or datasource integration UI patterns

### Architectural Decisions

- No ADR files or `DECISION:` markers exist for `settingsUIConfig.ts` or AzureDevOps credential form design
- CHANGELOG.md contains no prior entries for `azuredevops` or credential form label changes
- A related prior task (`docs/superpowers/tasks/2026-07-17-epmcdme-10928-configurable-integration-url-defaults/`) documented the introduction of the `dynDefault`/`dynPlaceholder`/`dynDefaultBool` factory functions that the AzureDevOps `url` field uses — this is background context for the field's dynamic default/placeholder behavior

### Derived Conventions

- `settingsUIConfig.ts` is the single authoritative source for all credential form field definitions; no other file defines credential UI metadata
- The `label` and `required()` message are maintained in sync manually — there is no automated linkage between them; keeping them consistent is a developer discipline requirement
- The field key (`url`), API payload shape, Yup `.url()` format validator, `dynDefault`, and `dynPlaceholder` are all decoupled from the display label and can be changed independently

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` — has a dedicated `azuredevops credential fields` describe block (lines 418–446) testing: field order (`url, organization, project, token`), Yup validation behavior (rejects empty string, accepts `https://dev.azure.com`), and absence of validation on `project`
- `src/utils/__tests__/settings.test.ts` — parameterized `URL_DEFAULTS_CASES` table covers `defaultValue`/`placeholder` resolution for `azuredevops.url` via `CREDENTIAL_UI_MAPPING`
- `src/store/__tests__/appInfo.test.ts` — references `azuredevops` incidentally in store tests; no credential form coverage
- `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx` — references `azuredevops` in datasource rendering tests; no credential form or label coverage

### Testing Framework and Patterns

- **Vitest 1.6.1** with two workspace profiles: `unit` (mocked Valtio, jsdom) and `integration` (real Valtio + mocked API, custom `vitest-env-integration.ts` environment)
- **@testing-library/react 16.3.0** with `@testing-library/user-event 14.6.1` and `@testing-library/jest-dom 6.6.3`
- Inline factory/fixture objects defined per test file (no shared factory registry)
- `vi.mock(...)` module mocks at the top of each test file (API, storage, Valtio, `appInfo` store)
- Mutable mock objects (`mockToolFieldDefaults`, `mockToolFieldPlaceholders`) mutated in `beforeEach`/`afterEach` for store-backed defaults
- `it.each(...)` for parameterized coverage across credential types
- Inline `Wrapper` React components provide `react-hook-form` context inside tests

### Coverage Gaps

- **No test asserts `label === 'Hostname'`** on the `azuredevops.url` field — the rename is not explicitly caught by any existing test
- **No test asserts the Yup `required` error message** is `'Hostname is required'` — the message change from `'URL is required'` is undetected by current tests
- **No integration test renders the AzureDevOps credential form** and checks the visible label in the DOM
- The existing `azuredevops` test block exercises Yup validation logic only, not the `label` or error-message string values

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — base API URL; read via `window._env_.VITE_API_URL` at runtime
- `VITE_ENV` — environment name (local/production)
- `VITE_APP_VERSION` — UI version string
- `VITE_SUFFIX` — sub-path prefix for deployments under a non-root path
- `VITE_API_PROXY_TARGET` — dev server proxy target (default `http://localhost:8080`)
- `VITE_ONBOARDING_ASSISTANT_SLUG`, `VITE_FEEDBACK_ASSISTANT_SLUG`, `VITE_CHATBOT_ASSISTANT_SLUG`, `VITE_PROMPT_ENGINEER_SLUG` — assistant identifier constants
- `KC_ENTRA_TENANT_ID`, `KC_ENTRA_CLIENT_ID`, `KC_ENTRA_CLIENT_SECRET` — Keycloak/Azure Entra SSO vars (Keycloak build only)

None of these variables are related to the label rename.

### Configuration Files

- `config.js` — runtime env injection via `window._env_`; governs `VITE_API_URL`, `VITE_ENV`, `VITE_APP_VERSION`; unrelated to credential form labels
- `vite.config.ts` — build configuration; `@` alias to `src/`; dev proxy; Keycloak build toggle; unrelated to label rename
- `src/utils/settingsUIConfig.ts` — the only file governing credential form field labels; no external config feeds into label definitions

### Feature Flags and Deployment Concerns

- No feature flag mechanism exists in the codebase
- No deployment concerns: the label rename is entirely contained within `settingsUIConfig.ts`; no env vars, `config.js` runtime injection, Docker templates, or nginx config reference the `"URL"`/`"Hostname"` label text; underlying field key `url` and API payload shape are unchanged

---

## 6. Risk Indicators

- **No label-value test coverage**: existing `CredentialFields.test.tsx` azuredevops block does not assert `label === 'Hostname'` or that the rendered DOM shows "Hostname" — the rename has no regression protection
- **No required-message test coverage**: the changed Yup message `'Hostname is required'` is not asserted anywhere; a future accidental revert to `'URL is required'` would not be caught
- **Manual label/message sync discipline**: the `label` string and the `required()` error message are maintained in sync manually with no automated enforcement; they can diverge silently
- **AzureDevOps is the sole outlier using 'Hostname'**: all other credential types with URL fields use `'URL'` as the label; a reviewer unfamiliar with the domain might flag the inconsistency as a bug
- **No documentation for settingsUIConfig conventions**: no guide, ADR, or inline comment explains why AzureDevOps uses `'Hostname'` instead of `'URL'`; the rationale is only traceable via the ticket reference

---

## 7. Summary for Complexity Assessment

This change is a single-file cosmetic rename confined entirely to `src/utils/settingsUIConfig.ts`. It touches one architectural layer (the config definition layer) and affects two string literals: the `label` property on the `azuredevops.url` field entry and the Yup `required()` message string. No type definitions, render components, API payloads, environment variables, or deployment artifacts are affected. The estimated file change surface is 1 file, 2 string literals.

The rename follows an established convention (`'<FieldLabel> is required'` for required-message text, explicit `label` override for non-obvious field display names) and does not introduce any new patterns. The secondary Yup validator message (`'Value must be a valid URL'`) is correctly left unchanged, consistent with every other URL-validated field in the config. The only technical novelty is that `azuredevops` becomes the sole credential type using `'Hostname'` as a URL field label, which is intentional per the ticket but undocumented.

Test coverage posture for this change is weak: the existing `CredentialFields.test.tsx` azuredevops block tests Yup validation behavior but does not assert either the `label` string value or the `required()` error message text. The rename therefore has no regression protection. This is a low-risk gap for a cosmetic change, but it represents a broader pattern — label values are systematically untested across the credential form suite — that could mask future unintended label changes.
