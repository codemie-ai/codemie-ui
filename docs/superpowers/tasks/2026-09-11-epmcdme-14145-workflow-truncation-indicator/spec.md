# Spec — EPMCDME-14145: Workflow Truncation Indicator

**Ticket**: EPMCDME-14145  
**Branch**: EPMCDME-14145-workflow-truncation-indicator  
**Complexity**: M (18/36)  

---

## Goal

Surface a visible indicator on the execution-detail drawer (both the state list and the selected state's output) and on the chat/thread view when a workflow execution state's output was cut off by a model token limit. The backend exposes a single `truncated: boolean` flag (default `false`) on the state output endpoint, the execution state responses, conversation-history thoughts and the live stream; this story wires that flag through the frontend type, store, and rendering layers so users can distinguish a complete answer from a silently-truncated one. The badge is driven by `truncated === true` and nothing else.

> **Revision note**: The drawer and chat implementations below reflect the shipped design, which superseded the original plan in two ways during follow-up commits (`d28f227`, `bca4030a`, `226a0ac`): (1) the drawer's state **list** also gained a per-item warning badge, not just the selected state's output panel; (2) the chat surface stopped fetching truncation status per message via `getWorkflowExecutionStateOutput` and instead reads `finish_reason`/`truncated` directly off each streamed/hydrated `Thought`, removing a network round-trip per rendered message. Both surfaces now share one `TruncationBadge` component instead of duplicating the icon/tooltip markup.
>
> **Revision note 2 (backend API change)**: The backend dropped `finish_reason` from the API entirely (it cannot supply a provider reason now); only `truncated` remains. The frontend no longer reads `finish_reason` anywhere: it is removed from the types, history hydration, live thought merge and the `TruncationBadge` `finishReason` prop, so the tooltip is always the plain `TRUNCATION_TOOLTIP_PREFIX` with no `(finish_reason: ...)` suffix. Editing a state's output clears the flag on the backend, so the frontend also clears its local copy on a successful chat edit (see 4a). Delivered in `9a94009ee`.

---

## What the Backend Exposes (Confirmed)

`finish_reason` no longer exists anywhere in the API. Only `truncated` (boolean, default `false`) remains. It appears in:

- `GET /workflows/{workflow_id}/executions/{execution_id}/states/{state_id}/output` (`get_workflow_execution_state_output`)
  Response: `{ output, truncated }`.
- Execution state responses (`WorkflowExecutionStateResponse`, including the states list endpoint): each state carries `truncated`.
- Conversation history thoughts (`history_materializer`): workflow thoughts include `truncated`.
- Live stream, `STATE_FINISH` event: `workflow_state.truncated`.
- Live stream, node-end thought: `thought.truncated`.

Behaviour the frontend relies on:

- The badge shows when `truncated === true`; nothing else drives it.
- Editing a state's output clears the flag on the backend. The drawer and chat history reflect that on the next fetch or reload. A live thought already streamed to the client is not updated until then, so the frontend clears its local copy when the user saves an edit (section 4a).
- Existing rows get `truncated = false` through the migration default, so old executions never show the badge.

---

## Architecture

All changes are additive; states persisted before the backend change (where `truncated` is absent or `false`) must render exactly as they do today.

```
Type layer      WorkflowExecutionState + WorkflowExecutionStateOutput  (src/types/entity/workflow.ts)
                Thought + ThoughtBackend gain truncated                 (src/types/entity/conversation.ts)
Store layer     getWorkflowExecutionStateOutput return type widened    (src/store/workflowExecutions.ts)
                chatGeneration merges truncated on streamed thought     (src/store/chatGeneration.ts)
                  updates and clears it on a saved output edit
                chatHelpers hydrates truncated from                     (src/utils/chatHelpers.ts)
                  history on load
Shared UI       TruncationBadge — icon + tooltip, renders null when    (src/components/TruncationBadge/)
                  not truncated
                CodeBlock gains a headerBadge slot (separate from      (src/components/CodeBlock/CodeBlock.tsx)
                  headerActionsTemplate)
                Thought / ThoughtHeader gain a headerBadge slot        (src/components/Thought/)
UI layer        WorkflowStateOutput — selected state's output panel    (src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/)
                WorkflowDrawerListItem — per-state badge in the list   (src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerList/)
                ChatAiMessage — badge on each Thought header           (src/pages/chat/components/ChatHistory/ChatAiMessage/)
```

---

## 1. Type Layer

### `WorkflowExecutionState` (`src/types/entity/workflow.ts`)

Add one optional field:

```ts
truncated?: boolean
```

It is optional so pre-existing store state and list responses without the field are backward-compatible without defensive defaults in callers.

### `WorkflowExecutionStateOutput` (new interface, same file or inline in store)

```ts
export interface WorkflowExecutionStateOutput {
  output: string | null
  truncated?: boolean
}
```

This is the return type of `getWorkflowExecutionStateOutput` after the fix. Naming it explicitly keeps the callers readable and avoids re-specifying the shape in three places.

---

## 2. Store Layer

### `getWorkflowExecutionStateOutput` (`src/store/workflowExecutions.ts`, lines 591–603)

**Current behaviour**: types the API response as `{ output: string | null }` and returns `data.output` — discarding `finish_reason` and `truncated`.

**Change**: widen the inline response type to match `WorkflowExecutionStateOutput` and return the full object.

```ts
// before
const data: { output: string | null } = await response.json()
return data.output

// after
const data: WorkflowExecutionStateOutput = await response.json()
return data
```

Return type changes from `Promise<string | null>` to `Promise<WorkflowExecutionStateOutput>`.

### Existing callers — compatibility

Three call sites currently treat the return value as `string | null` directly:

| File | Current usage | After change |
|---|---|---|
| `WorkflowStateOutput.tsx` | `setOutput(result ?? '')` | `setOutput(result.output ?? '')` |
| `WorkflowExecutionEditOutputForm.tsx` | uses result as string | `.output` |
| `ContinueWithInputPopup.tsx` | uses result as string | `.output` |

All three are one-line changes. `EditOutputForm` and `ContinueWithInputPopup` only use `output`; they do not need to handle `truncated`.

---

## 3. Drawer Surface

Two places in the drawer show the badge: the per-state row in the state **list**, and the selected state's **output panel**. Both consume the same `truncated` field already present on `ExtendedWorkflowExecutionState` (Task 1), so neither needs its own network call.

### 3a. Shared `TruncationBadge` component

`src/components/TruncationBadge/TruncationBadge.tsx` (new, extracted after both call sites above were first built inline and found to duplicate the same icon/tooltip markup)

```tsx
interface TruncationBadgeProps {
  truncated?: boolean
  className?: string
}

const TruncationBadge: FC<TruncationBadgeProps> = ({ truncated, className }) => {
  if (!truncated) return null

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      data-tooltip-id="react-tooltip"
      data-tooltip-content={TRUNCATION_TOOLTIP_PREFIX}
    >
      <StatusWarningSvg className={cn('size-3.5 text-feedback-warning', className)} />
    </span>
  )
}
```

Returning `null` when `truncated` is falsy means every call site can pass the flag straight through — no `truncated ? <Badge/> : null` guard repeated at each usage. Default icon size is `size-3.5` (14px, sized for a `Thought` header); the drawer passes `className="size-4"` to match its larger indicators. Exported via `src/components/TruncationBadge/index.ts`.

**Icon**: `import StatusWarningSvg from '@/assets/icons/status-warning.svg?react'` — follows the `*Svg` import convention used throughout the codebase.  
**Colour**: `text-feedback-warning` design token (not a raw Tailwind colour).

### 3b. State list — `WorkflowDrawerListItem.tsx`

`src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerList/WorkflowDrawerListItem.tsx`

`WorkflowDrawerList.tsx` passes `truncated={state.truncated}` straight from each `ExtendedWorkflowExecutionState` item — both for top-level states and recursively for nested ones. `WorkflowDrawerListItem` renders `<TruncationBadge truncated={truncated} className="size-4" />` in the row's status area, next to the existing `StatusIndicator`. This lets a user see which states were truncated without opening each one — not part of the original scope, added because the state data was already present on the list response.

### 3c. Output panel — `WorkflowStateOutput.tsx`

`src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowStateOutput.tsx`

**Local state** — added alongside the existing `output` state:

```ts
const [truncated, setTruncated] = useState(false)
```

**Effect** — in the existing effect that calls `getWorkflowExecutionStateOutput`, the result is destructured:

```ts
const result = await workflowExecutionsStore.getWorkflowExecutionStateOutput(...)
setOutput(result.output ?? '')
setTruncated(!!result.truncated)
```

**Indicator**: `CodeBlock` gained a `headerBadge` prop (distinct from the existing `headerActionsTemplate`, which stays reserved for buttons like Expand). `WorkflowStateOutput` renders `<TruncationBadge truncated={truncated} className="size-4" />` as `headerBadge`, and keeps the Expand button as `headerActionsTemplate`:

```tsx
<CodeBlock
  headerActionsLast
  title="Result"
  language="txt"
  downloadFilename="output"
  text={output}
  headerActionsTemplate={expandButton}
  headerBadge={<TruncationBadge truncated={truncated} className="size-4" />}
/>
```

`CodeBlock` renders `headerBadge` next to the title (left side of the header), and `headerActionsTemplate` on the right — so the warning badge no longer competes for space or tab order with action buttons.

---

## 4. Chat Surface — `ChatAiMessage.tsx`

`src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx`

**Superseded design**: the first implementation fetched truncation status per message via a `useEffect` calling `getWorkflowExecutionStateOutput` whenever `isTerminalExecution` and the message's `stateId`/`executionId`/`workflow_id` were all present, then rendered a standalone warning line below the markdown output. That effect and its local state (`outputTruncated`, `outputFinishReason`) were removed outright in `226a0ac` ("Drive chat truncation indicator from Thought fields") — no dead/commented code remains in the file. It was replaced by the design below because the backend already streams `truncated` on each `Thought`, making a second per-message network call redundant.

### Where the fields now flow from

- **Types** (`src/types/entity/conversation.ts`): `Thought` and `ThoughtBackend` both gain `truncated?: boolean`.
- **History hydration** (`src/utils/chatHelpers.ts`, `transformHistoryGroup`): when a persisted conversation is loaded, each mapped thought carries `truncated: thought.truncated ?? false` through from `ThoughtBackend`.
- **Streaming merge** (`src/store/chatGeneration.ts`): when a thought update arrives over the stream and matches an existing thought by id, the store merges the new value onto the existing one — `existingThought.truncated = thought.truncated ?? existingThought.truncated` — following the same merge pattern already used for `interrupted`, `aborted`, and `routing`.

So by the time `ChatAiMessage` renders, every `Thought` object (whether loaded from history or streamed live) already carries its own `truncated` — no fetch, no loading state, no failure path to guard against.

### 4a. Clearing the flag on output edit

Editing a state's output clears `truncated` on the backend, but a thought already streamed into the chat keeps its stale flag until the next fetch or reload. `chatGenerationStore.updateWorkflowChatOutput` therefore clears the local copy after the update call succeeds:

```ts
lastMessage.response = output
lastMessage.thoughts?.forEach((thought) => {
  if (thought.interrupted) thought.truncated = false
})
```

Only interrupted thoughts are cleared (the interrupted state is the one the edit targets); other thoughts keep their flag. The clear runs after the awaited update, so a failed save leaves the badge in place. The workflow drawer needs no local clear: `WorkflowStateOutput` and the state list refetch and pick up the backend's `truncated: false`.

### Indicator

Each `Thought` is rendered with the shared badge passed into its new `headerBadge` slot:

```tsx
{message?.thoughts?.map((thought) => (
  <Fragment key={thought.id}>
    {(!hideToolOutputs || thought.interrupted) && (
      <Thought
        thought={thought}
        headerBadge={
          <TruncationBadge truncated={thought.truncated} />
        }
      />
    )}
    ...
  </Fragment>
))}
```

`Thought` forwards `headerBadge` to `ThoughtHeader`, which renders it next to the existing `ThoughtStatus` indicator. Because `TruncationBadge` renders `null` when `truncated` is falsy, non-truncated thoughts are visually unchanged.

This moves the indicator from "below the final markdown answer" (per-message, one indicator) to "on each thought's header" (per-step, potentially several indicators per message) — a thought-level granularity that the original per-message design could not express, since it only knew about the terminal state's own `stateId`.

---

## 5. Shared Constant and Component

`src/constants/workflows.ts`:

```ts
export const TRUNCATION_TOOLTIP_PREFIX = 'Output may be incomplete — truncated by token limit'
```

Initially each call site (drawer list item, drawer output panel, chat) built its own tooltip string and icon/span markup from this constant. That duplication was consolidated into the single `TruncationBadge` component described in §3a — every surface now imports `TruncationBadge` rather than re-deriving the tooltip text or re-importing `StatusWarningSvg` directly.

---

## 6. Tests

### `TruncationBadge.test.tsx` (new)

| Case | What to assert |
|---|---|
| `truncated: true` | icon renders with the plain `TRUNCATION_TOOLTIP_PREFIX` tooltip (no `finish_reason` suffix) |
| `truncated: false` / `undefined` | component renders `null` |

### `CodeBlock.integration.test.tsx` (extend existing)

| Case | What to assert |
|---|---|
| `headerBadge` provided | badge renders next to the title, independent of `headerActionsTemplate` |
| `headerBadge` omitted | header layout unchanged from before the prop existed |

### `WorkflowStateOutput.test.tsx` (extend existing)

| Case | What to assert |
|---|---|
| `truncated: true` response | truncation badge is in the DOM (via `headerBadge`) |
| `truncated: true` response | tooltip is the plain `TRUNCATION_TOOLTIP_PREFIX` |
| `truncated: false` response | no truncation badge in the DOM |
| `truncated` absent from response | no truncation badge in the DOM |
| refetch returns `truncated: false` after a `true` response | badge is removed |

Uses existing `ExecutionContext.Provider` wrapper and `vi.hoisted()` store mock.

### `WorkflowDrawerListItem.test.tsx` (new)

| Case | What to assert |
|---|---|
| Item's `truncated: true` | badge renders in the row with the plain tooltip |
| Item's `truncated: false` / absent | no badge in the row |
| Nested items | each nested item's own `truncated` renders independently |

### `Thought.test.tsx` / `ThoughtHeader.test.tsx` (extend existing)

| Case | What to assert |
|---|---|
| `headerBadge` prop passed to `Thought` | forwarded through to `ThoughtHeader` and rendered in the header |
| `headerBadge` omitted | header renders exactly as before the prop existed |

### `chatHelpers.test.ts` (extend existing)

| Case | What to assert |
|---|---|
| History thought has `truncated` | mapped `Thought` carries it through `transformHistoryGroup` |
| History thought omits it | mapped `Thought` gets `truncated: false` |

### `chatGeneration.test.ts` (extend existing)

| Case | What to assert |
|---|---|
| Streamed thought update carries `truncated` | merged onto the matching existing thought |
| Streamed update omits it | existing thought's value is preserved, not clobbered to `undefined` |
| `updateWorkflowChatOutput` succeeds | `truncated` is cleared on interrupted thoughts only |
| `updateWorkflowChatOutput` fails | `truncated` is left unchanged |

### `ChatAiMessage.test.tsx` (extend existing, fetch-based cases removed)

| Case | What to assert |
|---|---|
| Thought has `truncated: true` | badge renders on that thought's header with the plain tooltip (no `finish_reason` suffix) |
| Thought has `truncated: false` / absent | no badge on that thought's header |
| Message with multiple thoughts, only one truncated | badge appears only on the truncated thought |

The original fetch-based test cases (terminal-execution gating, `getWorkflowExecutionStateOutput` not called when `stateId` is absent, rejection handling) were removed along with the effect they exercised — `ChatAiMessage` no longer calls `getWorkflowExecutionStateOutput`.

### Store method test (`workflowExecutions.getStateOutput.test.ts`) — unchanged, still exercised by the drawer surface

| Case | What to assert |
|---|---|
| Response includes `truncated: true` | method returns `{ output, truncated }` |
| Response includes only `output` (old backend) | method returns `truncated: undefined` |
| Network error | method throws |

---

## Out of Scope

- No new execution status. Truncated states remain `SUCCEEDED`.
- No retry/auto-continue UI.
- No live-update of the indicator during an in-progress execution.
- Exports/downloads of workflow output.
- `WorkflowDrawer.tsx` / `useWorkflowDrawer.tsx` — no changes needed; truncation data flows through `WorkflowDrawerList` → `WorkflowDrawerListItem` as plain props, not through the drawer root.

---

## Acceptance Criteria

- [x] Drawer output panel shows a badge when `truncated: true`; unchanged when `false` or absent.
- [x] Drawer state list shows a per-item badge when that state's `truncated: true`; unchanged otherwise.
- [x] Chat view shows a badge on each truncated `Thought`'s header; unchanged for non-truncated thoughts.
- [x] Indicator tooltip is the plain "Output may be incomplete" message on all three surfaces; no `finish_reason` is read or shown anywhere.
- [x] The badge is driven by `truncated === true` only.
- [x] Saving an edit in chat clears the local `truncated` flag on the interrupted thought; a failed save leaves it.
- [x] `WorkflowExecutionState` type includes `truncated` (no `finish_reason`).
- [x] `Thought` / `ThoughtBackend` types include `truncated` (no `finish_reason`).
- [x] `getWorkflowExecutionStateOutput` no longer discards `truncated`.
- [x] All existing callers of `getWorkflowExecutionStateOutput` remain type-correct after the return type change.
- [x] Drawer and chat surfaces share one `TruncationBadge` component rather than duplicating icon/tooltip markup.
