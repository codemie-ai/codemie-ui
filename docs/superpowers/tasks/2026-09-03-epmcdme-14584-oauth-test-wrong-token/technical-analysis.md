# Technical Analysis — EPMCDME-14584: OAuth integration test uses wrong token after saving

Repo: `codemie-ui` · Branch: `EPMCDME-14587_remove-new-types-fix-bugs` · Base: `main` (merge-base `c34fc36`)

## Ticket
After saving a Jira / Confluence / GitLab **OAuth** integration, the integration works but the **Test**
action on the UI fails because it uses an incorrect (masked) token. Manually pasting the real token
makes Test pass. AC: saved OAuth integrations test successfully without manual token replacement; the
UI uses the correct saved OAuth token / secure reference; no regression to create/save/edit.

## Root cause

This exact bug was fixed on **2026-09-01** (prior branch, task dir
`docs/superpowers/tasks/2026-09-01-oauth-integration-test-wrong-token/code-review.diff`). That fix
made `OAuthTestAction` route Test to a **connect-with-test** call (`connect… (settingId, test:true)`)
whenever the integration was saved and `client_secret` came back masked — so the backend decrypts the
**stored** app secret by `setting_id` and runs the OAuth handshake without persisting a token, instead
of sending the masked `**********` to `/initiate`.

**That fix was lost/undone by this branch's OAuth-folding refactor (EPMCDME-14586/14587).** Two
regressions combined:

1. **`OAuthTestAction` no longer contains the fix.**
   `src/pages/integrations/components/OAuthTestAction.tsx` is back to the pre-fix version: it always
   calls `initiate…OAuth({ client_secret: value('client_secret'), … })` with the form value. On edit
   that value is the mask (`MASKED_VALUE = '**********'`, `src/constants/settings.ts:21`). There is no
   `settingId` prop and no `shouldUseStoredSecret` branch. (`OAuthTestAction.tsx:39-93`)

2. **`OAuthTestAction` no longer fires at all for a saved OAuth integration.**
   It branches on `credentialType === GITLAB_OAUTH_CREDENTIAL_TYPE | JIRA_OAUTH_CREDENTIAL_TYPE |
   CONFLUENCE_OAUTH_CREDENTIAL_TYPE` (i.e. `'gitlaboauth' | 'jiraoauth' | 'confluenceoauth'`,
   `src/constants/integration.ts:37-39`). After folding, a saved OAuth integration persists under its
   **base** type (`Git`/`Jira`/`Confluence`) plus a `credential_values` marker
   `{key:'auth_type', value:'oauth'}`. The Edit pages pass
   `credentialType={setting.credential_type.toLowerCase()}` — i.e. `git`/`jira`/`confluence` — which
   matches none of the variant keys, so `OAuthTestAction` returns `null`.
   (`EditUserIntegrationPage.tsx:128-133`, `EditProjectIntegrationPage.tsx:119-124`)

3. **The generic `TestIntegration` shows instead — and it is the wrong test for OAuth.**
   The Edit pages render `TestIntegration` when
   `getTestableCredentialTypes().includes(setting.credential_type.toLowerCase())`
   (`EditUserIntegrationPage.tsx:119-127`). Testable flags (`settingsUIConfig.ts`,
   `CREDENTIAL_DEFAULTS.testable=false` in `src/constants/settings.ts:29`):
   - `jira` → `testable:true` (`settingsUIConfig.ts:186`) → generic Test button shows.
   - `confluence` → `testable:true` (`settingsUIConfig.ts:295`) → generic Test button shows.
   - `git` → no `testable` → **false** → no Test button at all for GitLab OAuth.
   - `gitlaboauth`/`jiraoauth`/`confluenceoauth` variants → no `testable` → false.

   So today: **Jira/Confluence OAuth** show the generic `TestIntegration`, which posts to
   `/settings/test/` (`TestIntegration.tsx:66`, `userSettings.testSetting`
   `src/store/userSettings.ts:177-184`). That handler builds a PAT-style `JiraConfig`/`ConfluenceConfig`
   from `credential_values` — an OAuth integration has no PAT token there, so the test is meaningless /
   fails. **GitLab OAuth** shows **no** Test button at all.

Note: the backend `/settings/test/` path already filters masked values and falls back to stored
decrypted values by `setting_id` (`codemie` `settings_tester.py` `SettingsTester.__init__` →
`_filter_masked_values` + `_overwrite_credential_values`), so the generic path's masking is handled
server-side — but it is still the wrong *kind* of test for OAuth. The correct OAuth test is the
connect-with-test handshake, which the backend already supports: `ConnectOAuthRequest.test: bool =
False` (`codemie` `oauth_router_factory.py:64-68`).

4. **The store lost its `test` parameter.** `connectGitLabOAuth`/`connectJiraOAuth`/
   `connectConfluenceOAuth` in `src/store/userSettings.ts` (types at 75/79/85, impls at 266/298/328)
   no longer accept `test` and always POST `{ setting_id }` (i.e. `test:false`, persisting). The prior
   fix's `test?: boolean` → `{ setting_id, test }` was reverted.

## Codebase Findings — the fix surface

The correct behaviour (matching the 2026-09-01 fix, adapted to the folded model): a **saved** OAuth
integration's Test must run the OAuth **connect-with-test** flow (loads stored app creds by
`setting_id` server-side, no token persisted); a freshly typed secret (create, or edit-with-change)
still validates via `/initiate` with form values. The generic `TestIntegration` must not show for an
OAuth integration.

Files to change:

- **`src/store/userSettings.ts`** — re-add `test = false` param to `connectGitLabOAuth`,
  `connectJiraOAuth`, `connectConfluenceOAuth` (types + impls); POST `{ setting_id, test }`.
- **`src/pages/integrations/components/OAuthTestAction.tsx`** —
  - Accept a `settingId?: string` prop.
  - Detect the OAuth provider from **either** a variant credentialType (`gitlaboauth`/`jiraoauth`/
    `confluenceoauth`, used by the create/New pages and the in-form footer where SettingsForm's
    internal `credentialType` is already the variant key — `SettingsForm.tsx:145-160`) **or** a base
    credentialType (`git`/`jira`/`confluence`) carrying `credentialValues.auth_type === 'oauth'` (used
    by the Edit pages). Map base→variant via `OAUTH_VARIANT_BY_BASE_TYPE`
    (`src/constants/integration.ts:44-58`).
  - When `settingId` is present AND `client_secret === MASKED_VALUE`, call
    `connect…OAuth(settingId, true)`; otherwise `initiate…OAuth({form values})`.
- **`src/pages/integrations/EditUserIntegrationPage.tsx`** &
  **`src/pages/integrations/EditProjectIntegrationPage.tsx`** — pass `settingId={setting.id}` to
  `OAuthTestAction`, and gate the generic `TestIntegration` off when the integration is OAuth
  (`credentialValues.auth_type === 'oauth'`).
- **`src/pages/integrations/components/SettingsForm/SettingsForm.tsx`** — pass `settingId={settingId}`
  to `OAuthTestAction` (footer, line 733), and gate the footer `TestIntegration` (line 724) off when
  OAuth.
- **New pages** (`NewUserIntegrationPage.tsx`, `NewProjectIntegrationPage.tsx`) — create flow only, no
  `settingId`; provider detection via variant key already works. Add the OAuth gate on generic
  `TestIntegration` for consistency (a create-flow OAuth variant is `git`/`jira`/`confluence`? No —
  create uses the variant key, so `getTestableCredentialTypes` already excludes it; low risk, verify).

Shared helper to add (avoid stringly-typed `=== 'oauth'` scattering): a small
`isFoldedOAuth(credentialValues)` / `resolveOAuthProvider(credentialType, credentialValues)` in
`src/utils/settings.ts` (or `src/constants/integration.ts`) reused by `OAuthTestAction` and the Edit/
New/SettingsForm gates.

## Existing tests
- `src/pages/integrations/components/__tests__/OAuthTestAction.test.tsx` — currently only checks
  provider rendering by variant key and null for unknown; the prior branch's connect-with-test
  assertions are gone. Must be extended to cover: base-type + `auth_type=oauth` detection, masked-secret
  → connect-with-test(`settingId`,`true`), fresh-secret → initiate, create (no settingId) → initiate.
- `src/store/__tests__/userSettings.test.ts` — must assert `connect…OAuth(id, true)` POSTs
  `{ setting_id, test:true }` and default POSTs `{ setting_id, test:false }`.

## Risk Indicators
1. Provider detection must cover two shapes (variant key vs base+marker) across 5 call sites — get one
   wrong and a flow silently shows the wrong (or no) Test button.
2. Suppressing generic `TestIntegration` for OAuth must not suppress it for PAT Jira/Confluence.
3. GitLab OAuth base type `git` is not `testable`; the OAuth Test button is the *only* Test affordance
   for it — detection there is load-bearing.
4. Backend already supports `test:true` connect and masked-value filtering — this is a **frontend-only**
   fix; no backend change required.
5. The `vite.config.ts` working-tree change is unrelated and stays out of this work.

## Conclusion
Post-folding, the OAuth Test regressed because `OAuthTestAction` (a) lost its connect-with-test
masked-secret fix and (b) is keyed on the removed standalone variant credential types, so it never
fires for a saved (base-type + `auth_type=oauth`) integration — leaving Jira/Confluence to fall back
to the wrong generic PAT test and GitLab with no Test at all. Fix is FE-only: restore the store `test`
param, make `OAuthTestAction` detect the folded model and route saved+masked Test to connect-with-test,
wire `settingId` through the Edit/SettingsForm call sites, and hide the generic Test for OAuth.
