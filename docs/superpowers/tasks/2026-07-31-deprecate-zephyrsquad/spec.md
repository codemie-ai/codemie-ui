# Spec — Deprecate ZephyrSquad integration (UI)

**Ticket**: EPMCDME-10913
**Repo**: codemie-ui/ (React/TypeScript/Vite)
**Companion**: codemie/ backend (branch `EPMCDME-10913_deprecate-zephyrsquad`, MR to be created).
Shared design lives in that repo's `docs/superpowers/tasks/2026-07-31-deprecate-zephyrsquad/spec.md`.

## Goal

Prevent users from creating new ZephyrSquad integrations from the UI, show a clear deprecation banner on existing ZephyrSquad settings, and put the edit form into read-only mode — leaving existing settings visible and usable by agents while forbidding modification. Rely on the backend's 410 for defense-in-depth; the UI is the primary UX guard.

## Behavior

### 1. New-integration picker hides ZephyrSquad

`getAvailableCredentialsTypes` (in `src/utils/settings.ts`) filters entries with `deprecated: true`. `NewUserIntegrationPage` and `NewProjectIntegrationPage` no longer offer ZephyrSquad as a selectable credential type.

### 2. Direct URL navigation guarded

If a user navigates to `/integrations/new?credentialType=ZephyrSquad` (or the project equivalent), the page detects the deprecated type and redirects back to the integrations list (or renders a "This integration is deprecated — you can still view existing ones from the list" message). No form is rendered for a new deprecated credential.

### 3. Deprecation banner on the edit form

For existing ZephyrSquad settings opened via `EditUserIntegrationPage` / `EditProjectIntegrationPage`, the shared `SettingsForm` renders a warning banner ("ZephyrSquad integration is deprecated. Existing configurations are read-only. Please migrate to Zephyr Scale or another supported integration.") using the existing `CredentialMessage` / `InfoWarning` primitive. The banner uses `type: 'warning'`.

### 4. Read-only edit form

For deprecated credential types on the edit page:
- Fields are rendered but disabled.
- The **Save** button is hidden (not just disabled — hiding is unambiguous and matches "read-only").
- The **Test Integration** button is hidden (the backend `POST /v1/settings/test` for ZephyrSquad may already reject; hiding avoids a confusing error toast). `getTestableCredentialTypes` respects the `deprecated` flag.
- The **Delete** button remains visible so users can clean up.

### 5. Type extension

`CredentialTypeConfig` in `src/types/settingsUI.ts` gains `deprecated?: boolean`. The `zephyrsquad` entry in `CREDENTIAL_UI_MAPPING` sets `deprecated: true` and provides the banner text via the existing `message: CredentialMessage` field.

### 6. Backend contract (already shipped)

The UI does not need special-case 410 handling. Existing `getErrorMessage(error)` parses the `ExtendedHTTPException` envelope `{error: {message, details, help}}` and surfaces it via the toast pipeline. A ZephyrSquad user who somehow bypasses the UI guard (e.g. old browser tab, direct API call) sees the backend's deprecation message via the standard error toast.

## Non-goals

- No i18n. Hardcoded English matches the rest of the codebase.
- No new UI primitives. `InfoWarning`, `CredentialMessage`, `getErrorMessage` all reused.
- No changes to the toolkit list on `GET /v1/tools` consumption (backend adds the field; UI only reads it if we later want a banner on the agent-tool picker — out of scope here).
- No feature flag. The deprecation is unconditional.
- No delete or forced migration of existing settings.

## Acceptance criteria

- [ ] AC1: On `/integrations/new` (user or project scope), ZephyrSquad is NOT in the credential-type dropdown.
- [ ] AC2: Direct URL nav to `/integrations/new?credentialType=ZephyrSquad` redirects or blocks; no form is rendered.
- [ ] AC3: Opening an existing ZephyrSquad setting shows a warning banner with the deprecation message.
- [ ] AC4: Form fields on the edit view are disabled; Save and Test Integration buttons are not visible.
- [ ] AC5: Delete button on the edit view remains functional.
- [ ] AC6: Non-deprecated credential types are unaffected (regression coverage in unit tests).
- [ ] AC7: `getAvailableCredentialsTypes` unit test covers the deprecated-exclusion branch.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| `SettingsForm.tsx` has no existing tests | Add a `SettingsForm.test.tsx` covering the deprecated read-only path |
| Direct-URL nav slips through | Explicit guard + test in `NewUser/NewProjectIntegrationPage` |
| "Test Integration" button forgotten | Update `getTestableCredentialTypes` to filter deprecated; verify in existing testable-types test |
| Type change to `CredentialTypeConfig` breaks other consumers | Optional field with default `undefined/false` — additive only |
| Deployment ordering (backend already returns 410) | Ship UI change ASAP; toast surfaces the backend message anyway |
