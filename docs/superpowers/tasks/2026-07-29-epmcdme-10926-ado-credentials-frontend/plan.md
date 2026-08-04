# EPMCDME-10926 Frontend — AzureDevOps Credential Field Order and Validation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the AzureDevOps credential form fields to `url → organization → project → token` and enforce required validation on `url`, `organization`, and `token`.

**Architecture:** The credential form is fully schema-driven. `SettingsForm.tsx` builds both render order and the Yup validation schema generically from `CREDENTIAL_UI_MAPPING` in `settingsUIConfig.ts`. Only that config object needs to change; no component code is touched.

**Tech Stack:** TypeScript, Yup, Vitest

## Global Constraints

- Commit message format: `EPMCDME-10926: Capital sentence` — first word after colon must start with uppercase; enforced by Tekton CI.
- Do not modify `src/store/appInfo.ts` or any component file — out of scope.
- Preserve all existing field properties (`label`, `placeholder`, `sensitive`, `defaultValue`).

---

### Task 1: Reorder fields and add required validation for AzureDevOps credentials

**Test-first: yes — field-order and validation tests fail before `settingsUIConfig.ts` is changed**

**Files:**
- Modify: `src/utils/settingsUIConfig.ts:383-398`
- Modify: `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` (append new describe block)

**Interfaces:**
- Consumes: `CREDENTIAL_UI_MAPPING` exported from `src/utils/settingsUIConfig.ts`
- Produces: `azuredevops.fields` with key order `['url', 'organization', 'project', 'token']`; `url`/`organization`/`token` each carry a Yup schema that rejects empty string; `project` has no `validation` property

- [ ] **Step 1: Append the failing tests to `CredentialFields.test.tsx`**

Add the following block at the end of the file (after the last closing `}` of the last `describe`):

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
})
```

- [ ] **Step 2: Run the new tests to confirm they fail (RED)**

```bash
npm run test:unit -- --reporter=verbose src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
```

Expected failures:
- `lists fields in order` — FAIL because current order is `url, project, organization, token`
- `url rejects empty string` — FAIL because `url` has no `validation` property (`undefined.isValidSync` throws)
- `organization rejects empty string` — FAIL for the same reason
- `token rejects empty string` — FAIL for the same reason
- `project has no validation` — PASS (project already has no validation — this one passes now)

- [ ] **Step 3: Update the `azuredevops` entry in `src/utils/settingsUIConfig.ts`**

Replace the entire `azuredevops` block (lines 383–398):

```typescript
  azuredevops: {
    defaultUrl: AZUREDEVOPS_URL,
    testable: false,
    displayName: 'AzureDevOps',
    serverEnum: 'AzureDevOps',
    fields: {
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('azuredevops', 'url'),
        defaultValue: AZUREDEVOPS_URL,
        validation: Yup.string().required('URL is required').url('Value must be a valid URL'),
      },
      organization: {
        placeholder: 'Organization Name',
        validation: Yup.string().required('Organization is required'),
      },
      project: { placeholder: 'Project Name' },
      token: {
        placeholder: 'Personal Access Token (PAT)',
        sensitive: true,
        validation: Yup.string().required('Personal Access Token is required'),
      },
    },
  },
```

- [ ] **Step 4: Run the new tests to confirm they all pass (GREEN)**

```bash
npm run test:unit -- --reporter=verbose src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
```

Expected: all 5 new tests PASS, all pre-existing tests in this file PASS.

- [ ] **Step 5: Run the full unit test suite to check for regressions**

```bash
npm run test:unit
```

Expected: all suites PASS.

- [ ] **Step 6: Run lint and typecheck**

```bash
npm run lint && npm run typecheck
```

Expected: both exit 0 with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/utils/settingsUIConfig.ts \
        src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
git commit -m "EPMCDME-10926: Reorder AzureDevOps credential fields and add required validation"
```
