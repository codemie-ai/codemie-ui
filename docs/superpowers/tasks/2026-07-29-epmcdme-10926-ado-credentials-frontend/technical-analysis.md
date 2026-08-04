# Technical Research

**Task**: azuredevops credentials settingsUIConfig integration settings form validation
**Generated**: 2026-07-29T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Implement the frontend part of EPMCDME-10926: Reorder AzureDevOps credential fields in the UI, add required validation for mandatory fields (url, organization, token), and fix the tool config field map. The backend has already implemented: field reordering in AzureDevOpsCredentials (base_url, organization, project, access_token) and GenericAzureDevOpsConfig (url, organization, project, token); mandatory validation for url/organization/token via min_length=1; project made optional. The frontend needs to: (1) reorder credential fields in settingsUIConfig.ts from [url, project, organization, token] to [url, organization, project, token]; (2) add Yup required validation for url, organization, token; (3) fix TOOL_CONFIG_FIELD_MAP in appInfo.ts for genericazuredevopsconfig removing the incorrect auth_type field.

---

## 2. Codebase Findings

### Existing Implementations

- `src/utils/settingsUIConfig.ts` — Defines `CREDENTIAL_UI_MAPPING` with `azuredevops` entry; currently orders fields as `url`, `project`, `organization`, `token`; no `validation` properties on any AzureDevOps field
- `src/store/appInfo.ts` — Defines `TOOL_CONFIG_FIELD_MAP`; current entry `genericazuredevopsconfig: { credentialType: 'azuredevops', fields: ['url', 'auth_type'] }` contains the spurious `auth_type` field
- `src/types/settingsUI.ts` — TypeScript types for `CredentialFieldConfig`, including the optional `validation?: Yup.Schema` property
- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` — Consumes `CREDENTIAL_UI_MAPPING` to dynamically build Yup schema (lines 190–212); uses `fieldConfig.validation || Yup.string().nullable().optional()` per field

### Architecture and Layers Affected

- **Configuration layer** (`settingsUIConfig.ts`): field definitions, ordering, and per-field Yup schemas for credential types
- **State/store layer** (`appInfo.ts`): `TOOL_CONFIG_FIELD_MAP` static map used by `fetchToolConfigs` to match backend config class names to credential types and pre-populate defaults
- **Form/UI layer** (`SettingsForm.tsx`): reads `CREDENTIAL_UI_MAPPING` at render time; no changes needed here — the schema-building logic is generic

### Integration Points

- `CREDENTIAL_UI_MAPPING` in `settingsUIConfig.ts` is consumed by `SettingsForm.tsx` to build both field render order and the Yup validation schema
- `TOOL_CONFIG_FIELD_MAP` in `appInfo.ts` is consumed by `fetchToolConfigs` to extract deployment-configurable default values from the `/v1/tools/configs` API response
- The `fields` array in `TOOL_CONFIG_FIELD_MAP` entries lists only backend field names that carry deployment defaults (e.g., `url`) — not all credential form fields

### Patterns and Conventions

- **Field ordering**: JavaScript object key insertion order is used directly; the form renders fields in the order they appear in the `fields` object in `settingsUIConfig.ts`
- **Required validation pattern**: attach `validation: Yup.string().required('...')` to a field config; optionally chain `.url('...')` for URL fields — canonical examples are `jira.url`, `jira.token`, `xwiki.url`, `xwiki.token`
- **`TOOL_CONFIG_FIELD_MAP` pattern**: only fields that have deployment-configurable defaults (e.g., `url`, `auth_type`) are listed; integrations without `auth_type` list only `['url']` (see `sonarconfig`, `elasticconfig`, `servicenowconfig`, `zephyrconfig`)

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guides found specifically for the integration settings form or credential UI mapping. Conventions derived from code exploration.

### Architectural Decisions

No ADRs found for this domain. The `TOOL_CONFIG_FIELD_MAP` pattern with deployment-configurable field defaults is an implicit convention inferred from existing entries.

### Derived Conventions

- The `fields` array in `TOOL_CONFIG_FIELD_MAP` is NOT a mirror of credential form fields — it is a filtered list of fields that can be pre-populated from deployment configuration
- `auth_type` is only listed in `genericgitconfig` and `emailtoolconfig` because those integrations expose an `auth_type` select in their credential form; AzureDevOps does not
- Validation messages follow the pattern `'<FieldLabel> is required'` (e.g., `'URL is required'`, `'Token is required'`)

---

## 4. Testing Landscape

### Existing Coverage

- `src/store/__tests__/appInfo.test.ts` — Tests `fetchToolConfigs` including a specific assertion that `azuredevops.auth_type` is populated from `genericazuredevopsconfig.auth_type`; this test **will break** when `auth_type` is removed from the field map and must be updated
- `src/utils/__tests__/settings.test.ts` — Tests `CREDENTIAL_UI_MAPPING` URL defaults and placeholders for `azuredevops`; no test covers field order or validation
- `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` — Tests Yup validation on individual fields but has no AzureDevOps-specific coverage

### Testing Framework and Patterns

- Framework: Vitest with React Testing Library
- Validation is tested by calling `fieldConfig.validation.isValidSync(...)` directly on the config object in unit tests
- Component tests use rendered form elements and fire-event patterns

### Coverage Gaps

- No test covers AzureDevOps field ordering in `CREDENTIAL_UI_MAPPING`
- No test covers Yup required validation for `azuredevops.url`, `azuredevops.organization`, or `azuredevops.token`
- The existing `appInfo.test.ts` assertion for `auth_type` on `genericazuredevopsconfig` will need to be removed/updated

---

## 5. Configuration and Environment

### Environment Variables

No environment variables specific to AzureDevOps credential configuration in the frontend. The `AZUREDEVOPS_URL` constant is a hardcoded default in `settingsUIConfig.ts`.

### Configuration Files

- `src/utils/settingsUIConfig.ts` — sole source of truth for credential field definitions, ordering, labels, placeholders, and validation schemas
- `src/store/appInfo.ts` — sole source of truth for `TOOL_CONFIG_FIELD_MAP` backend-to-frontend config class mapping

### Feature Flags and Deployment Concerns

None identified for this task. No feature flags gate the AzureDevOps integration form.

---

## 6. Risk Indicators

- `src/store/__tests__/appInfo.test.ts` asserts `azuredevops.auth_type` is populated from `genericazuredevopsconfig.auth_type` — removing `auth_type` from `TOOL_CONFIG_FIELD_MAP` will cause this test to fail; it must be updated as part of this task
- No existing Yup validation tests for `azuredevops` fields — new validation should be covered by at least a basic test following the pattern in `CredentialFields.test.tsx` or `settings.test.ts`
- Field ordering is purely positional (JS object key order) — easy to get wrong; a smoke test reading the key order would prevent regression
- The change is small and well-bounded (two files, three change points) — low risk of unintended side effects

---

## 7. Summary for Complexity Assessment

The task touches two configuration files and one existing test file. In `src/utils/settingsUIConfig.ts`, the AzureDevOps `fields` object key order must change from `url, project, organization, token` to `url, organization, project, token`, and three fields (`url`, `organization`, `token`) need `validation: Yup.string().required(...)` entries added — `url` should also chain `.url(...)` consistent with the jira/xwiki pattern. In `src/store/appInfo.ts`, the `genericazuredevopsconfig` entry in `TOOL_CONFIG_FIELD_MAP` needs `auth_type` removed from its `fields` array, leaving only `['url']`. No new components, routes, or API calls are introduced; the form rendering layer (`SettingsForm.tsx`) already handles both field order and dynamic Yup schema construction generically.

The task follows fully established patterns — required-field validation and TOOL_CONFIG_FIELD_MAP corrections are both well-precedented by jira, xwiki, sonar, and other integrations already in the codebase. There is no technical novelty. The only non-obvious step is updating `src/store/__tests__/appInfo.test.ts` to remove the assertion that `azuredevops.auth_type` is populated from the backend config, since that field no longer appears in the map.

Test coverage posture for the affected area is sparse: existing tests cover URL defaults and placeholders but not field ordering or required validation for AzureDevOps specifically. The existing failing-test risk in `appInfo.test.ts` is a known and concrete side effect of the `auth_type` removal. Overall complexity is low — three targeted edits across two source files plus one test file update, all following existing patterns with no architectural changes.
