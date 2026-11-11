# EPMCDME-15960: Required list-argument marker in workflow FORM mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Required free-entry list tool arguments (e.g. `exchange_forward.to`) show the same red
asterisk and `aria-required="true"` state in workflow FORM mode that required scalar arguments
already show, without changing optional lists or InputArray's other callers.

**Architecture:** `InputArray` gains an optional `required` prop (default off) that renders a
persistent asterisk next to its own label and forwards `required` to each row's existing `Input`
primitive, reusing `Input`'s already-correct `aria-required="true"` logic instead of inventing a
new one. `DynamicFieldsForm`'s free-entry LIST branch forwards the schema's `required` flag to
`InputArray`, exactly like it already does for `MultiSelect`. `ToolArgumentsForm` and
`CustomNodeArgumentsForm` need no changes — both delegate to `DynamicFieldsForm` — and are proven
by new tests rather than assumed. AC5 (save blocked on empty required list) is pre-existing
behavior in `ToolForm.tsx`; it is proven by a schema-level test, following the repo's own
`VirtualAssistantForm.schema.test.ts` convention, with a single non-behavioral `export` keyword
added so the schema builder is importable.

**Tech Stack:** React 18, TypeScript, Vitest + React Testing Library (`unit` project).

**Spec:** Requirements supplied inline (ticket EPMCDME-15960); no separate spec document. Stage 1
research: `docs/superpowers/tasks/2026-10-23-epmcdme-15960/technical-analysis.md`.

Commit per task using the repository's existing convention (ticket-prefixed commit message).

## Acceptance criteria

- [ ] AC1: Required list arguments without fixed choices show a persistent red asterisk in workflow FORM mode, regardless of how many rows are currently rendered (including zero).
- [ ] AC2: Required array row controls expose `aria-required="true"`. Optional controls do not announce themselves as required (no `aria-required="true"` when `required` is falsy/omitted).
- [ ] AC3: Required state is passed from `DynamicFieldsForm` to `InputArray`.
- [ ] AC4: Both tool-node (`ToolArgumentsForm`) and custom-node (`CustomNodeArgumentsForm`) argument forms honor required list state.
- [ ] AC5: Empty required lists still block saving; populated valid lists allow saving (pre-existing `ToolForm.tsx` behavior — verified, not changed).
- [ ] AC6: Optional list fields and `InputArray`'s existing callers (`ConversationStartersField.tsx`, `KataFormFields.tsx`) stay optional by default — neither is modified.
- [ ] AC7: Regression coverage includes required and optional free-entry lists, modeled on `exchange_forward.to` and `exchange_send.to`.

## Global Constraints

- `InputArray`'s new `required?: boolean` prop must default to falsy/undefined — its two other callers (`ConversationStartersField.tsx`, `KataFormFields.tsx`) are not touched and must keep rendering exactly as today.
- Do not modify `Input.tsx` — its existing asterisk (lines ~126-133) and `aria-required` (line ~191) logic is reused as-is via prop forwarding, not altered.
- No backend changes (`ms_exchange/tools.py`, `config_extractor.py`, `routers/tool.py`) — already correct per the ticket.
- No `FieldAnnouncer`/error-announcement plumbing changes to `InputArray`.

## Review Focus

- Zero-item required list: does the asterisk still show when `value` is `[]`? (AC1 says "persistent" — tied to the label, not to row count.)
- Optional list field rendered through the same `DynamicFieldsForm` branch: no asterisk, no `aria-required="true"` leaks in.
- `ConversationStartersField.tsx` / `KataFormFields.tsx` call sites: confirm neither passes the new `required` prop and neither changes visually (AC6).
- `CustomNodeArgumentsForm` specifically (not just `ToolArgumentsForm`) — the ticket names both, and only a dedicated test proves the second one actually inherits the fix (AC4).
- The AC5 schema test exercises the exact `tool_args.<field>` shape (`{ to: [] }` vs `{ to: ['x'] }`) the real form produces, not a simplified stand-in.

## Negative constraints checked

- "must NOT pass the new prop" (other `InputArray` call sites) — Task 1 does not touch `ConversationStartersField.tsx` or `KataFormFields.tsx`.
- "Optional controls do not announce themselves as required" — Task 1's test asserts the absence of `aria-required="true"` when `required` is omitted.
- "do not 'fix' Input.tsx as part of this task" — no task modifies `Input.tsx`; its existing behavior is reused by forwarding a prop into it.
- "Out of scope: backend... FieldAnnouncer/error-announcement plumbing... other call sites" — no task touches any of these.
- "treat AC5 as verification, not a code change" — Task 4 adds one non-behavioral `export` keyword only (test-support, mirrors the existing `virtualAssistantValidationSchema` export convention); no validation logic changes.

---

### Task 1: `InputArray` gains a `required` prop, persistent asterisk, and row-level `aria-required`

**Files:**
- Modify: `src/components/form/InputArray/InputArray.tsx:27-39` (props), `:104-112` (label), `:140-149` (per-row `Input`)
- Test: `src/components/form/InputArray/__tests__/InputArray.test.tsx` (new)

**Interfaces:**
- Produces: `InputArrayProps.required?: boolean` (default falsy) — consumed by Task 2.

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders a persistent asterisk next to the label when required, even with an empty list', () => {
  render(<InputArray isAIGenerated={false} label="To" value={[]} required onChange={vi.fn()} />)
  expect(screen.getByText('To').parentElement).toHaveTextContent('*')
})

it('does not render an asterisk when required is omitted', () => {
  render(<InputArray isAIGenerated={false} label="To" value={[]} onChange={vi.fn()} />)
  expect(screen.getByText('To').parentElement).not.toHaveTextContent('*')
})

it('exposes aria-required="true" on each row input when required', () => {
  render(<InputArray isAIGenerated={false} label="To" value={['a@b.com']} required onChange={vi.fn()} />)
  expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('aria-required', 'true')
})

it('does not expose aria-required on row inputs when required is omitted', () => {
  render(<InputArray isAIGenerated={false} label="To" value={['a@b.com']} onChange={vi.fn()} />)
  expect(screen.getAllByRole('textbox')[0]).not.toHaveAttribute('aria-required', 'true')
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run --project unit src/components/form/InputArray/__tests__/InputArray.test.tsx`
Expected: FAIL — no `required` prop exists, no asterisk rendered, no `aria-required` forwarded.

- [ ] **Step 3: Implement the prop, asterisk, and forwarding**

Add `required?: boolean` to `InputArrayProps`. In the label block (lines 104-112), render an
asterisk span after the label text when `required` is true, copying the markup/classes from
`Input.tsx:127-133` (`<span className="text-text-error input-label-required ml-0.5" aria-hidden="true">*</span>`).
On the per-row `<Input ... />` call (lines 140-149), add `required={required}` — `Input` already
renders native `required` and literal `aria-required="true"` from this prop (`Input.tsx:184,191`),
so no new ARIA logic is written here.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run --project unit src/components/form/InputArray/__tests__/InputArray.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

**Test-first: yes — asterisk/aria-required presence and absence tests above, written before the `required` prop exists.**

---

### Task 2: `DynamicFieldsForm` forwards `required` to the free-entry `InputArray` branch

**Files:**
- Modify: `src/components/form/DynamicFieldsForm/DynamicFieldsForm.tsx:179-189`
- Test: `src/components/form/DynamicFieldsForm/__tests__/DynamicFieldsForm.test.tsx` (new)

**Interfaces:**
- Consumes: `InputArrayProps.required` from Task 1.

- [ ] **Step 1: Write the failing tests**

Render `DynamicFieldsForm` with a schema containing one free-entry LIST field (`type: 'list'`, no
`values`), named `to` to mirror `exchange_forward.to` / `exchange_send.to`:

```tsx
const schema = { to: { type: 'list', required: true } as DynamicFormFieldSchema }
it('forwards required to InputArray for a required free-entry list field', () => {
  render(<DynamicFieldsForm schema={schema} value={{ to: [] }} onChange={vi.fn()} />)
  expect(screen.getByText('To').parentElement).toHaveTextContent('*')
})

it('does not forward required for an optional free-entry list field', () => {
  const optionalSchema = { to: { type: 'list', required: false } as DynamicFormFieldSchema }
  render(<DynamicFieldsForm schema={optionalSchema} value={{ to: [] }} onChange={vi.fn()} />)
  expect(screen.getByText('To').parentElement).not.toHaveTextContent('*')
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run --project unit src/components/form/DynamicFieldsForm/__tests__/DynamicFieldsForm.test.tsx`
Expected: FAIL — `InputArray` branch does not render an asterisk because `required` is not forwarded.

- [ ] **Step 3: Forward `required`**

Add `required={required}` to the `<InputArray ... />` call at lines 179-189, matching the
`required={required}` already passed to `MultiSelect` at line 174.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run --project unit src/components/form/DynamicFieldsForm/__tests__/DynamicFieldsForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

**Test-first: yes — required/optional forwarding tests above, written before the forward exists.**

---

### Task 3: Verify `ToolArgumentsForm` and `CustomNodeArgumentsForm` inherit the fix (AC4)

**Files:**
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/ToolArgumentsForm.test.tsx` (new)
- Test: `src/pages/workflows/editor/configPanels/components/CustomNodeForm/__tests__/CustomNodeArgumentsForm.test.tsx` (new)

**Interfaces:**
- Consumes: `DynamicFieldsForm`'s forwarding from Task 2 — no production code changes in this task.

- [ ] **Step 1: Write and run `ToolArgumentsForm.test.tsx`**

Mock `assistantsStore.getToolSchema` (via `vi.mock('@/store', ...)`) to resolve
`{ args_schema: { to: { type: 'list', required: true } } }`. Render
`<ToolArgumentsForm toolName="exchange_forward" value={{ to: ['a@b.com'] }} onChange={vi.fn()} />`,
await the schema fetch (`findByText('To')`), and assert the rendered row input has
`aria-required="true"`. Add a second case with `required: false` asserting the attribute is absent.

- [ ] **Step 2: Write and run `CustomNodeArgumentsForm.test.tsx`**

No store mocking needed — `schema` is a prop. Render
`<CustomNodeArgumentsForm schema={{ config_schema: { to: { type: 'list', required: true } } }} value={{ to: ['a@b.com'] }} onChange={vi.fn()} />`
and assert the same `aria-required="true"` on the row input, plus an optional-field case asserting
its absence.

- [ ] **Step 3: Confirm both pass without any source change**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/ToolArgumentsForm.test.tsx src/pages/workflows/editor/configPanels/components/CustomNodeForm/__tests__/CustomNodeArgumentsForm.test.tsx`
Expected: PASS — both forms satisfy AC4 purely by delegating to the fixed `DynamicFieldsForm`.

- [ ] **Step 4: Commit**

**Test-first: no — this is verification-only coverage; both files pass against Task 1/2's
already-implemented fix with no production code to change here.**

---

### Task 4: Verify AC5 — empty required list blocks save, populated list allows it

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/components/ToolForm.tsx:99` (add `export` to the existing `getValidationSchema` function signature only — no logic change)
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/ToolForm.schema.test.ts` (new)

**Interfaces:**
- Consumes: `getValidationSchema(requiredFields: string[])` (existing signature, `ToolForm.tsx:99`), made importable.

- [ ] **Step 1: Write the failing test**

Follow the existing `VirtualAssistantForm.schema.test.ts` pattern of importing the schema builder
directly rather than rendering the whole form:

```ts
it('blocks save when a required list argument is empty', async () => {
  const schema = getValidationSchema(['to'])
  await expect(
    schema.validate({ toolkits: [], mcpServers: [], tool_args: { to: [] } })
  ).rejects.toThrow(/Required fields/)
})

it('allows save when the required list argument is populated', async () => {
  const schema = getValidationSchema(['to'])
  await expect(
    schema.validate({ toolkits: [], mcpServers: [], tool_args: { to: ['a@b.com'] } })
  ).resolves.toBeTruthy()
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/ToolForm.schema.test.ts`
Expected: FAIL — `getValidationSchema` is not exported from `ToolForm.tsx`, import error.

- [ ] **Step 3: Export the existing function (no behavior change)**

Add `export` to `const getValidationSchema = ...` at `ToolForm.tsx:99`. The function body and
validation logic are untouched — this only makes the already-working builder importable, mirroring
how `VirtualAssistantForm.tsx` exports `virtualAssistantValidationSchema` for its own schema test.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/ToolForm.schema.test.ts`
Expected: PASS — proves AC5's save-blocking behavior already holds; no validation logic added.

- [ ] **Step 5: Commit**

**Test-first: yes — reject/resolve assertions above, written before the function is exported (so the import itself fails first).**
