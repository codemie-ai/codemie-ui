# Technical Research

**Task**: integrations settingsUIConfig testable TestIntegration toaster
**Generated**: 2026-09-30
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-15200 — UI handoff: Microsoft Exchange test button and success message. Research only; write technical-analysis.md (with "Codebase Findings" and "Risk Indicators" sections) and return the digest. Do NOT implement or commit anything.

Goal: Backend now implements a live-mailbox healthcheck for `MSExchange`. Users press **Test** on a Microsoft Exchange integration and see the backend's success text. Out of scope: new form fields (credential contract unchanged), Exchange tool UI, SDK enum bump.

Backend contract: existing integration test flow, no new route. Success: HTTP 200 `{ "success": true, "message": "Connection and Inbox access verified." }`. Failure: ExtendedHTTPException(400, "Integration test failed", details=<sanitised message>), which the UI already renders as `Integration test failed<br>details`.

Agreed changes (re-confirm line numbers against the current branch):
1. src/utils/settingsUIConfig.ts (~535, Microsoft Exchange entry): testable false -> true.
2. src/utils/__tests__/settingsUIConfig.test.ts (~172): flip the existing testable assertion and add a test that the Test button renders for this entry.
3. src/pages/integrations/components/TestIntegration.tsx (~88): replace hardcoded toaster.info('Integration test successful') with toaster.info(response.message || 'Integration test successful'). Cross-cutting: every integration's success toast will show the backend `message` when returned. Investigate whether any other integration's test response returns an unfriendly success `message` (frontend evidence: mocks, types, API layer, other consumers of the test endpoint).

Verify: unit tests pass, lint/type-check clean; manual backend check for both auth_type values is outside CI.

---

## 2. Codebase Findings

### Existing Implementations
Line numbers re-confirmed on branch EPMCDME-15200_ms-exchange-test-button:
- `src/utils/settingsUIConfig.ts:532-535` — `msexchange` entry: `displayName: 'Microsoft Exchange'`, `serverEnum: 'MSExchange'`, `testable: false` at line 535. Fields: `auth_type` select (`oauth_azure` / `ntlm`), `mailbox`, oauth_* fields (`shouldShow: isOAuthAzureExchangeAuth`), ntlm fields incl. `ews_url` (`isNtlmExchangeAuth`).
- `src/utils/settings.ts:125` — `getTestableCredentialTypes()` filters `CREDENTIAL_UI_MAPPING` by `config.testable ?? CREDENTIAL_DEFAULTS.testable`; returns registry keys (lowercase, e.g. `msexchange`). `getOriginalCredentialType` maps key to `serverEnum` (`MSExchange`).
- `src/pages/integrations/components/TestIntegration.tsx` — lines 82-89: on `!response.success` -> `toaster.error(\`Integration test failed: ${response.message}\`)`; otherwise line 88 `toaster.info('Integration test successful')`. `catch` only `console.error` + status FAILED (HTTP errors are toasted by the API layer, not here).
- `src/store/userSettings.ts:66,180-187` — `testSetting(type, setting_id?, values?) => Promise<any>`; POSTs `v1/settings/test/` with `{credential_type, setting_id?, credential_values?}` and returns `response.json()`. Return type is `any`; no response type exists, so `response.message` compiles without a type change.
- `src/utils/api.ts:311-401` — `makeRequest` rejects non-2xx; unless `skipErrorHandling`, calls `handleError` -> `toaster.error(formatErrorMessage(...))`. `testSetting` does not pass `skipErrorHandling`, so the 400 "Integration test failed" + details is toasted by the API layer (formatErrorMessage itself not inspected).

### Architecture and Layers Affected
- Config layer: `CREDENTIAL_UI_MAPPING` (settingsUIConfig.ts).
- Component layer: `TestIntegration` (integrations page area).
- Store/API layer read-only: `userSettingsStore.testSetting` -> `api.post`.

### Integration Points
`getTestableCredentialTypes()` consumers gating the Test button (10 callers per codegraph, 5 files):
- `IntegrationRowActionsCell.tsx:80` (row menu; non-OAuth path; `item.credential_type.toLocaleLowerCase()`)
- `EditIntegrationActions.tsx:44` (edit page; skipped if `isFoldedOAuth(credentialValues)`)
- `SettingsForm.tsx` (create form), `NewProjectIntegrationPage.tsx`, `NewUserIntegrationPage.tsx`.
`TestIntegration` is rendered by 5 callers: IntegrationRowActionsCell, SettingsForm, NewProjectIntegrationPage, NewUserIntegrationPage, EditIntegrationActions. So toast change is global for all testable types.
`OAuthTestAction`/`OAuthTestButton` is a separate path with its own toasts (`<Provider> test successful ...`); unaffected by change 3. `isOAuthProviderSetting` is scoped to Jira/Confluence/Git base types, so MSExchange (auth_type `oauth_azure`) is NOT routed to OAuth test and uses `TestIntegration`. `isFoldedOAuth(credentialValues)` in EditIntegrationActions was not inspected; whether `auth_type=oauth_azure` on Exchange could match it is unverified.

### Patterns and Conventions
Testable flag is per-entry in the registry; default from `CREDENTIAL_DEFAULTS.testable` (`src/constants/settings`, value not inspected). No per-type test component.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (testing/testing-patterns.md read: Vitest 1.6.1 + RTL, `unit` and `integration` projects, tests co-located in `__tests__/`, unit setup mocks `useSnapshot` and `@/utils/api`). Tests only when explicitly requested per AGENTS.md; this task explicitly lists test changes.

### Architectural Decisions
None found relevant.

### Derived Conventions
Toast strings inline; failure toast format `Integration test failed: ${message}`.

---

## 4. Testing Landscape

### Existing Coverage
- `src/utils/__tests__/settingsUIConfig.test.ts:163-199` — `describe('msExchange')`. Line 168 `it('has exact serverEnum/displayName, is not testable, auth_type has no default')` with `expect(entry.testable).toBe(false)` at line 171. Title mentions "is not testable" and must stay consistent with the flipped assertion.
- No test file for `TestIntegration` (codegraph: no covering tests). Integration-area tests present: `EditIntegrationActions.test.tsx`, `OAuthTestAction.test.tsx`, `SettingsForm.*.test.tsx`, `IntegrationsPage.integration.test.tsx`, etc. (contents not read; whether any asserts 'Integration test successful' or mocks `testSetting` is unverified). `ProjectSettingActionsCell.accessibility.test.tsx` and `UserSettings.accessibility.test.tsx` cover row action cells.
- `src/store/__tests__/userSettings.test.ts` exists (testSetting coverage unverified).

### Testing Framework and Patterns
Vitest + React Testing Library; `describe/it/expect`; tests use `CREDENTIAL_UI_MAPPING` directly for config assertions.

### Coverage Gaps
`TestIntegration` toast behaviour has no dedicated test. A "Test button renders" check would need a component-level render of `IntegrationRowActionsCell`/`EditIntegrationActions` (both use `getTestableCredentialTypes`), or an assertion via `getTestableCredentialTypes()` in settingsUIConfig/settings tests.

---

## 5. Configuration and Environment

### Environment Variables
None relevant (api base URL `VITE_API_URL` only).

### Configuration Files
`src/utils/settingsUIConfig.ts` registry; `src/constants/settings` `CREDENTIAL_DEFAULTS`.

### Feature Flags and Deployment Concerns
No `featureFlag` on the `msexchange` entry in the lines inspected (532-549). Backend must ship the healthcheck; a UI deployed ahead of it would expose a Test button for a type whose backend behaviour may differ.

---

## 6. Risk Indicators

- Cross-cutting toast change (TestIntegration.tsx:88): all 5 render sites and every testable type will show `response.message`. Frontend evidence for other types' success messages: none. `testSetting` returns `Promise<any>`, no response type or mock/fixture with a success `message` was found for `v1/settings/test`; the API layer just passes through JSON. Whether the backend returns terse/technical messages (e.g. raw `"OK"`, `"Success"`, internal strings) for other integrations cannot be determined from this repo; needs backend confirmation.
- `response.message || 'Integration test successful'` falls back only on falsy; a non-string `message` (object) would be passed to the toaster (any-typed, no compile protection). Toaster HTML handling of `message` not inspected; failure path already interpolates `response.message`, and `<br>` in the API error format suggests toaster renders HTML, so sanitization at toaster (security-patterns guide: sanitize at producer for HTML sinks) is worth checking before echoing backend text.
- Existing test title at settingsUIConfig.test.ts:168 says "is not testable"; flipping only the assertion leaves a contradictory title.
- No `TestIntegration` unit test; toast change is unguarded by any existing test. Existing tests elsewhere that assert the literal 'Integration test successful' were not searchable with available tools (no grep); verify before finishing.
- Edit-page path: `isFoldedOAuth(credentialValues)` may hide Test for Exchange oauth_azure integrations if it matches `auth_type`; unverified (constants/integration.ts not read). Row menu uses `isOAuthProviderSetting`, which is base-type scoped and should not match MSExchange.
- Speculative: the "Test button renders" test requires mocking store/`useSnapshot` (unit setup mocks it) for component-level rendering; a registry-level assertion via `getTestableCredentialTypes()` is lighter.
- Manual backend validation for both `auth_type` values (`oauth_azure`, `ntlm`) is outside CI.

---

## 7. Summary for Complexity Assessment

Small, contained change touching three files across config and one component: a boolean flip in `settingsUIConfig.ts:535`, a one-line expression in `TestIntegration.tsx:88`, and an update/addition in `settingsUIConfig.test.ts` (assertion at line 171, title at 168). No new routes, store methods, types or form fields; `testSetting` is already `any`-typed and the Test button gating goes through the existing `getTestableCredentialTypes()` in 5 render sites, so enabling it is data-only.

The technical novelty is low. The only non-local effect is that the toast change applies to every testable integration type. The repo holds no evidence (types, mocks, fixtures) about what other backends return in `message`, so that risk can only be closed by backend knowledge. Test coverage posture: the config test file has a dedicated msExchange block; `TestIntegration` itself has no test, so a new assertion for toast behaviour or for Test-button rendering would be new test scaffolding.

Key risk factors: unknown success `message` content for other integrations, unverified toaster HTML rendering of backend text, unverified interaction of `isFoldedOAuth` with Exchange auth values on the edit page, and possible existing tests asserting the literal old toast text.

---

## 8. External References

None named by the task.
