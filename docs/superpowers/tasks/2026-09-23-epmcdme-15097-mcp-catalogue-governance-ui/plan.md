# MCP Catalogue Governance UI (EPMCDME-15097) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the frontend gaps left after the backend's `mcpCustomServersDisabled` governance toggle went live: confirm the admin settings surface needs no new code, stop a catalogue-referenced MCP server's config from being hand-edited under a single consolidated accessor, and surface the real backend rejection reason instead of a generic message.

**Architecture:** No new pages, routes, or stores. Changes land in three existing seams: (1) the MCP toolkit's restricted-mode accessor and its one remaining unwired consumer (`MCPConfigSection.tsx`), (2) two `catch` blocks in the assistants store, (3) one branch in the workflow-editor's backend error processor.

**Tech Stack:** React 18, TypeScript, Valtio, react-hook-form, Vitest + React Testing Library.

## Global Constraints

- Frontend-only; do not open or edit the sibling `/codemie` backend repo.
- Do not add a new settings page, tab, or route — the existing generic `CustomerConfigurationPage` already renders any declared setting.
- Consolidate only `mcpMode.ts`'s `isMCPRestrictedMode()` and `MCPToolkit.tsx`'s inline duplicate; do not merge in the separately-existing `isFeatureEnabled`/`useFeatureFlag` machinery.
- Do not modify `src/utils/api.ts`'s `formatErrorMessage`/`handleError`, and do not change `AssistantForm.tsx`'s toast call — both are already correct for this ticket.
- No speculative refactors: touch only the files each task below names.
- Commit per task using the repository's existing convention (ticket key + conventional-commit-style subject, matching recent history — do not invent a new format).

## Acceptance criteria

- [ ] Admin/maintainer can view and edit the `mcpCustomServersDisabled` toggle through the existing generic settings-declaration UI; no non-admin/maintainer route exists for it (verified by inspection, Task 1).
- [ ] The three duplicated "is MCP custom-server editing restricted" lookups collapse into one accessor, `isMCPRestrictedMode()` (Task 2).
- [ ] When governance is on, a catalogue-referenced MCP server's connection config cannot be switched to Custom / hand-edited in the assistant builder (Task 3).
- [ ] A rejected assistant create/update save surfaces the real backend validation text, not a generic fallback (Task 4).
- [ ] A rejected workflow-create save (the wrapped `details`-as-string error shape) surfaces the real backend validation text in the visual-editor path (Task 5).

---

### Task 1: Verify AC1/AC2 need no new code; add a regression test

**Files:**
- Modify: `src/pages/settings/administration/__tests__/CustomerConfigurationPage.test.tsx`

**Interfaces:** None — pure test addition, no production code changes.

**Test-first: no — this task adds only a regression test guarding an already-satisfied behavior; there is no production change to drive with a red/green cycle.**

- [ ] **Step 1: Confirm the no-op by inspection**

`CustomerConfigurationPage.tsx` fetches all declarations and renders one `SettingCard` per entry (gated on `isAdmin || isMaintainer`); `SettingCard.tsx` renders `<SchemaForm fields={setting.fields} .../>`; `fieldRegistry.ts` maps field type `switch` → `SwitchField`. Once the backend declares `mcpCustomServersDisabled` (single field `enabled`, type `switch`), it renders and saves automatically. No new tab/page/route is needed for AC1/AC2.

- [ ] **Step 2: Add a regression test using the file's existing `declaration()` fixture helper**

Add a new `it` inside the existing `describe('CustomerConfigurationPage', ...)` block, using the file's own `declaration()` helper and `withSettings()` helper:

```ts
it('renders a switch-only declared setting generically (mcpCustomServersDisabled shape)', async () => {
  const setting = declaration({
    component_id: 'mcpCustomServersDisabled',
    label: 'Restrict to catalog MCP servers',
    description: 'Reject custom MCP server configs platform-wide',
    value: { enabled: false },
    fields: [
      {
        name: 'enabled',
        type: 'switch',
        label: 'Restrict to catalog MCP servers',
        description: null,
        required: false,
        max_length: null,
        pattern: null,
        pattern_message: null,
        markup: 'plain',
      },
    ],
  })
  withSettings([setting])
  render(<CustomerConfigurationPage />)
  await waitFor(() => screen.getByText('Restrict to catalog MCP servers'))
})
```

- [ ] **Step 3: Run it**

Run: `npx vitest run --project unit src/pages/settings/administration/__tests__/CustomerConfigurationPage.test.tsx`
Expected: PASS (this is a regression net, not a fix — no production code changes in this task).

- [ ] **Step 4: Commit**

---

### Task 2: Consolidate the restricted-mode accessor into `isMCPRestrictedMode()`

**Files:**
- Modify: `src/utils/mcpMode.ts`
- Modify: `src/utils/__tests__/mcpMode.test.ts`
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkit.tsx:66-69`
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPToolkit.test.tsx`

**Interfaces:**
- Produces: `isMCPRestrictedMode(configs?: ConfigItem[]): boolean` — defaults to reading `appInfoStore.configs` when called with no argument; accepts an already-read `configs` array (e.g. a Valtio snapshot) to preserve caller reactivity.

**Test-first: yes — mcpMode.test.ts gains a case for the parameterized override; MCPToolkit.test.tsx gains an end-to-end `isRestricted: true` case (currently zero coverage per the technical analysis's Coverage Gaps).**

- [ ] **Step 1: Write the failing tests**

In `src/utils/__tests__/mcpMode.test.ts`, add:

```ts
it('uses the passed configs array instead of the store when provided', () => {
  appInfoStore.configs = []
  const overrideConfigs = [
    { id: MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID, settings: { enabled: true } } as any,
  ]
  expect(isMCPRestrictedMode(overrideConfigs)).toBe(true)
})
```

In `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPToolkit.test.tsx`, add a case (using the file's existing `mockUseSnapshot` pattern) that sets `appInfoStore.configs` to `[{ id: 'mcpCustomServersDisabled', settings: { enabled: true } }]` via `mockUseSnapshot.mockReturnValue({ configs: [...] })` and asserts the "Manual Setup"/"Add Custom" affordance is absent from the rendered output.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/utils/__tests__/mcpMode.test.ts src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPToolkit.test.tsx`
Expected: FAIL — `isMCPRestrictedMode` doesn't yet accept an argument; MCPToolkit still hides nothing based on the mocked config.

- [ ] **Step 3: Implement**

In `src/utils/mcpMode.ts`, change the signature to accept an optional override, defaulting to the live store:

```ts
export const isMCPRestrictedMode = (
  configs: ConfigItem[] = appInfoStore.configs
): boolean => {
  const config = configs.find((c) => c.id === MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID)
  return config?.settings.enabled === true
}
```

(Import `ConfigItem` from `@/types/entity/configuration`.)

In `MCPToolkit.tsx:66-69`, replace the inline `useSnapshot`-based `.some(...)` block with a call to the accessor, keeping the existing `useSnapshot(appInfoStore)` call (for reactivity) and passing its `.configs` through:

```ts
const isRestricted = isMCPRestrictedMode(appInfoSnapshot.configs)
```

Import `isMCPRestrictedMode` from `@/utils/mcpMode` and drop the now-unused `MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID` import if nothing else in the file uses it.

- [ ] **Step 4: Run tests to verify they pass**

Run: same command as Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 3: Force catalogue config read-only under governance in `MCPConfigSection.tsx`

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPConfigSection.tsx`
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkitForm/MCPServerConfigStep.tsx:132-140`
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPConfigSection.test.tsx`
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPServerConfigStep.test.tsx`

**Interfaces:**
- Consumes: `isCatalogRef` — already computed once in `MCPToolkit.tsx` from Task 2's `isRestricted` and already threaded into `MCPServerConfigStep`'s existing `isCatalogRef?: boolean` prop.
- Produces: `MCPConfigSection` gains `isCatalogRef?: boolean` prop.

**Test-first: yes — MCPConfigSection.test.tsx gains a case for `isCatalogRef=true`; MCPServerConfigStep.test.tsx gains a case asserting the prop is forwarded.**

- [ ] **Step 1: Write the failing tests**

In `MCPConfigSection.test.tsx`, add (extending the file's `Wrapper`/`defaultValues` pattern with the new prop and `hasCatalogReference={true}`):

```ts
it('hides the Global/Custom toggle and forces read-only when isCatalogRef is true', () => {
  render(<Wrapper hasCatalogReference isCatalogRef useCustomConfig />)
  expect(screen.queryByText('Custom')).not.toBeInTheDocument()
  expect(screen.getByLabelText(/Configuration \(JSON format\)/i)).toBeDisabled()
})
```

(Extend the local `Wrapper` component's props and `defaultValues` to accept `hasCatalogReference`, `isCatalogRef`, and an initial `useCustomConfig` value, forwarding them into `<MCPConfigSection .../>` and `useForm`'s `defaultValues`.)

In `MCPServerConfigStep.test.tsx`, extend the existing mock of `MCPConfigSection` (the file's established data-testid-stub convention) to also render `data-is-catalog-ref={String(props.isCatalogRef)}`, then add a case asserting that stub attribute is `"true"` when the step is rendered with `isCatalogRef`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPConfigSection.test.tsx src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPServerConfigStep.test.tsx`
Expected: FAIL — `MCPConfigSection` has no `isCatalogRef` prop; the toggle still renders; `MCPServerConfigStep` doesn't forward it.

- [ ] **Step 3: Implement**

In `MCPConfigSection.tsx`, add `isCatalogRef?: boolean` to `MCPConfigSectionProps`, destructure it, and change:
- The read-only computation at line 75: `const isReadOnly = hasCatalogReference && (isCatalogRef || !useCustomConfig)`.
- The toggle's render guard at line 91: change `{hasCatalogReference && (` to `{hasCatalogReference && !isCatalogRef && (` so the Global/Custom `SelectButton` is hidden entirely under governance (matching `MCPActionButtons.tsx`/`MCPEmptyState.tsx`'s existing convention of hiding restricted affordances rather than disabling them — `SelectButton` has no `disabled` prop to lean on).

In `MCPServerConfigStep.tsx:132-140`, add `isCatalogRef={isCatalogRef}` to the `<MCPConfigSection .../>` call, alongside its existing props.

- [ ] **Step 4: Run tests to verify they pass**

Run: same command as Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 4: Surface the real backend message from `createAssistant`/`updateAssistant`

**Files:**
- Modify: `src/store/assistants.ts:776-782` (createAssistant catch) and `:889-895` (updateAssistant catch)
- Modify: `src/store/__tests__/assistants.test.ts`

**Interfaces:** None new — return shape (`{ error, message, assistantId }`) is unchanged; only the string content changes.

**Test-first: yes — assistants.test.ts has zero coverage of createAssistant/updateAssistant today; add a failing case per function.**

- [ ] **Step 1: Write the failing tests**

Add to `src/store/__tests__/assistants.test.ts` (mocking `api.post`/`api.put` to reject with the same `parsedError`-bearing shape `api.ts` attaches to a rejected `Response`):

```ts
import { assistantsStore } from '../assistants'
import { api } from '@/utils/api'

describe('createAssistant error extraction', () => {
  it('surfaces the real backend message via error.parsedError.message', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({ parsedError: { message: 'Custom MCP servers are disabled by platform policy' } })
    const result = await assistantsStore.createAssistant({} as any)
    expect(result.error).toBe('Custom MCP servers are disabled by platform policy')
    expect(result.message).toBe('Custom MCP servers are disabled by platform policy')
  })
})

describe('updateAssistant error extraction', () => {
  it('surfaces the real backend message via error.parsedError.message', async () => {
    vi.spyOn(api, 'put').mockRejectedValue({ parsedError: { message: 'Server "acme-db" is not in the catalogue' } })
    const result = await assistantsStore.updateAssistant('asst-1', {} as any)
    expect(result.error).toBe('Server "acme-db" is not in the catalogue')
    expect(result.message).toBe('Server "acme-db" is not in the catalogue')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --project unit src/store/__tests__/assistants.test.ts`
Expected: FAIL — both assertions receive the generic fallback string instead of the real message.

- [ ] **Step 3: Implement**

In `src/store/assistants.ts`, in `createAssistant`'s catch block (~776-782), replace `error.message ?? 'Failed to create assistant'` in both the `error` and `message` fields with `error?.parsedError?.message ?? error?.message ?? 'Failed to create assistant'` — the exact pattern already used in `src/store/skills.ts:345-350`. Apply the equivalent change in `updateAssistant`'s catch block (~889-895) with its own fallback string (`'Failed to update assistant'`).

- [ ] **Step 4: Run tests to verify they pass**

Run: same command as Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

---

### Task 5: Handle string-shaped `details` in `processBackendError` (workflow-create)

**Files:**
- Modify: `src/utils/workflowEditor/helpers/backendErrorHandler.ts:22-30,63-66`
- Modify: `src/utils/workflowEditor/helpers/__tests__/backendErrorHandler.test.ts`

**Interfaces:**
- Modifies: `WorkflowValidationError.details` type from `{ error_type; message; errors } | undefined` to `string | { error_type; message; errors } | undefined`. `processBackendError`'s signature and `ProcessedWorkflowError` return type are unchanged.

**Test-first: yes — the existing test file (511 lines, object-details coverage only) gains a case for the string-details shape.**

- [ ] **Step 1: Write the failing test**

Add to the `describe('non-validation errors', ...)` block in `backendErrorHandler.test.ts`:

```ts
it('appends string-shaped details (workflow-create wrapped ExtendedHTTPException shape)', () => {
  const error: WorkflowValidationError = {
    message: 'Workflow Configuration error',
    details: 'Custom MCP servers are disabled by platform policy' as any,
    help: '',
  }

  const result = processBackendError(error)

  expect(result.issues).toBeNull()
  expect(result.generalError).toBe(
    'Workflow Configuration error: Custom MCP servers are disabled by platform policy'
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/utils/workflowEditor/helpers/__tests__/backendErrorHandler.test.ts`
Expected: FAIL — `error.details?.message` is `undefined` for a string, so `generalError` is `'Workflow Configuration error'` without the appended text.

- [ ] **Step 3: Implement**

In `backendErrorHandler.ts`, widen the type at lines 22-30:

```ts
export interface WorkflowValidationError {
  message: string
  help?: string
  details?:
    | string
    | {
        error_type: string
        message: string
        errors: WorkflowIssue[]
      }
}
```

Then in `processBackendError` (around line 65), keep the existing object-shaped check and add a string-shaped branch alongside it:

```ts
if (typeof error.details === 'string') {
  generalError += `: ${error.details}`
} else if (error.details?.message) {
  generalError += `: ${error.details.message}`
}
```

(This replaces the single `if (error.details?.message) generalError += ...` line with the two-branch version above; the `error_type`/`errors` narrowing at the top of the function, which only runs for the object shape, is untouched since a string `details` never has `.error_type`.)

- [ ] **Step 4: Run test to verify it passes**

Run: same command as Step 2.
Expected: PASS. Also re-run the full file to confirm no existing object-details case regressed: `npx vitest run --project unit src/utils/workflowEditor/helpers/__tests__/backendErrorHandler.test.ts`.

- [ ] **Step 5: Commit**

---

## Negative-constraint pass

- "Do not touch the backend repo" — no task opens any path outside `codemie-ui`. Honored by all tasks.
- "Do not invent new settings-page UI" — Task 1 is inspection-plus-regression-test only; no page/tab/route file is created or modified. Honored.
- "Do not merge `isMCPRestrictedMode` with `isFeatureEnabled`/`useFeatureFlag`" — Task 2 touches only `mcpMode.ts` and `MCPToolkit.tsx`; `featureFlags.ts`/`useFeatureFlags.ts` are not in any task's Files list. Honored.
- "Do not change `formatErrorMessage`/`handleError` in `api.ts`" — Task 5 touches only `backendErrorHandler.ts`, the workflow-editor-specific processor; `api.ts` is not in any task's Files list. Honored.
- "Do not change `AssistantForm.tsx`'s toast call" — Task 4 touches only `assistants.ts`'s two catch blocks; `AssistantForm.tsx` is not in any task's Files list. Honored.
- "No speculative refactors elsewhere in error handling" — Tasks 4 and 5 each touch exactly the two catch blocks / one function named in scope, nothing broader. Honored.
