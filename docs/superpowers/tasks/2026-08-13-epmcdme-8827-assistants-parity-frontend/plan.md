# Assistants Version History UX Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development (sdlc-light Stage 4 — inline TDD in this conversation, not a subagent). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Workflow YAML Version History match Assistants System Instructions history: embedded `yaml_config_history`, FE labels, diff vs editor YAML, Restore into the form only, persist via page Save — no `/versions` or `/rollback` calls.

**Architecture:** Delete the dedicated versions Valtio store. Drive `WorkflowVersionHistoryPopup` from `workflow.yaml_config_history` passed as props. Restore calls existing `WorkflowForm.replaceYamlConfig` and toasts; the user persists with Save (`PUT v1/workflows/{id}`). Keep YAML header chrome and shared `VersionedFieldHistoryTab` / `VersionHistoryDiffView`.

**Tech Stack:** React, Valtio, Vitest + Testing Library, PrimeReact Popup, existing `formatDateTime` / `createdBy` helpers.

## Requirements

Review `docs/EPMCDME-8827-assistants-parity-frontend.md` and implement it. Workflow Version History must:

1. Read history from `workflow.yaml_config_history` (`WorkflowConfigHistoryItem`: `yaml_config`, `date`, `created_by`).
2. Label options with FE index math: `[NN] - date - author` where `NN = history.length - index`.
3. Diff selected history YAML vs current editor YAML (`currentEditorYaml`); previous sibling from the same array (no detail GET).
4. Restore writes YAML into the form via `replaceYamlConfig` (marks dirty). No confirm-for-server-rollback. No `POST .../rollback`.
5. Toast describes editor restore. Persist is the existing page **Save**.
6. Hide Restore when `canWrite` is false.
7. Remove `src/store/workflowVersions.ts`, its tests, and `src/types/entity/workflowVersion.ts`.
8. Keep Version History in YAML header actions, one page-owned popup, shared tab/diff view.
9. Do not change `useWorkflowData` or Assistants `SystemPrompt`.

## Global Constraints

- Commit messages: `EPMCDME-8827: Capital sentence` (first word after colon uppercase, no trailing period).
- License header on every `src/**` file (Apache 2.0, 2026).
- Do not commit `vite.config.ts` (local proxy) or invent versions-API UUIDs.
- Follow this parity spec, not older `docs/handoff-contract.md` / Aug 11 rollback spec.
- Option `value` = `` `${entry.date}::${index}` `` (stable if dates collide).
- Toast copy: `Workflow YAML has been restored successfully!` (`toaster.info`, matching Assistants).
- Drop the rollback `ConfirmationModal`; keep the AI Revert confirm modal.

## File map

| Path | Action |
|---|---|
| `src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx` | Rewrite for embedded history |
| `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx` | Drive from `history` props; client restore |
| `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx` | Add Restore → editor, no rollback HTTP |
| `src/pages/workflows/EditWorkflowPage.tsx` | Pass history; `replaceYamlConfig`; drop rollback |
| `src/store/workflowVersions.ts` | Delete |
| `src/store/__tests__/workflowVersions.test.ts` | Delete |
| `src/types/entity/workflowVersion.ts` | Delete |

Keep: `WorkflowConfigHistoryItem`, `replaceYamlConfig`, `WorkflowYamlHeaderActions`, `YamlPanel`, `WorkflowConfigField`, `VersionedFieldHistoryTab`, `VersionHistoryDiffView`, `useWorkflowData`.

---

### Task 1: Embedded-history popup and client Restore wiring

**Test-first: yes — popup tests still call `fetchVersions` / `onRestoreRequest(summary)`; page has no Restore→editor coverage and still mounts rollback confirm.**

**Files:**
- Modify: `src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx`
- Modify: `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx`
- Modify: `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx`
- Modify: `src/pages/workflows/EditWorkflowPage.tsx`

**Interfaces:**
- Consumes: `WorkflowConfigHistoryItem` from `@/types/entity/workflow`; `WorkflowFormRef.replaceYamlConfig(yaml: string)`; `createdBy` / `formatDateTime(..., 'short')`.
- Produces:

```ts
export interface WorkflowVersionHistoryPopupProps {
  visible: boolean
  canWrite: boolean
  currentEditorYaml: string
  history: WorkflowConfigHistoryItem[]
  onHide: () => void
  onRestore: (yamlConfig: string) => void
}
```

- [ ] **Step 1: Rewrite popup unit tests for the new contract**

Replace `src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx` entirely. Drop the `workflowVersions` store mock. Keep Popup / Button / HistoryTab / DiffView mocks (same shape, but HistoryTab mock no longer needs Load more / listStatusText).

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { WorkflowConfigHistoryItem } from '@/types/entity/workflow'

vi.mock('@/router', () => ({ router: {} }))

const historyFixture: WorkflowConfigHistoryItem[] = [
  {
    date: '2026-08-10T12:00:00+00:00',
    yaml_config: 'states: []\n# prior-2',
    created_by: { user_id: 'u2', username: 'bob', name: 'Bob' },
  },
  {
    date: '2026-08-09T12:00:00+00:00',
    yaml_config: 'states: []\n# prior-1',
    created_by: { user_id: 'u3', username: 'carol', name: 'Carol' },
  },
]

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children, headerContent }: any) =>
    visible ? (
      <div data-testid="popup">
        {headerContent}
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/form/VersionedField/VersionedFieldHistoryTab', () => ({
  default: ({
    children,
    options,
    onRestore,
    canRestore,
    emptyPlaceholder,
    onOptionChange,
    selectedOption,
  }: any) => (
    <div data-testid="history-tab">
      {options.length === 0 ? (
        <p>{emptyPlaceholder}</p>
      ) : (
        <>
          <select
            aria-label="Select a version"
            value={selectedOption ?? ''}
            onChange={(e) => onOptionChange(e.target.value)}
          >
            {options.map((o: any) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {canRestore !== false && (
            <button type="button" onClick={onRestore}>
              Restore
            </button>
          )}
          {children}
        </>
      )}
    </div>
  ),
}))

vi.mock('@/components/form/VersionedField/VersionHistoryDiffView', () => ({
  default: ({ historyText, currentText, previousHistoryText, title }: any) => (
    <div data-testid="diff-view">
      <span data-testid="diff-title">{title}</span>
      <span data-testid="diff-history">{historyText}</span>
      <span data-testid="diff-current">{currentText}</span>
      <span data-testid="diff-previous">{previousHistoryText ?? ''}</span>
    </div>
  ),
}))

const renderPopup = (overrides: Record<string, unknown> = {}) => {
  const { default: WorkflowVersionHistoryPopup } = require('../WorkflowVersionHistoryPopup')
  return render(
    <WorkflowVersionHistoryPopup
      visible
      canWrite
      currentEditorYaml="editor-yaml"
      history={historyFixture}
      onHide={vi.fn()}
      onRestore={vi.fn()}
      {...overrides}
    />
  )
}

describe('WorkflowVersionHistoryPopup', () => {
  it('builds FE labels from history length minus index and selects the newest prior', async () => {
    const { default: WorkflowVersionHistoryPopup } = await import('../WorkflowVersionHistoryPopup')
    render(
      <WorkflowVersionHistoryPopup
        visible
        canWrite
        currentEditorYaml="editor-yaml"
        history={historyFixture}
        onHide={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    const select = await screen.findByLabelText('Select a version')
    expect(select).toHaveValue('2026-08-10T12:00:00+00:00::0')
    expect(screen.getByRole('option', { name: /\[02\]/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /\[01\]/ })).toBeInTheDocument()
    expect(screen.queryByTestId('list-status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('diffs selected history YAML against current editor YAML and the next-older entry', async () => {
    const { default: WorkflowVersionHistoryPopup } = await import('../WorkflowVersionHistoryPopup')
    render(
      <WorkflowVersionHistoryPopup
        visible
        canWrite
        currentEditorYaml="unsaved-editor-yaml"
        history={historyFixture}
        onHide={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    expect(await screen.findByTestId('diff-current')).toHaveTextContent('unsaved-editor-yaml')
    expect(screen.getByTestId('diff-history')).toHaveTextContent('states: [] # prior-2')
    expect(screen.getByTestId('diff-previous')).toHaveTextContent('states: [] # prior-1')
  })

  it('hides Restore for READ users', async () => {
    const { default: WorkflowVersionHistoryPopup } = await import('../WorkflowVersionHistoryPopup')
    render(
      <WorkflowVersionHistoryPopup
        visible
        canWrite={false}
        currentEditorYaml="editor-yaml"
        history={historyFixture}
        onHide={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    await screen.findByTestId('diff-view')
    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument()
  })

  it('restores selected yaml_config into the parent without a versions summary', async () => {
    const onRestore = vi.fn()
    const { default: WorkflowVersionHistoryPopup } = await import('../WorkflowVersionHistoryPopup')
    render(
      <WorkflowVersionHistoryPopup
        visible
        canWrite
        currentEditorYaml="editor-yaml"
        history={historyFixture}
        onHide={vi.fn()}
        onRestore={onRestore}
      />
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }))
    expect(onRestore).toHaveBeenCalledWith('states: []\n# prior-2')
  })

  it('shows empty state when history is empty', async () => {
    const { default: WorkflowVersionHistoryPopup } = await import('../WorkflowVersionHistoryPopup')
    render(
      <WorkflowVersionHistoryPopup
        visible
        canWrite
        currentEditorYaml="editor-yaml"
        history={[]}
        onHide={vi.fn()}
        onRestore={vi.fn()}
      />
    )

    expect(await screen.findByText(/No version history available/i)).toBeInTheDocument()
  })
})
```

Remove unused `renderPopup` if the file uses only inline `import()` renders (prefer static import of the component to avoid `require`). Final file should statically import the popup:

```ts
import WorkflowVersionHistoryPopup from '../WorkflowVersionHistoryPopup'
```

- [ ] **Step 2: Run popup tests to verify they fail**

Run: `npm test -- src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx`

Expected: FAIL — tests pass `history` / `onRestore` but the component still requires `workflowId` / `onRestoreRequest` and fetches `/versions`.

- [ ] **Step 3: Rewrite the popup**

Replace `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx` with a props-driven component (keep the existing Apache license header). No store, no paging, no detail GET.

```tsx
import { useEffect, useMemo, useState, type ReactNode } from 'react'

import VersionedFieldHistoryTab, {
  VersionedFieldOption,
} from '@/components/form/VersionedField/VersionedFieldHistoryTab'
import VersionHistoryDiffView from '@/components/form/VersionedField/VersionHistoryDiffView'
import Popup from '@/components/Popup'
import { WorkflowConfigHistoryItem } from '@/types/entity/workflow'
import { createdBy, formatDateTime } from '@/utils/helpers'

export interface WorkflowVersionHistoryPopupProps {
  visible: boolean
  canWrite: boolean
  currentEditorYaml: string
  history: WorkflowConfigHistoryItem[]
  onHide: () => void
  onRestore: (yamlConfig: string) => void
}

const optionValue = (entry: WorkflowConfigHistoryItem, index: number) => `${entry.date}::${index}`

const WorkflowVersionHistoryPopup = ({
  visible,
  canWrite,
  currentEditorYaml,
  history,
  onHide,
  onRestore,
}: WorkflowVersionHistoryPopupProps) => {
  const [selectedValue, setSelectedValue] = useState<string | null>(null)

  const options: VersionedFieldOption[] = useMemo(
    () =>
      history.map((entry, index) => {
        const versionNumber = history.length - index
        return {
          label: `[${String(versionNumber).padStart(2, '0')}] - ${formatDateTime(
            entry.date,
            'short'
          )} - ${createdBy(entry.created_by)}`,
          value: optionValue(entry, index),
        }
      }),
    [history]
  )

  const selectedIndex = useMemo(() => {
    if (!selectedValue) return -1
    return history.findIndex((entry, index) => optionValue(entry, index) === selectedValue)
  }, [history, selectedValue])

  const selectedEntry = selectedIndex >= 0 ? history[selectedIndex] : null
  const previousEntry = selectedIndex >= 0 ? history[selectedIndex + 1] : undefined

  useEffect(() => {
    if (!visible) {
      setSelectedValue(null)
      return
    }
    if (history.length === 0) {
      setSelectedValue(null)
      return
    }
    const stillValid = history.some((entry, index) => optionValue(entry, index) === selectedValue)
    if (!stillValid) {
      setSelectedValue(optionValue(history[0], 0))
    }
  }, [visible, history, selectedValue])

  const title = selectedEntry
    ? `${formatDateTime(selectedEntry.date, 'short')} — ${createdBy(selectedEntry.created_by)}`
    : ''

  let diffContent: ReactNode = null
  if (selectedEntry) {
    diffContent = (
      <VersionHistoryDiffView
        key={optionValue(selectedEntry, selectedIndex)}
        historyText={selectedEntry.yaml_config ?? ''}
        currentText={currentEditorYaml}
        previousHistoryText={previousEntry?.yaml_config}
        title={title}
      />
    )
  }

  return (
    <Popup
      hideFooter
      hideClose={false}
      isFullWidth
      visible={visible}
      onHide={onHide}
      className="h-[90vh] pb-6"
      headerContent={<h2 className="text-lg font-semibold">Version History</h2>}
    >
      <div className="flex flex-col gap-3 h-full pt-2">
        <VersionedFieldHistoryTab
          isLoading={false}
          options={options}
          selectedOption={selectedValue}
          emptyPlaceholder="No version history available"
          canRestore={canWrite}
          onRestore={() => {
            if (selectedEntry?.yaml_config != null) onRestore(selectedEntry.yaml_config)
          }}
          onOptionChange={(value) => setSelectedValue(value)}
        >
          {diffContent}
        </VersionedFieldHistoryTab>
      </div>
    </Popup>
  )
}

export default WorkflowVersionHistoryPopup
```

Do not pass `hasMore` / `onLoadMore` / `listStatusText`.

- [ ] **Step 4: Run popup tests to verify they pass**

Run: `npm test -- src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx`

Expected: PASS. Diff text content may collapse newlines to spaces in `toHaveTextContent` — that is OK.

- [ ] **Step 5: Add the failing EditWorkflowPage restore integration test**

Append a second `describe` to `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx` (keep the existing AI Refine suite). Fixture already has `yaml_config_history`. Use `mockAPI` spies / `fetch` assertions already used by the harness (`@/utils/api` is real in integration).

```tsx
describe('EditWorkflowPage - Version History restore', () => {
  const user = userEvent.setup()

  const createWorkflowFixture = (overrides: Partial<Workflow> = {}): Workflow => ({
    id: 'wf-edit-1',
    slug: 'edit-workflow',
    name: 'Edit Workflow',
    yaml_config: 'states: []',
    yaml_config_history: [
      {
        date: '2026-01-01T00:00:00Z',
        yaml_config: 'states: []\n# v1',
        created_by: { user_id: 'u1', username: 'alice', name: 'Alice' },
      },
    ],
    update_date: '2026-01-02T00:00:00Z',
    user_abilities: ['read', 'write', 'delete'],
    guardrail_assignments: [],
    ...overrides,
  })

  beforeEach(() => {
    ;(mockRouterState as any).params = { id: 'wf-edit-1' }
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    mockAPI('GET', 'v1/workflows/id/wf-edit-1', createWorkflowFixture())
    appInfoStore.configs = [{ id: 'features:workflowAI', settings: { enabled: true } } as any]
    appInfoStore.isConfigFetched = true
  })

  afterEach(() => {
    vi.clearAllMocks()
    ;(mockRouterState as any).params = {}
  })

  it('restores history YAML into the editor without calling rollback', async () => {
    renderPage('/workflows/wf-edit-1/edit')

    const historyButton = await screen.findByRole('button', {
      name: /Version History \(visual editor\)/i,
    })
    await user.click(historyButton)

    await screen.findByRole('heading', { name: 'Version History' })
    await user.click(screen.getByRole('button', { name: 'Restore' }))

    await waitFor(() => {
      expect(toaster.info).toHaveBeenCalledWith('Workflow YAML has been restored successfully!')
    })
    expect(screen.queryByText(/Rollback creates a new current version/i)).not.toBeInTheDocument()
    expect(toaster.success).not.toHaveBeenCalled()

    const { fetch } = await import('@/utils/api')
    const rollbackCalls = vi.mocked(fetch).mock.calls.filter(([url, options]) => {
      const path = String(url)
      const method = String((options as any)?.method ?? 'GET').toUpperCase()
      return method === 'POST' && path.includes('/rollback')
    })
    expect(rollbackCalls).toHaveLength(0)
  })
})
```

If `fetch` is not a `vi.fn` in integration (real fetch + `mockAPI`), assert via `mockAPI` that no handler was registered/hit for `POST v1/workflows/wf-edit-1/versions/.../rollback`. Inspect `src/test-utils/integration.tsx` and match how other tests prove an HTTP method was **not** called (e.g. spy on `global.fetch` if that is what `mockAPI` wraps). Do not add a rollback mock that would succeed — the test must fail today because Restore still POSTs rollback.

- [ ] **Step 6: Run the page test to verify it fails**

Run: `npm test -- src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx`

Expected: FAIL on the new case — Restore still opens the rollback confirm and/or POSTs rollback; toast is still the server copy. Existing AI Refine tests must still pass.

- [ ] **Step 7: Wire EditWorkflowPage**

In `src/pages/workflows/EditWorkflowPage.tsx`:

1. Remove imports: `workflowVersionsStore`, `WorkflowVersionSummary`. Keep `ConfirmationModal` (AI revert).
2. Remove state: `versionListRefreshToken`, `restoreTarget`, `rollbackLoading`.
3. Replace restore handlers:

```tsx
const handleRestoreFromHistory = (yamlConfig: string) => {
  formRef.current?.replaceYamlConfig(yamlConfig)
  setShowVersionHistory(false)
  toaster.info('Workflow YAML has been restored successfully!')
}
```

4. Popup usage:

```tsx
<WorkflowVersionHistoryPopup
  visible={showVersionHistory}
  canWrite={canWrite}
  currentEditorYaml={versionHistoryYaml}
  history={currentWorkflow?.yaml_config_history ?? []}
  onHide={() => setShowVersionHistory(false)}
  onRestore={handleRestoreFromHistory}
/>
```

5. Delete the rollback `ConfirmationModal` block (header `"Restore Version"` / message about discarding unsaved edits). Leave the AI `"Revert to Previous"` modal.

Do not call `reinitializeFromWorkflow` or `fetchWorkflow` on Restore. Do not change Save.

- [ ] **Step 8: Re-run popup unit tests and EditWorkflowPage integration tests**

Run:

```bash
npm test -- src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx
```

Expected: PASS. If the visual-editor header button is not in the integration tree, fall back to `getByRole('button', { name: /Version History/i })` — do not skip the no-rollback assertion.

- [ ] **Step 9: Commit**

```bash
git add \
  src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx \
  src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx \
  src/pages/workflows/EditWorkflowPage.tsx \
  src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx
git commit -m "$(cat <<'EOF'
EPMCDME-8827: Restore workflow YAML from embedded history

EOF
)"
```

Do not stage `vite.config.ts`.

---

### Task 2: Delete the versions API store and types

**Test-first: no — unused client deletion; no new behavior. Prove with grep + existing tests still green.**

**Files:**
- Delete: `src/store/workflowVersions.ts`
- Delete: `src/store/__tests__/workflowVersions.test.ts`
- Delete: `src/types/entity/workflowVersion.ts`

**Interfaces:**
- Consumes: Task 1 removed all production imports of `workflowVersionsStore` / `WorkflowVersionSummary`.
- Produces: no `/v1/workflows/{id}/versions*` client in this repo.

- [ ] **Step 1: Confirm no remaining production imports**

```bash
rg "workflowVersions|workflowVersion" src --glob '!**/__tests__/**'
```

Expected: no matches after Task 1. If anything remains besides the files being deleted, stop and fix Task 1.

- [ ] **Step 2: Delete the three files**

```bash
rm src/store/workflowVersions.ts \
   src/store/__tests__/workflowVersions.test.ts \
   src/types/entity/workflowVersion.ts
```

- [ ] **Step 3: Run unit + the touched integration file**

```bash
npm run test:unit -- src/pages/workflows src/store src/components/form/VersionedField
npm test -- src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx
```

Expected: PASS. `workflowVersions.test.ts` is gone (that was the only `POST .../rollback` assertion). YamlPanel / WorkflowConfigField / VersionHistoryDiffView tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/store/workflowVersions.ts \
  src/store/__tests__/workflowVersions.test.ts \
  src/types/entity/workflowVersion.ts
git commit -m "$(cat <<'EOF'
EPMCDME-8827: Remove workflow versions store and types

EOF
)"
```

---

## Self-review

1. **Spec coverage:** data source (Task 1), FE labels (Task 1), diff vs editor (Task 1), Restore into form (Task 1), no rollback (Task 1+2), hide Restore for READ (Task 1), keep header chrome (untouched files), after-Save refetch (existing Save path), delete store/types/tests (Task 2).
2. **Placeholders:** none — exact props, toast, option value, commands.
3. **Type consistency:** `onRestore(yamlConfig: string)` in popup, tests, and `handleRestoreFromHistory`.
