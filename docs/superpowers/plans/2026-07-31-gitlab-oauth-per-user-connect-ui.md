# GitLab OAuth Per-User Connect (Chat Auth-Gate) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a project member connect their own GitLab account to a shared integration from the chat, so a run that needs GitLab but has no token for the current user shows an actionable "Sign in with GitLab" auth-gate instead of a raw error.

**Architecture:** A shared integration stores app credentials once; each user holds their own tokens. The client never re-enters client_id/secret — it drives a per-user OAuth flow against an existing integration by its `setting_id`. When a run fails because the current user has no token, the AI turn renders an auth-gate row with a connect button. Clicking it runs `POST /connect` → popup → poll `GET /status/{state}`; successful callback processing already persists user tokens server-side using signed state + integration binding. This reuses the existing popup + status-polling mechanics already used by the integration-creation sign-in (`useOAuth`), not the heavier MCP callback-listener infrastructure.

**Tech Stack:** React, TypeScript, Zustand-style stores, react-hook-form (existing OAuth field), Vitest + React Testing Library.

## Global Constraints

- Do not require the member to enter app credentials (client_id/secret/callback). The connect flow loads them server-side from the integration identified by `setting_id`.
- The connection-status endpoint returns only the caller's own state; never render other users' connection info.
- Follow existing OAuth UI patterns: `useOAuth` (`src/hooks/useOAuth.ts`), `OAuthSignInButton` (`src/components/OAuthSignInButton/`), and the store method style in `src/store/userSettings.ts` (`api.post`/`api.get`, `skipErrorHandling` on status polls).
- API base paths are relative (`v1/gitlab-oauth/...`), matching existing calls.

## API Contract (consumed by this UI)

These endpoints already exist and are what this UI calls:

- `POST v1/gitlab-oauth/connect` body `{ setting_id }` → `{ auth_url, state, instance_url, setting_id }`
- `GET v1/gitlab-oauth/status/{state}` → `{ status: "pending" | "success" | "error", username?, email?, message? }`
- `GET v1/gitlab-oauth/connection?setting_id=...` → `{ status: "connected" | "not_connected", username }`
- `DELETE v1/gitlab-oauth/connection?setting_id=...` → `{ status: "disconnected" }`

**Prerequisite (server contract, tracked separately — Task 5):** a run that fails because the acting user has no GitLab token must surface a structured signal the chat can detect, carrying at minimum `{ setting_id, integration_name }`. Until that lands, Task 4's detection has nothing to parse; Tasks 1–3 are independently shippable and testable.

---

## File Structure

- Modify `src/types/entity/dataSource.ts` (or the GitLab OAuth types module) — add connect/status response types.
- Modify `src/store/userSettings.ts` — add connect / complete / connection-status / disconnect methods.
- Create `src/hooks/useGitLabConnect.ts` — per-user connect flow for an existing setting.
- Create `src/hooks/__tests__/useGitLabConnect.test.ts`.
- Create `src/pages/chat/components/GitLabAuthGate/GitLabAuthGateRow.tsx` — connect button + status row.
- Create `src/pages/chat/components/GitLabAuthGate/__tests__/GitLabAuthGateRow.test.tsx`.
- Modify the chat AI-turn error handling (where `useMCPAuthPrompt.handleAuthRequiredError` is wired) to also detect the GitLab connect-required signal and render the gate.

---

## Task 1: Store methods + types for per-user connect

**Files:**
- Modify: `src/store/userSettings.ts`
- Modify: `src/types/entity/dataSource.ts`
- Test: `src/store/__tests__/userSettings.test.ts`

**Interfaces:**
- Produces on `userSettingsStore`:
  - `connectGitLabOAuth(settingId: string): Promise<GitLabOAuthInitiateResponse & { setting_id: string }>`
  - `getGitLabConnectionStatus(settingId: string): Promise<GitLabConnectionStatusResponse>`
  - `disconnectGitLabOAuth(settingId: string): Promise<{ status: string }>`
- New type `GitLabConnectionStatusResponse = { status: 'connected' | 'not_connected'; username: string }`

- [ ] **Step 1: Write the failing test**

```ts
// src/store/__tests__/userSettings.test.ts (add cases)
import { userSettingsStore } from '@/store/userSettings'
import api from '@/utils/api'

vi.mock('@/utils/api')

it('connectGitLabOAuth posts setting_id and returns initiate payload', async () => {
  vi.mocked(api.post).mockResolvedValue({
    json: async () => ({ auth_url: 'https://gl/auth', state: 'st', instance_url: 'https://gl', setting_id: 's1' }),
  } as Response)
  const res = await userSettingsStore.connectGitLabOAuth('s1')
  expect(api.post).toHaveBeenCalledWith('v1/gitlab-oauth/connect', { setting_id: 's1' })
  expect(res.state).toBe('st')
})

it('getGitLabConnectionStatus reads caller status', async () => {
  vi.mocked(api.get).mockResolvedValue({
    ok: true, json: async () => ({ status: 'connected', username: 'groot' }),
  } as Response)
  const res = await userSettingsStore.getGitLabConnectionStatus('s1')
  expect(api.get).toHaveBeenCalledWith('v1/gitlab-oauth/connection?setting_id=s1', { skipErrorHandling: true })
  expect(res.username).toBe('groot')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/store/__tests__/userSettings.test.ts`
Expected: FAIL (methods undefined)

- [ ] **Step 3: Implement the store methods**

```ts
// src/store/userSettings.ts — add alongside initiateGitLabOAuth/getGitLabOAuthStatus
async connectGitLabOAuth(settingId: string) {
  const response = await api.post('v1/gitlab-oauth/connect', { setting_id: settingId })
  return response.json()
},

async getGitLabConnectionStatus(settingId: string): Promise<GitLabConnectionStatusResponse> {
  const response = await api.get(`v1/gitlab-oauth/connection?setting_id=${encodeURIComponent(settingId)}`, {
    skipErrorHandling: true,
  })
  if (!response.ok) return { status: 'not_connected', username: '' }
  return response.json()
},

async disconnectGitLabOAuth(settingId: string) {
  const response = await api.delete(`v1/gitlab-oauth/connection?setting_id=${encodeURIComponent(settingId)}`)
  return response.json()
},
```

Add the interface entries to the store type and `GitLabConnectionStatusResponse` to the types module. Confirm `api.delete` exists; if the util exposes a different verb helper, match it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/store/__tests__/userSettings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/userSettings.ts src/types/entity/dataSource.ts src/store/__tests__/userSettings.test.ts
git commit -m "feat(gitlab-oauth): store methods for per-user connect/status/disconnect"
```

---

## Task 2: `useGitLabConnect` hook

**Files:**
- Create: `src/hooks/useGitLabConnect.ts`
- Test: `src/hooks/__tests__/useGitLabConnect.test.ts`

**Interfaces:**
- Consumes: `userSettingsStore.connectGitLabOAuth`, `getGitLabOAuthStatus`, `getGitLabConnectionStatus` (Task 1); `usePopupWindow`, `usePolling` (existing).
- Produces: `useGitLabConnect(settingId: string) => { status, username, error, handleConnect, refreshStatus }` where `status` is the existing `OAuthStatus` enum.

Behavior: `handleConnect` calls `connectGitLabOAuth(settingId)` → opens popup on `auth_url` → polls `getGitLabOAuthStatus(state)`; on `success` sets `SUCCESS` with `username`. `refreshStatus` calls `getGitLabConnectionStatus(settingId)` to seed initial state.

This mirrors `useOAuth` (`src/hooks/useOAuth.ts`); reuse `usePopupWindow` + `usePolling` the same way, with initiation keyed by `settingId`.

- [ ] **Step 1: Write the failing test**

```ts
// src/hooks/__tests__/useGitLabConnect.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGitLabConnect } from '@/hooks/useGitLabConnect'
import { userSettingsStore } from '@/store/userSettings'
import { OAuthStatus } from '@/types/entity/dataSource'

vi.mock('@/hooks/usePopupWindow', () => ({
  usePopupWindow: () => ({ open: () => true, close: () => {} }),
}))

it('connects and completes for an existing setting', async () => {
  vi.spyOn(userSettingsStore, 'connectGitLabOAuth').mockResolvedValue({
    auth_url: 'https://gl/auth', state: 'st', instance_url: 'https://gl', setting_id: 's1',
  })
  vi.spyOn(userSettingsStore, 'getGitLabOAuthStatus').mockResolvedValue({
    status: 'success', username: 'groot', email: 'g@x.io',
  })

  const { result } = renderHook(() => useGitLabConnect('s1'))
  await act(async () => { await result.current.handleConnect() })

  await waitFor(() => expect(result.current.status).toBe(OAuthStatus.SUCCESS))
  expect(result.current.username).toBe('groot')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/hooks/__tests__/useGitLabConnect.test.ts`
Expected: FAIL (hook not found)

- [ ] **Step 3: Implement the hook**

Adapt `useOAuth`: on `initiate` call `userSettingsStore.connectGitLabOAuth(settingId)`; keep the popup + `usePolling(getGitLabOAuthStatus)` loop; in the poll success branch set `SUCCESS` directly (server callback already persisted the connection). Provide `refreshStatus` that maps `getGitLabConnectionStatus` → initial `OAuthStatus.SUCCESS`+username or `IDLE`. (Copy the structure of `src/hooks/useOAuth.ts`; do not import it — initiation semantics differ.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/hooks/__tests__/useGitLabConnect.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGitLabConnect.ts src/hooks/__tests__/useGitLabConnect.test.ts
git commit -m "feat(gitlab-oauth): useGitLabConnect hook for existing integrations"
```

---

## Task 3: `GitLabAuthGateRow` component

**Files:**
- Create: `src/pages/chat/components/GitLabAuthGate/GitLabAuthGateRow.tsx`
- Create: `src/pages/chat/components/GitLabAuthGate/index.ts`
- Test: `src/pages/chat/components/GitLabAuthGate/__tests__/GitLabAuthGateRow.test.tsx`

**Interfaces:**
- Consumes: `useGitLabConnect` (Task 2), `OAuthSignInButton` (existing, provider=GITLAB).
- Produces: `GitLabAuthGateRow({ settingId, integrationName, onConnected })` rendering the integration name, connection status, and a "Sign in with GitLab" button. On success it calls `onConnected()`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/chat/components/GitLabAuthGate/__tests__/GitLabAuthGateRow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GitLabAuthGateRow from '@/pages/chat/components/GitLabAuthGate/GitLabAuthGateRow'
import { OAuthStatus } from '@/types/entity/dataSource'

const handleConnect = vi.fn()
vi.mock('@/hooks/useGitLabConnect', () => ({
  useGitLabConnect: () => ({
    status: OAuthStatus.IDLE, username: '', error: '', handleConnect, refreshStatus: vi.fn(),
  }),
}))

it('renders integration name and a sign-in button', () => {
  render(<GitLabAuthGateRow settingId="s1" integrationName="Team GitLab" onConnected={vi.fn()} />)
  expect(screen.getByText(/Team GitLab/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /sign in with gitlab/i }))
  expect(handleConnect).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/chat/components/GitLabAuthGate`
Expected: FAIL (component not found)

- [ ] **Step 3: Implement the component**

```tsx
// GitLabAuthGateRow.tsx
import { FC, useEffect } from 'react'
import OAuthSignInButton from '@/components/OAuthSignInButton/OAuthSignInButton'
import { useGitLabConnect } from '@/hooks/useGitLabConnect'
import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'

interface Props {
  settingId: string
  integrationName: string
  onConnected: () => void
}

const GitLabAuthGateRow: FC<Props> = ({ settingId, integrationName, onConnected }) => {
  const { status, username, error, handleConnect, refreshStatus } = useGitLabConnect(settingId)

  useEffect(() => { refreshStatus() }, [refreshStatus])
  useEffect(() => { if (status === OAuthStatus.SUCCESS) onConnected() }, [status, onConnected])

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-stroke-primary px-3 py-2">
      <div className="text-sm text-text-primary">{integrationName}</div>
      <OAuthSignInButton
        provider={OAuthProvider.GITLAB}
        status={status}
        user={username}
        authError={error}
        onSignIn={handleConnect}
      />
    </div>
  )
}

export default GitLabAuthGateRow
```

Match required `OAuthSignInButton` props to its actual signature (see `src/components/OAuthSignInButton/OAuthSignInButton.tsx`); omit optional handlers not needed here.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/pages/chat/components/GitLabAuthGate`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/chat/components/GitLabAuthGate/
git commit -m "feat(gitlab-oauth): chat auth-gate row for per-user connect"
```

---

## Task 4: Detect the connect-required signal and render the gate in chat

**Files:**
- Modify: the chat AI-turn error path where `useMCPAuthPrompt.handleAuthRequiredError` is invoked (see `src/hooks/useMCPAuthPrompt.ts` usage) and where `ChatAiAuthPrompt` is rendered (`src/pages/chat/components/ChatHistory/ChatAiMessage/`).
- Create/Modify: a small parser `src/utils/gitlabAuth.ts` — `parseGitLabConnectRequired(payload): { settingId, integrationName } | null`.
- Test: `src/utils/__tests__/gitlabAuth.test.ts` and an AI-message render test.

**Interfaces:**
- Consumes: the run error `Response` JSON (see Task 5 contract), `GitLabAuthGateRow` (Task 3).
- Produces: `parseGitLabConnectRequired(value: unknown)`; chat renders `GitLabAuthGateRow` when the signal is present, and offers to resend the failed turn after `onConnected`.

- [ ] **Step 1: Write the failing parser test**

```ts
// src/utils/__tests__/gitlabAuth.test.ts
import { parseGitLabConnectRequired } from '@/utils/gitlabAuth'

it('parses a gitlab connect-required payload', () => {
  const out = parseGitLabConnectRequired({
    error: 'gitlab_auth_required', setting_id: 's1', integration_name: 'Team GitLab',
  })
  expect(out).toEqual({ settingId: 's1', integrationName: 'Team GitLab' })
})

it('returns null for unrelated payloads', () => {
  expect(parseGitLabConnectRequired({ error: 'authentication_required' })).toBeNull()
  expect(parseGitLabConnectRequired(null)).toBeNull()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/utils/__tests__/gitlabAuth.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the parser**

```ts
// src/utils/gitlabAuth.ts
export interface GitLabConnectRequired { settingId: string; integrationName: string }

export const parseGitLabConnectRequired = (value: unknown): GitLabConnectRequired | null => {
  if (
    typeof value === 'object' && value !== null &&
    (value as { error?: unknown }).error === 'gitlab_auth_required' &&
    typeof (value as { setting_id?: unknown }).setting_id === 'string'
  ) {
    const v = value as { setting_id: string; integration_name?: string }
    return { settingId: v.setting_id, integrationName: v.integration_name ?? 'GitLab integration' }
  }
  return null
}
```

- [ ] **Step 4: Wire detection into the chat turn**

At the point where the AI turn inspects a failed run (same place `handleAuthRequiredError` handles the MCP payload), also call `parseGitLabConnectRequired` on the error JSON; when it returns a value, store it on the message so the AI-message component renders `GitLabAuthGateRow` with `onConnected` = re-send the failed turn (reuse the existing resend action used by the MCP gate's "resend the failed turn" affordance). Add a render test asserting the gate appears for a message carrying the signal.

- [ ] **Step 5: Run tests**

Run: `npm test -- src/utils/__tests__/gitlabAuth.test.ts src/pages/chat/components/ChatHistory`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(gitlab-oauth): render connect auth-gate on connect-required runs"
```

---

## Task 5: Server contract prerequisite (tracked here, implemented server-side)

**Not a UI change** — recorded so the flow is complete. The run path must emit, when the acting user has no GitLab token for a required tool, a JSON error payload the chat can parse:

```json
{ "error": "gitlab_auth_required", "setting_id": "<id>", "integration_name": "<alias>" }
```

Until this exists, the member still gets the plain "Connect your GitLab account to use this integration." message (from the typed not-connected error), and Tasks 1–3 remain usable via any surface that knows the `setting_id`. Coordinate this contract before shipping Task 4.

---

## Task 6: Full gate

- [ ] **Step 1: Type-check and lint**

Run: `npx tsc --noEmit` and `npx eslint src/hooks/useGitLabConnect.ts src/store/userSettings.ts src/pages/chat/components/GitLabAuthGate src/utils/gitlabAuth.ts`
Expected: clean.

- [ ] **Step 2: Run the affected suites**

Run: `npm test -- src/hooks/__tests__/useGitLabConnect.test.ts src/store/__tests__/userSettings.test.ts src/pages/chat/components/GitLabAuthGate src/utils/__tests__/gitlabAuth.test.ts`
Expected: all PASS.

- [ ] **Step 3: Manual end-to-end (two users)**

1. Admin creates a shared GitLab integration (existing flow) and signs in.
2. A second member opens a chat with an assistant that uses the integration and sends a turn that hits GitLab.
3. The run fails not-connected → the AI turn shows a "Sign in with GitLab" auth-gate for that integration.
4. The member clicks it → popup → authorizes under their own account → gate flips to connected → resend the turn → the call now runs as the member.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore(gitlab-oauth): lint + suite green for per-user connect UI"
```

---

## Self-Review Notes (author)

- **UX decision:** chat auth-gate mirroring the MCP prompt, but using the proven popup+poll mechanics (`useOAuth`) rather than the MCP callback-listener, which keeps the change small and avoids MCP-specific coupling.
- **Cross-cutting dependency:** Task 4 depends on the Task 5 server contract; Tasks 1–3 ship independently and are unit-testable now.
- **No app-credential exposure:** members never see client_id/secret — `/connect` loads them by `setting_id` server-side.
```
