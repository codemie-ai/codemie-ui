# xWiki Datasource Type (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This run executes inline** per `sdlc-standard` Stage 5 — TDD in the current conversation, no per-task subagents.

**Goal:** Add xWiki as a selectable knowledge-base datasource type in the CodeMie UI, wired end to end from creation form to details view.

**Architecture:** Mirror the existing Confluence datasource type field-for-field, substituting Confluence's single required `cql` with xWiki's required `space` plus optional `wiki` (backend default `"xwiki"`). Everything else — credential selection, embeddings, cron scheduling, `project_space_visible` — is inherited from the shared form scaffolding. No new abstractions and no redesign of the datasource UI.

**Tech Stack:** React 18 + TypeScript, react-hook-form + Yup (`yupResolver`), Valtio stores, Tailwind, Vitest (two projects: `unit` and `integration`), Testing Library.

## Global Constraints

- Branch is `EPMCDME-13142_ui-xwiki-datasource`, already checked out. **Do not create another branch.**
- Commit message format is enforced by Tekton CI: `EPMCDME-XXXX: Capital sentence`. First word after the colon must start uppercase. Every commit in this plan uses `EPMCDME-13142: ...`.
- **Never commit `*.diff` files.** Stage 6 writes `code-review.diff` / `code-review-check.diff` into the task directory; they must stay untracked.
- Every new `.ts` / `.tsx` file needs the Apache-2.0 license header (CI gate: `npm run license-headers:check`). Copy the 14-line block verbatim from any existing source file.
- Code, comments and commit messages in English. No comments unless the *why* is non-obvious.
- Form field names are **`xwikiSpace`** and **`xwikiWiki`** — never bare `space` / `wiki` in `FormValues`. They map to the API's `space` / `wiki` only at request-build time.
- Display label is **`xWiki`** (lowercase x), never `Xwiki`.
- API contract is fixed and live-verified; see `technical-analysis.md` → "Live contract verification". Do not invent request shapes.
- Verification commands: `npm run test:unit`, `npm run test:integration`, `npm run lint`, `npm run typecheck`.

---

## File Structure

**Created (2 files):**

| File | Responsibility |
|---|---|
| `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeXWiki.tsx` | The xWiki-specific form fields: Space, Wiki, integration selector, embeddings model. Single responsibility, mirrors `IndexTypeConfluence.tsx`. |
| `src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts` | Unit coverage for the reindex-capability predicates. |

**Modified (14 files):** see the per-task **Files** blocks. Grouped by responsibility:
foundation (`constants/dataSources.ts`, `utils/helpers.ts`, `utils/indexing.ts`, `types/entity/dataSource.ts`) →
form state (`useEditPopupForm.ts`, `useEditPopup.ts`) →
form UI (`IndexTypeField/index.ts`, `DataSourceForm.tsx`) →
request path (`useCreateIndex.ts`, `store/dataSources.ts`) →
read paths (`DataSourceDetails.tsx`, `dataSourceUtils.ts`, `DataSourceEditPage.tsx`, `DataSourceTypeSelector.tsx`) →
credential copy (`utils/settingsUIConfig.ts`).

---

### Task 1: Foundation — constant, label, predicate, types

Adds the `XWIKI` constant and everything that reads directly off it. Nothing renders yet; this task exists separately because the constant is what silently enables the type selector, the list filter, and the cron field, and those side effects deserve their own gate.

**Files:**
- Modify: `src/constants/dataSources.ts:22-35`
- Modify: `src/utils/helpers.ts:114-142`
- Modify: `src/utils/indexing.ts:44-46`
- Modify: `src/types/entity/dataSource.ts:112-139` and `:171-185`
- Test: `src/utils/__tests__/helpers.test.ts`
- Test: `src/utils/__tests__/indexing.test.ts` (create)

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `INDEX_TYPES.XWIKI: 'xwiki'` — the literal every later task switches on.
  - `isXWikiIndex(info: { index_type: string }): boolean`
  - `humanize('xwiki') === 'xWiki'`
  - `DataSource['xwiki']` and `DataSourceDetailsResponse['xwiki']`, both `{ space: string; wiki?: string } | undefined`.

**Test-first: yes** — `humanize('xwiki')` returns `'Xwiki'` today, and `isXWikiIndex` does not exist, so both specs fail before the implementation lands.

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/__tests__/helpers.test.ts` (and add `humanize` to the existing import from `@/utils/helpers`):

```ts
describe('humanize', () => {
  it('renders the xwiki index type as xWiki', () => {
    expect(humanize('xwiki')).toBe('xWiki')
  })

  it('leaves the existing special cases intact', () => {
    expect(humanize('xray')).toBe('X-ray')
    expect(humanize('sharepoint')).toBe('SharePoint')
    expect(humanize('svn')).toBe('SVN')
  })

  it('capitalizes each underscore-separated word by default', () => {
    expect(humanize('azure_devops_wiki')).toBe('Azure Devops Wiki')
  })
})
```

Create `src/utils/__tests__/indexing.test.ts` (remember the license header):

```ts
import { describe, it, expect } from 'vitest'

import { getFullIndexType, getIndexTypeCode, isXWikiIndex } from '@/utils/indexing'

describe('isXWikiIndex', () => {
  it('matches the xwiki knowledge base index type', () => {
    expect(isXWikiIndex({ index_type: 'knowledge_base_xwiki' })).toBe(true)
  })

  it('does not match other knowledge base types', () => {
    expect(isXWikiIndex({ index_type: 'knowledge_base_confluence' })).toBe(false)
    expect(isXWikiIndex({ index_type: 'knowledge_base_azure_devops_wiki' })).toBe(false)
  })
})

describe('xwiki index type code round trip', () => {
  it('maps xwiki to knowledge_base_xwiki and back', () => {
    expect(getFullIndexType('xwiki')).toBe('knowledge_base_xwiki')
    expect(getIndexTypeCode('knowledge_base_xwiki')).toBe('xwiki')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:unit -- src/utils/__tests__/helpers.test.ts src/utils/__tests__/indexing.test.ts`
Expected: FAIL — `expected 'Xwiki' to be 'xWiki'`, and `isXWikiIndex is not a function`.

- [ ] **Step 3: Add the constant**

In `src/constants/dataSources.ts`, inside `INDEX_TYPES`, directly after the `CONFLUENCE` line:

```ts
  CONFLUENCE: 'confluence',
  XWIKI: 'xwiki',
```

- [ ] **Step 4: Add the humanize special case**

In `src/utils/helpers.ts`, inside `humanize`, after the existing `sharepoint` block:

```ts
  // Special case for xwiki to display as xWiki
  if (string.toLowerCase() === 'xwiki') {
    return 'xWiki'
  }
```

- [ ] **Step 5: Add the index predicate**

In `src/utils/indexing.ts`, directly after `isConfluenceIndex`:

```ts
export const isXWikiIndex = (info: IndexInfo): boolean => {
  return info.index_type.includes(INDEX_TYPES.XWIKI)
}
```

- [ ] **Step 6: Add the response types**

In `src/types/entity/dataSource.ts`, add to `interface DataSource` (after the `azure_devops_work_item` block) **and** to `interface DataSourceDetailsResponse` (after the `azure_devops_work_item: any` line):

```ts
  xwiki?: {
    space: string
    wiki?: string
  }
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run test:unit -- src/utils/__tests__/helpers.test.ts src/utils/__tests__/indexing.test.ts`
Expected: PASS.

- [ ] **Step 8: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/constants/dataSources.ts src/utils/helpers.ts src/utils/indexing.ts \
        src/types/entity/dataSource.ts src/utils/__tests__/helpers.test.ts \
        src/utils/__tests__/indexing.test.ts
git commit -m "EPMCDME-13142: Add xWiki index type constant, label and predicate"
```

---

### Task 2: Form state — validation, defaults, edit prefill

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts:46-51` (error constant), `:177-191` (schema), `:193-208` (`setting_id` list), `:332-372` (create defaults), `:384-443` (edit prefill)
- Test: `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts`

**Interfaces:**
- Consumes: `INDEX_TYPES.XWIKI` (Task 1); `DataSourceDetailsResponse['xwiki']` (Task 1).
- Produces: `FormValues['xwikiSpace']: string | undefined`, `FormValues['xwikiWiki']: string | undefined`. Task 4 reads both when building the request. `setting_id` becomes required for `INDEX_TYPES.XWIKI`, surfacing the existing message `'Integration is required for this data source type'`.

**Test-first: yes** — `editingSchema.validate` currently resolves for an xWiki value object with no space; the new spec fails with "expected promise to reject".

- [ ] **Step 1: Write the failing test**

Append to `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts`:

```ts
describe('editingSchema — xWiki space validation', () => {
  const baseXWiki = {
    indexType: INDEX_TYPES.XWIKI,
    projectName: 'test-project',
    description: 'test description',
    projectSpaceVisible: true,
    isEditing: true,
    guardrail_assignments: [],
    setting_id: 'setting-1',
  }

  it('passes when space is provided', async () => {
    await expect(
      editingSchema.validate({ ...baseXWiki, xwikiSpace: 'KB' }, { abortEarly: false })
    ).resolves.toBeTruthy()
  })

  it('fails when space is missing', async () => {
    await expect(
      editingSchema.validate({ ...baseXWiki, xwikiSpace: '' }, { abortEarly: false })
    ).rejects.toThrow('Space is required')
  })

  it('treats wiki as optional — the backend defaults it to "xwiki"', async () => {
    await expect(
      editingSchema.validate(
        { ...baseXWiki, xwikiSpace: 'KB', xwikiWiki: '' },
        { abortEarly: false }
      )
    ).resolves.toBeTruthy()
  })

  it('requires an integration for xWiki', async () => {
    await expect(
      editingSchema.validate(
        { ...baseXWiki, xwikiSpace: 'KB', setting_id: '' },
        { abortEarly: false }
      )
    ).rejects.toThrow('Integration is required for this data source type')
  })

  it('does not require space for other index types', async () => {
    await expect(
      editingSchema.validate(
        { ...baseValidObject, uploadedFiles: ['a.pdf'], xwikiSpace: '' },
        { abortEarly: false }
      )
    ).resolves.toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts`
Expected: FAIL — the "fails when space is missing" and "requires an integration" cases resolve instead of rejecting.

- [ ] **Step 3: Add the error constant and schema rules**

In `useEditPopupForm.ts`, beside the existing `CQL_REQUIRED_ERR`:

```ts
const SPACE_REQUIRED_ERR = 'Space is required'
```

Directly after the `cql` rule in `baseValidationSchema`:

```ts
  xwikiSpace: Yup.string().when('indexType', {
    is: (indexType) => indexType === INDEX_TYPES.XWIKI,
    then: (schema) => schema.required(SPACE_REQUIRED_ERR),
  }),

  xwikiWiki: Yup.string().optional(),
```

- [ ] **Step 4: Require the integration**

In the same file, add `INDEX_TYPES.XWIKI` to the array inside the `setting_id` rule:

```ts
      return [
        INDEX_TYPES.JIRA,
        INDEX_TYPES.XRAY,
        INDEX_TYPES.CONFLUENCE,
        INDEX_TYPES.XWIKI,
        INDEX_TYPES.AZURE_DEVOPS_WIKI,
        INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM,
        INDEX_TYPES.GOOGLE,
      ].includes(indexType)
```

- [ ] **Step 5: Add create-mode defaults**

In the `useForm({ defaultValues: { … } })` block, after the `cql: ''` line:

```ts
      xwikiSpace: '',
      xwikiWiki: '',
```

- [ ] **Step 6: Add edit-mode prefill**

In `resetInitFormValues`'s `mergedValues`, after the `cql:` line:

```ts
      xwikiSpace: defaults?.xwiki?.space ?? '',
      xwikiWiki: defaults?.xwiki?.wiki ?? '',
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm run test:unit -- src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/dataSources/components/DataSourceForm/hooks/useEditPopupForm.ts \
        src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopupForm.validation.test.ts
git commit -m "EPMCDME-13142: Add xWiki space and wiki form validation"
```

---

### Task 3: Form UI and credential wiring

The task the user actually sees. Includes `useEditPopup` because without the `filteredSettings` key the integration dropdown never renders — the component and its credential source are one deliverable.

**Files:**
- Create: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeXWiki.tsx`
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/index.ts`
- Modify: `src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx:503-521` (insert after the Confluence branch)
- Modify: `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopup.ts:50-63` and `:112-125`
- Test: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

**Interfaces:**
- Consumes: `INDEX_TYPES.XWIKI` (Task 1); `xwikiSpace` / `xwikiWiki` form fields (Task 2).
- Produces: `IndexTypeField.XWiki` — a React component taking `{ errors, hasNoSettings, value, projectName, isDropdownShown, control, filteredSettings, embeddingModels, onIntegrationCreated? }`, the same prop bag as `IndexTypeField.AzureDevOpsWiki`. Renders inputs labelled `Space` and `Wiki (optional)` and an integration selector labelled `Integration for xWiki`.

**Test-first: yes** — selecting "xWiki" in the type dropdown currently renders the provider fallback, so the Space field is absent.

- [ ] **Step 1: Write the failing test**

Append to `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`:

```tsx
const selectXWikiType = async (user: ReturnType<typeof userEvent.setup>) => {
  await selectAutocompleteOption('Datasource Type', 'xWiki', { user })
}

const mockXWikiCredential = () => {
  mockAPI('GET', 'v1/settings/user/available', [
    {
      id: 'xwiki-setting-1',
      alias: 'my-xwiki',
      credential_type: 'XWIKI',
      project_name: 'test-project',
      is_global: true,
    },
  ])
}

describe('DataSourceCreatePage - xWiki', () => {
  beforeEach(() => {
    mockFormInitAPIs()
    mockXWikiCredential()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows Space, Wiki and the xWiki integration selector after selecting the xWiki type', async () => {
    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectXWikiType(user)

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Space' })).toBeInTheDocument()
    })
    expect(screen.getByRole('textbox', { name: 'Wiki (optional)' })).toBeInTheDocument()
    expect(screen.getByText('Integration for xWiki')).toBeInTheDocument()
  })

  it('shows the space required error when saving without a space', async () => {
    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectXWikiType(user)

    const descInput = screen.getByRole('textbox', { name: 'Description' })
    await user.clear(descInput)
    await user.type(descInput, 'An xWiki datasource')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Space is required')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:integration -- src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "textbox" and name "Space"`.

- [ ] **Step 3: Create the form component**

Create `src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeXWiki.tsx` (with the Apache-2.0 header above the imports):

```tsx
import { FC } from 'react'
import { Controller } from 'react-hook-form'

import FormAutocomplete from '@/components/form/FormAutocomplete'
import Input from '@/components/form/Input'

import IntegrationSection from './shared/IntegrationSection'
import { useIntegrationManager } from './shared/useIntegrationManager'

interface Props {
  errors
  hasNoSettings
  value
  projectName
  isDropdownShown
  control
  filteredSettings
  embeddingModels
  onIntegrationCreated?: () => void
}

const IndexTypeXWiki: FC<Props> = ({
  errors,
  hasNoSettings,
  value,
  projectName,
  isDropdownShown,
  control,
  filteredSettings,
  embeddingModels,
  onIntegrationCreated,
}) => {
  const {
    showIntegrationPopup,
    handleIntegrationSuccess,
    handleIntegrationCancel,
    openIntegrationPopup,
  } = useIntegrationManager({ onIntegrationCreated })

  return (
    <div data-onboarding="datasource-xwiki-fields">
      <Controller
        name="xwikiSpace"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="xwikiSpace"
            name="xwikiSpace"
            className="w-full"
            rootClass="mb-3"
            label="Space"
            placeholder='Space key to index, e.g.: "KB"'
            error={errors.xwikiSpace?.message}
          />
        )}
      />

      <Controller
        name="xwikiWiki"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            id="xwikiWiki"
            name="xwikiWiki"
            className="w-full"
            rootClass="mb-3"
            label="Wiki (optional)"
            placeholder='Wiki identifier, defaults to "xwiki"'
            error={errors.xwikiWiki?.message}
          />
        )}
      />

      <IntegrationSection
        hasNoSettings={hasNoSettings(value)}
        isDropdownShown={isDropdownShown(value)}
        datasourceType={value}
        projectName={projectName}
        control={control}
        errors={errors}
        filteredSettings={filteredSettings}
        showIntegrationPopup={showIntegrationPopup}
        onOpenIntegrationPopup={openIntegrationPopup}
        onIntegrationSuccess={handleIntegrationSuccess}
        onIntegrationCancel={handleIntegrationCancel}
        integrationLabel="Integration for xWiki"
        integrationPlaceholder="Integration for xWiki"
      />

      <FormAutocomplete
        name="embeddingsModel"
        control={control}
        id="embeddingsModel"
        label="Model used for embeddings"
        options={embeddingModels}
        placeholder="Embeddings Model Type"
      />
    </div>
  )
}

export default IndexTypeXWiki
```

No `credentialType` prop is passed to `IntegrationSection` — the datasource type string `'xwiki'` already equals the credential type key, exactly as it does for Confluence and Jira.

- [ ] **Step 4: Register the component**

In `IndexTypeField/index.ts`, add the import (alphabetical, after `Svn`) and the registry entry:

```ts
import XWiki from './IndexTypeXWiki'
```

```ts
const IndexTypeField = {
  Git,
  Svn,
  Google,
  File,
  Confluence,
  XWiki,
  Jira,
  Xray,
  AzureDevOpsWiki,
  AzureDevOpsWorkItem,
  SharePoint,
  Provider,
}
```

- [ ] **Step 5: Add the render branch**

In `DataSourceForm.tsx`, directly after the closing `)}` of the `INDEX_TYPES.CONFLUENCE` block:

```tsx
              {field.value === INDEX_TYPES.XWIKI && (
                <IndexTypeField.XWiki
                  {...{
                    errors,
                    control,
                    projectName,
                    hasNoSettings,
                    isDropdownShown,
                    filteredSettings,
                    value: field.value,
                    embeddingModels,
                    onIntegrationCreated: () => {
                      userSettingsStore.resetIsSettingsIndexed()
                      userSettingsStore.indexSettings()
                    },
                  }}
                />
              )}
```

- [ ] **Step 6: Wire the credential source**

In `useEditPopup.ts`, add to the `filteredSettings` memo after the Confluence entry:

```ts
      [INDEX_TYPES.XWIKI]: getSettingOptions(INDEX_TYPES.XWIKI),
```

and add xWiki to the single-credential auto-select condition:

```ts
        indexType === INDEX_TYPES.CONFLUENCE ||
        indexType === INDEX_TYPES.XWIKI ||
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm run test:integration -- src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/dataSources/components/DataSourceForm/IndexTypeField/IndexTypeXWiki.tsx \
        src/pages/dataSources/components/DataSourceForm/IndexTypeField/index.ts \
        src/pages/dataSources/components/DataSourceForm/DataSourceForm.tsx \
        src/pages/dataSources/components/DataSourceForm/hooks/useEditPopup.ts \
        src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx
git commit -m "EPMCDME-13142: Add xWiki datasource creation form"
```

---

### Task 4: Request path — health check, create and update

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/hooks/useCreateIndex.ts:85-94` (health-check options), `:122-149` (switch), and a new function after `createOrUpdateConfluenceIndex` (`:272`)
- Modify: `src/store/dataSources.ts:306-342` (widen health-check options) and after `:369` (new create method)
- Test: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

**Interfaces:**
- Consumes: `xwikiSpace` / `xwikiWiki` (Task 2); the rendered form (Task 3).
- Produces: `dataSourceStore.createKBIndexXWiki(indexConfig: any)` → `POST v1/index/knowledge_base/xwiki`. Edit mode reuses the existing generic `dataSourceStore.updateKBIndex('xwiki', request, isReindex)` → `PUT v1/index/knowledge_base/xwiki`.

**Test-first: yes** — no POST is issued for xWiki today; it falls through the switch to `createOrUpdateProviderIndex` and fails on missing `indexMetadata`.

- [ ] **Step 1: Write the failing test**

Append inside the `describe('DataSourceCreatePage - xWiki', …)` block:

```tsx
  it('posts space and wiki to the xwiki knowledge base endpoint', async () => {
    mockAPI('POST', 'v1/index/health', { implemented: false })
    mockAPI('POST', 'v1/index/knowledge_base/xwiki', { id: 'ds-xwiki-1' })

    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectXWikiType(user)

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(nameInput)
    await user.type(nameInput, 'my-xwiki-source')

    const descInput = screen.getByRole('textbox', { name: 'Description' })
    await user.clear(descInput)
    await user.type(descInput, 'An xWiki datasource')

    await user.type(screen.getByRole('textbox', { name: 'Space' }), 'KB')
    await user.type(screen.getByRole('textbox', { name: 'Wiki (optional)' }), 'xwiki')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/index/knowledge_base/xwiki'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"space":"KB"'),
        })
      )
    })

    const xwikiPost = vi
      .mocked(global.fetch)
      .mock.calls.find(
        ([url, init]) =>
          String(url).includes('v1/index/knowledge_base/xwiki') &&
          (init as RequestInit)?.method === 'POST'
      )
    const body = JSON.parse((xwikiPost?.[1] as RequestInit).body as string)
    expect(body).toMatchObject({
      name: 'my-xwiki-source',
      description: 'An xWiki datasource',
      space: 'KB',
      wiki: 'xwiki',
      setting_id: 'xwiki-setting-1',
    })
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:integration -- src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx -t "posts space and wiki"`
Expected: FAIL — no fetch call matching `v1/index/knowledge_base/xwiki`.

- [ ] **Step 3: Add the store create method**

In `src/store/dataSources.ts`, directly after `createKBIndexConfluence`:

```ts
  createKBIndexXWiki(indexConfig: any) {
    return handleIndexResponse(api.post('v1/index/knowledge_base/xwiki', indexConfig))
  },
```

- [ ] **Step 4: Widen the health-check options**

In the same file, add two entries to the `options` parameter type of `healthCheckDatasource`:

```ts
      space?: string | null
      wiki?: string | null
```

and two conditional spreads inside `requestData`, after the `cql` line:

```ts
        ...(options.space != null && { space: options.space }),
        ...(options.wiki != null && { wiki: options.wiki }),
```

The backend's `DatasourceHealthCheckRequest` already accepts both — verified against the live `openapi.json`.

- [ ] **Step 5: Wire the health-check payload**

In `useCreateIndex.ts`, add to the `healthCheckOptions` map after the `CONFLUENCE` entry:

```ts
          [INDEX_TYPES.XWIKI]: { space: data.xwikiSpace, wiki: data.xwikiWiki },
```

- [ ] **Step 6: Add the request builder and switch case**

In `useCreateIndex.ts`, directly after `createOrUpdateConfluenceIndex`:

```ts
  const createOrUpdateXWikiIndex = async (values: FormValues) => {
    const { isEditMode, isReindex, hasProjectChanged } = getIndexEditContext(index, values)

    const request = {
      ...getBaseRequestFields(values, index, hasProjectChanged),
      space: values.xwikiSpace,
      wiki: values.xwikiWiki || undefined,
      setting_id: values.setting_id,
    }

    if (isEditMode) {
      return dataSourceStore.updateKBIndex(INDEX_TYPES.XWIKI, request, isReindex)
    }

    return dataSourceStore.createKBIndexXWiki(request)
  }
```

`wiki` collapses an empty string to `undefined` so the key is omitted and the backend default `"xwiki"` applies — the schema requires `minLength: 1` when the key is present.

Add the switch case after the `CONFLUENCE` case:

```ts
          case INDEX_TYPES.XWIKI:
            return createOrUpdateXWikiIndex(values)
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm run test:integration -- src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`
Expected: PASS (all four xWiki specs).

- [ ] **Step 8: Commit**

```bash
git add src/pages/dataSources/components/DataSourceForm/hooks/useCreateIndex.ts \
        src/store/dataSources.ts \
        src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx
git commit -m "EPMCDME-13142: Wire xWiki datasource create, update and health check"
```

---

### Task 5: Scheduling coverage

`shouldShowScheduling` is a **denylist** (`blockedReindexingIndexTypes = {FILE, PROVIDER}`) plus an `INDEX_TYPES` membership test, so Task 1 switched the cron field on for xWiki as a side effect. That default is intended, but nothing declares it. This task pins it down.

**Files:**
- Test: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–4. No production code changes.
- Produces: nothing consumed downstream.

**Test-first: no** — this is a characterization test. The behavior is already correct once Tasks 1–4 land; the point is to lock it in so a later change to `blockedReindexingIndexTypes` or `shouldShowScheduling` cannot silently drop xWiki scheduling. If it fails on first run, that is a real defect in Tasks 1–4, not an expected RED.

- [ ] **Step 1: Write the test**

Add `selectDropdownOption` to the existing import from `@/test-utils/component-interactions`, then append inside the `describe('DataSourceCreatePage - xWiki', …)` block:

```tsx
  it('shows the schedule field for xWiki and sends the selected cron expression', async () => {
    mockAPI('POST', 'v1/index/health', { implemented: false })
    mockAPI('POST', 'v1/index/knowledge_base/xwiki', { id: 'ds-xwiki-2' })

    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectXWikiType(user)

    await waitFor(() => {
      expect(screen.getByText('Expression')).toBeInTheDocument()
    })

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(nameInput)
    await user.type(nameInput, 'scheduled-xwiki')

    const descInput = screen.getByRole('textbox', { name: 'Description' })
    await user.clear(descInput)
    await user.type(descInput, 'A scheduled xWiki datasource')

    await user.type(screen.getByRole('textbox', { name: 'Space' }), 'KB')

    await selectDropdownOption('Expression', 'Daily at midnight', { user })

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('v1/index/knowledge_base/xwiki'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"cron_expression":"0 0 * * *"'),
        })
      )
    })
  })
```

- [ ] **Step 2: Run the test**

Run: `npm run test:integration -- src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx -t "schedule field"`
Expected: PASS. If it fails, fix the defect it exposes before continuing — do not weaken the assertion.

- [ ] **Step 3: Commit**

```bash
git add src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx
git commit -m "EPMCDME-13142: Cover xWiki reindex scheduling behaviour"
```

---

### Task 6: Details view

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceDetails.tsx:520-527` (insert after the Confluence row)
- Test: `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx`

**Interfaces:**
- Consumes: `INDEX_TYPES.XWIKI` and `DataSourceDetailsResponse['xwiki']` (Task 1).
- Produces: nothing consumed downstream.

**Test-first: yes** — the rows do not exist, so `getByText('Space:')` throws.

- [ ] **Step 1: Write the failing test**

Append to `src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx`:

```tsx
describe('DataSourceDetails — xWiki properties', () => {
  const xwikiDataSource: DataSourceDetailsResponse = {
    ...dataSource,
    index_type: 'knowledge_base_xwiki',
    xwiki: { space: 'KB', wiki: 'xwiki' },
  }

  it('renders the space and wiki rows', () => {
    const { getByText } = render(<DataSourceDetails dataSource={xwikiDataSource} />)
    expect(getByText('Space:')).toBeInTheDocument()
    expect(getByText('KB')).toBeInTheDocument()
    expect(getByText('Wiki:')).toBeInTheDocument()
  })

  it('falls back to the default wiki name when none is stored', () => {
    const { getByText } = render(
      <DataSourceDetails
        dataSource={{ ...xwikiDataSource, xwiki: { space: 'KB' } }}
      />
    )
    expect(getByText('xwiki')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx`
Expected: FAIL — `Unable to find an element with the text: Space:`.

- [ ] **Step 3: Add the detail rows**

In `DataSourceDetails.tsx`, directly after the `INDEX_TYPES.CONFLUENCE` block:

```tsx
                {indexType === INDEX_TYPES.XWIKI && (
                  <>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Space:</span>
                      <span className={styles.propertyValue}>
                        {dataSource.xwiki?.space || 'N/A'}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.propertyLabel}>Wiki:</span>
                      <span className={styles.propertyValue}>
                        {dataSource.xwiki?.wiki || 'xwiki'}
                      </span>
                    </div>
                  </>
                )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:unit -- src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/dataSources/components/DataSourceDetails.tsx \
        src/pages/dataSources/components/__tests__/DataSourceDetails.test.tsx
git commit -m "EPMCDME-13142: Show xWiki space and wiki in datasource details"
```

---

### Task 7: Reindex and edit predicates

Three opt-in allowlists. Miss any of them and xWiki datasources are created but cannot be reindexed or edited — the silent half-wiring this ticket's design flagged as the main risk.

**Files:**
- Modify: `src/pages/dataSources/utils/dataSourceUtils.ts:75` (`canFullReindex`), `:110` (`canForceReindex`), `:181-189` (`performFullReindex`)
- Modify: `src/pages/dataSources/DataSourceEditPage.tsx:57`
- Test: `src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts` (create)

**Interfaces:**
- Consumes: `isXWikiIndex` (Task 1).
- Produces: nothing consumed downstream.

**Test-first: yes** — `canFullReindex` currently ends in `return !isKBIndex(item)`, which is `false` for `knowledge_base_xwiki`, so both predicates return `false`.

- [ ] **Step 1: Write the failing test**

Create `src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts` (with the license header):

```ts
import { describe, it, expect, vi } from 'vitest'

import { DataSource } from '@/types/entity/dataSource'

import { canFullReindex, canForceReindex } from '../dataSourceUtils'

vi.mock('@/utils/entity', () => ({ canEdit: () => true }))

const buildXWikiDataSource = (overrides: Partial<DataSource> = {}): DataSource =>
  ({
    id: 'ds-1',
    index_type: 'knowledge_base_xwiki',
    project_name: 'test-project',
    repo_name: 'my-xwiki-source',
    completed: true,
    error: false,
    xwiki: { space: 'KB', wiki: 'xwiki' },
    ...overrides,
  } as DataSource)

describe('xWiki reindex capabilities', () => {
  it('allows a full reindex of a completed xWiki datasource', () => {
    expect(canFullReindex(buildXWikiDataSource())).toBe(true)
  })

  it('allows a full reindex of a failed xWiki datasource', () => {
    expect(canFullReindex(buildXWikiDataSource({ completed: false, error: true }))).toBe(true)
  })

  it('allows a force reindex while indexing is still running', () => {
    expect(canForceReindex(buildXWikiDataSource({ completed: false, error: false }))).toBe(true)
  })

  it('does not offer a force reindex once indexing has completed', () => {
    expect(canForceReindex(buildXWikiDataSource({ completed: true }))).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:unit -- src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts`
Expected: FAIL — `expected false to be true` on the first three cases.

- [ ] **Step 3: Add xWiki to both predicates**

In `dataSourceUtils.ts`, import `isXWikiIndex` from `@/utils/indexing`, then add a line to `canFullReindex` after the Confluence line:

```ts
  if (isConfluenceIndex(item)) return true
  if (isXWikiIndex(item)) return true
```

and the same line in `canForceReindex`, again after its Confluence line.

- [ ] **Step 4: Add the full-reindex branch**

In `performFullReindex`, add a branch after the `isConfluenceIndex` branch:

```ts
  } else if (isXWikiIndex(item)) {
    updateKBIndex(
      item.index_type,
      {
        name: item.repo_name,
        project_name: item.project_name,
      },
      true
    )
```

`space` and `wiki` are omitted deliberately — the `PUT` schema makes both optional and the backend keeps the stored values, matching how Confluence reindexes without resending `cql`.

- [ ] **Step 5: Allow editing**

In `DataSourceEditPage.tsx`, import `isXWikiIndex` and add to the predicate at line 57:

```ts
    if (isConfluenceIndex(item)) return true
    if (isXWikiIndex(item)) return true
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:unit -- src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/dataSources/utils/dataSourceUtils.ts \
        src/pages/dataSources/DataSourceEditPage.tsx \
        src/pages/dataSources/utils/__tests__/dataSourceUtils.test.ts
git commit -m "EPMCDME-13142: Enable reindex and edit actions for xWiki datasources"
```

---

### Task 8: NEW badge and credential help copy

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceTypeSelector.tsx:60-70`
- Modify: `src/utils/settingsUIConfig.ts:671-703`
- Test: `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`

**Interfaces:**
- Consumes: `INDEX_TYPES.XWIKI` (Task 1).
- Produces: nothing consumed downstream.

**Test-first: yes** for the badge — the `NEW` chip is not rendered for xWiki today. The credential copy is static configuration with no behavior to assert; it is verified by reading the integrations page during Stage 7 feature verification.

- [ ] **Step 1: Write the failing test**

Append inside the `describe('DataSourceCreatePage - xWiki', …)` block:

```tsx
  it('marks the xWiki option with a NEW badge in the type selector', async () => {
    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()

    await openAutocompleteDropdown('Datasource Type', { user })

    const option = await screen.findByText('xWiki')
    expect(option.parentElement).toHaveTextContent('NEW')
  })
```

Add `openAutocompleteDropdown` to the existing import from `@/test-utils/component-interactions`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:integration -- src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx -t "NEW badge"`
Expected: FAIL — the option's parent has no `NEW` text.

- [ ] **Step 3: Add the badge**

In `DataSourceTypeSelector.tsx`, extend the badge condition:

```ts
        if (
          INDEX_TYPES[key] === INDEX_TYPES.XRAY ||
          INDEX_TYPES[key] === INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM ||
          INDEX_TYPES[key] === INDEX_TYPES.SHAREPOINT ||
          INDEX_TYPES[key] === INDEX_TYPES.SVN ||
          INDEX_TYPES[key] === INDEX_TYPES.XWIKI
        ) {
          return { ...option, badge: 'NEW' }
        }
```

- [ ] **Step 4: Add the credential help copy**

In `settingsUIConfig.ts`, add a `message` block to the existing `xwiki` entry (directly after `testable: false`) and a `note` on the `url` field. Do not change any field names, types or validation:

```ts
    message: {
      type: 'info',
      title: 'Authentication',
      message:
        'Username and password always works. A token only works if the target xWiki has the ' +
        'token plugin installed — if authentication fails with a token, fall back to username ' +
        'and password.',
    },
```

and on the `url` field:

```ts
      url: {
        label: 'URL',
        placeholder: dynPlaceholder('xwiki', 'url'),
        defaultValue: XWIKI_URL,
        note: 'The base URL is the wiki root. Some instances serve the wiki at the domain root, others under an "/xwiki" path — use whichever your instance uses.',
        validation: Yup.string().required('URL is required').url('Value must be a valid URL'),
      },
```

Confirm `note` and `message.type: 'info'` are supported by `CredentialUIMap` in `src/types/settingsUI.ts` before writing; the `webhook` entry uses `note` (`settingsUIConfig.ts:860`) and `git` uses an info-typed message block, so both are established. If `type: 'info'` is unavailable on the top-level `message`, use `'warn'` and keep the wording.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:integration -- src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx`
Expected: PASS.

- [ ] **Step 6: Run the full gate**

```bash
npm run typecheck && npm run lint && npm run test:unit && npm run test:integration
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/pages/dataSources/components/DataSourceTypeSelector.tsx \
        src/utils/settingsUIConfig.ts \
        src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx
git commit -m "EPMCDME-13142: Badge xWiki as new and document its credential fields"
```

---

## Live verification (after Task 8, before code review)

**Completed 2026-08-06 — all checks passed.** Full evidence table in `qa-report.md` → "Feature verification".

- [x] Confirm the stack is up: API on `:8080`, UI on `:5173`, xWiki on `:8888`.
- [x] xWiki integration present (two existed: `xwiki-local-13142`, `xwiki-wrongurl-13142`). The URL note and authentication message render on the integration form.
- [x] Create an xWiki datasource against space `KB` with the wiki field left empty. POST succeeded and indexing started.
- [x] Datasource reached `completed` and reported **7 processed documents** (0 failed).
- [x] Details view — Space shows `KB`, Wiki shows `xwiki` (backend default applied because the blank key was omitted).
- [x] Edit form — Space and Wiki prefilled from the response.
- [x] Full reindex offered from the list and succeeded (`Updated` advanced, status COMPLETED).
- [x] Filter the datasource list by type `xWiki` — `?index_type=knowledge_base_xwiki` returns only xWiki datasources.
- [x] **Bonus, beyond the original checklist:** verified the CR-002 fix against the deliberately broken `xwiki-wrongurl-13142` credential — the backend's `field_error: "url"` surfaces inline beneath the integration selector with the `/rest` vs `/xwiki/rest` help text, and the save is blocked.

## Self-Review

**Spec coverage** — every spec section maps to a task:

| Spec requirement | Task |
|---|---|
| `XWIKI` constant | 1 |
| `humanize` → `xWiki` | 1 |
| `isXWikiIndex` | 1 |
| Typed `xwiki` response sub-object | 1 |
| `space` required, `wiki` optional | 2 |
| `setting_id` required in UI | 2 |
| Create defaults + edit prefill | 2 |
| Creation form component | 3 |
| Render branch | 3 |
| `filteredSettings` + credential auto-select | 3 |
| Health-check payload | 4 |
| `createKBIndexXWiki` / `updateKBIndex` | 4 |
| Scheduling gate (spec test 6) | 5 |
| Details view rows | 6 |
| Reindex predicates + edit predicate | 7 |
| `NEW` badge | 8 |
| Credential help notes | 8 |
| Icon → `IconCode` fallback | none needed — the fallback is the existing default; adding no map entry *is* the decision |

All six spec test cases are present: helpers (1), validation (2), dataSourceUtils (7), DataSourceDetails (6), create-page fields + POST body (3, 4), scheduling (5).

**Placeholder scan** — no TBD/TODO; every code step carries the literal content to write.

**Type consistency** — `xwikiSpace` / `xwikiWiki` are used identically in Tasks 2, 3 and 4. `isXWikiIndex` is defined in Task 1 and consumed in Task 7. `createKBIndexXWiki` is defined in Task 4 step 3 and called in step 6. `IndexTypeField.XWiki` is registered in Task 3 step 4 and rendered in step 5.

**Known ordering note** — Task 5 is a characterization test rather than a red-green cycle, and says so explicitly rather than pretending otherwise.
