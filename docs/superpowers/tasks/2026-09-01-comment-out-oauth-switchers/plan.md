# EPMCDME-14586 — Comment out OAuth switchers (temporary) Implementation Plan

> **For agentic workers:** executed inline via `superpowers:test-driven-development` (sdlc-light Stage 4).

**Goal:** Temporarily hide the GitLab OAuth credential type and the Jira/Confluence "Use OAuth 2.0
sign-in" toggle from the integration form by **commenting out** the related code (keep it in place for
easy re-enable).

**Architecture:** Two precise comment-outs — the `[GITLAB_OAUTH_CREDENTIAL_TYPE]` entry in
`CREDENTIAL_UI_MAPPING`, and the `showOAuthToggle` render block + its supporting consts in
`SettingsForm`. Each site gets an `EPMCDME-14586:` marker.

**Tech Stack:** TypeScript, Vitest + RTL.

**Spec:** EPMCDME-14586 (team hotfix). Context: `technical-analysis.md`.

## Global Constraints

- **Comment out, do not delete.** Leave the code as comments with an `EPMCDME-14586:` marker.
- Only hide: the GitLab OAuth **type** and the Jira/Confluence sign-in **toggle**. Do not touch the
  `jiraoauth`/`confluenceoauth` config entries, token flows, or other credential types.
- Keep lint/typecheck green — comment orphaned supporting consts/imports too (per technical-analysis).
- Commit format: `EPMCDME-14586: Capital sentence`. Do not manually run prettier/eslint (hook does it).

---

### Task 1: Hide the GitLab OAuth credential type

**Files:**
- Modify: `src/utils/settingsUIConfig.ts` (comment the `[GITLAB_OAUTH_CREDENTIAL_TYPE]` entry `:979-1005` + its import `:20`)
- Test: `src/utils/__tests__/settings.test.ts` (extend)

- [ ] **Step 1: Write the failing test** — assert the type is gone:
```ts
describe('OAuth switchers commented out (EPMCDME-14586)', () => {
  it('does not expose the GitLab OAuth credential type', () => {
    expect(CREDENTIAL_UI_MAPPING['gitlaboauth']).toBeUndefined()
    const types = getAvailableCredentialsTypes({ settingType: SETTING_TYPE_USER, user: null })
    expect(types).not.toContain('gitlaboauth')
  })
})
```
- [ ] **Step 2: Run → RED** — `npx vitest run src/utils/__tests__/settings.test.ts`; the entry exists.
- [ ] **Step 3: Implement** — block-comment the `[GITLAB_OAUTH_CREDENTIAL_TYPE]: { … }` entry (prefix an
  `// EPMCDME-14586: temporarily hidden — do not delete`) and line-comment `GITLAB_OAUTH_CREDENTIAL_TYPE`
  in the `@/constants/integration` import.
- [ ] **Step 4: Run → GREEN**.
- [ ] **Step 5: Commit** — `EPMCDME-14586: Comment out GitLab OAuth credential type`.

**Test-first: yes — asserts CREDENTIAL_UI_MAPPING/getAvailableCredentialsTypes no longer include gitlaboauth (fails while the entry is present).**

---

### Task 2: Hide the Jira/Confluence "Use OAuth 2.0 sign-in" toggle

**Files:**
- Modify: `src/pages/integrations/components/SettingsForm/SettingsForm.tsx` (comment toggle block `:569-581`, consts `:293-303` keeping `baseCredentialType`, and the `OAUTH_VARIANT_BY_BASE_TYPE` import)
- Test: `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx` (extend)

- [ ] **Step 1: Write the failing test** — render `SettingsForm` for a jira credential and assert the
  toggle is absent (add `toolFieldPlaceholders: {}` to the appInfoStore mock and make
  `getAvailableCredentialsTypes` return `['jira','jiraoauth']` so the toggle would otherwise render):
```ts
it('does not render the Use OAuth 2.0 sign-in toggle', () => {
  render(<SettingsForm credentialType="jira" settingType="user" onSubmit={vi.fn()} onClose={vi.fn()} submitText="Save" editing={false} />)
  expect(screen.queryByText('Use OAuth 2.0 sign-in')).toBeNull()
})
```
- [ ] **Step 2: Run → RED** — the toggle renders.
- [ ] **Step 3: Implement** — block-comment the toggle JSX (`:569-581`) and the four supporting consts
  `oauthVariantType`/`isOAuthVariantSelected`/`showOAuthToggle`/`handleOAuthToggle` (`:293-303`), keeping
  `baseCredentialType` (`:292`); line-comment the now-unused `OAUTH_VARIANT_BY_BASE_TYPE` import. Prefix
  an `// EPMCDME-14586: temporarily hidden — do not delete` marker.
- [ ] **Step 4: Run → GREEN**.
- [ ] **Step 5: Commit** — `EPMCDME-14586: Comment out Jira Confluence OAuth sign-in toggle`.

**Test-first: yes — a render test asserting the 'Use OAuth 2.0 sign-in' toggle is not in the form (fails while the block renders).**

## Coverage

| Requirement | Covered by |
|---|---|
| GitLab OAuth type removed from form | Task 1 |
| Jira/Confluence sign-in toggle removed | Task 2 |
| Code kept (commented, revertable) | both — block/line comments + EPMCDME-14586 markers |
| No regression to other types / token flows | only the two switchers touched; gates green |
