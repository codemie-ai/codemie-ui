# Sharepoint Integration — Reorder and Rename Credential Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the four Sharepoint Integration credential fields to URL, Tenant ID,
Application (Client) ID, Client Secret, and give each an explicit label matching the Sharepoint
Datasource form's wording, so the "Azure app registration" form no longer causes copy-paste
errors.

**Architecture:** Single-file config edit. `CREDENTIAL_UI_MAPPING.sharepoint.fields` in
`src/utils/settingsUIConfig.ts` is a plain object whose key order **is** the render order
(`CredentialFields.tsx` iterates `Object.entries(...)` in declaration order — no renderer change
needed). Reorder the keys and add an explicit `label` to each field so the placeholder-truncating
`getLabel()` heuristic never runs for these fields.

**Tech Stack:** React 18 + TypeScript, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-09-09-epmcdme-13990/spec.md`

**Commit per task using the repository's existing convention.**

## Global Constraints

- New declared key order: `url`, `tenant_id`, `client_id`, `client_secret`.
- Exact label text (spec's "Target label text"): `url` → "URL" (unchanged); `tenant_id` →
  "Azure Directory (tenant) ID"; `client_id` → "Azure Application (client) ID"; `client_secret` →
  "Client Secret".
- Existing `placeholder`, `help`, `sensitive`, and default-value behavior for each field carry
  over unchanged, except where a placeholder currently duplicates the old label wording (see
  Task 1).
- Non-goals: no change to `IndexTypeSharePoint.tsx`'s `OAUTH_CUSTOM` fields, no new shared
  constant/module, no change to help links or `sensitive`/`dynPlaceholder`/`dynDefault` wiring, no
  change to `CredentialFieldConfig` type or `CredentialFields.tsx` rendering/grouping logic
  **except** the one-line `getLabel()` precedence fix required by Task 1 Step 3a (discovered
  during implementation: `getLabel()` truncates an explicit `label` too, not just a derived
  placeholder, so the target label text is otherwise unreachable).

---

### Task 1: Reorder and relabel `CREDENTIAL_UI_MAPPING.sharepoint.fields`

**Files:**
- Modify: `src/utils/settingsUIConfig.ts:728-747` (the `fields` object inside the `sharepoint`
  entry)
- Modify: `src/pages/integrations/components/SettingsForm/CredentialFields.tsx:248` (one-line
  `getLabel()` precedence fix — see Step 3a)
- Test: `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.sharePointAuth.test.tsx`

**Interfaces:**
- Consumes: `dynPlaceholder('sharepoint', 'url')`, `SHAREPOINT_URL` — already imported in this
  file, unchanged.
- Produces: `CREDENTIAL_UI_MAPPING.sharepoint.fields` keyed in order `url`, `tenant_id`,
  `client_id`, `client_secret`, each with an explicit `label`. `CredentialFields.tsx` and every
  test re-exporting the real `CREDENTIAL_UI_MAPPING` (via the existing
  `getCredentialUIMapping` mock pattern) consume this shape unchanged.

Test-first: yes — a new test in `SettingsForm.sharePointAuth.test.tsx` asserting the four fields
render, in DOM order, with labels "URL", "Azure Directory (tenant) ID", "Azure Application
(client) ID", "Client Secret" under the Azure app registration method; it fails against today's
`url, client_id, tenant_id, client_secret` order and today's `getLabel()`-derived labels ("Azure
AD Application", "Azure AD Tenant ID", "Azure AD Client Secret").

- [ ] **Step 1: Write the failing test**

Add to the existing `describe('SettingsForm — SharePoint authentication method', ...)` block in
`SettingsForm.sharePointAuth.test.tsx`, reusing `renderSharePointForm` and the "Azure app
registration" toggle already exercised at line 129:

```tsx
it('renders the Azure app registration fields in URL, Tenant ID, Client ID, Secret order with matching labels', async () => {
  const user = userEvent.setup()
  renderSharePointForm()

  await act(async () => {
    await user.click(screen.getByLabelText('Azure app registration'))
  })

  const labels = screen
    .getAllByText(/^(URL|Azure Directory \(tenant\) ID|Azure Application \(client\) ID|Client Secret)$/)
    .map((el) => el.textContent)

  expect(labels).toEqual([
    'URL',
    'Azure Directory (tenant) ID',
    'Azure Application (client) ID',
    'Client Secret',
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.sharePointAuth.test.tsx`
Expected: FAIL — the new test's `labels` array does not match (wrong order and/or wrong label
text) against today's config.

- [ ] **Step 3: Reorder and relabel the fields object**

In `src/utils/settingsUIConfig.ts`, replace the `sharepoint.fields` object (current lines
728-747) so the keys are declared `url`, `tenant_id`, `client_id`, `client_secret`, in that order,
and each carries an explicit `label`:

```ts
fields: {
  url: {
    label: 'URL',
    placeholder: dynPlaceholder('sharepoint', 'url'),
    defaultValue: SHAREPOINT_URL,
  },
  tenant_id: {
    label: 'Azure Directory (tenant) ID',
    placeholder: 'Azure Directory (tenant) ID',
    help: 'https://learn.microsoft.com/en-us/azure/active-directory/fundamentals/how-to-find-tenant',
  },
  client_id: {
    label: 'Azure Application (client) ID',
    placeholder: 'Azure Application (client) ID',
    help: 'https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app',
  },
  client_secret: {
    label: 'Client Secret',
    placeholder: 'Client Secret',
    sensitive: true,
    help: 'https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app#add-a-client-secret',
  },
},
```

`help` URLs are carried over unchanged from the current entry (per-field, not reassigned between
fields). Placeholders are updated to match the new label wording so the in-field placeholder text
stays consistent with what's now shown as the label above it.

- [ ] **Step 3a: Fix `getLabel()` precedence in `CredentialFields.tsx`**

Discovered running Step 4 the first time: `getLabel()` (`CredentialFields.tsx:167-171`) truncates
at the first `(`, and line 248 calls it unconditionally — `label={getLabel(label ?? placeholder)}`
— so it clips an explicit `label` exactly like a derived placeholder. "Azure Directory (tenant)
ID" renders as "Azure Directory"; "Azure Application (client) ID" renders as "Azure Application".

In `src/pages/integrations/components/SettingsForm/CredentialFields.tsx`, change line 248 from:

```tsx
label={getLabel(label ?? placeholder)}
```

to:

```tsx
label={label ?? getLabel(placeholder)}
```

This makes an explicit `label` render verbatim (bypassing the heuristic), while a field with no
`label` still gets its placeholder truncated by `getLabel()` exactly as before — no other
credential type sets an explicit `label` today, so this is a behavior change only for the four
Sharepoint fields touched by this task.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.sharePointAuth.test.tsx`
Expected: PASS — all tests in the file, including the new one.

- [ ] **Step 5: Commit**

Commit `src/utils/settingsUIConfig.ts`, `CredentialFields.tsx`, and the test file together, per
the repository's existing commit convention.
