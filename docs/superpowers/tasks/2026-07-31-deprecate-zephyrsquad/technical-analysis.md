# Technical Research

**Task**: integrations settings zephyr zephyrsquad tool-picker credential-type integration-form
**Generated**: 2026-07-31T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-10913 — Deprecate ZephyrSquad integration in the CodeMie UI (codemie-ui/ repo, TypeScript/React/Vite).

This is the UI-side of a cross-repo task. The backend companion is already implemented in codemie/ and will:
1. Return `deprecated: true` on the ZephyrSquad entry in `GET /v1/tools` response (new field on the Tool schema).
2. Reject `POST /v1/settings/user` and `POST /v1/settings/project` (and PUT variants) with `credential_type=ZephyrSquad` via HTTP 410 Gone + ExtendedHTTPException envelope `{error: {message: "ZephyrSquad integration is deprecated", details: "...", help: "..."}}`.
3. Keep GET on existing settings unchanged — ZephyrSquad rows remain visible.

User has chosen for this run: "Read-only with deprecation banner" for existing configurations.

UI responsibilities to research:
- Where does the UI render the integration/tool picker for creating a new user or project setting? How does it consume `GET /v1/tools` and lay out available integrations?
- Where does the ZephyrSquad settings form/detail view live? What are the code paths that render the form (create + edit)?
- Is there a shared list-of-integrations component that would show a deprecation badge/banner?
- What's the API-client / SDK layer for user_settings and project_settings? Where would we handle a 410 response gracefully (e.g. show the deprecation message from the ExtendedHTTPException envelope)?
- Existing pattern (if any) for "deprecated" or "coming soon" or "disabled" integration entries in the picker. Prior art?
- i18n strings — where are user-facing deprecation messages stored?
- Test patterns (vitest + React Testing Library based on package.json).

---

## 2. Codebase Findings

### Existing Implementations

The ZephyrSquad integration is entirely data-driven through a central credential-type registry. There is no separate ZephyrSquad-specific component — all fields, labels, and behavior come from one config entry.

- `src/utils/settingsUIConfig.ts` (lines 607–620) — `CREDENTIAL_UI_MAPPING['zephyrsquad']` entry: `displayName: 'ZephyrSquad'`, `serverEnum: 'ZephyrSquad'`, `testable: true`, three fields (`account_id`, `access_key`, `secret_key`). This is the **single source of truth** for ZephyrSquad's UI; the primary change point for deprecation.
- `src/types/settingsUI.ts` (line 99) — `CredentialTypeConfig` interface: must be extended with `deprecated?: boolean`. Already contains a `message?: CredentialMessage` field that supports inline info/warn/error banners — this is the prior-art hook for the deprecation banner.
- `src/utils/settings.ts` — `getAvailableCredentialsTypes` (line 98) and `getCredentialUIMapping` (line 46): filter the credential registry by `accessType`, `roleRestrictionType`, `enterpriseOnly`. A `deprecated` flag filter should be added here to exclude ZephyrSquad from new-integration pickers. `getOriginalCredentialType` / `getTestableCredentialTypes` also live here.
- `src/pages/integrations/NewUserIntegrationPage.tsx` — page for creating a new user-scoped integration; reads available credential types from `getAvailableCredentialsTypes` to populate the picker. Must exclude deprecated types in the picker and guard against direct URL navigation with `?credentialType=ZephyrSquad`.
- `src/pages/integrations/NewProjectIntegrationPage.tsx` — same as above for project scope.
- `src/pages/integrations/EditUserIntegrationPage.tsx` — edit path for existing user-scoped settings. The deprecation banner must be rendered here for ZephyrSquad credentials. Form should be read-only per the chosen UX mode.
- `src/pages/integrations/EditProjectIntegrationPage.tsx` — same for project scope.
- `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` — shared form component; renders `CredentialFields`, `SettingFormMessage` (for `CredentialMessage`), validation, submit. The deprecation banner placement and read-only guard must be applied here.
- `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` — renders per-field UI from the `CredentialTypeConfig`. Already handles the `message` property (shows `SettingFormMessage`).
- `src/pages/integrations/utils/getErrorMessage.ts` — reads `parsedError.message + parsedError.details` from caught errors; already compatible with the backend 410 `ExtendedHTTPException` envelope `{error: {message, details, help}}`. No new API client code is required for 410 handling.
- `src/store/userSettings.ts` — Valtio proxy store; `createUserSetting`, `updateUserSetting` make POST/PUT calls. 410 errors flow through `api.ts` → `parsedError` → caught in page-level catch blocks → `getErrorMessage` → toast.
- `src/store/settings.ts` — Valtio proxy store for project settings; same error pipeline.
- `src/utils/api.ts` — `makeRequest` / `parseErrorBody`: generic fetch wrapper; non-2xx responses attach `parsedError` to the rejected Response. No changes needed for 410.
- `src/components/InfoWarning/InfoWarning.tsx` — reusable banner with WARNING / INFO / ERROR types; the correct primitive for the deprecation banner in the edit form.
- `src/components/StatusBadge/StatusBadge.tsx` — `StatusEnum` badge (warning, error, success, etc.); can be used for a "Deprecated" badge in the integration picker list.
- `src/pages/integrations/components/IntegrationStateBadge/IntegrationStateBadge.tsx` — per-integration enabled/disabled badge, driven by `INTEGRATION_ENABLED_BADGE_MAP` in `src/constants/integration.ts`. A "Deprecated" state could be added here if needed.

### Architecture and Layers Affected

1. **UI Config layer** — `settingsUIConfig.ts`: add `deprecated: true` to the `zephyrsquad` entry. Extend `CredentialTypeConfig` in `settingsUI.ts` with `deprecated?: boolean`.
2. **Utility/Filtering layer** — `settings.ts`: filter deprecated types out of `getCredentialUIMapping` / `getAvailableCredentialsTypes` for new-creation flows.
3. **Form layer** — `SettingsForm.tsx`, `CredentialFields.tsx`: render deprecation banner (via existing `CredentialMessage` / `InfoWarning` pattern) and enforce read-only mode on deprecated settings.
4. **Page layer** — `NewUserIntegrationPage`, `NewProjectIntegrationPage` (guard/redirect), `EditUserIntegrationPage`, `EditProjectIntegrationPage` (show banner, disable save).
5. **State/Store layer** — `userSettingsStore`, `settingsStore`: 410 errors handled automatically by existing toast pattern; no store changes required.
6. **HTTP Client layer** — `api.ts` + `getErrorMessage.ts`: no changes required; existing error pipeline handles 410 correctly.
7. **UI Primitives** — `InfoWarning`, `StatusBadge`, `IntegrationStateBadge`: reuse as-is.

### Integration Points

- `src/utils/settingsUIConfig.ts` → imported by `settings.ts`, `CredentialFields.tsx`, `SettingsForm.tsx`, both New and Edit page variants — changing the `zephyrsquad` entry propagates to all of them.
- `src/utils/settings.ts` → `getAvailableCredentialsTypes` is the picker data source for all New integration pages.
- `src/utils/api.ts` → used by `userSettingsStore` and `settingsStore` for all HTTP calls; `parsedError` flows to `getErrorMessage.ts`.
- No external service clients are involved in the UI change — the HTTP boundary is already established.

### Patterns and Conventions

- **Data-driven credential registry**: all credential-type UI is declared in `CREDENTIAL_UI_MAPPING`. Adding fields, messages, and flags (like `deprecated`) is the established extension point — no new components required for basic behavior.
- **`CredentialMessage` prior art**: `CredentialTypeConfig.message` (type `CredentialMessage`) already supports `type` (info/warn/error), `text`, `shouldShow` predicate, and `configKey` for feature-flag gating. The deprecation banner for the edit view should use this exact mechanism — set `message: { type: 'warning', text: 'ZephyrSquad is deprecated. ...' }` on the `zephyrsquad` config entry.
- **Access-control filter pattern**: `getCredentialUIMapping` filters by `accessType`/`roleRestrictionType`/`enterpriseOnly`. Adding a `deprecated` check follows this same filter chain, keeping exclusion logic centralized.
- **Error toast pattern**: page-level catch blocks call `getErrorMessage(error)` and display a toast. 410 responses will surface the backend's deprecation message automatically — no new wiring is needed.
- **Valtio proxy stores**: stores are thin wrappers around `api.ts`; no business logic in stores — filtering/guarding happens in utils or pages.
- **No i18n**: all user-facing strings are hardcoded English in config objects and component props — consistent throughout the codebase. Deprecation messages should follow this convention.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/patterns/form-patterns.md` — form conventions; relevant for deprecation banner placement in `SettingsForm`.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/patterns/state-management.md` — Valtio store patterns; relevant if any store-level change is made.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/testing/testing-patterns.md` — test conventions; governs how new test cases for the deprecation flag should be written.
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/testing/qa-strategy.md` — quality gate strategy.

### Architectural Decisions

- The credential-type registry pattern (`CREDENTIAL_UI_MAPPING`) is the established extension mechanism — confirmed by codegraph exploration of the full file. Adding deprecation metadata to it (rather than branching in components) is consistent with all prior additions.
- The `CredentialMessage` type with `shouldShow` / `configKey` is designed for conditional inline messages — it is the documented hook for per-credential-type contextual information.

### Derived Conventions

- New credential-type behaviors (fields, constraints, messages) are declared in `settingsUIConfig.ts` data, not in component code.
- Error messages shown to users come from `getErrorMessage(error)`, which reads `parsedError.message + parsedError.details` — no special-casing for HTTP status codes.
- No feature-flag infrastructure beyond the `configKey` on `CredentialMessage` (which gates a message's visibility on a user config value) — if a hard feature flag is required for the deprecation, it should use this existing `configKey` pattern.

### External Documentation Findings

Not applicable — this task has no third-party/external library surface; it is entirely internal UI refactoring.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/settings.test.ts` — covers `getAvailableCredentialsTypes` (the picker filter function). New test cases for `deprecated: true` exclusion behavior belong here.
- `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` — covers field rendering, multiselect, webhook section grouping. Deprecation banner rendering for ZephyrSquad (via `CredentialMessage`) belongs here.
- `src/store/__tests__/userSettings.test.ts` — covers `userSettingsStore` create/update API calls. A test for 410 response producing the correct error toast content belongs here.
- `src/pages/integrations/__tests__/IntegrationsPage.integration.test.tsx` — integration test using `mockAPI` + `renderPage` helpers. A test asserting ZephyrSquad does NOT appear in the new-integration picker dropdown belongs here.
- `src/pages/integrations/__tests__/ProjectSettingsPagination.integration.test.tsx` — pagination tests; lower priority for this change.
- `src/pages/integrations/__tests__/UserSettingsPagination.integration.test.tsx` — pagination tests; lower priority for this change.

### Testing Framework and Patterns

- **Framework**: Vitest + `@testing-library/react` + `@testing-library/user-event`
- **Integration test helpers**: `src/test-utils/integration` — `mockAPI` (HTTP mock) + `renderPage` (full page render with store); used in `IntegrationsPage.integration.test.tsx`.
- **Unit test mock pattern**: `vi.mock('@/utils/api')` to mock HTTP calls at the boundary in store and utility tests.
- **Fixture pattern**: inline test data objects; no factory library.

### Coverage Gaps

- `SettingsForm.tsx` has **zero covering tests** — any deprecation banner or read-only guard added here carries regression risk without a new test file.
- `NewUserIntegrationPage` and `NewProjectIntegrationPage` have **no covering tests** — the direct-URL-navigation guard (redirect or disabled state when `credentialType=ZephyrSquad`) must be added and tested.
- `EditUserIntegrationPage` and `EditProjectIntegrationPage` have **no specific ZephyrSquad test coverage** — the deprecation banner rendering on the edit view needs new tests.

---

## 5. Configuration and Environment

### Environment Variables

No new environment variables are required. The deprecation is data-driven via `CREDENTIAL_UI_MAPPING`.

### Configuration Files

- `src/utils/settingsUIConfig.ts` — `CREDENTIAL_UI_MAPPING` constant (line 106); `zephyrsquad` entry at line 607. Primary change file.
- `src/types/settingsUI.ts` — `CredentialTypeConfig` interface (line 99). Must add `deprecated?: boolean`.
- `src/constants/integration.ts` — `INTEGRATION_ENABLED_BADGE_MAP` used by `IntegrationStateBadge`; may need a `deprecated` state entry if a distinct badge is desired.

### Feature Flags and Deployment Concerns

- The existing `CredentialMessage.configKey` mechanism supports gating a message on a user config value — if the deprecation banner needs to be toggled via a customer config flag, this path exists in `CredentialTypeConfig.message.configKey` without new infrastructure.
- No deployment manifests or environment-specific config changes required for this task.
- The backend 410 response is live; the UI must be deployed before or simultaneously to avoid confusing error states for existing users attempting to create new ZephyrSquad settings.

---

## 6. Risk Indicators

- `SettingsForm.tsx` has zero covering tests. Changes to it (deprecation banner, read-only enforcement) are untested by default — a new `SettingsForm.test.tsx` or additions to `CredentialFields.test.tsx` are required.
- `NewUserIntegrationPage` and `NewProjectIntegrationPage` have no tests. Direct URL navigation to `/integrations/new?credentialType=ZephyrSquad` bypasses the picker filter — the redirect/guard must be implemented and covered by tests.
- `getTestableCredentialTypes()` currently includes `zephyrsquad` (`testable: true`). If the edit page still renders a "Test Integration" button for ZephyrSquad, the test endpoint will also return 410, producing a confusing error. The button must be hidden or disabled for deprecated settings — this is a secondary change not explicitly in the requirements but necessary for UX consistency.
- The `CredentialMessage.shouldShow` predicate supports conditional banner display — if this predicate is not set or is incorrectly evaluated, the deprecation banner may silently not appear on the edit page. Requires explicit test coverage.
- Backend is already deployed with 410 rejection. Until UI ships, any user with a ZephyrSquad setting who clicks Save on the edit page will see a raw 410 error toast. The urgency to ship the UI guard is higher than average.
- No i18n layer: all deprecation messages will be hardcoded English strings — consistent with the rest of the codebase but non-localizable.
- `getOriginalCredentialType` in `settings.ts` maps the normalized lowercase key back to the backend enum (`'ZephyrSquad'`). Verify the edit pages use this correctly when loading existing settings to avoid a key mismatch that would cause the deprecation flag to not be detected.

---

## 7. Summary for Complexity Assessment

The ZephyrSquad deprecation in codemie-ui is a contained, data-driven change centered on two TypeScript files and two layers: the credential-type config registry (`settingsUIConfig.ts`) and the utility filtering layer (`settings.ts`). The implementation follows well-established patterns already present in the codebase — specifically, the `CredentialMessage` mechanism for inline banners and the `getCredentialUIMapping` filter chain for access control. No new components, no new API client code, and no store changes are required for the core behavior. The estimated file change surface is 6–10 files: `settingsUIConfig.ts`, `settingsUI.ts` (type extension), `settings.ts` (filter logic), `SettingsForm.tsx` (read-only guard + banner), `constants/integration.ts` (optional badge state), and the four page files (`NewUser`, `NewProject`, `EditUser`, `EditProject`) for guards and banner wiring.

The primary technical novelty is the introduction of a `deprecated` semantic into the credential-type registry — something the current `CredentialTypeConfig` type does not have. However, the type extension is trivial and the downstream filtering follows the exact same pattern as the existing `enterpriseOnly` and `roleRestrictionType` exclusions. The 410 error handling requires zero new code because the existing `getErrorMessage` + toast pattern already consumes the `ExtendedHTTPException` envelope format.

The significant risk factor is test coverage: `SettingsForm.tsx`, `NewUserIntegrationPage`, and `NewProjectIntegrationPage` all lack tests, yet they are in the change surface. Any regression in the read-only enforcement or the picker exclusion could go undetected without new test files. Additionally, the "Test Integration" button must be suppressed for deprecated credentials (a secondary risk not explicitly stated in requirements). The overall complexity is low-to-medium: the pattern is clear, the change surface is small, but the test debt in the affected files requires deliberate effort to address alongside the feature work.
