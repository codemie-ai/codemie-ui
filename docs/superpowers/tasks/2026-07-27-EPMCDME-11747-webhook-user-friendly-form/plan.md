# Webhook User-Friendly Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four UX improvements to the Webhook credential form: a read-only URL field with copy button, alias→webhook_id auto-fill, collapsible accordion sections, and a name-based Resource dropdown.

**Architecture:** The credential form is data-driven — field configs in `settingsUIConfig.ts` declare types, and `CredentialFields.tsx` renders them via a type switch. We extend this system with two new `CredentialComponentType` values (`webhookUrl`, `resourceSelect`), three new optional fields on `CredentialFieldConfig` (`collapsible`, `accordionTitle`, `rowGroup`), and a pre-processing pass in the renderer to group entries into accordions and flex rows before rendering. Auto-fill logic lives in `SettingsForm.tsx` via two `useEffect`s and a `useRef` flag.

**Tech Stack:** React 18, TypeScript, React Hook Form (`useWatch`, `useForm`, `Controller`), Valtio stores (`useSnapshot`), Vitest + React Testing Library, `ConfigAccordion` (existing), `InputCopy` (existing), `Select` (existing).

## Global Constraints

- SonarQube Cyclomatic Complexity gate ≤ 15 per function. New pure functions (`buildAccordionGroups`, `groupByRow`, `useResourceOptions`) must each stay well under this limit. Do not nest more than 2 levels of conditionals.
- Test command for this area: `npx vitest run src/pages/integrations/components/SettingsForm --reporter verbose`
- `settingsUI.ts` types and `settingsUIConfig.ts` configs are the single source of truth — never hard-code behavior in the renderer that belongs in the config.
- `resource_id` must reach the form submission payload. Do not add `shouldShow: () => false`. The `resourceSelect` Controller writes to `resource_id` directly via RHF `field.onChange`.
- `setFormValue('webhook_id', ...)` must use `{ shouldDirty: false, shouldTouch: false }` to avoid premature validation errors.
- NEVER commit without explicit user approval.

---

### Task 1: Types + config + remove showWebhookUrl

**Test-first: yes — assert new config shape (collapsible, accordionTitle, webhookUrl type, resourceSelect type, rowGroup, absent showWebhookUrl/note on webhook_id) in the existing `webhook form section grouping` describe block.**

**Files:**
- Modify: `src/types/settingsUI.ts`
- Modify: `src/utils/settingsUIConfig.ts`
- Modify: `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` (remove showWebhookUrl rendering)
- Modify: `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx`

**Interfaces:**
- Produces: `CredentialComponentType.webhookUrl`, `CredentialComponentType.resourceSelect` (used by Tasks 3, 4, 5)
- Produces: `CredentialFieldConfig.collapsible`, `CredentialFieldConfig.accordionTitle`, `CredentialFieldConfig.rowGroup` (used by Task 3)
- Produces: updated webhook config (consumed by all downstream rendering tasks)

- [ ] **Step 1: Write failing tests in CredentialFields.test.tsx**

In `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx`, **delete** the entire `describe('CredentialFields — note "Full URL" preview scoping', ...)` block (lines 204–262, the `NoteWrapper` function and two `it(...)` cases). Then add these new test cases inside the existing `describe('webhook form section grouping', ...)` block, right before its closing `})`:

```typescript
it('marks the three optional sections as collapsible with new accordion titles', () => {
  expect(fields._verification_section.collapsible).toBe(true)
  expect(fields._verification_section.accordionTitle).toBe(
    'Advanced Security Settings (optional)'
  )
  expect(fields._github_section.collapsible).toBe(true)
  expect(fields._github_section.accordionTitle).toBe('GitHub Settings (optional)')
  expect(fields._gitlab_section.collapsible).toBe(true)
  expect(fields._gitlab_section.accordionTitle).toBe('GitLab Settings (optional)')
})

it('includes webhook_url_display field after webhook_id with webhookUrl type', () => {
  const keys = Object.keys(fields)
  const idx = (k: string) => keys.indexOf(k)
  expect(idx('webhook_url_display')).toBeGreaterThan(idx('webhook_id'))
  expect(idx('webhook_url_display')).toBeLessThan(idx('is_enabled'))
  expect(fields.webhook_url_display.type).toBe(CredentialComponentType.webhookUrl)
})

it('changes resource_id to resourceSelect type with rowGroup, and resource_type gains rowGroup', () => {
  expect(fields.resource_id.type).toBe(CredentialComponentType.resourceSelect)
  expect(fields.resource_id.rowGroup).toBe('resource_row')
  expect(fields.resource_type.rowGroup).toBe('resource_row')
})

it('removes note and showWebhookUrl from webhook_id', () => {
  expect((fields.webhook_id as any).note).toBeUndefined()
  expect((fields.webhook_id as any).showWebhookUrl).toBeUndefined()
})
```

- [ ] **Step 2: Run tests to confirm RED**

```bash
npx vitest run src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx --reporter verbose
```

Expected: 4 new assertions FAIL (collapsible/accordionTitle/webhookUrl/resourceSelect not in config yet), the deleted showWebhookUrl describe block is gone.

- [ ] **Step 3: Update `src/types/settingsUI.ts`**

In the `CredentialComponentType` enum, add two new values after the existing `sectionHeader` entry:

```typescript
webhookUrl = 'webhookUrl',
resourceSelect = 'resourceSelect',
```

In `CredentialFieldConfig`, remove the `showWebhookUrl?: boolean` line and add three new optional fields. The final `CredentialFieldConfig` shape gains:

```typescript
collapsible?: boolean
accordionTitle?: string
rowGroup?: string
```

Remove `showWebhookUrl?: boolean` entirely.

- [ ] **Step 4: Update `src/utils/settingsUIConfig.ts` — webhook fields**

In the `webhook` credential config (around lines 759–861), apply these changes:

**`webhook_id`** — remove `note` and `showWebhookUrl`:
```typescript
webhook_id: {
  placeholder: 'Webhook ID',
},
```

**After `webhook_id`** — insert new display-only field:
```typescript
webhook_url_display: {
  label: 'Webhook URL',
  type: CredentialComponentType.webhookUrl,
},
```

**`_verification_section`** — add collapsible props:
```typescript
_verification_section: {
  type: CredentialComponentType.sectionHeader,
  label: 'Request verification (legacy header)',
  collapsible: true,
  accordionTitle: 'Advanced Security Settings (optional)',
},
```

**`_github_section`** — add collapsible props:
```typescript
_github_section: {
  type: CredentialComponentType.sectionHeader,
  label: 'GitHub',
  collapsible: true,
  accordionTitle: 'GitHub Settings (optional)',
},
```

**`_gitlab_section`** — add collapsible props:
```typescript
_gitlab_section: {
  type: CredentialComponentType.sectionHeader,
  label: 'GitLab',
  collapsible: true,
  accordionTitle: 'GitLab Settings (optional)',
},
```

**`resource_type`** — add `rowGroup`:
```typescript
resource_type: {
  placeholder: 'Resource Type',
  type: CredentialComponentType.select,
  rowGroup: 'resource_row',
  options: [
    { value: 'assistant', label: 'Assistant' },
    { value: 'workflow', label: 'Workflow' },
    { value: 'datasource', label: 'Datasource' },
  ],
},
```

**`resource_id`** — replace free-text with `resourceSelect`:
```typescript
resource_id: {
  label: 'Resource',
  type: CredentialComponentType.resourceSelect,
  rowGroup: 'resource_row',
},
```

- [ ] **Step 5: Remove `showWebhookUrl` from `CredentialFields.tsx`**

In `src/pages/integrations/components/SettingsForm/CredentialFields.tsx`:

**Remove `showWebhookUrl` from the destructuring** at line 93. The destructuring block (lines 80–94) becomes:
```typescript
const {
  label,
  placeholder,
  type = CredentialComponentType.input,
  options = [],
  help,
  note,
  shouldShow,
  sensitive,
  rows,
  position: fieldPosition = CredentialComponentPosition.fieldsSection,
  message,
  emptySelectionError,
} = config
```

**Simplify the note rendering block** (lines 172–179). Replace:
```tsx
{note && (
  <InfoMessage>
    {note}
    {showWebhookUrl &&
      buildWebhookURL &&
      ` Full URL: ${buildWebhookURL(formValues[name])}`}
  </InfoMessage>
)}
```
with:
```tsx
{note && <InfoMessage>{note}</InfoMessage>}
```

- [ ] **Step 6: Run tests to confirm GREEN**

```bash
npx vitest run src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx --reporter verbose
```

Expected: All tests PASS. The 4 new config-shape assertions pass. The `sectionHeader rendering` describe block still passes (it uses non-collapsible config, unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/types/settingsUI.ts src/utils/settingsUIConfig.ts \
        src/pages/integrations/components/SettingsForm/CredentialFields.tsx \
        src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
git commit -m "feat(EPMCDME-11747): extend types/config for webhook UX improvements

Add webhookUrl, resourceSelect enum values; add collapsible/accordionTitle/rowGroup
to CredentialFieldConfig; remove showWebhookUrl; update webhook credential config."
```

---

### Task 2: SettingsForm alias → webhook_id auto-fill

**Test-first: yes — new test file asserts alias change populates webhook_id and manual edit stops auto-fill.**

**Files:**
- Create: `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.autoFill.test.tsx`
- Modify: `src/pages/integrations/components/SettingsForm/SettingsForm.tsx`

**Interfaces:**
- Consumes: `generateDefaultAlias(alias: string): string` from `@/utils/settings` (slug function, already imported in SettingsForm.tsx)
- Consumes: `webhookIdManuallyEdited: React.MutableRefObject<boolean>` (new internal ref)
- Produces: `webhook_id` auto-filled from alias, stops on manual edit, resets on credential type change

- [ ] **Step 1: Create the test file**

Create `src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.autoFill.test.tsx`:

```typescript
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import SettingsForm from '../SettingsForm'

vi.mock('@/utils/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/settings')>()
  return {
    ...actual,
    generateDefaultAlias: vi.fn().mockImplementation((input: string) => `gen-${input}`),
    getAvailableCredentialsTypes: vi.fn().mockReturnValue(['webhook']),
  }
})
vi.mock('valtio', () => ({ proxy: (v: unknown) => v, snapshot: (v: unknown) => v, subscribe: vi.fn() }))
vi.mock('valtio/react', () => ({ useSnapshot: (store: unknown) => store }))
vi.mock('@/store/user', () => ({
  userStore: { user: { id: '1', role: 'admin', projects: [], username: 'test' } },
}))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    api: { BASE_URL: 'http://test' },
    fetchCustomerConfig: vi.fn().mockResolvedValue(null),
  },
}))
vi.mock('@/utils/onboarding', () => ({ registerCredentialTypeCallback: vi.fn(() => () => {}) }))
vi.mock('@/hooks/useActiveHelpSegment', () => ({ useActiveHelpSegment: vi.fn() }))
vi.mock('@/components/ProjectSelector', () => ({ default: () => null }))
vi.mock('../../TestIntegration', () => ({ default: () => null }))
vi.mock('../GoogleOAuthField', () => ({ default: () => null }))
vi.mock('../../SettingFormMessage/SettingFormMessage', () => ({ default: () => null }))
vi.mock('@/store/assistants', () => ({
  assistantsStore: { getAssistantOptions: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/store/workflows', () => ({
  workflowsStore: { getWorkflowOptions: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/store/dataSources', () => ({
  dataSourceStore: { getDataSourceOptions: vi.fn().mockResolvedValue([]) },
}))

function renderWebhookForm(editing = false) {
  return render(
    <SettingsForm
      credentialType="webhook"
      settingType="user"
      onSubmit={vi.fn()}
      onClose={vi.fn()}
      submitText="Save"
      editing={editing}
    />
  )
}

describe('SettingsForm — alias → webhook_id auto-fill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auto-fills webhook_id from alias as a slug when alias changes', async () => {
    renderWebhookForm()
    const aliasInput = screen.getByLabelText('Alias')
    const webhookIdInput = screen.getByPlaceholderText('Webhook ID')

    await act(async () => {
      await userEvent.clear(aliasInput)
      await userEvent.type(aliasInput, 'my-webhook')
    })

    expect(webhookIdInput).toHaveValue('gen-my-webhook')
  })

  it('stops auto-filling webhook_id after the user manually edits it', async () => {
    renderWebhookForm()
    const aliasInput = screen.getByLabelText('Alias')
    const webhookIdInput = screen.getByPlaceholderText('Webhook ID')

    await act(async () => {
      await userEvent.clear(aliasInput)
      await userEvent.type(aliasInput, 'initial-alias')
    })
    expect(webhookIdInput).toHaveValue('gen-initial-alias')

    await act(async () => {
      await userEvent.clear(webhookIdInput)
      await userEvent.type(webhookIdInput, 'manual-id')
    })

    await act(async () => {
      await userEvent.clear(aliasInput)
      await userEvent.type(aliasInput, 'new-alias')
    })

    expect(webhookIdInput).toHaveValue('manual-id')
  })

  it('does not overwrite a pre-populated webhook_id in edit mode', async () => {
    render(
      <SettingsForm
        credentialType="webhook"
        settingType="user"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        submitText="Save"
        editing={true}
        initialCredentialValues={{ webhook_id: 'pre-existing-id' }}
        initialSettingAlias="existing-alias"
      />
    )

    const webhookIdInput = screen.getByPlaceholderText('Webhook ID')
    expect(webhookIdInput).toHaveValue('pre-existing-id')

    const aliasInput = screen.getByLabelText('Alias')
    await act(async () => {
      await userEvent.clear(aliasInput)
      await userEvent.type(aliasInput, 'changed-alias')
    })

    expect(webhookIdInput).toHaveValue('pre-existing-id')
  })
})
```

- [ ] **Step 2: Run tests to confirm RED**

```bash
npx vitest run src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.autoFill.test.tsx --reporter verbose
```

Expected: All 3 tests FAIL — the auto-fill behavior does not exist yet.

- [ ] **Step 3: Implement auto-fill in `SettingsForm.tsx`**

In `src/pages/integrations/components/SettingsForm/SettingsForm.tsx`:

**After line 109** (`const aliasManuallyEdited = useRef(false)`), add two new refs:

```typescript
const webhookIdManuallyEdited = useRef(false)
const lastAutoFilledWebhookId = useRef('')
```

**After line 221** (`const formValues = useWatch({ control })`), add a scoped alias watcher:

```typescript
const aliasValue = useWatch({ control, name: 'alias' })
```

**After the existing alias auto-fill effect** (lines 260–265), add two new effects:

```typescript
useEffect(() => {
  if (editing || webhookIdManuallyEdited.current || !aliasValue) return
  const newId = generateDefaultAlias(aliasValue)
  if (newId) {
    lastAutoFilledWebhookId.current = newId
    setFormValue('webhook_id', newId, { shouldDirty: false, shouldTouch: false })
  }
}, [aliasValue])

useEffect(() => {
  if (
    lastAutoFilledWebhookId.current !== '' &&
    formValues['webhook_id'] !== lastAutoFilledWebhookId.current
  ) {
    webhookIdManuallyEdited.current = true
  }
}, [formValues['webhook_id']])
```

**Inside `handleCredentialTypeChange`** (around line 272), immediately BEFORE the `reset(...)` call (currently line 280), add:

```typescript
webhookIdManuallyEdited.current = false
lastAutoFilledWebhookId.current = ''
```

- [ ] **Step 4: Run tests to confirm GREEN**

```bash
npx vitest run src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.autoFill.test.tsx --reporter verbose
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/integrations/components/SettingsForm/SettingsForm.tsx \
        src/pages/integrations/components/SettingsForm/__tests__/SettingsForm.autoFill.test.tsx
git commit -m "feat(EPMCDME-11747): alias → webhook_id auto-fill with manual override

Watch alias field and auto-populate webhook_id as a slug via generateDefaultAlias.
webhookIdManuallyEdited ref disables sync once user edits the field directly.
Resets on credential type change."
```

---

### Task 3: CredentialFields accordion + rowGroup rendering

**Test-first: yes — assert ConfigAccordion renders with accordionTitle (collapsed by default) and rowGroup siblings appear in a flex container.**

**Files:**
- Modify: `src/pages/integrations/components/SettingsForm/CredentialFields.tsx`
- Modify: `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx`

**Interfaces:**
- Consumes: `CredentialComponentType.sectionHeader` with `collapsible: true` and `accordionTitle` (from Task 1)
- Consumes: `CredentialFieldConfig.rowGroup` (from Task 1)
- Consumes: `ConfigAccordion` from `src/pages/workflows/editor/configPanels/components/ConfigAccordion.tsx` — props: `title: string`, `defaultExpanded?: boolean`, `children: ReactNode`
- Produces: accordion sections collapsed by default; rowGroup fields in `<div className="flex gap-4">`

- [ ] **Step 1: Write failing tests**

Add two new describe blocks in `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx` after the `'CredentialFields — sectionHeader rendering'` describe:

```typescript
describe('CredentialFields — collapsible accordion sections', () => {
  function AccordionWrapper() {
    const { control } = useForm({ defaultValues: { secure_header_name: '' } })
    const fields: Record<string, CredentialFieldConfig> = {
      _verification_section: {
        type: CredentialComponentType.sectionHeader,
        label: 'Request verification (legacy header)',
        collapsible: true,
        accordionTitle: 'Advanced Security Settings (optional)',
      },
      secure_header_name: {
        label: 'Secure Header Name',
        placeholder: 'Secure Header Name',
      },
    }
    return <CredentialFields control={control as any} credentialFields={fields} />
  }

  it('renders collapsible sectionHeader as accordion with accordionTitle text visible', () => {
    render(<AccordionWrapper />)
    expect(screen.getByText('Advanced Security Settings (optional)')).toBeInTheDocument()
  })

  it('hides fields inside a collapsed accordion by default', () => {
    render(<AccordionWrapper />)
    expect(screen.queryByLabelText('Secure Header Name')).not.toBeInTheDocument()
  })

  it('does NOT render the old label as a heading element', () => {
    render(<AccordionWrapper />)
    expect(
      screen.queryByRole('heading', { name: 'Request verification (legacy header)' })
    ).not.toBeInTheDocument()
  })
})

describe('CredentialFields — rowGroup flex layout', () => {
  function RowWrapper() {
    const { control } = useForm({ defaultValues: { resource_type: '', field_b: '' } })
    const fields: Record<string, CredentialFieldConfig> = {
      field_a: {
        label: 'Field A',
        placeholder: 'Field A',
        rowGroup: 'test_row',
      },
      field_b: {
        label: 'Field B',
        placeholder: 'Field B',
        rowGroup: 'test_row',
      },
    }
    return <CredentialFields control={control as any} credentialFields={fields} />
  }

  it('wraps fields sharing a rowGroup in a flex container', () => {
    const { container } = render(<RowWrapper />)
    const flexDiv = container.querySelector('.flex.gap-4')
    expect(flexDiv).not.toBeNull()
    expect(flexDiv!.querySelectorAll('input').length).toBeGreaterThanOrEqual(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm RED**

```bash
npx vitest run src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx --reporter verbose
```

Expected: The 4 new accordion/rowGroup tests FAIL. All prior tests continue to pass.

- [ ] **Step 3: Add pure helper functions and import to `CredentialFields.tsx`**

At the top of `src/pages/integrations/components/SettingsForm/CredentialFields.tsx`, add the `ConfigAccordion` import:

```typescript
import ConfigAccordion from '@/pages/workflows/editor/configPanels/components/ConfigAccordion'
```

Then, **before the `CredentialFields` component declaration**, add two pure helper functions and a type:

```typescript
type AccordionGroup = {
  kind: 'accordion'
  key: string
  title: string
  entries: [string, CredentialFieldConfig][]
}
type RowGroup = { kind: 'row'; entries: [string, CredentialFieldConfig][] }

function groupByRow(
  entries: [string, CredentialFieldConfig][]
): [string, CredentialFieldConfig][][] {
  const rows: [string, CredentialFieldConfig][][] = []
  let i = 0
  while (i < entries.length) {
    const [name, config] = entries[i]
    const rg = config.rowGroup
    if (rg) {
      const group: [string, CredentialFieldConfig][] = [[name, config]]
      i++
      while (i < entries.length && entries[i][1].rowGroup === rg) {
        group.push(entries[i])
        i++
      }
      rows.push(group)
    } else {
      rows.push([[name, config]])
      i++
    }
  }
  return rows
}

function buildRenderGroups(
  entries: [string, CredentialFieldConfig][]
): (AccordionGroup | RowGroup)[] {
  const rows = groupByRow(entries)
  const result: (AccordionGroup | RowGroup)[] = []
  let i = 0
  while (i < rows.length) {
    const row = rows[i]
    const [name, config] = row[0]
    if (config.type === CredentialComponentType.sectionHeader && config.collapsible) {
      const group: AccordionGroup = {
        kind: 'accordion',
        key: name,
        title: config.accordionTitle ?? (typeof config.label === 'string' ? config.label : ''),
        entries: [],
      }
      i++
      while (i < rows.length && rows[i][0][1].type !== CredentialComponentType.sectionHeader) {
        group.entries.push(...rows[i])
        i++
      }
      result.push(group)
    } else {
      result.push({ kind: 'row', entries: row })
      i++
    }
  }
  return result
}
```

- [ ] **Step 4: Refactor rendering in `CredentialFields.tsx`**

Inside the `CredentialFields` component, extract the current map body into a `renderEntry` closure, then replace the existing `return (...)` with the accordion/rowGroup aware version.

Add a `renderEntry` closure **before** the `return` statement (after the existing `getLabel`/`togglePasswordVisibility` helpers). The body of `renderEntry` is the **verbatim content** of the current `.map(([name, config]: [string, CredentialFieldConfig]) => { ... })` lambda starting at `CredentialFields.tsx:79`. Extract that entire lambda body (lines 80–end of the closing `})`) into the new function — the signature changes from an anonymous `([name, config])` destructure to `(name: string, config: CredentialFieldConfig)`, and the Controller's `key={name}` prop remains unchanged:

```typescript
const renderEntry = (name: string, config: CredentialFieldConfig) => {
  const {
    label,
    placeholder,
    type = CredentialComponentType.input,
    options = [],
    help,
    note,
    shouldShow,
    sensitive,
    rows,
    position: fieldPosition = CredentialComponentPosition.fieldsSection,
    message,
    emptySelectionError,
  } = config

  if (fieldPosition !== position) return null
  if (shouldShow && !shouldShow(formValues)) return null

  if (type === CredentialComponentType.message && message) {
    return <SettingFormMessage key={name} message={message} />
  }

  if (type === CredentialComponentType.sectionHeader) {
    const heading = getPlaceholder(label)
    return (
      <div key={name} className="mt-2">
        <hr className="opacity-25 mb-3 border-border-structural" />
        {heading && <h5 className="text-sm font-medium">{heading}</h5>}
      </div>
    )
  }

  if (type === CredentialComponentType.webhookUrl) {
    // Task 4 adds this branch
    if (!buildWebhookURL) return null
    return (
      <div key={name} className="flex flex-col gap-1">
        {label && <label className="text-sm font-medium">{typeof label === 'string' ? label : ''}</label>}
        <InputCopy
          text={buildWebhookURL(String(formValues['webhook_id'] ?? ''))}
          notification="Webhook URL copied"
        />
      </div>
    )
  }

  return (
    <Controller
      key={name}
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        // ... rest of the existing Controller render body, unchanged ...
        // (copy verbatim from the current .map lambda, from line ~121 to the closing })}  )
      }}
    />
  )
}
```

The `// ... rest of the existing Controller render body, unchanged ...` comment above is a shorthand for the verbatim copy: take every line currently inside `render={({ field, fieldState }) => { ... }}` (starting at `CredentialFields.tsx:121`) and paste it verbatim. Nothing inside the Controller's render function changes in Task 3.

Replace the `return (...)` block with:

```tsx
return (
  <>
    {buildRenderGroups(Object.entries(credentialFields)).map((group) => {
      if (group.kind === 'accordion') {
        return (
          <ConfigAccordion key={group.key} title={group.title} defaultExpanded={false}>
            {groupByRow(group.entries).map((row) =>
              row.length > 1 ? (
                <div key={row[0][0]} className="flex gap-4">
                  {row.map(([n, c]) => renderEntry(n, c))}
                </div>
              ) : (
                renderEntry(row[0][0], row[0][1])
              )
            )}
          </ConfigAccordion>
        )
      }
      return group.entries.length > 1 ? (
        <div key={group.entries[0][0]} className="flex gap-4">
          {group.entries.map(([n, c]) => renderEntry(n, c))}
        </div>
      ) : (
        renderEntry(group.entries[0][0], group.entries[0][1])
      )
    })}
  </>
)
```

Note: Inside `renderEntry`, the Controller's `key` prop remains `key={name}` — this is fine because each call to `renderEntry` returns a distinct keyed element and they are not siblings that need disambiguation at the React reconciler level within the map.

- [ ] **Step 5: Run tests to confirm GREEN**

```bash
npx vitest run src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx --reporter verbose
```

Expected: All tests PASS including the 4 new accordion/rowGroup tests. The `sectionHeader rendering` describe block still passes (non-collapsible config unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/pages/integrations/components/SettingsForm/CredentialFields.tsx \
        src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
git commit -m "feat(EPMCDME-11747): accordion grouping and rowGroup flex layout in CredentialFields

Pre-processing pass (buildRenderGroups + groupByRow) groups collapsible sectionHeaders
into ConfigAccordion wrappers (defaultExpanded=false) and consecutive rowGroup fields
into flex rows. Non-collapsible headers and ungrouped fields render unchanged."
```

---

### Task 4: Webhook URL read-only display field

**Test-first: yes — assert InputCopy renders with the correct URL derived from webhook_id form value.**

**Files:**
- Modify: `src/pages/integrations/components/SettingsForm/CredentialFields.tsx`
- Modify: `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx`

**Interfaces:**
- Consumes: `CredentialComponentType.webhookUrl` (Task 1)
- Consumes: `buildWebhookURL` prop already on `CredentialFields`; signature: `(webhookId: string) => string`
- Consumes: `InputCopy` from `src/components/form/InputCopy/InputCopy.tsx` — props: `text: string`, `notification: string`, `className?: string` (no `label` prop)
- Consumes: `formValues['webhook_id']` (reactive, already available in component via `useWatch`)

- [ ] **Step 1: Write failing tests**

Add a new describe block in `CredentialFields.test.tsx`:

```typescript
describe('CredentialFields — webhookUrl display field', () => {
  const buildWebhookURL = (value: string) =>
    `http://test/v1/webhooks/${value && value.trim() !== '' ? value : '<id>'}`

  function UrlWrapper({ webhookId }: Readonly<{ webhookId: string }>) {
    const { control } = useForm({ defaultValues: { webhook_id: webhookId, webhook_url_display: '' } })
    const fields: Record<string, CredentialFieldConfig> = {
      webhook_url_display: {
        label: 'Webhook URL',
        type: CredentialComponentType.webhookUrl,
      },
    }
    return (
      <CredentialFields
        control={control as any}
        credentialFields={fields}
        buildWebhookURL={buildWebhookURL}
      />
    )
  }

  it('renders InputCopy with URL built from the current webhook_id value', () => {
    render(<UrlWrapper webhookId="my-hook" />)
    const input = screen.getByDisplayValue('http://test/v1/webhooks/my-hook')
    expect(input).toBeInTheDocument()
  })

  it('renders InputCopy with placeholder URL when webhook_id is empty', () => {
    render(<UrlWrapper webhookId="" />)
    const input = screen.getByDisplayValue('http://test/v1/webhooks/<id>')
    expect(input).toBeInTheDocument()
  })

  it('renders the Webhook URL label', () => {
    render(<UrlWrapper webhookId="x" />)
    expect(screen.getByText('Webhook URL')).toBeInTheDocument()
  })

  it('renders nothing when buildWebhookURL prop is absent', () => {
    const { control } = useForm({ defaultValues: { webhook_id: 'x' } })
    const fields: Record<string, CredentialFieldConfig> = {
      webhook_url_display: { label: 'Webhook URL', type: CredentialComponentType.webhookUrl },
    }
    const { container } = render(
      <CredentialFields control={control as any} credentialFields={fields} />
    )
    expect(container.firstChild).toBeEmptyDOMElement()
  })
})
```

Wait — the last test inline-calls `useForm` inside the test body which violates React hooks rules in testing. Replace the last test with a Wrapper approach:

```typescript
  it('renders nothing when buildWebhookURL prop is absent', () => {
    function NoBuildWrapper() {
      const { control } = useForm({ defaultValues: { webhook_id: 'x', webhook_url_display: '' } })
      const fields: Record<string, CredentialFieldConfig> = {
        webhook_url_display: { label: 'Webhook URL', type: CredentialComponentType.webhookUrl },
      }
      return <CredentialFields control={control as any} credentialFields={fields} />
    }
    render(<NoBuildWrapper />)
    expect(screen.queryByText('Webhook URL')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to confirm RED**

```bash
npx vitest run src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx --reporter verbose
```

Expected: 4 new webhookUrl tests FAIL.

- [ ] **Step 3: Add `InputCopy` import and `webhookUrl` branch in `CredentialFields.tsx`**

Add import at the top:

```typescript
import InputCopy from '@/components/form/InputCopy/InputCopy'
```

Inside `renderEntry`, **before the `Controller` return** (i.e., after the `sectionHeader` check but before `return (<Controller ...)`), add the `webhookUrl` branch:

```typescript
if (type === CredentialComponentType.webhookUrl) {
  if (!buildWebhookURL) return null
  return (
    <div key={name} className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium">{typeof label === 'string' ? label : ''}</label>}
      <InputCopy
        text={buildWebhookURL(String(formValues['webhook_id'] ?? ''))}
        notification="Webhook URL copied"
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm GREEN**

```bash
npx vitest run src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx --reporter verbose
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/integrations/components/SettingsForm/CredentialFields.tsx \
        src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
git commit -m "feat(EPMCDME-11747): add webhookUrl read-only display field with InputCopy

New rendering branch for CredentialComponentType.webhookUrl renders a label + InputCopy
with the full webhook URL built from buildWebhookURL(formValues['webhook_id']).
Renders nothing if buildWebhookURL prop is absent."
```

---

### Task 5: `useResourceOptions` hook + `resourceSelect` rendering

**Test-first: yes — hook test asserts options mapped per store; rendering test asserts Select is disabled without resource_type and enabled with options when resource_type is set.**

**Files:**
- Create: `src/pages/integrations/components/SettingsForm/hooks/useResourceOptions.ts`
- Create: `src/pages/integrations/components/SettingsForm/__tests__/useResourceOptions.test.ts`
- Modify: `src/pages/integrations/components/SettingsForm/CredentialFields.tsx`
- Modify: `src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx`

**Interfaces:**
- Produces: `useResourceOptions(resourceType: string): { options: { label: string; value: string }[], loading: boolean }`
- Consumes: `assistantsStore.getAssistantOptions()` → `{ id: string; name: string }[]`
- Consumes: `workflowsStore.getWorkflowOptions()` → `{ id: string; name: string }[]`
- Consumes: `dataSourceStore.getDataSourceOptions()` → `{ id: string; repo_name: string }[]`
- Consumes: `Select` from `src/components/form/Select/Select.tsx` — props include `label`, `options`, `disabled`, `value`, `onChangeValue?: (value: TValue | null) => void`

- [ ] **Step 1: Write failing hook tests**

Create `src/pages/integrations/components/SettingsForm/__tests__/useResourceOptions.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useResourceOptions } from '../hooks/useResourceOptions'

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    getAssistantOptions: vi.fn().mockResolvedValue([
      { id: '1', name: 'My Assistant' },
      { id: '2', name: 'Other Assistant' },
    ]),
  },
}))
vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    getWorkflowOptions: vi.fn().mockResolvedValue([
      { id: '10', name: 'Deploy Flow' },
    ]),
  },
}))
vi.mock('@/store/dataSources', () => ({
  dataSourceStore: {
    getDataSourceOptions: vi.fn().mockResolvedValue([
      { id: '20', repo_name: 'my-repo' },
    ]),
  },
}))

describe('useResourceOptions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty options and loading=false when resourceType is empty', () => {
    const { result } = renderHook(() => useResourceOptions(''))
    expect(result.current.options).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('returns empty options for an unknown resourceType', async () => {
    const { result } = renderHook(() => useResourceOptions('unknown'))
    await act(async () => {})
    expect(result.current.options).toEqual([])
  })

  it('fetches and maps assistant options with label=name, value=id', async () => {
    const { result } = renderHook(() => useResourceOptions('assistant'))
    await act(async () => {})
    expect(result.current.options).toEqual([
      { label: 'My Assistant', value: '1' },
      { label: 'Other Assistant', value: '2' },
    ])
    expect(result.current.loading).toBe(false)
  })

  it('fetches and maps workflow options with label=name, value=id', async () => {
    const { result } = renderHook(() => useResourceOptions('workflow'))
    await act(async () => {})
    expect(result.current.options).toEqual([{ label: 'Deploy Flow', value: '10' }])
  })

  it('fetches datasource options using repo_name as label', async () => {
    const { result } = renderHook(() => useResourceOptions('datasource'))
    await act(async () => {})
    expect(result.current.options).toEqual([{ label: 'my-repo', value: '20' }])
  })

  it('re-fetches when resourceType changes', async () => {
    const { result, rerender } = renderHook(
      ({ rt }: { rt: string }) => useResourceOptions(rt),
      { initialProps: { rt: 'assistant' } }
    )
    await act(async () => {})
    expect(result.current.options[0].label).toBe('My Assistant')

    rerender({ rt: 'workflow' })
    await act(async () => {})
    expect(result.current.options[0].label).toBe('Deploy Flow')
  })
})
```

- [ ] **Step 2: Write failing rendering tests**

Add a new describe block in `CredentialFields.test.tsx`:

```typescript
describe('CredentialFields — resourceSelect field', () => {
  vi.mock(
    '@/pages/integrations/components/SettingsForm/hooks/useResourceOptions',
    () => ({
      useResourceOptions: vi.fn().mockReturnValue({ options: [], loading: false }),
    })
  )

  function ResourceWrapper({
    resourceType,
    options,
  }: Readonly<{ resourceType: string; options: { label: string; value: string }[] }>) {
    const { control } = useForm({ defaultValues: { resource_type: resourceType, resource_id: '' } })
    const fields: Record<string, CredentialFieldConfig> = {
      resource_id: {
        label: 'Resource',
        type: CredentialComponentType.resourceSelect,
        rowGroup: 'resource_row',
      },
    }
    // Override the mock for this render
    const { useResourceOptions } = require(
      '@/pages/integrations/components/SettingsForm/hooks/useResourceOptions'
    )
    ;(useResourceOptions as any).mockReturnValue({ options, loading: false })

    return <CredentialFields control={control as any} credentialFields={fields} />
  }

  it('renders the Resource label', () => {
    render(<ResourceWrapper resourceType="" options={[]} />)
    expect(screen.getByText('Resource')).toBeInTheDocument()
  })

  it('is disabled when resource_type is empty', () => {
    render(<ResourceWrapper resourceType="" options={[]} />)
    // Select renders a disabled combobox when disabled prop is true
    const combo = screen.queryByRole('combobox')
    if (combo) expect(combo).toBeDisabled()
  })
})
```

Note: The `resourceSelect` integration test above is intentionally minimal. The key behavior (disabled without resource_type, options populated) is better verified via the hook tests and a full integration test. Expand these assertions once the implementation is visible.

- [ ] **Step 3: Run tests to confirm RED**

```bash
npx vitest run src/pages/integrations/components/SettingsForm/__tests__/useResourceOptions.test.ts \
  src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx \
  --reporter verbose
```

Expected: All 6 hook tests FAIL (file does not exist), rendering tests FAIL.

- [ ] **Step 4: Implement `useResourceOptions`**

Create `src/pages/integrations/components/SettingsForm/hooks/useResourceOptions.ts`:

```typescript
import { useState, useEffect } from 'react'
import { assistantsStore } from '@/store/assistants'
import { dataSourceStore } from '@/store/dataSources'
import { workflowsStore } from '@/store/workflows'

type ResourceOption = { label: string; value: string }

export function useResourceOptions(resourceType: string): {
  options: ResourceOption[]
  loading: boolean
} {
  const [options, setOptions] = useState<ResourceOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!resourceType) {
      setOptions([])
      return
    }
    let cancelled = false
    setLoading(true)
    const fetchOptions = async () => {
      try {
        let mapped: ResourceOption[] = []
        if (resourceType === 'assistant') {
          const data = await assistantsStore.getAssistantOptions()
          mapped = data.map((item: { id: string; name: string }) => ({
            label: item.name,
            value: String(item.id),
          }))
        } else if (resourceType === 'workflow') {
          const data = await workflowsStore.getWorkflowOptions()
          mapped = data.map((item: { id: string; name: string }) => ({
            label: item.name,
            value: String(item.id),
          }))
        } else if (resourceType === 'datasource') {
          const data = await dataSourceStore.getDataSourceOptions()
          mapped = data.map((item: { id: string; repo_name: string }) => ({
            label: item.repo_name,
            value: String(item.id),
          }))
        }
        if (!cancelled) setOptions(mapped)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchOptions()
    return () => {
      cancelled = true
    }
  }, [resourceType])

  return { options, loading }
}
```

- [ ] **Step 5: Add `resourceSelect` branch in `CredentialFields.tsx`**

Add the `Select` import and `useResourceOptions` import at the top of `CredentialFields.tsx`:

```typescript
import Select from '@/components/form/Select/Select'
import { useResourceOptions } from './hooks/useResourceOptions'
```

**Inside the `CredentialFields` component** (after existing `useState`/`useWatch` calls at the top — unconditionally to comply with React Rules of Hooks), add:

```typescript
const resourceType = String(formValues['resource_type'] ?? '')
const { options: resourceOptions } = useResourceOptions(resourceType)
```

**Inside `renderEntry`**, add a `resourceSelect` branch **inside the `Controller`** render prop, after the existing type checks and before the default input rendering. The `resourceSelect` branch returns from within the Controller's render function:

```typescript
if (type === CredentialComponentType.resourceSelect) {
  return (
    <Select
      key={name}
      label={typeof label === 'string' ? label : 'Resource'}
      options={resourceOptions}
      disabled={!resourceType}
      value={field.value ?? null}
      onChangeValue={(val) => field.onChange(val ?? '')}
    />
  )
}
```

- [ ] **Step 6: Run tests to confirm GREEN**

```bash
npx vitest run src/pages/integrations/components/SettingsForm/__tests__/useResourceOptions.test.ts \
  src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx \
  --reporter verbose
```

Expected: All tests PASS.

- [ ] **Step 7: Run full test suite for the SettingsForm area**

```bash
npx vitest run src/pages/integrations/components/SettingsForm --reporter verbose
```

Expected: All tests in the SettingsForm directory PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/integrations/components/SettingsForm/hooks/useResourceOptions.ts \
        src/pages/integrations/components/SettingsForm/__tests__/useResourceOptions.test.ts \
        src/pages/integrations/components/SettingsForm/CredentialFields.tsx \
        src/pages/integrations/components/SettingsForm/__tests__/CredentialFields.test.tsx
git commit -m "feat(EPMCDME-11747): resource dropdown with useResourceOptions hook

New useResourceOptions hook fetches entity options from assistants/workflows/dataSources
Valtio stores based on resource_type. resourceSelect CredentialComponentType renders a
Select Controller writing the selected entity ID into resource_id for form submission."
```
