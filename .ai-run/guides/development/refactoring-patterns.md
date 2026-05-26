# Refactoring Patterns

> When and how to split large components in CodeMie UI.

---

## Hard Limit: 300 Lines Per Component

Every component file must stay under 300 lines. Start planning the split when approaching 250 lines.

**Never delete functionality during refactoring.** Refactoring = restructuring, not removal. Only delete code when the user explicitly requests it or after verifying with `grep -r 'SymbolName' src/` that it is 100% unused.

---

## When to Refactor

| Signal | Action |
|--------|--------|
| Component approaching 300 lines | Plan a split now |
| Same JSX block repeated 2+ times | Extract sub-component |
| `useState`/`useEffect` logic > ~50 lines | Extract custom hook |
| Multiple unrelated responsibilities | Separate into focused components |
| Form validation schema inline | Move to `formSchema.ts` |
| TypeScript types inline | Move to `formTypes.ts` |

---

## Strategy 1 — Extract Sub-Components

Apply when a large component has distinct, renderable sections (header, body, footer; list item; card; etc.).

**Before** (single file, 350+ lines):
```tsx
const MyModal = () => (
  <Popup>
    {/* ~100 lines of header */}
    {/* ~100 lines of body */}
    {/* ~100 lines of footer */}
  </Popup>
)
```

**After**:
```tsx
const MyModal = () => (
  <Popup>
    <MyModalHeader />
    <MyModalBody />
    <MyModalFooter />
  </Popup>
)
```

File structure after extraction:
```
components/MyModal/
├── index.tsx          # thin orchestrator, < 60 lines
├── MyModalHeader.tsx  # header section
├── MyModalBody.tsx    # body section
└── MyModalFooter.tsx  # footer + action buttons
```

Each sub-component file stays under 150 lines. Sub-components receive only the props they actually use — avoid passing the entire parent state as one large object.

---

## Strategy 2 — Extract to Custom Hook

Apply when a component has significant imperative logic: multiple `useState` declarations, `useEffect` blocks, event handlers, or data transformation.

**Before** (logic and JSX mixed):
```tsx
const MyModal = ({ visible, onHide }) => {
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({})
  // ...50+ lines of handlers and effects
  return <Popup>...</Popup>
}
```

**After** (logic separated):
```tsx
const MyModal = ({ visible, onHide }) => {
  const { step, formData, handleNext, handleSubmit } = useMyModal(visible, onHide)
  return <Popup>...</Popup>
}
```

Hook file (`hooks/useMyModal.ts`) contains all state, effects, and handlers. The component file shrinks to JSX + hook call.

Hook naming: `use` + component name + optional suffix (e.g. `useAssistantForm`, `useWorkflowEditor`).

Place in `src/hooks/` if reusable across multiple components, or co-locate in the component folder if single-use.

---

## Strategy 3 — Extract Schema and Type Files

Apply to form-heavy components where inline schemas and types bloat the file.

**Target file structure**:
```
pages/assistants/
├── AssistantForm/
│   ├── index.tsx         # component, < 200 lines
│   ├── formSchema.ts     # Yup validation schema
│   ├── formTypes.ts      # TypeScript interfaces
│   └── formHelpers.ts    # pure transformation functions
```

`formSchema.ts` — Yup schema only, imports from `@/constants` for limits.
`formTypes.ts` — `interface FormData`, `type FormStep`, etc.
`formHelpers.ts` — pure functions: `buildPayload(data)`, `mapResponseToForm(response)`.

---

## Refactoring Sequence

Follow this order to avoid breaking the component mid-refactor:

1. **Identify** which strategy applies (sub-component / hook / schema).
2. **Create** the new file alongside the existing one.
3. **Move** the code — cut from source, paste into new file.
4. **Import** the new export back into the source file.
5. **Verify** the component still renders correctly (run `npm run test:unit`).
6. **Repeat** for each section until the main file is under 300 lines.

Never attempt to split and rename simultaneously in the same step — it makes diffs unreadable and errors hard to trace.

---

## Sub-Component Guidelines

| Rule | Rationale |
|------|-----------|
| Each sub-component has a single responsibility | Easier to test and replace |
| Props typed with a dedicated interface | Prevents implicit coupling |
| No direct store access in leaf sub-components | Keep store access at the page/feature level |
| Sub-components under 150 lines | Leave room to grow without triggering another split |

---

## Custom Hook Guidelines

| Rule | Rationale |
|------|-----------|
| Return a plain object with named fields | Clear contract, easy destructuring |
| Hook owns its state — do not pass `setState` as a prop | Encapsulation |
| Clean up side effects in `useEffect` return | Prevent memory leaks |
| Accept only the minimal inputs needed | Reduces coupling |

---

## DO / DON'T

| DON'T | DO |
|-------|----|
| Leave component at 400+ lines | Split before it grows further |
| Delete code "to clean up" without verification | `grep` first, or ask the user |
| Pass entire parent state object to sub-components | Pass only required props |
| Put reusable hooks inside a component file | Move to `src/hooks/` |
| Mix Yup schema and component JSX | Extract to `formSchema.ts` |
| Rename + move in the same commit | One change at a time |
| Extract every tiny helper | Only extract when it reduces line count meaningfully |

---

## Combining Strategies

Real-world refactors usually combine all three strategies. Example: a 420-line `AssistantForm.tsx`:

```
Before:
AssistantForm.tsx (420 lines) — JSX + handlers + Yup schema + types

After:
AssistantForm/
├── index.tsx           (~120 lines) — JSX only, calls hook
├── useAssistantForm.ts  (~90 lines) — state, submit handler, effects
├── formSchema.ts        (~40 lines) — Yup schema + resolver
├── formTypes.ts         (~30 lines) — FormData interface, StepType
└── FormStepOne.tsx      (~80 lines) — sub-component for first step
```

Each file is under 150 lines. The `index.tsx` file stays thin enough that a future developer can understand the structure at a glance.

---

## Folder vs Flat File

| Use a folder (`ComponentName/index.tsx`) | Keep a flat file (`ComponentName.tsx`) |
|------------------------------------------|----------------------------------------|
| Component needs 2+ sub-components or helpers | Component is self-contained under 250 lines |
| Shared types or schema live alongside it | No co-located files needed |
| Multiple strategies applied at once | Single strategy applied |

Create the folder structure at the start of the refactor — moving a file to a folder later is a separate git commit.

---

## Testing After Refactoring

Run `npm run test:unit` after each extraction step. If a test breaks:

1. The component's props interface likely changed — update the test's `render()` call.
2. A hook's return shape changed — update destructuring in the test.
3. An export path changed — update the import in the test file.

Do not skip tests to speed up the refactor — a green test suite after each step is the only reliable proof the extraction was safe.

---

## Common Pitfalls

| Problem | Fix |
|---------|-----|
| Sub-component needs too many props | It has too much responsibility — split further or lift logic into a hook |
| Hook grows beyond 150 lines | Split into two focused hooks |
| Circular imports after extraction | Check dependency direction — child should not import parent |
| Tests break after refactoring | Props interface changed — update test file accordingly |
| Extract creates duplicate state | Hoist shared state to the parent or the hook |
| Refactor PR is too large to review | Split into one commit per extracted file |
| Renamed file breaks existing import | Update all callers before merging |
