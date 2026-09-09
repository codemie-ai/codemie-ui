# Technical Analysis — EPMCDME-14582: OAuth toggle disabled in the assistant-tools "Create User Integration" popup

Repo: `codemie-ui` · Branch: `EPMCDME-14587_remove-new-types-fix-bugs` · Base: `main` (merge-base `c34fc36`)

## Ticket / user report
From the assistant Create/Edit page → Tools configuration → Available Tools → (VCS / Project
Management) → "Select integration", the **"Create User Integration"** popup opens. There the
**"Use OAuth 2.0 sign-in" toggle is disabled** (greyed), so a user cannot create a Jira/Confluence
(or GitLab) OAuth integration from that flow. The user clarified: the popup should behave like the
main integration page — **the only intended difference is that the "Test" button is absent** — and
the OAuth toggle must be togglable.

## Root cause (single line)
`src/pages/integrations/components/SettingsForm/SettingsForm.tsx:597` — the OAuth toggle is rendered
`disabled={editing || disableType}`. The assistant-tools popup
(`src/pages/integrations/components/NewIntegrationPopup/NewIntegrationPopup.tsx:80`) passes
`disableType={true}` to lock the **credential type** to the tool's context (VCS→Git,
Project Management→Jira, …). That flag is correct for the *type select* (line 586), but it is wrongly
reused to gate the *OAuth auth-method toggle*, so locking the type also greys out the toggle.

`disableType` means "you cannot change the base credential type" — it must **not** mean "you cannot
choose OAuth vs PAT". OAuth is an auth method within the same base type (Jira OAuth still persists
under base `Jira`), so the toggle should stay usable when the type is locked.

## Why the main page works and the popup doesn't
- Main New pages (`NewUserIntegrationPage` / `NewProjectIntegrationPage`) do **not** pass
  `disableType` → defaults to `false` → toggle `disabled={editing(false) || false}` = **enabled**.
- `NewIntegrationPopup` is the **only** caller passing `disableType={true}` (verified:
  `grep disableType` across `src` returns only this popup + the prop/default/usage in SettingsForm).
  It also passes `hideActions={true}` (hides the footer Save/Test/OAuthTestAction — the popup supplies
  its own Save via the `Popup` footer), which is exactly the "no Test button" difference the user
  described. `editing` is not passed → `false` (create flow).

So in the popup: `editing=false`, `disableType=true` → toggle wrongly `disabled`.

## Fix
Decouple the OAuth toggle from `disableType`: change line 597 from
`disabled={editing || disableType}` to `disabled={editing}`.

- On **create** (`editing=false`) the toggle is always enabled, even when the base type is locked —
  restoring OAuth creation in the popup (and unchanged on the main New pages).
- On **edit** (`editing=true`) the toggle stays disabled — you cannot switch a saved integration's
  auth method. (Unchanged.)
- The **type select** (line 586) keeps `disabled={editing || disableType}` — the tool-locked type
  must stay locked.

## Codebase Findings
- `SettingsForm.tsx:311-312` `showOAuthToggle = !!oauthVariantType && CREDENTIAL_VALUES_MAPPING[oauthVariantType] !== undefined`
  — the toggle is only shown when the OAuth variant is available (role/enterprise/feature-flag gating
  already applied to the mapping). So when OAuth is *not supported* the toggle is hidden, not shown-
  disabled — satisfying the AC "disabled state only when OAuth is not supported/permission reason"
  (here: hidden). This gating is unchanged by the fix.
- `SettingsForm.tsx:314-317` `handleOAuthToggle` flips `credentialType` between base and variant; on
  save the submit path injects the `auth_type=oauth` marker (existing EPMCDME-14587 behavior), so once
  the toggle is enabled the full OAuth create flow works in the popup with no further change.
- `Switch` (`src/components/form/Switch/Switch.tsx`) renders `<input role="switch" id="useOAuth" disabled=...>`
  wrapped by a `<label>` containing the text "Use OAuth 2.0 sign-in", so the switch's accessible name
  is that label — testable via `getByRole('switch', { name: /Use OAuth 2.0 sign-in/i })`.

## Risk Indicators
1. Only one caller sets `disableType={true}` (the popup); the change affects exactly that flow plus
   keeps every other flow identical. Low blast radius.
2. Auth-adjacent (OAuth), but no secret/token handling changes — purely a UI enable/disable predicate.
3. The type-select lock (line 586) must remain intact — do not touch it.

## Conclusion
One-token fix: the OAuth toggle's `disabled` predicate must drop `disableType`
(`disabled={editing}`), so a tool-locked credential type no longer disables the auth-method toggle.
Covered by a SettingsForm test asserting the toggle is enabled when `disableType` is true on create,
and stays disabled on edit.
