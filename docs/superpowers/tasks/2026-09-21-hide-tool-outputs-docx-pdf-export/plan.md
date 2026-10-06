# Concise-by-default DOCX/PDF export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the conversation export menu request a "with tool outputs" DOCX/PDF variant via a
new `include_tool_outputs` query parameter, and add loading/duplicate-click/feedback UI around the
export action. JSON export and all other download call sites stay untouched.

**Architecture:** Two call sites, no new abstractions. `chatsStore.exportChat` grows one optional
boolean parameter that conditionally appends a query-string fragment it already builds by hand.
`ChatHeaderDownloadConversationButton` grows two menu items, an explicit `ariaLabel` override on
the existing `ButtonOverlay`, and a local `isExporting` boolean wired to the trigger `Button`'s
existing `isLoading` prop.

**Tech Stack:** React 18, TypeScript, Valtio store, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-09-21-hide-tool-outputs-docx-pdf-export/spec.md`

## Global Constraints

- Backend contract (assumed, per spec): `include_tool_outputs=true` is appended only for
  `format === 'docx' | 'pdf'`; omitted (falsy) means the concise default; `json` never carries it.
- `api.downloadFileStream`'s signature and its other five call sites (`dataSources.ts`, `files.ts`,
  `workflowExecutions.ts`, `agentWorkspace.ts`) must not change.
- `exportConversationAIMessage` and `ChatAiMessageActions.tsx` are out of scope — do not touch.
- `useChatConfiguration.tsx` / `ChatConfigHideToolOutputs.tsx` (the unrelated live-transcript
  toggle) are out of scope — do not touch.
- No new type is introduced; `ChatExportFormat` in `src/types/chats.ts` is unchanged.
- Commit per task using the repository's existing convention.

---

### Task 1: Store — `exportChat` accepts `includeToolOutputs`

**Files:**
- Modify: `src/store/chats.ts:109` (interface `ChatsStoreType`)
- Modify: `src/store/chats.ts:466-475` (implementation)
- Test: `src/store/__tests__/chats.export.test.ts`

**Interfaces:**
- Produces: `chatsStore.exportChat(format: ChatExportFormat, includeToolOutputs?: boolean): Promise<boolean> | null` — Task 2 calls this with the new second argument.

**Test-first: yes** — new cases asserting the URL gains `&include_tool_outputs=true` for
`docx`/`pdf` when the second arg is `true`, and that `json` never carries it even if `true` is
passed.

- [ ] **Step 1: Write the failing tests** — add to the existing `describe('exportChat', ...)`:

```ts
it('appends include_tool_outputs=true for docx/pdf when requested', async () => {
  const spy = vi.spyOn(api, 'downloadFileStream').mockResolvedValue(true)
  chatsStore.currentChat = { id: 'c1', name: 'Notes', assistantIds: [], assistantData: [], history: [] }

  await chatsStore.exportChat('docx', true)
  expect(spy).toHaveBeenCalledWith(
    'v1/conversations/c1/export?export_format=docx&include_tool_outputs=true', undefined, 'Notes.docx'
  )

  await chatsStore.exportChat('pdf', true)
  expect(spy).toHaveBeenCalledWith(
    'v1/conversations/c1/export?export_format=pdf&include_tool_outputs=true', undefined, 'Notes.pdf'
  )
})

it('never appends include_tool_outputs for json, even if requested', async () => {
  const spy = vi.spyOn(api, 'downloadFileStream').mockResolvedValue(true)
  chatsStore.currentChat = { id: 'c2', name: 'Notes', assistantIds: [], assistantData: [], history: [] }

  await chatsStore.exportChat('json', true)
  expect(spy).toHaveBeenCalledWith('v1/conversations/c2/export?export_format=json', undefined, 'Notes.json')
})
```

- [ ] **Step 2: Run `npx vitest run src/store/__tests__/chats.export.test.ts`** — expect the two
  new cases to FAIL (URL missing the param, or a TS error on the extra argument).

- [ ] **Step 3: Implement.** Change line 109 to
  `exportChat(format: ChatExportFormat, includeToolOutputs?: boolean): any`. In the line 466-475
  body, compute
  `const toolOutputsParam = includeToolOutputs && (format === 'docx' || format === 'pdf') ? '&include_tool_outputs=true' : ''`
  and interpolate it right after `export_format=${format}` in the URL template. No other line changes.

- [ ] **Step 4: Run the same command** — expect all cases (existing + new) to PASS.

- [ ] **Step 5: Commit.**

---

### Task 2: Component — menu items, explicit aria-label, loading/duplicate-click state

**Files:**
- Modify: `src/pages/chat/components/ChatHeader/ChatHeaderDownloadConversationButton.tsx`
- Test: `src/pages/chat/components/ChatHeader/__tests__/ChatHeaderDownloadConversationButton.test.tsx`

**Interfaces:**
- Consumes: `chatsStore.exportChat(format, includeToolOutputs)` from Task 1, via the test file's
  existing `mockChatsStore.exportChat = vi.fn()`.

**Test-first: yes** — new cases: the menu renders five items in order with distinct labels; the
"with tool outputs" items call `exportChat` with `true` and the plain items without it; the
trigger button is disabled while an export promise is pending and re-enabled after.

- [ ] **Step 1: Write the failing tests.** Add `userEvent` (`@testing-library/user-event`) and
  `waitFor` (`@testing-library/react`) to the existing imports, then add:

```tsx
it('renders five menu items in order and requests the right variant', async () => {
  render(<ChatHeaderDownloadConversationButton />)
  await userEvent.click(screen.getByLabelText('Export Conversation'))

  const items = screen.getAllByRole('menuitem')
  expect(items.map((i) => i.textContent)).toEqual([
    'Export to JSON', 'Export to DOCX', 'Export to DOCX (with tool outputs)',
    'Export to PDF', 'Export to PDF (with tool outputs)',
  ])

  await userEvent.click(screen.getByText('Export to DOCX (with tool outputs)'))
  expect(mockChatsStore.exportChat).toHaveBeenCalledWith('docx', true)

  await userEvent.click(screen.getByLabelText('Export Conversation'))
  await userEvent.click(screen.getByText('Export to PDF'))
  expect(mockChatsStore.exportChat).toHaveBeenCalledWith('pdf')
})

it('disables the trigger button while an export is in flight', async () => {
  let resolveExport: (v: boolean) => void = () => {}
  mockChatsStore.exportChat.mockReturnValue(new Promise((r) => (resolveExport = r)))
  render(<ChatHeaderDownloadConversationButton />)
  await userEvent.click(screen.getByLabelText('Export Conversation'))
  await userEvent.click(screen.getByText('Export to DOCX'))

  expect(screen.getByLabelText('Export Conversation')).toBeDisabled()
  resolveExport(true)
  await waitFor(() => expect(screen.getByLabelText('Export Conversation')).not.toBeDisabled())
})
```

- [ ] **Step 2: Run the test file** — expect both new cases to FAIL (missing items, wrong call
  args, or no disabled state).

- [ ] **Step 3: Implement.**
  - `ButtonOverlayProps` (line 28-32): add `ariaLabel?: string`.
  - `ButtonOverlay` (line 34-53): use
    `` ariaLabel ?? `Export your conversation as ${label.split(' ').pop()} format for easy sharing and archiving` ``
    in place of the current unconditional derivation.
  - Add `const [isExporting, setIsExporting] = useState(false)` next to the existing `useState` at line 59.
  - `handleExport` (line 105-116): add a second parameter `includeToolOutputs?: boolean`, pass it
    through to `chatsStore.exportChat(format, includeToolOutputs)`, wrap the call so
    `setIsExporting(true)` runs before it and `setIsExporting(false)` runs in a `finally`, and
    extend the toast text with
    `` `${includeToolOutputs ? ' (with tool outputs)' : ''}` `` before the trailing sentence.
  - Trigger `Button` (line 121-131): add `isLoading={isExporting}`.
  - Menu items (lines 148-163): insert two `ButtonOverlay`s — after the DOCX item, one with
    `label="Export to DOCX (with tool outputs)"`,
    `ariaLabel="Export your conversation as DOCX with tool outputs included for easy sharing and archiving"`,
    `onClick={() => handleExport('docx', true)}`; after the PDF item, the PDF equivalent.

- [ ] **Step 4: Run the test file** — expect all cases (existing four + new two) to PASS.

- [ ] **Step 5: Commit.**

---

## Negative-constraint pass

- "JSON export behavior must remain unchanged" → Task 1's second new test asserts the JSON URL is
  byte-identical to today even if `includeToolOutputs: true` is (incorrectly) passed; Task 2 never
  wires a "with tool outputs" click to `format: 'json'`.
- "a separate export option... available" (not a toggle on the existing item) → Task 2 adds two
  *additional* menu items rather than mutating the existing DOCX/PDF entries' behavior.
- "`api.downloadFileStream`'s signature... unaffected" / other five call sites untouched → neither
  task modifies `src/utils/api.ts`; only the URL string passed into it changes.
- "`exportConversationAIMessage`... unchanged" → no task touches `src/store/chats.ts:508-514` or
  `ChatAiMessageActions.tsx`.
- "the unrelated `hideToolOutputs`... not read, written, or reused" → no task touches
  `useChatConfiguration.tsx` or `ChatConfigHideToolOutputs.tsx`.
- "duplicate-click handling... not possible until the request settles" → Task 2's `isExporting`
  disables the trigger button (which also blocks reopening the menu) for the whole in-flight
  duration, not just until the panel closes.
- No new type, env var, or feature flag is introduced by either task, matching the spec's Non-goals.
