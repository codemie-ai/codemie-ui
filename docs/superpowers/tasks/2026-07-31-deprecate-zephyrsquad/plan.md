# Plan — EPMCDME-10913 UI

Ticket: EPMCDME-10913 · Branch: `EPMCDME-10913_deprecate-zephyrsquad` · Spec: [spec.md](./spec.md)

Six inline TDD tasks. Additive type extension + one filter helper + four page-level guards. All existing render primitives (`InfoWarning`, `CredentialMessage`, `getErrorMessage`) reused as-is.

Test discovery: `SettingsForm.tsx`, `NewUserIntegrationPage`, `NewProjectIntegrationPage`, `EditUserIntegrationPage`, `EditProjectIntegrationPage` have zero tests. New file `src/utils/__tests__/settings.test.ts` extended; new lightweight test file `src/utils/__tests__/settingsUIConfig.test.ts` may cover the `deprecated=true` invariant on zephyrsquad without needing to test the whole SettingsForm surface.

---

## T1 — Extend `CredentialTypeConfig` with `deprecated?: boolean`

**Files**: `src/types/settingsUI.ts`

**Change**: add `deprecated?: boolean` (optional, defaults to undefined/false) to the `CredentialTypeConfig` type.

**Test-first: n/a** — pure type-only change; caught by `tsc --noEmit` when consumers add filters. The next tasks' tests exercise the field.

---

## T2 — Mark ZephyrSquad deprecated in config, add banner message

**Files**: `src/utils/settingsUIConfig.ts`

**Change**: on the `zephyrsquad` entry (lines 607–620):
- Add `deprecated: true`.
- Add `message: { type: 'warning', text: '<deprecation message>' }` using the existing `CredentialMessage` shape. The banner text is exactly: `"ZephyrSquad integration is deprecated. Existing configurations are read-only — you cannot save changes here. Please migrate to Zephyr Scale or another supported integration."`.

**Test-first: yes** — new small file `src/utils/__tests__/settingsUIConfig.test.ts`:
```ts
import { CREDENTIAL_UI_MAPPING } from '@/utils/settingsUIConfig'
test('zephyrsquad is marked deprecated', () => {
  expect(CREDENTIAL_UI_MAPPING.zephyrsquad.deprecated).toBe(true)
  expect(CREDENTIAL_UI_MAPPING.zephyrsquad.message?.type).toBe('warning')
})
test('other credential types are not deprecated', () => {
  const nonDeprecated = ['jira','confluence','xray','zephyrscale']
  for (const k of nonDeprecated) {
    expect(CREDENTIAL_UI_MAPPING[k]?.deprecated).toBeFalsy()
  }
})
```

Fails before T2 impl.

---

## T3 — Filter deprecated from picker and testable helpers

**Files**: `src/utils/settings.ts`

**Change**:
1. In `getCredentialUIMapping` — add a filter step that skips entries with `config.deprecated === true`.
2. In `getTestableCredentialTypes` — also filter out deprecated entries (a deprecated credential is not testable even if `testable: true`).

**Test-first: yes** — extend `src/utils/__tests__/settings.test.ts`:
```ts
test('getAvailableCredentialsTypes excludes deprecated credentials', () => {
  const types = getAvailableCredentialsTypes({ settingType: 'user', user: MOCK_USER })
  expect(types).not.toContain('zephyrsquad')
})
test('getTestableCredentialTypes excludes deprecated credentials', () => {
  const testable = getTestableCredentialTypes()
  expect(testable).not.toContain('zephyrsquad')
})
```

Both fail before T3.

---

## T4 — Guard direct URL nav on `NewUser/NewProjectIntegrationPage`

**Files**:
- `src/pages/integrations/NewUserIntegrationPage.tsx`
- `src/pages/integrations/NewProjectIntegrationPage.tsx`

**Change**: after the `useVueRouter` hook, add a `useEffect` (or inline check on render) that reads `query.credentialType`, normalizes to lowercase, and if `CREDENTIAL_UI_MAPPING[key]?.deprecated`, calls `navigateBack(INTEGRATIONS)` or `router.replace('/integrations')` before rendering `SettingsForm`. Additionally, the `SettingsForm`'s picker will already exclude it (T3), so the plain `/integrations/new` path is safe.

**Test-first: yes** — new test files:
- `src/pages/integrations/__tests__/NewUserIntegrationPage.test.tsx`
- `src/pages/integrations/__tests__/NewProjectIntegrationPage.test.tsx`

Each: render with `router.query.credentialType = 'ZephyrSquad'`; assert that `navigate`/`replace` mock was called with the integrations list path and no form is rendered.

---

## T5 — Hide Save + Test in edit pages when credential is deprecated

**Files**:
- `src/pages/integrations/EditUserIntegrationPage.tsx`
- `src/pages/integrations/EditProjectIntegrationPage.tsx`

**Change**: in the `rightContent` of `PageLayout`, wrap the `Save` `<Button>` and the `TestIntegration` block in a conditional: only render them when `setting.credential_type` is NOT deprecated. Add a small helper `isDeprecatedCredentialType(credentialType)` in `src/utils/settings.ts` returning `!!CREDENTIAL_UI_MAPPING[credentialType.toLowerCase()]?.deprecated` so both edit pages share the check.

The banner itself will render via the SettingsForm → CredentialFields → SettingFormMessage pipe because T2 set `message: {...}` on the config; no additional rendering wiring required.

**Test-first: yes** — new test files:
- `src/pages/integrations/__tests__/EditUserIntegrationPage.test.tsx`
- `src/pages/integrations/__tests__/EditProjectIntegrationPage.test.tsx`

Each: render with a mocked setting whose `credential_type = 'ZephyrSquad'`; assert Save and Test buttons are NOT in the DOM, Cancel IS in the DOM. Add a companion case where `credential_type = 'Jira'` and Save + Test ARE present.

Also a small unit test for the `isDeprecatedCredentialType` helper in `src/utils/__tests__/settings.test.ts`.

---

## T6 — Fields disabled on the deprecated edit form

**Files**: `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` (and `CredentialFields.tsx` if per-field prop plumbing is needed)

**Change**: `SettingsForm` reads `isDeprecatedCredentialType(credentialType)`; if true AND `editing === true`, passes `disabled={true}` to input fields (via existing `CredentialFields` field prop already used by other flows). Keep the Delete affordance functional (Delete is not on SettingsForm — the edit pages own it separately).

**Test-first: yes** — extend `EditUser/EditProjectIntegrationPage.test.tsx` (or a new SettingsForm test): assert form input elements are rendered with `disabled` attribute when the setting is ZephyrSquad; enabled when it is Jira.

---

## Execution order

T1 (type) → T2 (config) → T3 (filter helpers) → T4 (New pages guard) → T5 (Edit pages button visibility) → T6 (form disabled state).

T4/T5/T6 could parallelize but sequential keeps commits atomic and reviewable.

## Out of scope

- Any change to how `GET /v1/tools` is consumed on other pages (agent config, etc.).
- i18n / message translations.
- Adding a "Deprecated" badge to the integrations list — spec limits scope to picker exclusion + edit-form banner + edit-form read-only.
- Backend contract (already shipped in codemie/).
- Feature flag for the deprecation.
