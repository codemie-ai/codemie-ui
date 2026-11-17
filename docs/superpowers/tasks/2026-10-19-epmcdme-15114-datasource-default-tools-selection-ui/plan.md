# Datasource Default Tools Selection (UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the three datasource default tools (`get_repository_file_tree`, `search_code_repo`, `search_kb`) in the assistant and virtual-assistant forms, derive their checked state from context attachment and an author deselection list, enforce standard/with-filtering exclusivity, and persist the deselection list through both forms' save payloads.

**Architecture:** One pure utility module owns the three tool-name constants and the derivation/pairing logic (testable without React). `useToolkitSelection` gains two new mutators built on those utilities. `Toolkit.tsx` is the single rendering surface both forms already share (via `ToolsConfiguration`), so it is the only component that needs new checkbox wiring. Each form then only needs to thread one new field (`deselected_default_tools`) through its existing state/schema and save-payload mapping, exactly like `toolkits` already travels.

**Tech Stack:** React 18, TypeScript 5, react-hook-form, Valtio, Vitest + React Testing Library (`unit` and `integration` projects).

**Spec:** `docs/superpowers/tasks/2026-10-19-datasource-default-tools-selection-ui/spec.md`

## Global Constraints

- The persisted field is `deselected_default_tools: string[]`, default `[]`, a sibling of `toolkits` on the assistant payload (not nested in it) — confirmed by backend MR !4569.
- The only three valid values are `get_repository_file_tree`, `search_code_repo`, `search_kb` — no other name is ever read from or written to the list.
- An unknown name fails the save with the server message `Unknown deselected default tools detected: <sorted, comma-joined names>`; the UI shows it verbatim and keeps the author's unsaved changes.
- The UI must not add any grouping, filtering, or reordering on top of `assistantsStore.availableToolkits` — only render what the backend returns and drive selection state.
- Exclusivity is forward-only (D9): a stored assistant with both the standard and the "with filtering" variant already selected still shows both as selected until the next toggle.
- Deselecting both "Get Repo Tree" and "Search Code" simultaneously is allowed; no minimum-one-selected rule (D10).
- Removing the last datasource of a type never clears that type's entries from `deselected_default_tools` (D8) — the list is a standing decision, independent of current attachment.

## Review Focus

- A pre-existing assistant with `deselected_default_tools` absent (legacy data, field never sent by an older client) must show its default tools selected whenever the matching datasource context is present — absence must not be read as "nothing is attached" or crash on `undefined`.
- Toggling the "with filtering" variant when the standard tool is already in `deselected_default_tools` must not double-add the name (idempotent dedupe), and the reverse toggle must not remove a name that was never present.
- A tool whose label happens to end in "with filtering" in some other, unrelated toolkit (if any) must not be paired by the exclusivity logic — pairing only applies to the three default tool names and their catalog-provided counterpart.
- The save-error path must preserve the toggle the author just made (e.g. just deselected "Search Code") when the backend rejects the whole save, not only the toolkits array.
- Switching between the assistant form and the virtual assistant form must not desync: both must derive the identical checked state for the same `(context, toolkits, deselected_default_tools)` triple, since they share `useToolkitSelection`/`Toolkit.tsx` but keep separate top-level state containers.

---

## Task 1: Add `deselected_default_tools` to the assistant and workflow-config types

**Files:**
- Modify: `src/types/entity/assistant.ts:89-165` (interface `Assistant`), `:454-495` (interface `CreateAssistantDto`)
- Modify: `src/types/workflowEditor/configuration.ts:32-46` (interface `AssistantConfiguration`)

**Interfaces:**
- Produces: `Assistant.deselected_default_tools?: string[]`, `CreateAssistantDto.deselected_default_tools?: string[]`, `AssistantConfiguration.deselected_default_tools?: string[]` — every later task reads/writes this exact field name on these exact types.

**Test-first: no — type-only addition, nothing to assert yet; later tasks' tests fail to compile until this lands.**

- [ ] **Step 1:** Add `deselected_default_tools?: string[]` to `Assistant` (near `toolkits?: AssistantToolkit[]`, assistant.ts:127), to `CreateAssistantDto` (near `toolkits?: ToolKitDetails[]`, assistant.ts:465), and to `AssistantConfiguration` (near `tools?: AssistantTool[]`, configuration.ts:40). One line each, same optional-array style as the neighboring field.
- [ ] **Step 2:** Run `npx tsc --noEmit` (or the project's type-check script) and confirm it still passes.
- [ ] **Step 3: Commit** using the repository's existing commit convention.

---

## Task 2: Default-tool utility module (pure logic)

**Files:**
- Create: `src/utils/defaultDatasourceTools.ts`
- Test: `src/utils/__tests__/defaultDatasourceTools.test.ts`

**Interfaces:**
- Consumes: `ContextType` (`src/types/entity/assistant.ts`, `CODE` / `KNOWLEDGE_BASE`), `AssistantContext`, `AssistantToolkit`, `Tool`.
- Produces (all exported, all pure):
  - `DEFAULT_TOOL_NAME = { CODE_TREE: 'get_repository_file_tree', SEARCH_CODE: 'search_code_repo', SEARCH_KB: 'search_kb' } as const`
  - `isDefaultToolName(name: string): boolean`
  - `getContextTypeForDefaultTool(name: string): ContextType | undefined`
  - `hasContextOfType(context: AssistantContext[] | undefined, type: ContextType): boolean`
  - `isDefaultToolActive(name: string, context: AssistantContext[] | undefined, deselectedDefaultTools: string[] | undefined): boolean` — `true` iff `hasContextOfType(context, getContextTypeForDefaultTool(name))` and `name` is not in `deselectedDefaultTools`.
  - `findExclusivePairTool(toolkit: AssistantToolkit, tool: Tool): Tool | undefined` — given a tool, finds its standard/"with filtering" counterpart within the same `toolkit.tools` list by label (`"<label> with filtering"` ↔ `"<label>"`), restricted to pairs where one side `isDefaultToolName`.

**Test-first: yes — write these first (TDD), then implement:**

- [ ] **Step 1: Write the failing tests**

```ts
describe('isDefaultToolName', () => {
  it('is true only for the three deselectable tool ids', () => {
    expect(isDefaultToolName('get_repository_file_tree')).toBe(true)
    expect(isDefaultToolName('search_code_repo')).toBe(true)
    expect(isDefaultToolName('search_kb')).toBe(true)
    expect(isDefaultToolName('get_repository_file_tree_v2')).toBe(false)
  })
})

describe('isDefaultToolActive', () => {
  it('is false when no matching context is attached, regardless of deselected list', () => {
    expect(isDefaultToolActive('search_kb', [], [])).toBe(false)
  })

  it('is true when the matching context is attached and the tool is not deselected', () => {
    const context = [{ name: 'kb-1', context_type: ContextType.KNOWLEDGE_BASE, id: '1' }]
    expect(isDefaultToolActive('search_kb', context, [])).toBe(true)
  })

  it('is false when the tool is in deselected_default_tools even with matching context', () => {
    const context = [{ name: 'repo-1', context_type: ContextType.CODE, id: '1' }]
    expect(isDefaultToolActive('get_repository_file_tree', context, ['get_repository_file_tree'])).toBe(false)
  })

  it('treats an undefined deselected list the same as an empty one (legacy assistants)', () => {
    const context = [{ name: 'repo-1', context_type: ContextType.CODE, id: '1' }]
    expect(isDefaultToolActive('search_code_repo', context, undefined)).toBe(true)
  })
})

describe('findExclusivePairTool', () => {
  const standard = { name: 'get_repository_file_tree', label: 'Get Repo Tree', settings_config: false, tool: null }
  const filtering = { name: 'get_repository_file_tree_v2', label: 'Get Repo Tree with filtering', settings_config: false, tool: null }
  const unrelated = { name: 'search_jira', label: 'Search Jira', settings_config: false, tool: null }
  const toolkit = { toolkit: 'codebase', label: 'Codebase Tools', tools: [standard, filtering, unrelated], settings_config: false, is_external: false }

  it('finds the "with filtering" variant from the standard tool', () => {
    expect(findExclusivePairTool(toolkit, standard)).toBe(filtering)
  })

  it('finds the standard tool from the "with filtering" variant', () => {
    expect(findExclusivePairTool(toolkit, filtering)).toBe(standard)
  })

  it('returns undefined for a tool with no default-tool pair', () => {
    expect(findExclusivePairTool(toolkit, unrelated)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests, verify they fail** (`npx vitest run --project unit src/utils/__tests__/defaultDatasourceTools.test.ts`) with "Cannot find module" / `is not a function`.
- [ ] **Step 3: Implement `src/utils/defaultDatasourceTools.ts`** per the signatures above. `getContextTypeForDefaultTool` maps `CODE_TREE`/`SEARCH_CODE` → `ContextType.CODE`, `SEARCH_KB` → `ContextType.KNOWLEDGE_BASE`. `findExclusivePairTool` strips/appends the literal suffix `' with filtering'` on `tool.label` and looks up the sibling by exact label match in `toolkit.tools`, only pairing when at least one side is `isDefaultToolName`.
- [ ] **Step 4: Run tests, verify they pass.**
- [ ] **Step 5: Commit.**

---

## Task 3: Extend `useToolkitSelection` with default-tool toggle and exclusivity sync

**Files:**
- Modify: `src/hooks/useToolkitSelection.ts`
- Test: `src/hooks/__tests__/useToolkitSelection.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `isDefaultToolName`, `findExclusivePairTool` from Task 2 (`@/utils/defaultDatasourceTools`).
- Produces (new props and returns on `useToolkitSelection`):
  - New prop `deselectedDefaultTools?: string[]`
  - New prop `onDeselectedDefaultToolsChange?: (next: string[]) => void`
  - New return `toggleDefaultTool(toolkit: AssistantToolkit, tool: Tool): void` — flips `tool.name` in/out of `deselectedDefaultTools`; when the toggle *selects* the default tool (removes it from the list) and `findExclusivePairTool(toolkit, tool)` is currently present in `selectedToolkits`, removes that pair tool via the existing `updateSelectedToolkits`.
  - New return `toggleToolAndSyncDefaults(toolkit: AssistantToolkit, tool: Tool, isSingleSelection: boolean): void` — calls `toggleSingleTool`/`toggleMultiTool` as today based on `isSingleSelection`; when this toggle newly *selects* `tool` and `findExclusivePairTool(toolkit, tool)` is an `isDefaultToolName` tool not already in `deselectedDefaultTools`, appends it.

**Test-first: yes — write these first, then implement:**

- [ ] **Step 1: Write the failing tests** (append to `src/hooks/__tests__/useToolkitSelection.test.ts`, reusing its `makeTool`/`makeToolkit` helpers):

```ts
describe('toggleDefaultTool', () => {
  it('adds the tool name to deselectedDefaultTools when it is not already there', () => {
    const toolkit = makeToolkit('codebase', [makeTool('get_repository_file_tree')])
    const onDeselectedDefaultToolsChange = vi.fn()
    const { result } = renderHook(() =>
      useToolkitSelection({
        selectedToolkits: [],
        onToolkitsChange,
        deselectedDefaultTools: [],
        onDeselectedDefaultToolsChange,
      })
    )

    act(() => result.current.toggleDefaultTool(toolkit, toolkit.tools[0]))

    expect(onDeselectedDefaultToolsChange).toHaveBeenCalledWith(['get_repository_file_tree'])
  })

  it('removes the tool name and deselects its selected "with filtering" pair', () => {
    const standard = makeTool('get_repository_file_tree')
    standard.label = 'Get Repo Tree'
    const filtering = makeTool('get_repository_file_tree_v2')
    filtering.label = 'Get Repo Tree with filtering'
    const toolkit = makeToolkit('codebase', [standard, filtering])
    const selected = { ...toolkit, tools: [filtering] }
    const onDeselectedDefaultToolsChange = vi.fn()
    const { result } = renderHook(() =>
      useToolkitSelection({
        selectedToolkits: [selected],
        onToolkitsChange,
        deselectedDefaultTools: ['get_repository_file_tree'],
        onDeselectedDefaultToolsChange,
      })
    )

    act(() => result.current.toggleDefaultTool(toolkit, standard))

    expect(onDeselectedDefaultToolsChange).toHaveBeenCalledWith([])
    expect(onToolkitsChange).toHaveBeenCalledWith([])
  })
})

describe('toggleToolAndSyncDefaults', () => {
  it('selecting the "with filtering" variant deselects its default-tool pair', () => {
    const standard = makeTool('search_code_repo')
    standard.label = 'Search Code'
    const filtering = makeTool('search_code_repo_v2')
    filtering.label = 'Search Code with filtering'
    const toolkit = makeToolkit('codebase', [standard, filtering])
    const onDeselectedDefaultToolsChange = vi.fn()
    const { result } = renderHook(() =>
      useToolkitSelection({
        selectedToolkits: [],
        onToolkitsChange,
        deselectedDefaultTools: [],
        onDeselectedDefaultToolsChange,
      })
    )

    act(() => result.current.toggleToolAndSyncDefaults(toolkit, filtering, false))

    expect(onDeselectedDefaultToolsChange).toHaveBeenCalledWith(['search_code_repo'])
  })

  it('does not touch deselectedDefaultTools for a tool with no default pair', () => {
    const tool = makeTool('search_jira')
    const toolkit = makeToolkit('jira', [tool])
    const onDeselectedDefaultToolsChange = vi.fn()
    const { result } = renderHook(() =>
      useToolkitSelection({
        selectedToolkits: [],
        onToolkitsChange,
        deselectedDefaultTools: [],
        onDeselectedDefaultToolsChange,
      })
    )

    act(() => result.current.toggleToolAndSyncDefaults(toolkit, tool, false))

    expect(onDeselectedDefaultToolsChange).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests, verify they fail** (`npx vitest run --project unit src/hooks/__tests__/useToolkitSelection.test.ts`).
- [ ] **Step 3: Implement** `toggleDefaultTool` and `toggleToolAndSyncDefaults` in `useToolkitSelection.ts`, reading `deselectedDefaultTools ?? []` throughout so an absent list behaves as empty.
- [ ] **Step 4: Run tests, verify they pass** (full file, not just the new tests — confirm no regression in the existing `updateSelectedToolkits`/`toggleMultiTool` suites).
- [ ] **Step 5: Commit.**

---

## Task 4: Wire `Toolkit.tsx` to default-tool checked state and the new toggles

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/Toolkit.tsx:34-80` (props + `isToolSelected`), `:212-219` (checkbox `onChange`)
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/AvailableToolsSection.tsx:34-47` (`ToolkitRenderProps` interface — add the two new fields)
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/ToolsConfiguration.tsx:50-73` (props), `:94-145` (destructure + pass through), `:199-231` (`toolkitRenderProps` object)
- Test: `src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/Toolkit.defaultTools.test.tsx` (new)

**Interfaces:**
- Consumes: `isDefaultToolActive`, `isDefaultToolName` (Task 2); `toggleDefaultTool`, `toggleToolAndSyncDefaults` (Task 3).
- Produces: `ToolsConfiguration` gains two new props — `context: AssistantContext[] | undefined` and `deselectedDefaultTools: string[]` plus `onDeselectedDefaultToolsChange: (next: string[]) => void` — which both calling forms (Tasks 6 and 7) must pass in.

**Test-first: yes — write the failing test first:**

- [ ] **Step 1: Write the failing test** in the new file, rendering `Toolkit` directly (same direct-mount pattern as the sibling `__tests__/IntegrationSelectDropdown.test.tsx`) with a toolkit containing the standard and "with filtering" Codebase tools:

```tsx
it('shows the default tool unchecked with no matching context and checked once one is attached', () => {
  const standard = { name: 'get_repository_file_tree', label: 'Get Repo Tree', settings_config: false, tool: null }
  const toolkit = { toolkit: 'codebase', label: 'Codebase Tools', tools: [standard], settings_config: false, is_external: false }

  const { rerender } = render(
    <Toolkit
      toolkit={toolkit}
      selectedToolkits={[]}
      context={[]}
      deselectedDefaultTools={[]}
      settings={{}}
      toggleTool={vi.fn()}
      toggleDefaultTool={vi.fn()}
      toggleAllTools={vi.fn()}
      updateToolSetting={vi.fn()}
      updateToolkitSetting={vi.fn()}
      onAddSettingClick={vi.fn()}
    />
  )
  expect(screen.getByLabelText('Get Repo Tree')).not.toBeChecked()

  rerender(
    <Toolkit
      toolkit={toolkit}
      selectedToolkits={[]}
      context={[{ name: 'repo', context_type: ContextType.CODE, id: '1' }]}
      deselectedDefaultTools={[]}
      settings={{}}
      toggleTool={vi.fn()}
      toggleDefaultTool={vi.fn()}
      toggleAllTools={vi.fn()}
      updateToolSetting={vi.fn()}
      updateToolkitSetting={vi.fn()}
      onAddSettingClick={vi.fn()}
    />
  )
  expect(screen.getByLabelText('Get Repo Tree')).toBeChecked()
})

it('calls toggleDefaultTool, not toggleTool, when a default tool checkbox is clicked', async () => {
  // same toolkit as above, context already attached, deselectedDefaultTools: []
  // user.click the checkbox, assert toggleDefaultTool called with (toolkit, standard)
  // and toggleTool was not called
})
```

- [ ] **Step 2: Run the test, verify it fails** (`npx vitest run --project unit src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/Toolkit.defaultTools.test.tsx`) — missing `context`/`toggleDefaultTool` props.
- [ ] **Step 3: Add the new props to `ToolkitProps`** in `Toolkit.tsx`: `context?: AssistantContext[]`, `deselectedDefaultTools?: string[]`, `toggleDefaultTool: (toolkit: AssistantToolkit, tool: Tool) => void`. Change `isToolSelected` so that when `isDefaultToolName(tool.name)` it returns `isDefaultToolActive(tool.name, context, deselectedDefaultTools)` instead of checking `selectedToolkit?.tools`; otherwise keep the current lookup unchanged.
- [ ] **Step 4: Route the checkbox `onChange`** (Toolkit.tsx:212-219): when `isDefaultToolName(tool.name)` call `toggleDefaultTool(toolkit, tool)`, otherwise keep calling the existing `toggleTool(toolkit, tool)` — but have the caller (`ToolsConfiguration.tsx`) pass `toggleToolAndSyncDefaults` bound with `singleToolSelection` as the `toggleTool` prop instead of the raw `toggleSingleTool`/`toggleMultiTool`, so non-default toggles keep syncing exclusivity.
- [ ] **Step 5: Thread `context`, `deselectedDefaultTools`, `toggleDefaultTool`** through `ToolkitRenderProps` (`AvailableToolsSection.tsx`) and through `ToolsConfiguration`'s props/destructure/`toolkitRenderProps` `useMemo`, using the hook from Task 3 (`useToolkitSelection({ selectedToolkits, onToolkitsChange, deselectedDefaultTools, onDeselectedDefaultToolsChange })`) in place of the current call, and passing `toggleTool: singleToolSelection ? toggleSingleTool-replacement : toggleMultiTool-replacement` as `(toolkit, tool) => toggleToolAndSyncDefaults(toolkit, tool, singleToolSelection)`.
- [ ] **Step 6: Run the test, verify it passes.**
- [ ] **Step 7: Commit.**

---

## Task 5: Map `deselected_default_tools` in `transformAssistantToCreateDTO`

**Files:**
- Modify: `src/store/utils/assistants.ts:44-109`
- Test: `src/store/utils/__tests__/assistants.test.ts` (extend existing suite for `transformAssistantToCreateDTO`)

**Interfaces:**
- Consumes: `Assistant.deselected_default_tools` (Task 1).
- Produces: `CreateAssistantDto.deselected_default_tools` always present (defaults to `[]`) in the transform's output — the exact field both `createAssistant` and `updateAssistant` (`src/store/assistants.ts:763-879`) send to the backend.

**Test-first: yes:**

- [ ] **Step 1: Write the failing test** in `src/store/utils/__tests__/assistants.test.ts`:

```ts
it('includes deselected_default_tools in the create DTO, defaulting to []', () => {
  const dto = transformAssistantToCreateDTO({ ...baseAssistant, deselected_default_tools: ['search_kb'] })
  expect(dto.deselected_default_tools).toEqual(['search_kb'])
})

it('defaults deselected_default_tools to [] when the assistant has none', () => {
  const dto = transformAssistantToCreateDTO({ ...baseAssistant, deselected_default_tools: undefined })
  expect(dto.deselected_default_tools).toEqual([])
})
```

(Reuse whatever minimal `Assistant` fixture the existing describe block already builds; name it to match.)

- [ ] **Step 2: Run the test, verify it fails** (`npx vitest run --project unit src/store/utils/__tests__/assistants.test.ts`).
- [ ] **Step 3: Add `deselected_default_tools: assistant.deselected_default_tools ?? [],` to the object returned by `transformAssistantToCreateDTO`** (assistants.ts, alongside the `toolkits` mapping at line ~58-78).
- [ ] **Step 4: Run the test, verify it passes.**
- [ ] **Step 5: Commit.**

---

## Task 6: Wire `AssistantForm.tsx` — state, save payload, and save-error retention

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:230` (new state), `:323-366` (`prepareFormData`), `:374-379` (new change handler alongside `handleToolkitsChange`), `:666-679` (`ContextSelector` — pass `context` value down to `ToolsConfiguration`), `:878-883` (`ToolsConfiguration` render — pass `context`, `deselectedDefaultTools`, `onDeselectedDefaultToolsChange`)
- Test: `src/pages/assistants/__tests__/AssistantForm.defaultTools.integration.test.tsx` (new, using the `renderPage`/`mockAPI` integration harness already used by `AssistantDetailsPage.integration.test.tsx`, routed through the Edit Assistant page)

**Interfaces:**
- Consumes: `ToolsConfiguration`'s new `context`/`deselectedDefaultTools`/`onDeselectedDefaultToolsChange` props (Task 4); `CreateAssistantDto.deselected_default_tools` (Task 5, reached via `transformAssistantToCreateDTO` inside `assistantsStore.updateAssistant`).
- Produces: the object returned by `prepareFormData()` always carries `deselected_default_tools: string[]`, which the existing `onSubmit`/`assistantsStore.updateAssistant` already forwards to the backend.

**Test-first: yes:**

- [ ] **Step 1: Write the failing integration test** — load the Edit Assistant page for an assistant fixture with a CODE context already attached and `deselected_default_tools: []`, assert the "Get Repo Tree" checkbox renders checked; uncheck it; submit; assert the PUT request body includes `deselected_default_tools: ['get_repository_file_tree']`. Then mock the PUT to reject with `{ error: 'Unknown deselected default tools detected: bogus_tool' }` on a second save attempt and assert (a) that exact message is shown via the existing error toast and (b) the checkbox the author unchecked is still unchecked (state not reset).
- [ ] **Step 2: Run the test, verify it fails** (`npx vitest run --project integration src/pages/assistants/__tests__/AssistantForm.defaultTools.integration.test.tsx`).
- [ ] **Step 3: Implement the wiring:**
  - Add `const [deselectedDefaultTools, setDeselectedDefaultTools] = useState<string[]>(assistant?.deselected_default_tools ?? [])` next to the `toolkits` state (line 230).
  - Add `const handleDeselectedDefaultToolsChange = useCallback((next: string[]) => setDeselectedDefaultTools(next), [])` next to `handleToolkitsChange` (line 374-379).
  - In `prepareFormData` (line 325-330), add `deselected_default_tools: deselectedDefaultTools` to `preparedValues`.
  - Pass `context={watch('context') as AssistantContext[]}`, `deselectedDefaultTools={deselectedDefaultTools}`, `onDeselectedDefaultToolsChange={handleDeselectedDefaultToolsChange}` into the `<ToolsConfiguration>` element at line 878-883.
- [ ] **Step 4: Run the test, verify it passes.**
- [ ] **Step 5: Commit.**

---

## Task 7: Wire `VirtualAssistantForm.tsx` and `AssistantTab.tsx` for the workflow-embedded assistant

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx:114-129` (`virtualAssistantValidationSchema`), `:131-140` (`getDefaultValues`), `:258-270` (new change handler alongside `handleToolkitsChange`), `:404-437` (`ContextSelector`/`ToolsConfiguration` render — pass `context`/`deselectedDefaultTools`/`onDeselectedDefaultToolsChange`)
- Modify: `src/pages/workflows/editor/configPanels/AssistantTab.tsx:219-233` (`finalAssistantConfig` for the virtual-assistant branch)
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts` (extend existing suite)

**Interfaces:**
- Consumes: `ToolsConfiguration`'s `context`/`deselectedDefaultTools`/`onDeselectedDefaultToolsChange` props (Task 4); `AssistantConfiguration.deselected_default_tools` (Task 1).
- Produces: `VirtualAssistantForm`'s exposed `getValues()` (via `useImperativeHandle`, line 232-256) includes `deselected_default_tools: string[]`, which `AssistantTab.tsx` copies onto `finalAssistantConfig`.

**Test-first: yes:**

- [ ] **Step 1: Write the failing schema test**, appended to `VirtualAssistantForm.schema.test.ts`:

```ts
it('defaults deselected_default_tools to [] when omitted', async () => {
  const result = await virtualAssistantValidationSchema.validate({
    ...baseValues,
  })
  expect(result.deselected_default_tools).toEqual([])
})

it('accepts an explicit deselected_default_tools list', async () => {
  const result = await virtualAssistantValidationSchema.validate({
    ...baseValues,
    deselected_default_tools: ['search_kb'],
  })
  expect(result.deselected_default_tools).toEqual(['search_kb'])
})
```

- [ ] **Step 2: Run the test, verify it fails** (`npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/VirtualAssistantForm.schema.test.ts`).
- [ ] **Step 3: Implement:**
  - Add `deselected_default_tools: Yup.array().of(Yup.string()).default([])` to `virtualAssistantValidationSchema` (line ~114-128).
  - Add `deselected_default_tools: config?.deselected_default_tools ?? []` to `getDefaultValues` (line ~131-140).
  - Add `const handleDeselectedDefaultToolsChange = useCallback((next: string[]) => setValue('deselected_default_tools', next, { shouldValidate: true }), [setValue])` next to `handleToolkitsChange` (line ~258-263).
  - Pass `context={watch('context')}`, `deselectedDefaultTools={watch('deselected_default_tools') ?? []}`, `onDeselectedDefaultToolsChange={handleDeselectedDefaultToolsChange}` into the `<ToolsConfiguration>` element (line ~429-436).
  - In `AssistantTab.tsx`'s virtual-assistant branch (line 219-233), add `deselected_default_tools: virtualAssistantValues.deselected_default_tools ?? [],` to `finalAssistantConfig`.
- [ ] **Step 4: Run the test, verify it passes.**
- [ ] **Step 5: Commit.**

---

## Self-Review Notes

**Spec coverage:**
- Listing (Codebase/KB groups) — no task needed; backend-driven, explicitly out of scope for new UI logic (Global Constraints).
- Selection source of truth / legacy absence-means-selected — Task 2 (`isDefaultToolActive`) + Task 4 (`isToolSelected` branch) + Review Focus item 1.
- Auto-select on attach / D5/D8 — implemented as *derived* state (`isDefaultToolActive` recomputes from `context` on every render), not an imperative handler; Task 2's tests cover the 0→1 transition and the "stays deselected" case directly. No separate "auto-select" task exists because there is no separate code path — documented here so an implementer does not go looking for one.
- Exclusivity / D9/D10 — Task 2 (`findExclusivePairTool`) + Task 3 (`toggleDefaultTool`, `toggleToolAndSyncDefaults`); D9 (no retroactive enforcement) falls out of the design because pairing only ever runs inside a toggle handler, never on load.
- Persistence through both forms — Tasks 5, 6, 7.
- Save errors verbatim + state retention — Task 6's integration test.
- Virtual assistant parity — Task 7, sharing Tasks 2-4's logic.

**Review Focus coverage:** all five items map to an owning task's test (items 1 and 2 → Task 2/3 unit tests; item 3 → Task 2's `findExclusivePairTool` "unrelated tool" test; item 4 → Task 6's integration test; item 5 is structural — both forms call the same Task 3/4 code, which is the point of extending the shared hook/component rather than forking logic).

**Negative-constraints pass:**
- "No new grouping/filtering/reordering logic" (spec Listing section) — honored: no task touches `assistantsStore.availableToolkits` fetch or sort order; Task 4 only changes checked-state and toggle wiring.
- "Not a replacement for the existing `AssistantToolkit.tools` selection rule" (spec Selection source of truth) — honored: Task 4 only special-cases the three default tool names in `isToolSelected`; every other tool keeps the existing `selectedToolkit.tools` lookup unchanged.
- "No minimum-one-selected rule" (D10) — honored: no task adds validation preventing both defaults from being deselected simultaneously.
- "Do not clear the deselected list when the last datasource of a type is removed" (D8) — honored: no task adds any code that reacts to context *removal*; the list only changes inside the two toggle handlers (Task 3).
- "No retroactive exclusivity enforcement on load" (D9) — honored: Task 3's functions only run from a user toggle; nothing runs the pairing check on mount/load.
- Non-goals (backend/SDK changes, per-datasource selection, new tools/provider/Git/MCP UI, workflow YAML `exclude_extra_context_tools` setting) — no task touches the backend, `exclude_extra_context_tools`, provider/Git/MCP selection code, or introduces new tool catalog entries.

**Proportion check:** 7 tasks, all but Task 1 test-first; two short plumbing tasks (6, 7) carry no new branching logic beyond what Tasks 2-4 already proved, kept to a single implementation step each.
