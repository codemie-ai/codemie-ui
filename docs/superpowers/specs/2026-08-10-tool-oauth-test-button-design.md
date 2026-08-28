# Tool OAuth "Test" on the integration settings form (CR-U09)

## Problem

The GitLab / Jira / Confluence OAuth integration form still runs the old **`oauth_state`
"sign in before Save"** flow, which the backend has removed for these three types:

- `GitLab/Jira/ConfluenceOAuthField.tsx` render an `OAuthSignInButton` driven by `useOAuth`
  (`/initiate` → popup → poll `/status` → set `oauth_state`).
- `SettingsForm.tsx` **requires** `oauth_state` before Save and forwards it on submit.

The backend no longer accepts or persists `oauth_state` for these types: `/initiate` now always runs
in test mode (`persist_token=false`, token discarded), Setting creation persists app credentials
only, and each user connects their own token afterward via the per-user connect flow (`/connect`),
which the app already drives from the **chat auth gates**. So the current form both blocks Save on a
now-meaningless step and implies a token was saved when it was not.

## Goal

Replace the save-gating "Sign in" step on the three tool-OAuth forms with a **Test** action that
validates the app credentials by running the OAuth flow without persisting a token, and let Save
create/update the integration with app credentials only. Match the existing "Test" affordance used
elsewhere in the app.

## Non-goals

- **Google OAuth** — unchanged. It keeps its `oauth_state` validation and submit forwarding; the
  backend still uses that path for Google.
- **Per-user connect UX** — unchanged. The creator (and every member) connects their own token
  through the existing chat auth gate (`useOAuthConnect` → `/connect`) when first using the tool. No
  connect affordance is added to the settings form in this change.
- **Backend** — already done (CR-U02 / U06 / U08). This is the frontend counterpart only.

## Design

### `OAuthTestButton` (new, shared) — `SettingsForm/OAuthTestButton.tsx`

A small component that presents an OAuth credential test using the app's standard test affordance.

- Drives the flow with the existing **`useOAuth({ initiate, getStatus })`** hook (initiate → popup →
  poll `/status`). It does **not** pass `onAuthStateChange`, so no `oauth_state` is produced.
- Renders a **`Checker`** (as `TestIntegration` and `MCPToolkitTest` do), mapping `OAuthStatus`:
  - `WAITING` → `IN_PROGRESS`
  - `SUCCESS` → `SUCCESS`, plus `toaster.info("Test successful — authenticated as <user>")`
  - `ERROR` → `FAILED`, plus `toaster.error(<error>)`
  - `IDLE` → `UNDEFINED`
- Props: `provider`, `initiate` (bound to the provider's `/initiate` with the current form values),
  `getStatus`. The three field components supply these, mirroring how they wire `useOAuth` today.

Rationale for not reusing the MCP test flow: `MCPToolkitTest` runs a synchronous config test that may
*then* require auth (`useMCPAuthPrompt` + retry). For these providers there is no separate synchronous
test — the OAuth exchange **is** the test — so only the `Checker`/`toaster` presentation is borrowed,
not the auth-prompt/retry machinery.

### `GitLab/Jira/ConfluenceOAuthField.tsx`

Render `OAuthTestButton` instead of `OAuthSignInButton`. Keep the existing `initiate` (provider
`/initiate` with the typed app credentials) and `getStatus`; drop the `onAuthStateChange` /
`oauth_state` wiring and the persistent "signed in as … / reauthenticate" state (a test is transient).

### `SettingsForm.tsx`

- Remove the `oauth_state`-required Yup validation for `gitlaboauth` / `jiraoauth` / `confluenceoauth`
  (keep it for `googleoauth`).
- Stop forwarding `oauth_state` on submit for those three (Google still forwards it).
- Save creates/updates the integration with app credentials only.

## Data flow

```
Create/Edit form  ──Test──►  useOAuth.initiate() ─► POST /{provider}-oauth/initiate (persist_token=false)
                                    │
                                    ▼  popup (provider consent) ─► poll /status/{state}
                             success: Checker=SUCCESS + toast "authenticated as <user>"
                             error:   Checker=FAILED  + toast <error>
Create/Edit form  ──Save──►  create/update Setting with app credentials only (no oauth_state)
Later, in chat    ──────►    chat auth gate: useOAuthConnect ─► POST /{provider}-oauth/connect (persist)
```

## Error handling

- Popup blocked / initiate failure / status error → `Checker=FAILED` + `toaster.error`. No `oauth_state`,
  nothing persisted. The user can retry or Save the app credentials regardless.
- Save is never blocked by test state.

## Testing

- **`OAuthTestButton`**: success maps `Checker` to SUCCESS + success toast with the username; error maps
  to FAILED + error toast; never emits an `oauth_state`.
- **`SettingsForm`**: for the three tool types, Save is allowed without a completed sign-in and the
  submit payload carries no `oauth_state`; **Google still requires and forwards `oauth_state`**.
- **Field components**: each renders `OAuthTestButton` and wires the correct provider `initiate`/`getStatus`.
- Follow existing vitest patterns in the `SettingsForm/__tests__` directory.
