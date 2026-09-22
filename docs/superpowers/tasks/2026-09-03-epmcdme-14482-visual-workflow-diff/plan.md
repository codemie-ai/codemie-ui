# Visual Workflow Diff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Visual toggle alongside the YAML diff tab inside `WorkflowVersionHistoryPopup`, rendering a read-only xyflow canvas with added/removed/modified node chrome derived from two YAML snapshots.

**Architecture:** A new pure utility `diffWorkflowGraphs` classifies nodes by `state.id` and propagates actor-change marking. `DiffNodeWrapper` applies border/badge/opacity chrome. `WorkflowVisualDiffView` orchestrates deserialization, diffing, and a bare isolated `<ReactFlow>` instance disconnected from `workflowsStore`. The YAML/Visual toggle and `viewMode` state live in `WorkflowVersionHistoryPopup`; `VersionHistoryDiffView` gains an optional `onTabChange` callback to surface the active baseline.

**Tech Stack:** React 18, TypeScript 5, @xyflow/react, Tailwind 3, Vitest + RTL.

Commit per task using the repository's existing convention (ticket prefix: `EPMCDME-14482`).

## Global Constraints

- Colors sourced exclusively from `tailwind.config.ts` `surface.specific.diff` tokens via `getTailwindColor()` — no hardcoded hex values.
- Diff canvas: `nodesDraggable={false}`, `nodesConnectable={false}`, `elementsSelectable={false}`, no `onNodesChange`/`onEdgesChange`/`onConnect`.
- Node identity matched by `state.id` only.
- `isAdvancedConfigField` fields excluded from modified-node comparison.
- No dagre auto-layout on diff canvas — stored positions from deserialized YAML used as-is.
- `SystemPromptExpandedModal` caller of `VersionHistoryDiffView` must remain unaffected.
- Visual toggle hidden when either YAML parse fails or graphs are structurally identical.

---

## File Map

| Status | Path | Responsibility |
|---|---|---|
| New | `src/utils/workflowEditor/diffWorkflowGraphs.ts` | Pure diff: added/removed/modified classification + actor propagation |
| New | `src/utils/workflowEditor/__tests__/diffWorkflowGraphs.test.ts` | 7 unit test cases for the diff utility |
| New | `src/pages/workflows/editor/nodes/DiffNodeWrapper.tsx` | Border ring, badge, opacity/line-through chrome; `DiffLegend` chip row |
| New | `src/pages/workflows/components/WorkflowVisualDiffView.tsx` | Read-only xyflow diff canvas orchestrating deserialize + diff + render |
| Modify | `tailwind.config.ts` | Add `surface.specific.diff.linebg-modified` token |
| Modify | `src/components/form/VersionedField/VersionHistoryDiffView.tsx` | Add optional `onTabChange` prop |
| Modify | `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx` | `viewMode` state, YAML/Visual toggle, conditional `WorkflowVisualDiffView` render |
| Modify | `src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx` | Two new tests for toggle visibility and `viewMode` transitions |

---

### Task 1: Add `linebg-modified` theme token

**Test-first: no — infrastructure config change with no runtime logic**

In `tailwind.config.ts` inside the `surface.specific.diff` object (around line 253), add `'linebg-modified': [yellow500Dark, yellow500Light]` immediately after `linebg-add`, using the same `[dark, light]` tuple convention as `linebg-add` and `linebg-remove`. Source both values from the raw `yellow[500]` palette entry at the same weight used by the existing add/remove tokens. The class name `bg-surface-specific-diff-linebg-modified` must appear literally in component source so Tailwind does not purge it.

---

### Task 2: Implement `diffWorkflowGraphs` pure utility

**Test-first: yes — write all 7 failing tests before any implementation**

**Files:**
- Create: `src/utils/workflowEditor/diffWorkflowGraphs.ts`
- Create: `src/utils/workflowEditor/__tests__/diffWorkflowGraphs.test.ts`

**Interfaces — consumed by Tasks 3, 4, 5:**

```typescript
export type DiffStatus = 'added' | 'removed' | 'modified';

export interface NodeDiffEntry {
  id: string;
  status: DiffStatus;
  canvasNode?: SerializedState;   // present for added/modified
  baselineNode?: SerializedState; // present for removed/modified
}

export interface DiffResult {
  nodes: NodeDiffEntry[];
  actorChangedIds: Set<string>;
}

export function diffWorkflowGraphs(
  canvas: WorkflowConfiguration,
  baseline: WorkflowConfiguration,
): DiffResult
```

- [ ] Write 7 failing tests in `diffWorkflowGraphs.test.ts`. Each test constructs minimal `WorkflowConfiguration` objects (`{ states, orphaned_states: [], meta_states: [] }`) inline. Cover: (1) canvas-only state → `status: 'added'`; (2) baseline-only state → `status: 'removed'` with `baselineNode.position` preserved; (3) same id, different field value → `status: 'modified'`; (4) same id, same content → absent from `nodes`; (5) actor changed in `assistants[]` → referencing state marked `'modified'` and id in `actorChangedIds`; (6) child state change ambers child only — parent iterator absent from `nodes`; (7) empty baseline → all canvas states `'added'`.

- [ ] Run `npx vitest run src/utils/workflowEditor/__tests__/diffWorkflowGraphs.test.ts` — expect all 7 to fail with import error.

- [ ] Implement `diffWorkflowGraphs.ts`. Algorithm:
  1. Build `Map<id, SerializedState>` for each side from `.states`.
  2. Walk the union of ids. Canvas-only → `added`; baseline-only → `removed`; both sides → compare `stableJson(omitNonSemanticFields(state))`. `omitNonSemanticFields` strips `position`, `measured`, and any key matching `isAdvancedConfigField`. `stableJson` is `JSON.stringify(obj, Object.keys(obj).sort())`.
  3. Actor propagation: for each of `assistants[]`, `tools[]`, `custom_nodes[]`, diff arrays by `id` using `stableJson`. Collect `changedActorIds`. For each canvas state whose `actor_id` / `assistant_id` / `tool_id` is in `changedActorIds`, force its classification to `'modified'` (upgrading or creating the entry) and add its id to `actorChangedIds`.
  4. Return `{ nodes, actorChangedIds }`.

- [ ] Run `npx vitest run src/utils/workflowEditor/__tests__/diffWorkflowGraphs.test.ts` — expect all 7 to pass.

---

### Task 3: Implement `DiffNodeWrapper` and `DiffLegend`

**Test-first: no — new presentational components; verified visually and via popup integration in Task 5**

**Files:**
- Create: `src/pages/workflows/editor/nodes/DiffNodeWrapper.tsx`

- [ ] Create `DiffNodeWrapper.tsx` with two named exports:

  **`DiffNodeWrapper`** — a React Flow node component. `data` extends standard node data with `diffStatus: DiffStatus | undefined` and `OriginalComponent: React.ComponentType<NodeProps>`. Wrap `OriginalComponent` in a `relative` container div. Derive border color from `getTailwindColor('--surface-specific-diff-linebg-{add|remove|modified}')`. Apply inline `outline` style: `solid` for `added`/`modified`, `dashed` for `removed`. Apply `opacity-40` class on the container for `removed`. Absolutely-position a badge `<span>` at `top-0 right-0 -translate-y-full` (outside the node bounds) with text `ADDED` / `REMOVED` / `MODIFIED` and the same background color. Use the literal class `bg-surface-specific-diff-linebg-modified` in the modified branch so Tailwind includes it in the purge scan.

  **`DiffLegend`** — a `<div>` row of three labeled color swatches (ADDED/green, MODIFIED/amber, REMOVED/red). Read each color via `getTailwindColor` on the corresponding `--surface-specific-diff-linebg-*` CSS variable. Style as a small pill row with `bg-surface-card` background and shadow.

---

### Task 4: Implement `WorkflowVisualDiffView`

**Test-first: no — orchestration component; behavior tested via popup integration in Task 5**

**Files:**
- Create: `src/pages/workflows/components/WorkflowVisualDiffView.tsx`

- [ ] Create `WorkflowVisualDiffView.tsx`. Props: `{ canvasYaml: string; baselineYaml: string; onParseError: () => void; onNoDiff: () => void }`.

  Implementation:
  1. Use `useMemo([canvasYaml, baselineYaml])` to: wrap both `deserialize()` calls in `try/catch` (return sentinel `'parse-error'` on any failure — do not emit any toast); call `diffWorkflowGraphs`; if `diff.nodes.length === 0` return sentinel `'no-diff'`; otherwise build and return `{ nodes, styledEdges }`.
  2. In a `useEffect` watching the memo result, call `onParseError()` for `'parse-error'` and `onNoDiff()` for `'no-diff'`.
  3. If memo result is a sentinel, return `null`.
  4. Build the xyflow `nodes` array: map `canvasConfig.states` attaching `diffStatus` from `statusById`; append removed entries from `diff.nodes` using `baselineNode.position`.
  5. Derive edge `diffStatus` from endpoint severity (`removed=3 > modified=2 > added=1`); apply stroke color via `getTailwindColor` on the correct CSS var.
  6. Build `diffNodeTypes` by wrapping each entry of the standard `nodeTypes` (from `../editor/nodes`) with `DiffNodeWrapper`: `(props) => <DiffNodeWrapper {...props} data={{ ...props.data, OriginalComponent: Comp }} />`.
  7. Render inside a `relative w-full h-full` container: `<ReactFlowProvider>` wrapping `<ReactFlow nodeTypes={diffNodeTypes} nodes={nodes} edges={styledEdges} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag zoomOnScroll fitView />`. Overlay `<DiffLegend>` at `absolute bottom-4 left-4 z-10`.

---

### Task 5: Thread `onTabChange` and wire YAML/Visual toggle into popup

**Test-first: yes — add failing popup tests before modifying any source file**

**Files:**
- Modify: `src/components/form/VersionedField/VersionHistoryDiffView.tsx`
- Modify: `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx`
- Modify: `src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx`

- [ ] Add two failing tests to `WorkflowVersionHistoryPopup.test.tsx`: (a) when a history entry is selected and a mocked `WorkflowVisualDiffView` does not call `onNoDiff`, both "YAML" and "Visual" toggle buttons are present in the document; (b) when the mocked component immediately calls `onNoDiff` in a `useEffect`, the "Visual" toggle button is absent. Mock `WorkflowVisualDiffView` via `vi.mock` in each case.

- [ ] Run `npx vitest run src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx` — expect the two new tests to fail; existing 5 should still pass.

- [ ] Modify `VersionHistoryDiffView.tsx`: add `onTabChange?: (tab: 'current' | 'previous') => void` to the props interface; call `onTabChange?.(tab)` alongside every existing `setActiveTab(tab)` call. The `SystemPromptExpandedModal` caller passes no `onTabChange` and is unaffected.

- [ ] Modify `WorkflowVersionHistoryPopup.tsx`:
  - Add `viewMode: 'yaml' | 'visual'` state (default `'yaml'`).
  - Add `activeBaselineTab: 'current' | 'previous'` state; pass as `onTabChange` to `VersionHistoryDiffView` to keep the baseline in sync.
  - Add `hasDiff: boolean` state (default `true`) and `parseError: boolean` state (default `false`).
  - Derive `showVisualToggle = hasDiff && !parseError`. In a `useEffect`, when `showVisualToggle` transitions to `false` while `viewMode === 'visual'`, reset `viewMode` to `'yaml'`.
  - Render a toggle row (two `<button>` elements labelled "YAML" and "Visual", styled to indicate active state) only when `showVisualToggle` is true and a history entry is selected.
  - Keep `<VersionHistoryDiffView>` always mounted (apply `hidden` class when `viewMode === 'visual'`) to preserve baseline tab state. Render `<WorkflowVisualDiffView canvasYaml={historyText} baselineYaml={activeBaselineTab === 'current' ? currentText : previousHistoryText} onParseError={() => setParseError(true)} onNoDiff={() => setHasDiff(false)} />` only when `viewMode === 'visual'`.

- [ ] Run `npx vitest run src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.test.tsx` — expect all 7 tests to pass.

---

## Negative-Constraint Pass

| Non-goal | Honored by |
|---|---|
| No two-pane side-by-side graph layout | Task 4 renders a single overlay canvas, no second graph |
| No separate "Compare revisions" modal or revision pills | Not introduced in any task |
| No auto-layout (dagre) on diff canvas | Task 4 uses `baselineNode.position` / stored canvas positions; no layout call |
| No visual diff in `SystemPromptExpandedModal` | Task 5 adds `onTabChange?` as optional with `undefined` default — no other caller touched |
| No diff of `isAdvancedConfigField` fields | Task 2 strips them inside `omitNonSemanticFields` before comparison |
| No edge-only diffs | Task 4 derives edge status from endpoint severity only; no standalone edge comparison |
| No undo/redo or editor interactions on diff canvas | Task 4 uses bare `<ReactFlow>` with all interaction props explicitly disabled |
| No backend changes | No task touches any API layer, store, or backend interface |
| No new `VersionHistoryDiffView` tests | Task 5 modifies only `WorkflowVersionHistoryPopup.test.tsx` |
| No hardcoded hex values | Tasks 3 and 4 read all colors via `getTailwindColor` on CSS custom properties |
