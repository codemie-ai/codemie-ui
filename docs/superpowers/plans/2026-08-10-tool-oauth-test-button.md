# Tool OAuth "Test" Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the save-gating "Sign in with X" step on the GitLab/Jira/Confluence OAuth integration forms with a non-persisting "Test connection" action, and let Save create the integration with app credentials only.

**Architecture:** A new shared `OAuthTestButton` drives the existing `useOAuth` popup+poll flow (against `/initiate`, which the backend now forces to `persist_token=false`) and reports via the app's standard `Checker` + `toaster` affordance. The three provider field components become thin wrappers around it. `SettingsForm` stops requiring/forwarding `oauth_state` for the three tool types. Google OAuth and the chat-gate connect flow are untouched.

**Tech Stack:** React + TypeScript, react-hook-form, valtio, vitest + @testing-library/react.

Spec: `docs/superpowers/specs/2026-08-10-tool-oauth-test-button-design.md`

## Global Constraints

- Apache license header (the 13-line `// Copyright 2026 EPAM Systems, Inc. ("EPAM") …` block) at the top of every new `.ts`/`.tsx` file — copy it verbatim from any existing sibling file.
- **Google OAuth is out of scope and must not change**: `GoogleOAuthField`, and the `googleoauth` `oauth_state` validation (`SettingsForm.tsx` ~line 209-214) and submit forwarding must remain intact.
- The three tool credential-type constants: `GITLAB_OAUTH_CREDENTIAL_TYPE` (`'gitlaboauth'`), `JIRA_OAUTH_CREDENTIAL_TYPE` (`'jiraoauth'`), `CONFLUENCE_OAUTH_CREDENTIAL_TYPE` (`'confluenceoauth'`) — from `@/constants/integration`.
- `OAuthStatus` (`@/types/entity/dataSource`): `IDLE='idle'`, `WAITING='waiting'`, `SUCCESS='success'`, `ERROR='error'`.
- `CHECKER_STATUSES` (`@/constants`): `UNDEFINED`, `IN_PROGRESS`, `FAILED`, `SUCCESS`.
- Lint/format gate before every commit: `npm run lint` (or the repo's ruff-equivalent — check `package.json`) must pass on changed files.

---

### Task 1: `OAuthTestButton` shared component

**Files:**
- Create: `src/pages/integrations/components/SettingsForm/OAuthTestButton.tsx`
- Test: `src/pages/integrations/components/SettingsForm/__tests__/OAuthTestButton.test.tsx`

**Interfaces:**
- Consumes: `useOAuth` from `@/hooks/useOAuth` (returns `{ status, user, error, handleSignIn }` among others); `Checker` from `@/components/Checker`; `toaster` (default) from `@/utils/toaster`.
- Produces: `default export OAuthTestButton` with props
  `{ provider: OAuthProvider; initiate: () => Promise<OAuthInitiateResponse>; getStatus: (state: string) => Promise<OAuthStatusResponse & { email?: string }> }`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/integrations/components/SettingsForm/__tests__/OAuthTestButton.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'

import OAuthTestButton from '../OAuthTestButton'

const handleSignIn = vi.fn()
let mockReturn: { status: OAuthStatus; user: string; error: string; handleSignIn: typeof handleSignIn }

vi.mock('@/hooks/useOAuth', () => ({ useOAuth: () => mockReturn }))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))

import toaster from '@/utils/toaster'

const props = { provider: OAuthProvider.GITLAB, initiate: vi.fn(), getStatus: vi.fn() }

describe('OAuthTestButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReturn = { status: OAuthStatus.IDLE, user: '', error: '', handleSignIn }
  })

  it('runs the OAuth flow when clicked', async () => {
    render(<OAuthTestButton {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /test connection/i }))
    expect(handleSignIn).toHaveBeenCalledTimes(1)
  })

  it('toasts success with the authenticated user', () => {
    const { rerender } = render(<OAuthTestButton {...props} />)
    mockReturn = { status: OAuthStatus.SUCCESS, user: 'groot', error: '', handleSignIn }
    rerender(<OAuthTestButton {...props} />)
    expect(toaster.info).toHaveBeenCalledWith(expect.stringContaining('groot'))
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('toasts the error message on failure', () => {
    const { rerender } = render(<OAuthTestButton {...props} />)
    mockReturn = { status: OAuthStatus.ERROR, user: '', error: 'bad creds', handleSignIn }
    rerender(<OAuthTestButton {...props} />)
    expect(toaster.error).toHaveBeenCalledWith('bad creds')
    expect(toaster.info).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/pages/integrations/components/SettingsForm/__tests__/OAuthTestButton.test.tsx`
Expected: FAIL — cannot resolve `../OAuthTestButton`.

- [ ] **Step 3: Write the component**

```tsx
// src/pages/integrations/components/SettingsForm/OAuthTestButton.tsx
// <Apache license header here>
import { FC, useEffect, useRef } from 'react'

import Checker from '@/components/Checker'
import { CHECKER_STATUSES, CheckerStatus } from '@/constants'
import { useOAuth } from '@/hooks/useOAuth'
import {
  OAuthInitiateResponse,
  OAuthProvider,
  OAuthStatus,
  OAuthStatusResponse,
} from '@/types/entity/dataSource'
import toaster from '@/utils/toaster'

interface OAuthTestButtonProps {
  provider: OAuthProvider
  initiate: () => Promise<OAuthInitiateResponse>
  getStatus: (state: string) => Promise<OAuthStatusResponse & { email?: string }>
}

const CHECKER_STATUS_BY_OAUTH: Record<OAuthStatus, CheckerStatus> = {
  [OAuthStatus.IDLE]: CHECKER_STATUSES.UNDEFINED,
  [OAuthStatus.WAITING]: CHECKER_STATUSES.IN_PROGRESS,
  [OAuthStatus.SUCCESS]: CHECKER_STATUSES.SUCCESS,
  [OAuthStatus.ERROR]: CHECKER_STATUSES.FAILED,
}

const OAuthTestButton: FC<OAuthTestButtonProps> = ({ provider, initiate, getStatus }) => {
  const { status, user, error, handleSignIn } = useOAuth({ initiate, getStatus })
  const prevStatus = useRef(status)

  useEffect(() => {
    if (prevStatus.current === status) return
    prevStatus.current = status
    if (status === OAuthStatus.SUCCESS) {
      toaster.info(
        user ? `${provider} test successful — authenticated as ${user}` : `${provider} test successful`
      )
    } else if (status === OAuthStatus.ERROR) {
      toaster.error(error || `${provider} test failed — please try again.`)
    }
  }, [status, user, error, provider])

  return (
    <Checker
      label="Test connection"
      status={CHECKER_STATUS_BY_OAUTH[status]}
      onCheck={() => handleSignIn()}
    />
  )
}

export default OAuthTestButton
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run src/pages/integrations/components/SettingsForm/__tests__/OAuthTestButton.test.tsx`
Expected: PASS (3 tests). If the click can't find the button, confirm `Checker` renders a `<button>` and adjust the query to `screen.getByText('Test connection')`.

- [ ] **Step 5: Lint**

Run: `npx eslint src/pages/integrations/components/SettingsForm/OAuthTestButton.tsx src/pages/integrations/components/SettingsForm/__tests__/OAuthTestButton.test.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/integrations/components/SettingsForm/OAuthTestButton.tsx \
        src/pages/integrations/components/SettingsForm/__tests__/OAuthTestButton.test.tsx
git commit -m "feat(oauth): add OAuthTestButton for tool integration test (CR-U09)"
```

---

### Task 2: Rewire the three fields + SettingsForm (drop oauth_state gate)

**Files:**
- Modify: `src/pages/integrations/components/SettingsForm/GitLabOAuthField.tsx`
- Modify: `src/pages/integrations/components/SettingsForm/JiraOAuthField.tsx`
- Modify: `src/pages/integrations/components/SettingsForm/ConfluenceOAuthField.tsx`
- Modify: `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` (validation ~216-227, submit ~409-448, render sites ~611/622/633)
- Test: `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx`

**Interfaces:**
- Consumes: `OAuthTestButton` (Task 1). Each field keeps its existing store calls: `userSettingsStore.initiateGitLabOAuth({client_id,client_secret,callback_base_url,instance_url})` / `initiateJiraOAuth({client_id,client_secret,callback_base_url})` / `initiateConfluenceOAuth({client_id,client_secret,callback_base_url})`, and `getGitLabOAuthStatus`/`getJiraOAuthStatus`/`getConfluenceOAuthStatus`.
- Produces: field components with props `{ getValues: UseFormGetValues<FieldValues> }` (drops `setValue`/`editing`/`formError`/`initialUser`).

- [ ] **Step 1: Write the failing test**

```tsx
// src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import SettingsForm from '../SettingsForm'

vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  const { CREDENTIAL_UI_MAPPING } = await import('@/utils/settingsUIConfig')
  return {
    ...actual,
    generateDefaultAlias: vi.fn().mockImplementation((input: string) => `gen-${input}`),
    getAvailableCredentialsTypes: vi.fn().mockReturnValue(['gitlaboauth']),
    getCredentialUIMapping: vi.fn().mockReturnValue(CREDENTIAL_UI_MAPPING),
  }
})
vi.mock('valtio', () => ({
  proxy: (v: unknown) => v,
  snapshot: (v: unknown) => v,
  subscribe: vi.fn(),
  useSnapshot: (store: unknown) => store,
}))
vi.mock('valtio/react', () => ({ useSnapshot: (store: unknown) => store }))
vi.mock('@/store/user', () => ({
  userStore: { user: { id: '1', role: 'admin', projects: [], username: 'test' } },
}))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    api: { BASE_URL: 'https://test' },
    fetchCustomerConfig: vi.fn().mockResolvedValue(null),
    toolFieldDefaults: {},
  },
}))
vi.mock('@/utils/onboarding', () => ({ registerCredentialTypeCallback: vi.fn(() => () => {}) }))
vi.mock('@/hooks/useActiveHelpSegment', () => ({ useActiveHelpSegment: vi.fn() }))
vi.mock('@/components/ProjectSelector', () => ({ default: () => null }))
vi.mock('../../TestIntegration', () => ({ default: () => null }))
// Neutralize the OAuth field so the test targets SettingsForm's validation/submit only.
vi.mock('../GitLabOAuthField', () => ({ default: () => null }))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))

describe('SettingsForm — tool OAuth save no longer requires oauth_state', () => {
  beforeEach(() => vi.clearAllMocks())

  it('submits a gitlaboauth integration with app creds only (no oauth_state gate)', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(
      <SettingsForm
        credentialType="gitlaboauth"
        settingType="user"
        onSubmit={onSubmit}
        onClose={vi.fn()}
        submitText="Save"
        editing={false}
      />
    )

    await act(async () => {
      await user.type(screen.getByLabelText('Alias'), 'my-gitlab')
      await user.type(screen.getByPlaceholderText('GitLab OAuth Application ID'), 'cid')
      await user.type(screen.getByPlaceholderText('GitLab OAuth Application Secret'), 'sec')
      await user.type(screen.getByPlaceholderText('https://your-codemie-host'), 'https://cm')
      // instance_url has a default of https://gitlab.com
      await user.click(screen.getByRole('button', { name: 'Save' }))
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const payload = onSubmit.mock.calls[0][0]
    expect(payload.credential_type).toBe('gitlaboauth')
    expect(payload.oauth_state).toBeUndefined()
    expect(payload.credential_values).toEqual(
      expect.arrayContaining([{ key: 'client_id', value: 'cid' }])
    )
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx`
Expected: FAIL — currently Save is blocked by the `oauth_state` required rule, so `onSubmit` is not called.
(If a label/placeholder query fails, read the rendered form via `screen.debug()` and align the query to the actual `CredentialFields` label/placeholder — labels are humanized field names, placeholders come from `settingsUIConfig` `gitlaboauth.fields`.)

- [ ] **Step 3: Remove the oauth_state validation for the three tool types**

In `SettingsForm.tsx`, delete these three blocks (keep the Google block above them):

```tsx
    if (credentialType === GITLAB_OAUTH_CREDENTIAL_TYPE && !editing) {
      schema.oauth_state = Yup.string().required('Please sign in with GitLab before saving')
    }

    if (credentialType === JIRA_OAUTH_CREDENTIAL_TYPE && !editing) {
      schema.oauth_state = Yup.string().required('Please sign in with Jira before saving')
    }

    if (credentialType === CONFLUENCE_OAUTH_CREDENTIAL_TYPE && !editing) {
      schema.oauth_state = Yup.string().required('Please sign in with Confluence before saving')
    }
```

- [ ] **Step 4: Stop forwarding oauth_state on submit for the three tool types**

In `SettingsForm.tsx` `submit()`, remove the now-unused `isGitLabOAuth` / `isJiraOAuth` / `isConfluenceOAuth` declarations, and change the trailing spread from:

```tsx
      ...((isGoogleOAuth || isGitLabOAuth || isJiraOAuth || isConfluenceOAuth) && {
        oauth_state: getValues('oauth_state') || undefined,
      }),
```

to:

```tsx
      ...(isGoogleOAuth && {
        oauth_state: getValues('oauth_state') || undefined,
      }),
```

(Keep `const isGoogleOAuth = …` and the `if (!isGoogleOAuth) { … }` credential-values block unchanged. Keep the `delete rawValues.oauth_state` line.)

- [ ] **Step 5: Point the three field components at OAuthTestButton**

Replace the body of `GitLabOAuthField.tsx` with:

```tsx
// <Apache license header here>
import { FC, useCallback } from 'react'
import { FieldValues, UseFormGetValues } from 'react-hook-form'

import { userSettingsStore } from '@/store/userSettings'
import { OAuthProvider } from '@/types/entity/dataSource'

import OAuthTestButton from './OAuthTestButton'

interface GitLabOAuthFieldProps {
  getValues: UseFormGetValues<FieldValues>
}

const GitLabOAuthField: FC<GitLabOAuthFieldProps> = ({ getValues }) => {
  const initiate = useCallback(
    () =>
      userSettingsStore.initiateGitLabOAuth({
        client_id: getValues('client_id'),
        client_secret: getValues('client_secret'),
        callback_base_url: getValues('callback_base_url'),
        instance_url: getValues('instance_url'),
      }),
    [getValues]
  )

  const getStatus = useCallback(async (state: string) => {
    const result = await userSettingsStore.getGitLabOAuthStatus(state)
    return { ...result, email: result.email || result.username }
  }, [])

  return <OAuthTestButton provider={OAuthProvider.GITLAB} initiate={initiate} getStatus={getStatus} />
}

export default GitLabOAuthField
```

Apply the same shape to `JiraOAuthField.tsx` (`initiateJiraOAuth` with `{client_id, client_secret, callback_base_url}`, `getJiraOAuthStatus`, `provider={OAuthProvider.JIRA}`) and `ConfluenceOAuthField.tsx` (`initiateConfluenceOAuth`, `getConfluenceOAuthStatus`, `provider={OAuthProvider.CONFLUENCE}`). None keep `setValue`/`editing`/`formError`/`initialUser`/`useOAuth`/`OAuthSignInButton`.

- [ ] **Step 6: Update the render sites in SettingsForm**

For each of the three blocks (~611/622/633), reduce the props to `getValues` only, e.g.:

```tsx
                {credentialType === GITLAB_OAUTH_CREDENTIAL_TYPE && (
                  <GitLabOAuthField getValues={getValues} />
                )}
                {credentialType === JIRA_OAUTH_CREDENTIAL_TYPE && (
                  <JiraOAuthField getValues={getValues} />
                )}
                {credentialType === CONFLUENCE_OAUTH_CREDENTIAL_TYPE && (
                  <ConfluenceOAuthField getValues={getValues} />
                )}
```

(Leave the `GoogleOAuthField` block at ~565 untouched.)

- [ ] **Step 7: Run the SettingsForm test, verify it passes**

Run: `npx vitest run src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx`
Expected: PASS.

- [ ] **Step 8: Run the full SettingsForm test dir + typecheck**

Run: `npx vitest run src/pages/integrations/components/SettingsForm/__tests__/`
Run: `npx tsc --noEmit`
Expected: all pass; no type errors (this catches any missed reference to the removed field props or `useOAuth` import).

- [ ] **Step 9: Lint**

Run: `npx eslint src/pages/integrations/components/SettingsForm/`
Expected: no errors (also confirms no unused `OAuthSignInButton`/`useOAuth`/`isGitLabOAuth` leftovers).

- [ ] **Step 10: Commit**

```bash
git add src/pages/integrations/components/SettingsForm/
git commit -m "feat(oauth): tool OAuth forms use Test button, save app creds only (CR-U09)"
```

---

## Self-Review

- **Spec coverage:** `OAuthTestButton` (Task 1) = the Test affordance; field rewiring + `SettingsForm` validation/submit changes (Task 2) = drop `oauth_state` for the three types, save app-creds-only, Google untouched. Chat gate / backend explicitly out of scope. ✔
- **Placeholders:** none — all steps carry real code or exact edits. Label/placeholder queries have a documented fallback (`screen.debug()`).
- **Type consistency:** field props are `{ getValues }` in both the component definitions (Step 5) and the render sites (Step 6); `OAuthTestButton` prop names (`provider`/`initiate`/`getStatus`) match between Task 1 and Task 2. ✔
