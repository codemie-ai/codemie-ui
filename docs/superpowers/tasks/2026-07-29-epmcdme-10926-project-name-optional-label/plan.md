# AzureDevOps Project Name Optional Placeholder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Indicate that the AzureDevOps Project Name field is optional by appending "(optional)" to its placeholder text.

**Architecture:** Option B — placeholder copy only. The credential form is schema-driven via `CREDENTIAL_UI_MAPPING` in `settingsUIConfig.ts`. The `project` field's `placeholder` value is shown inside the `<Input>` when the field is empty. `getLabel()` in `CredentialFields.tsx` strips `(` and everything after it before using the placeholder as a label, so the rendered **label** remains "Project Name"; the "(optional)" text appears only as placeholder copy while the field is unfilled. This matches the existing convention used by five webhook fields (e.g. `'Secure Header Name: Optional field, e.g. ...'`). No component changes.

**Tech Stack:** TypeScript, Vitest.

## Global Constraints

- Do NOT modify `src/store/appInfo.ts` or `src/store/__tests__/appInfo.test.ts` — out of scope.
- Do NOT modify `src/pages/integrations/components/SettingsForm/CredentialFields.tsx`.
- Commit message format: `EPMCDME-10926: Capital sentence` (enforced by CI).
- Branch: `EPMCDME-10926_ado-credentials-frontend` (already active).
- Test runner: `npm run test:unit`.

---

## File Map

| File | Change |
|---|---|
| `src/utils/settingsUIConfig.ts` | `placeholder: 'Project Name'` → `placeholder: 'Project Name (optional)'` on `azuredevops.fields.project` |
| `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` | Add one assertion inside existing `azuredevops credential fields` describe block |

---

### Task 1: Mark Project Name as optional via placeholder text

**Test-first:** yes — assert `projectField.placeholder === 'Project Name (optional)'`; currently fails because the value is `'Project Name'`.

**Files:**
- Modify: `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx:455` (append inside existing describe, before closing `})`)
- Modify: `src/utils/settingsUIConfig.ts:399` (project field definition)

**Interfaces:**
- Consumes: `CREDENTIAL_UI_MAPPING.azuredevops.fields.project` — currently `{ placeholder: 'Project Name' }`
- Produces: `CREDENTIAL_UI_MAPPING.azuredevops.fields.project` — becomes `{ placeholder: 'Project Name (optional)' }`

---

- [ ] **Step 1: Write the failing test**

  Open `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx`.
  Append inside the existing `describe('azuredevops credential fields', () => { … })` block, after line 455 (the last `it(…)`), before the closing `})`:

  ```typescript
  it('project placeholder indicates optional', () => {
    const projectField = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).project
    expect(projectField.placeholder).toBe('Project Name (optional)')
  })
  ```

- [ ] **Step 2: Run test to verify it fails (RED)**

  ```bash
  npm run test:unit -- --reporter=verbose src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
  ```

  Expected: new test fails with `AssertionError: expected 'Project Name' to be 'Project Name (optional)'`. All 7 pre-existing tests pass.

- [ ] **Step 3: Update placeholder in settingsUIConfig.ts**

  Open `src/utils/settingsUIConfig.ts`. Find line 399:
  ```typescript
      project: { placeholder: 'Project Name' },
  ```
  Change it to:
  ```typescript
      project: { placeholder: 'Project Name (optional)' },
  ```

- [ ] **Step 4: Run test to verify it passes (GREEN)**

  ```bash
  npm run test:unit -- --reporter=verbose src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
  ```

  Expected: all 8 tests in `azuredevops credential fields` pass. Overall file: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/utils/settingsUIConfig.ts \
          src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
  git commit -m "EPMCDME-10926: Mark AzureDevOps Project Name field as optional in placeholder"
  ```
