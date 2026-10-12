# EPMCDME-15200 - Microsoft Exchange Test button and backend success message

## Goal
Users can press **Test** on a Microsoft Exchange integration (either auth_type) and see the
backend's success text ("Connection and Inbox access verified."). Backend contract: existing
`v1/settings/test/` flow; 200 `{success:true, message}` on success; 400 "Integration test failed"
plus sanitised details on failure (already toasted by the API layer as `header<br>details`).
Releases together with EPMCDME-15199 (backend !4354 + this UI MR).

## Changes
1. `src/utils/settingsUIConfig.ts:535` - `msexchange` entry `testable: false` -> `true`. The Test
   button is gated by `getTestableCredentialTypes()` (`src/utils/settings.ts:125`) at all five
   `TestIntegration` render sites, so no other wiring is needed.
2. `src/pages/integrations/components/TestIntegration.tsx:88` - success toast becomes
   `toaster.info(response.message || 'Integration test successful')`. Applies to every testable
   integration; the fallback preserves today's text when no message is returned.
3. `src/utils/__tests__/settingsUIConfig.test.ts:168-173` - rename the title (drop "is not
   testable"; say "is testable"), assert `testable` is `true`, and add an assertion that
   `getTestableCredentialTypes()` includes `'msexchange'`.
4. New component test `src/pages/integrations/components/__tests__/EditIntegrationActions.msexchange.test.tsx`.
   Render site chosen: `EditIntegrationActions` (small props, already has a test file; the
   alternatives `SettingsForm`/`IntegrationRowActionsCell` need form or table setup). Unlike the
   existing `EditIntegrationActions.test.tsx`, do NOT mock `@/utils/settings` or `TestIntegration`:
   the real registry and real `TestIntegration` must run so the test proves the entry is
   testable end to end. Mock only `@/store/userSettings` (`testSetting`), `OAuthTestAction`, and
   `@/utils/toaster`. Cases, parameterised over `auth_type` `oauth_azure` and `ntlm` with
   `credentialType="MSExchange"`:
   - the "Test" button is rendered;
   - clicking it calls `testSetting('MSExchange', settingId, <entered values as key/value list>)`;
   - on `{success:true, message:'Connection and Inbox access verified.'}` the info toast shows that
     message; on a response without `message` it shows 'Integration test successful'.

## Verified findings
- Toaster (`src/utils/toaster.ts:74-86`) passes header and content through DOMPurify with
  `ALLOWED_TAGS: [br,i,b,em,strong]`, so echoing backend text is sanitised at the sink.
- `isFoldedOAuth` (`src/constants/integration.ts:83`) matches only `auth_type === 'oauth'`.
  Exchange uses `oauth_azure`/`ntlm`, so `EditIntegrationActions` shows Test for both. Row menu
  uses `isOAuthProviderSetting` (Jira/Confluence/Git only): not matched.
- No existing test asserts the literal 'Integration test successful' (searched
  `src/pages/integrations/**/__tests__`). Nothing to update.
- `testSetting` returns `any`; no type change needed.

## Acceptance criteria
- AC1: `CREDENTIAL_UI_MAPPING.msexchange.testable === true` and `getTestableCredentialTypes()`
  includes `msexchange`.
- AC2: Successful test toasts the backend `message`; falls back to 'Integration test successful'
  when `message` is absent/empty.
- AC3: Failure behaviour is unchanged (`!success` branch and API-layer 400 toast).
- AC4: A component test asserts the Test button renders for Microsoft Exchange for both
  `oauth_azure` and `ntlm`, and that pressing it sends the entered configuration to
  `testSetting` with type `MSExchange`.
- AC5: Updated and added tests pass (quote the `Test Files` line after `npm ci`); lint and
  type-check are clean.

## Non-goals
- No new form fields or change to the Exchange credential contract.
- No Exchange tool UI.
- No SDK enum bump.
- No new route, store method, or response type for `testSetting`.
- No change to the failure toast, `OAuthTestAction`, or the toaster.
- No broader `TestIntegration` test suite beyond the Exchange cases above.
- Manual backend verification for both `auth_type` values is outside CI.

## Risks
- Release coupling: EPMCDME-15199 and 15200 must ship together (backend !4354 + UI MR). UI ahead
  of the backend healthcheck exposes Test for Exchange prematurely; backend without the UI leaves
  the button hidden.
- Other integrations' backend success messages are unknown from this repo; they will now be shown
  verbatim. Needs backend confirmation.
- A non-string `message` would make `prepareText` throw; caught by the existing `catch` (status
  FAILED). Accepted; backend contract returns a string.
