# Plan — Per-user OAuth for GitLab / Jira / Confluence integrations (frontend)

Ticket: EPMCDME-13527. Scope: frontend (codemie-ui).
Legend: `Test-first: yes/no — <failing test>`.

The three providers share one pattern (GitLab first, then Jira, then Confluence). Each provider adds
the same set of files; the tasks below are per-provider mirrors.

## 1. Credential-type constants + entity types
- `src/constants/integration.ts`: `gitlaboauth`, `jiraoauth`, `confluenceoauth`.
- `src/types/entity/dataSource.ts`: `OAuthProvider.{GITLAB,JIRA,CONFLUENCE}`, plus per-provider
  initiate/status/connect/connection response + payload types.
- Test-first: no — constants/types only.

## 2. Settings UI config (fields + scope)
- `src/utils/settingsUIConfig.ts`: entries for the three OAuth types with `fields` `client_id`,
  `client_secret` (`sensitive: true`), `callback_base_url` (GitLab also `instance_url`);
  `accessType = ALL`; `serverEnum` mapping.
- Test-first: no — declarative config, covered indirectly by the form suite.

## 3. Store methods (per provider)
- `src/store/userSettings.ts`: `initiate*OAuth(payload)`, `get*OAuthStatus(state)`,
  `connect*OAuth(settingId)`, `complete*Connect(settingId, state)`, `get*ConnectionStatus(settingId)`,
  `disconnect*OAuth(settingId)` for GitLab / Jira / Confluence. Jira uses `/v1/atlassian-oauth/*`;
  Confluence uses `/v1/confluence-oauth/*`; GitLab uses `/v1/gitlab-oauth/*`.
- Test-first: yes — `userSettings.test.ts`: each method calls the right endpoint with the right body,
  and connection-status falls back to `not_connected` on a failed response.

## 4. Create-form OAuth fields + SettingsForm wiring
- `GitLabOAuthField.tsx` / `JiraOAuthField.tsx` / `ConfluenceOAuthField.tsx` under
  `src/pages/integrations/components/SettingsForm/`: wire the existing `useOAuth` popup/poll hook,
  read app-cred form values to pass into `initiate`, and write `oauth_state` on success.
- `SettingsForm.tsx`: render each provider field for its credential type; require `oauth_state`
  before save; forward `oauth_state` in the submit payload.
- Test-first: no — thin wrappers over the shared, already-tested `useOAuth` hook.

## 5. Per-user connect hook (per provider)
- `src/hooks/use{GitLab,Jira,Confluence}Connect.ts`: connect against an existing integration by
  `settingId` — `connect` → popup → poll `status` → `connect/complete`; `refreshStatus` seeds the
  current connection state.
- Test-first: yes — `use{GitLab,Jira,Confluence}Connect.test.ts`: WAITING on connect, SUCCESS after a
  successful poll (calls `complete*Connect`), `refreshStatus` seeds SUCCESS when already connected.

## 6. Chat connect-gate (per provider)
- `src/utils/{gitlab,jira,confluence}Auth.ts`: `parse*ConnectRequired(payload)` detects the
  `{ error: '<provider>_auth_required', setting_id, integration_name }` run signal; returns `null`
  otherwise.
- `src/pages/chat/components/{GitLab,Jira,Confluence}AuthGate/*AuthGateRow.tsx`: the gate row (status
  badge + Sign-in button) driving the connect hook.
- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAi{GitLab,Jira,Confluence}AuthPrompt.tsx`:
  the in-chat prompt wrapper with a post-connect "resend the failed turn" note.
- `src/store/chatGeneration.ts`: on a failed run, detect each `*_auth_required` payload and attach it
  to the AI turn; clear the prompt on retry.
- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx`: render the matching
  provider prompt when the message carries one.
- `src/types/entity/conversation.ts`: `gitlabAuthPrompt` / `jiraAuthPrompt` / `confluenceAuthPrompt`
  on the chat message.
- Test-first: yes — `{gitlab,jira,confluence}Auth.test.ts` (parser); `ChatAi*AuthPrompt.test.tsx`
  (renders the gate row, switches to the success note on connect).

## Validation
- `tsc --noEmit`; `eslint` on changed files; `vitest` on the OAuth connect, parser, prompt, and store
  suites. Commit per provider with the ticket prefix; do not push until asked.
