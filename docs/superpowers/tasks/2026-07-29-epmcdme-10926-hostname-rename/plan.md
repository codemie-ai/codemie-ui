# EPMCDME-10926 Hostname Rename — Test Coverage Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the two missing unit tests that assert the AzureDevOps `url` field carries `label: 'Hostname'` and a `required()` error message of `'Hostname is required'`.

**Architecture:** The rename is already committed. The existing `azuredevops credential fields` describe block in `CredentialFields.test.tsx` tests Yup validation logic only; it does not assert the `label` string or the error message text. Two tests are appended to that block. No production code changes.

**Tech Stack:** TypeScript, Yup, Vitest

## Global Constraints

- Commit message format: `EPMCDME-10926: Capital sentence` — first word after colon must start uppercase; enforced by Tekton CI.
- Do not modify `src/utils/settingsUIConfig.ts` or any component file — only `CredentialFields.test.tsx`.
- Test-first note: the rename is already in place, so these tests will pass immediately on first run. That is expected and acceptable for label-string coverage added after-the-fact.

---

### Task 1: Add label and required-message tests for the `url` field

**Test-first: no — rename already committed; tests pass immediately (label-string coverage, not logic)**

**Files:**
- Modify: `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` (append two `it` blocks inside the existing `azuredevops credential fields` describe, after line 445)

**Interfaces:**
- Consumes: `CREDENTIAL_UI_MAPPING` from `src/utils/settingsUIConfig.ts` (already imported in the test file)
- Produces: two new passing tests — `url field label is 'Hostname'` and `url required message is 'Hostname is required'`

- [ ] **Step 1: Append the two tests to the `azuredevops credential fields` describe block**

Open `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` and add the following two `it` blocks immediately before the closing `})` of the `azuredevops credential fields` describe (after the existing `'project has no validation (optional)'` test, currently at line 442–445):

```typescript
  it('url field label is Hostname', () => {
    const urlField = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).url
    expect(urlField.label).toBe('Hostname')
  })

  it('url required message is Hostname is required', () => {
    const { validation } = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).url
    expect(() => validation.validateSync('')).toThrow('Hostname is required')
  })
```

The final describe block will look like:

```typescript
describe('azuredevops credential fields', () => {
  it('lists fields in order: url, organization, project, token', () => {
    const keys = Object.keys(CREDENTIAL_UI_MAPPING.azuredevops.fields)
    expect(keys).toEqual(['url', 'organization', 'project', 'token'])
  })

  it('url rejects empty string', () => {
    const { validation } = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).url
    expect(validation.isValidSync('')).toBe(false)
    expect(validation.isValidSync('https://dev.azure.com')).toBe(true)
  })

  it('organization rejects empty string', () => {
    const { validation } = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).organization
    expect(validation.isValidSync('')).toBe(false)
    expect(validation.isValidSync('my-org')).toBe(true)
  })

  it('token rejects empty string', () => {
    const { validation } = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).token
    expect(validation.isValidSync('')).toBe(false)
    expect(validation.isValidSync('pat-secret-123')).toBe(true)
  })

  it('project has no validation (optional)', () => {
    const projectField = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).project
    expect(projectField.validation).toBeUndefined()
  })

  it('url field label is Hostname', () => {
    const urlField = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).url
    expect(urlField.label).toBe('Hostname')
  })

  it('url required message is Hostname is required', () => {
    const { validation } = (CREDENTIAL_UI_MAPPING.azuredevops.fields as any).url
    expect(() => validation.validateSync('')).toThrow('Hostname is required')
  })
})
```

- [ ] **Step 2: Run the target test file to confirm both new tests pass**

```bash
npm run test:unit -- --reporter=verbose src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
```

Expected: **28 passed** (26 existing + 2 new). All tests in the `azuredevops credential fields` describe show ✓.

- [ ] **Step 3: Commit**

```bash
git add src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
git commit -m "EPMCDME-10926: Add label and required-message tests for AzureDevOps url field"
```
