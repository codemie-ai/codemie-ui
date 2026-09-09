# EPMCDME-14584 — OAuth Test uses wrong token after saving — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax. Execute task-by-task with a RED→GREEN test cycle each.

**Goal:** Make the "Test" action on a saved Jira/Confluence/GitLab OAuth integration succeed without manually re-pasting the secret, by routing it through the OAuth connect-with-test flow (stored secret decrypted server-side by `setting_id`).

**Architecture:** Frontend-only fix in `codemie-ui`. Restore the store's `test` param on the three `connect…OAuth` methods; make `OAuthTestAction` detect the folded OAuth model (base type + `auth_type=oauth` marker, or a variant credentialType) and route saved+masked Test to `connect…OAuth(settingId, true)` while a freshly typed secret still uses `initiate`; wire `settingId` through the Edit/SettingsForm call sites; and hide the generic `TestIntegration` for OAuth integrations.

**Tech Stack:** React 18 · TypeScript · Valtio · Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-09-03-epmcdme-14584-oauth-test-wrong-token/technical-analysis.md`

## Global Constraints
- Frontend-only. Backend already supports connect-with-test (`ConnectOAuthRequest.test`) and masked-value filtering — do NOT change backend.
- `MASKED_VALUE = '**********'` (`src/constants/settings.ts`). The OAuth marker is `auth_type === 'oauth'`.
- Provider ↔ variant ↔ base mapping already exists: `OAUTH_VARIANT_BY_BASE_TYPE` and `getBaseTypeForOAuthVariant` (`src/constants/integration.ts`), variant keys `gitlaboauth`/`jiraoauth`/`confluenceoauth`.
- Do not touch the unrelated dirty `vite.config.ts`.
- Commit convention: `EPMCDME-14584: <Capital sentence>` (single ticket + colon). No MR/reviewer refs in messages. A `PostToolUse` hook runs prettier/eslint on `src/` edits — do not re-run them.
- Follow `.ai-run/guides/` for gate commands.

---

### Task 1: Store — re-add `test` flag to the three `connect…OAuth` methods

**Files:**
- Modify: `src/store/userSettings.ts` (interface types ~75/79/85; impls ~266/298/328)
- Test: `src/store/__tests__/userSettings.test.ts`

**Interfaces:**
- Produces: `connectGitLabOAuth(settingId: string, test?: boolean)`, `connectJiraOAuth(settingId: string, test?: boolean)`, `connectConfluenceOAuth(settingId: string, test?: boolean)` — each POSTs `{ setting_id, test }` (default `test:false`).

- [ ] **Step 1: Write failing tests** — in the existing connect describe-blocks, assert default POSTs `{ setting_id, test:false }` and that `connect…OAuth(id, true)` POSTs `{ setting_id, test:true }`, for GitLab, Jira, Confluence:

```ts
it('connectGitLabOAuth forwards test:true for a non-persisting test', async () => {
  mockPost.mockResolvedValueOnce(okResponse({ auth_url: 'https://gl/auth', state: 'st', instance_url: 'https://gl', setting_id: 's1' }))
  await userSettingsStore.connectGitLabOAuth('s1', true)
  expect(mockPost).toHaveBeenCalledWith('v1/gitlab-oauth/connect', { setting_id: 's1', test: true })
})
```
(and analogous `test:true` tests for `connectJiraOAuth` → `v1/atlassian-oauth/connect`, `connectConfluenceOAuth` → `v1/confluence-oauth/connect`; update the existing default-call assertions to expect `{ setting_id, test:false }`).

- [ ] **Step 2: Run tests, verify RED**

Run: `npm run test:unit -- src/store/__tests__/userSettings.test.ts`
Expected: FAIL (default calls send `{ setting_id }`, no `test`; `test:true` overload not honored).

- [ ] **Step 3: Implement** — add `test = false` param and include it in the body:

```ts
async connectGitLabOAuth(settingId: string, test = false): Promise<GitLabOAuthConnectResponse> {
  const response = await api.post('v1/gitlab-oauth/connect', { setting_id: settingId, test })
  return response.json()
},
```
Do the same for `connectJiraOAuth` (`v1/atlassian-oauth/connect`) and `connectConfluenceOAuth` (`v1/confluence-oauth/connect`), and add `test?: boolean` to the three interface signatures in `UserSettingsStoreType`.

- [ ] **Step 4: Run tests, verify GREEN**

Run: `npm run test:unit -- src/store/__tests__/userSettings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/userSettings.ts src/store/__tests__/userSettings.test.ts
git commit -m "EPMCDME-14584: Re-add non-persisting test flag to OAuth connect store methods"
```

---

### Task 2: Shared helper — resolve the OAuth provider from the folded model

**Files:**
- Modify: `src/constants/integration.ts` (add helper near `OAUTH_VARIANT_BY_BASE_TYPE`)
- Test: `src/constants/__tests__/integration.test.ts` (create if absent) OR co-locate with settings util tests

**Interfaces:**
- Produces:
  - `isFoldedOAuth(credentialValues?: Record<string, unknown>): boolean` — `credentialValues?.auth_type === 'oauth'`.
  - `resolveOAuthVariant(credentialType: string, credentialValues?: Record<string, unknown>): string | undefined` — returns the variant key (`gitlaboauth`/`jiraoauth`/`confluenceoauth`) when `credentialType` is already a variant, or when `credentialType` is a base type (`git`/`jira`/`confluence`) AND `isFoldedOAuth(credentialValues)`; else `undefined`.

- [ ] **Step 1: Write failing tests**

```ts
import { resolveOAuthVariant, isFoldedOAuth } from '@/constants/integration'

describe('resolveOAuthVariant', () => {
  it('returns the variant key directly for a variant credentialType', () => {
    expect(resolveOAuthVariant('gitlaboauth', {})).toBe('gitlaboauth')
  })
  it('maps a base type + oauth marker to its variant', () => {
    expect(resolveOAuthVariant('git', { auth_type: 'oauth' })).toBe('gitlaboauth')
    expect(resolveOAuthVariant('jira', { auth_type: 'oauth' })).toBe('jiraoauth')
    expect(resolveOAuthVariant('confluence', { auth_type: 'oauth' })).toBe('confluenceoauth')
  })
  it('returns undefined for a base type without the marker (PAT)', () => {
    expect(resolveOAuthVariant('jira', { token: 'x' })).toBeUndefined()
  })
  it('returns undefined for a non-OAuth type', () => {
    expect(resolveOAuthVariant('aws', { auth_type: 'oauth' })).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests, verify RED**

Run: `npm run test:unit -- src/constants/__tests__/integration.test.ts`
Expected: FAIL ("resolveOAuthVariant is not a function").

- [ ] **Step 3: Implement** in `src/constants/integration.ts`:

```ts
export const isFoldedOAuth = (credentialValues?: Record<string, unknown>): boolean =>
  credentialValues?.auth_type === 'oauth'

// Resolve the OAuth variant key from either an already-variant credentialType or a base type
// (git/jira/confluence) carrying the auth_type=oauth marker. undefined => not an OAuth integration.
export const resolveOAuthVariant = (
  credentialType: string,
  credentialValues?: Record<string, unknown>
): string | undefined => {
  const type = credentialType?.toLowerCase()
  if (OAUTH_VARIANT_CREDENTIAL_TYPES.has(type)) return type
  const variant = OAUTH_VARIANT_BY_BASE_TYPE[type]
  return variant && isFoldedOAuth(credentialValues) ? variant : undefined
}
```

- [ ] **Step 4: Run tests, verify GREEN**

Run: `npm run test:unit -- src/constants/__tests__/integration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/constants/integration.ts src/constants/__tests__/integration.test.ts
git commit -m "EPMCDME-14584: Add folded-OAuth provider resolution helpers"
```

---

### Task 3: OAuthTestAction — detect folded OAuth and route saved+masked Test to connect-with-test

**Files:**
- Modify: `src/pages/integrations/components/OAuthTestAction.tsx`
- Test: `src/pages/integrations/components/__tests__/OAuthTestAction.test.tsx`

**Interfaces:**
- Consumes: `resolveOAuthVariant`, `isFoldedOAuth` (Task 2); `connect…OAuth(settingId, test)` (Task 1); `MASKED_VALUE`.
- Produces: `OAuthTestAction` accepts `settingId?: string`; renders the provider `OAuthTestButton` for any folded OAuth integration (variant key OR base+marker); `initiate` callback routes to `connect…OAuth(settingId!, true)` when `settingId` present AND `client_secret === MASKED_VALUE`, else `initiate…OAuth({form values})`.

- [ ] **Step 1: Write failing tests** — extend the test using the captured-`initiate` mock pattern (mock `OAuthTestButton` to capture its `initiate` prop; mock `userSettingsStore` with `initiate*`/`connect*` vi.fns). Cover:
  - base type `jira` + `{ auth_type:'oauth', client_secret: MASKED }` + `settingId` → `connectJiraOAuth('setting-1', true)`, not `initiateJiraOAuth`.
  - base type `git` + `{ auth_type:'oauth', client_secret: MASKED }` + `settingId` → `connectGitLabOAuth(id, true)`.
  - variant `confluenceoauth` + fresh `client_secret:'real'` + `settingId` → `initiateConfluenceOAuth({...})`, not connect.
  - variant `jiraoauth`, no `settingId` (create), masked-looking secret → `initiateJiraOAuth`, not connect.
  - base type `jira` **without** the marker (PAT) → renders null (`queryByTestId('oauth-test-button')` is null).

```ts
it('routes saved masked-secret Jira OAuth (base type + marker) to connect-with-test', async () => {
  render(<OAuthTestAction credentialType="jira" settingId="setting-1"
    credentialValues={{ auth_type: 'oauth', client_id: 'id', client_secret: '**********', callback_base_url: 'https://h' }} />)
  await capturedInitiate!()
  expect(userSettingsStore.connectJiraOAuth).toHaveBeenCalledWith('setting-1', true)
  expect(userSettingsStore.initiateJiraOAuth).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run tests, verify RED**

Run: `npm run test:unit -- src/pages/integrations/components/__tests__/OAuthTestAction.test.tsx`
Expected: FAIL (base-type cases render null; no connect routing; no `settingId` prop).

- [ ] **Step 3: Implement** — rewrite the component body to resolve the variant then branch on provider:

```tsx
interface OAuthTestActionProps {
  credentialType: string
  credentialValues: Record<string, unknown>
  settingId?: string
}

const OAuthTestAction: FC<OAuthTestActionProps> = ({ credentialType, credentialValues, settingId }) => {
  const value = (key: string): string => {
    const raw = credentialValues[key]
    return typeof raw === 'string' ? raw : ''
  }
  const variant = resolveOAuthVariant(credentialType, credentialValues)
  if (!variant) return null

  // On edit the backend returns client_secret masked. Sending the mask to /initiate fails
  // (EPMCDME-14584); when saved + masked, run against the STORED secret via connect-with-test
  // (backend decrypts by setting_id, no token persisted). A freshly typed secret uses /initiate.
  const useStoredSecret = !!settingId && value('client_secret') === MASKED_VALUE

  if (variant === GITLAB_OAUTH_CREDENTIAL_TYPE) {
    return (
      <OAuthTestButton
        provider={OAuthProvider.GITLAB}
        initiate={() =>
          useStoredSecret
            ? userSettingsStore.connectGitLabOAuth(settingId!, true)
            : userSettingsStore.initiateGitLabOAuth({
                client_id: value('client_id'),
                client_secret: value('client_secret'),
                callback_base_url: value('callback_base_url'),
                instance_url: value('instance_url'),
              })
        }
      />
    )
  }
  if (variant === JIRA_OAUTH_CREDENTIAL_TYPE) {
    return (
      <OAuthTestButton
        provider={OAuthProvider.JIRA}
        initiate={() =>
          useStoredSecret
            ? userSettingsStore.connectJiraOAuth(settingId!, true)
            : userSettingsStore.initiateJiraOAuth({
                client_id: value('client_id'),
                client_secret: value('client_secret'),
                callback_base_url: value('callback_base_url'),
              })
        }
      />
    )
  }
  if (variant === CONFLUENCE_OAUTH_CREDENTIAL_TYPE) {
    return (
      <OAuthTestButton
        provider={OAuthProvider.CONFLUENCE}
        initiate={() =>
          useStoredSecret
            ? userSettingsStore.connectConfluenceOAuth(settingId!, true)
            : userSettingsStore.initiateConfluenceOAuth({
                client_id: value('client_id'),
                client_secret: value('client_secret'),
                callback_base_url: value('callback_base_url'),
              })
        }
      />
    )
  }
  return null
}
```
Add imports for `resolveOAuthVariant`, `isFoldedOAuth` (if used), and `MASKED_VALUE`.

- [ ] **Step 4: Run tests, verify GREEN**

Run: `npm run test:unit -- src/pages/integrations/components/__tests__/OAuthTestAction.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/integrations/components/OAuthTestAction.tsx src/pages/integrations/components/__tests__/OAuthTestAction.test.tsx
git commit -m "EPMCDME-14584: Route saved masked-secret OAuth Test to connect-with-test"
```

---

### Task 4: Wire `settingId` and hide the generic Test for OAuth at the call sites

**Files:**
- Modify: `src/pages/integrations/EditUserIntegrationPage.tsx` (~119-133)
- Modify: `src/pages/integrations/EditProjectIntegrationPage.tsx` (~110-124)
- Modify: `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` (~724-733)
- Modify (consistency): `src/pages/integrations/NewUserIntegrationPage.tsx`, `src/pages/integrations/NewProjectIntegrationPage.tsx` (generic-Test gate only)
- Test: extend the Edit-page component test if one exists; otherwise rely on Task 3 unit coverage + manual/qa. (No new failing-test file is required for prop wiring; the behavior is covered by Task 3. Test-first: no — pure prop threading. Verified via typecheck + existing render tests + Stage 6 gates.)

**Interfaces:**
- Consumes: `OAuthTestAction` `settingId` prop (Task 3); `isFoldedOAuth` (Task 2).

- [ ] **Step 1: Edit pages** — pass `settingId={setting.id}` to `OAuthTestAction`, and gate the generic `TestIntegration` off for OAuth. In both Edit pages:

```tsx
{setting &&
  !isFoldedOAuth(credentialValues) &&
  getTestableCredentialTypes().includes(setting.credential_type.toLowerCase()) && (
    <TestIntegration
      credentialType={setting.credential_type.toLowerCase()}
      credentialValues={credentialValues}
      settingId={setting.id}
      label="Test"
    />
  )}
{setting && (
  <OAuthTestAction
    credentialType={setting.credential_type.toLowerCase()}
    credentialValues={credentialValues}
    settingId={setting.id}
  />
)}
```

- [ ] **Step 2: SettingsForm footer** (line ~724-733) — gate generic Test off for OAuth and pass `settingId`:

```tsx
{!isFoldedOAuth(getValues()) && getTestableCredentialTypes().includes(credentialType) && (
  <TestIntegration credentialType={credentialType} credentialValues={getValues()} settingId={settingId} label="Test Integration" />
)}
<OAuthTestAction credentialType={credentialType} credentialValues={getValues()} settingId={settingId} />
```
(SettingsForm's internal `credentialType` is already the variant key for OAuth — `SettingsForm.tsx:145-160` — so `OAuthTestAction` matches via the variant branch; `settingId` is the `settingId` prop, undefined on create.)

- [ ] **Step 3: New pages** — the create-flow `credentialType` is the variant key, which `getTestableCredentialTypes()` already excludes, so the generic Test does not show; add `!isFoldedOAuth(credentialValues)` to the generic-Test condition only if `credentialValues` carries a marker there (defensive; skip if it complicates — the variant key already gates it). Leave `OAuthTestAction` (no `settingId`) as-is; create flow uses `initiate`.

- [ ] **Step 4: Typecheck + run affected tests**

Run: `npm run typecheck`
Run: `npm run test:unit -- src/pages/integrations`
Expected: PASS (no `TestIntegration` shown for a folded OAuth integration; `OAuthTestAction` receives `settingId`).

- [ ] **Step 5: Commit**

```bash
git add src/pages/integrations/EditUserIntegrationPage.tsx src/pages/integrations/EditProjectIntegrationPage.tsx src/pages/integrations/components/SettingsForm/SettingsForm.tsx src/pages/integrations/NewUserIntegrationPage.tsx src/pages/integrations/NewProjectIntegrationPage.tsx
git commit -m "EPMCDME-14584: Wire settingId to OAuth Test and hide generic Test for OAuth integrations"
```

---

## Self-Review

- **Spec coverage:** Store `test` flag (Task 1) ✔; provider detection for folded model (Task 2) ✔; connect-with-test on saved+masked, initiate on fresh (Task 3) ✔; `settingId` wiring + generic-Test suppression across Edit/SettingsForm/New (Task 4) ✔; GitLab OAuth now has a Test button via the OAuth branch (Task 3/4) ✔; no backend change ✔.
- **Placeholder scan:** none — all steps carry concrete code/commands.
- **Type consistency:** `resolveOAuthVariant`/`isFoldedOAuth` names and signatures consistent across Tasks 2–4; `connect…OAuth(settingId, test)` consistent across Tasks 1 and 3; variant constants from `@/constants/integration`.
