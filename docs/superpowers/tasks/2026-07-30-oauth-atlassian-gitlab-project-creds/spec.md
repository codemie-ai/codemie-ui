# Spec — Per-user OAuth for GitLab / Jira / Confluence integrations (UI)

Ticket: EPMCDME-13527. Scope: frontend (codemie-ui).

## Problem / Goal

Add browser OAuth 2.0 (3LO) integrations for **GitLab**, **Jira**, and **Confluence** where an admin
sets up the OAuth **application** once and **each user authorizes under their own account**:

- The admin enters the OAuth application credentials — `client_id`, `client_secret`, and the callback
  base URL (GitLab also `instance_url`) — directly in the integration form (the same way SharePoint
  collects its Azure app credentials) and completes a first sign-in that verifies the config.
- These app credentials are **shared** on the integration; the **tokens are per user**. A member who
  uses a shared integration connects their own provider account, and their calls run under that
  account — nobody borrows another member's token.

Because tokens are per-user, the integration is available on **both** the user and the project
settings surfaces (`accessType = ALL`), and a member who has not connected yet is prompted to do so
**from the chat** the first time a run needs the integration (a connect "gate"), then resends.

## Behaviour (acceptance)

1. **Credential types** `gitlaboauth`, `jiraoauth`, `confluenceoauth` are selectable on the settings
   form with `accessType = ALL` (available on user and project integrations), mapping to the backend
   `serverEnum` (`GitLabOAuth` / `JiraOAuth` / `ConfluenceOAuth`).
2. **App-credential inputs**: the form shows `client_id`, `client_secret` (masked/sensitive), and
   `callback_base_url`; GitLab additionally shows `instance_url`. These render together with the
   provider **Sign in** button. The admin enters only the base callback URL; the provider redirect
   URI is derived from it on the backend.
3. **Sign-in flow (create)**: Sign in opens the provider consent in a popup and polls a `status`
   endpoint until success/error; on success the connected account is shown and `oauth_state` is
   written into the form so the setting can be created. Saving an OAuth integration requires a
   completed sign-in (`oauth_state` is a required field for create).
4. **Per-user connect from chat (gate)**: when a run fails because the acting user has no token for a
   shared integration, the backend returns a structured signal
   `{ error: '<provider>_auth_required', setting_id, integration_name }`. The chat detects it, attaches
   it to the AI turn, and renders a "Connect your <provider> account" gate with a Sign-in button. On
   success the gate shows a "resend the failed turn" note.
5. **Connect flow (existing integration)**: the connect gate initiates OAuth against an existing
   integration by `setting_id` (app credentials loaded server-side — the member never re-enters
   `client_id`/`client_secret`), polls status, then persists the member's tokens via a
   `connect/complete` call. Each provider also exposes connection-status and disconnect calls.
6. **Atlassian shared callback**: Jira and Confluence are one Atlassian platform app — Jira's OAuth
   HTTP calls use the `/v1/atlassian-oauth/*` namespace and Confluence's use `/v1/confluence-oauth/*`,
   but both authorize against a single shared callback so only one Callback URL is registered on the
   Atlassian app.
7. **Secrets not leaked**: `client_secret` is a sensitive field (masked); token material is never
   rendered client-side. Connection status returns only the caller's own state.

## Non-goals

- No change to other existing OAuth integrations (Google, SharePoint).
- No new backend endpoints authored in this repo; this UI consumes the provider OAuth API contract
  (initiate / status / connect / connection / disconnect, and the
  `<provider>_auth_required` run signal).

## Risks

- Form-state plumbing: OAuth field components must read current form values (client_id/secret/
  callback) to pass into `initiate` — covered by store + field wiring.
- Popup + polling edge cases (popup blocked, error, success) — covered by connect-hook tests.
- Chat-gate detection must not swallow unrelated errors — the parser returns `null` for any payload
  that is not the specific `<provider>_auth_required` shape; covered by parser tests.
