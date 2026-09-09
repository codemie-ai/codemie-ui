# EPMCDME-14582 — Enable OAuth toggle in the assistant-tools integration popup — Plan

> Steps use checkbox (`- [ ]`) syntax; single TDD task.

**Goal:** Let users create Jira/Confluence/GitLab OAuth integrations from the assistant "Create User
Integration" popup by making the "Use OAuth 2.0 sign-in" toggle usable when the credential type is
locked (`disableType`), while keeping it disabled on edit.

**Architecture:** Frontend-only, one-token change in `SettingsForm.tsx`: the OAuth toggle's `disabled`
predicate drops `disableType`. Grounding: `technical-analysis.md`.

**Tech Stack:** React 18 · TypeScript · Vitest + React Testing Library.

## Global Constraints
- Change ONLY the OAuth toggle's `disabled` (line ~597). Do NOT touch the type-select `disabled`
  (line ~586) — the tool-locked type must stay locked.
- Frontend-only; no secret/token handling changes.
- Do not touch the unrelated dirty `vite.config.ts`.
- Commit convention: `EPMCDME-14582: <Capital sentence>` (single ticket + colon). No MR/reviewer refs.
- PostToolUse hook runs prettier/eslint on `src/` edits — don't re-run them.

---

### Task 1: OAuth toggle stays enabled when the credential type is locked (create), disabled on edit

**Files:**
- Modify: `src/pages/integrations/components/SettingsForm/SettingsForm.tsx:597`
- Test: `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx`

**Test-first: yes** — a test rendering `SettingsForm` with `disableType` locked on create asserts the
"Use OAuth 2.0 sign-in" switch is enabled (fails today because it is `disabled={editing || disableType}`).

- [ ] **Step 1: Write failing tests** — add to the existing oauth test file:

```tsx
it('keeps the OAuth toggle enabled when the credential type is locked on create (assistant-tools popup)', () => {
  render(
    <SettingsForm
      credentialType="git"
      settingType="user"
      disableType
      editing={false}
      onSubmit={vi.fn()}
      onClose={vi.fn()}
      submitText="Save"
    />
  )
  expect(screen.getByRole('switch', { name: /Use OAuth 2.0 sign-in/i })).toBeEnabled()
})

it('disables the OAuth toggle when editing a saved integration', () => {
  render(
    <SettingsForm
      credentialType="git"
      settingType="user"
      editing
      onSubmit={vi.fn()}
      onClose={vi.fn()}
      submitText="Save"
    />
  )
  expect(screen.getByRole('switch', { name: /Use OAuth 2.0 sign-in/i })).toBeDisabled()
})
```

- [ ] **Step 2: Run tests, verify RED**

Run: `npm run test:unit -- src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx`
Expected: the "enabled when locked on create" test FAILS (toggle currently `disabled` because `disableType` is true); the edit test passes.

- [ ] **Step 3: Implement** — in `SettingsForm.tsx`, the OAuth toggle (the `<Switch id="useOAuth" .../>`):

```tsx
disabled={editing}
```
(was `disabled={editing || disableType}`). Leave the credential-type `Autocomplete`/select `disabled={editing || disableType}` unchanged.

- [ ] **Step 4: Run tests, verify GREEN**

Run: `npm run test:unit -- src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx`
Expected: PASS (both new tests + existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/pages/integrations/components/SettingsForm/SettingsForm.tsx \
        src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.oauth.test.tsx
git commit -m "EPMCDME-14582: Keep OAuth toggle usable when the integration type is locked"
```

---

## Self-Review
- **Spec coverage:** AC "OAuth toggle enabled for Jira/Confluence (and Git) creation from the popup
  when OAuth is supported" → toggle enabled on create even with `disableType` ✔. "Disabled only when
  OAuth not supported" → `showOAuthToggle` still hides it when the variant is unavailable ✔. "No
  regression to non-OAuth create" → only the toggle's disabled predicate changed; type lock intact ✔.
  "Disabled on edit" → `disabled={editing}` preserves it ✔.
- **Placeholder scan:** none — concrete code/commands.
- **Type consistency:** uses existing `editing` / `disableType` props; no new symbols.
