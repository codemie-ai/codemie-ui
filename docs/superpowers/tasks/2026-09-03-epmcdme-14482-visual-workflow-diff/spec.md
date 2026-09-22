# Spec: Visual Workflow Diff — EPMCDME-14482

**Generated**: 2026-09-03
**Complexity**: L (score 21, ~4–5 days)
**Branch**: EPMCDME-14482_visual-workflow-diff

---

## Overview

Two version-history surfaces, matching the main-branch YAML popup plus a new visual popup:

- **YAML** — existing `WorkflowVersionHistoryPopup` (opened from the YAML editor). Keeps Current / Previous baseline tabs on `VersionHistoryDiffView`, including the `SystemPromptExpandedModal` caller. This is the main-branch YAML history UX; it is not replaced by a YAML/Visual toggle.
- **Visual** — new `WorkflowVisualVersionHistoryPopup` (opened from the visual editor toolbar). Renders a read-only xyflow canvas of the selected history revision with diff chrome: green border + ADDED badge for new nodes, red solid border + REMOVED badge (ghost) for deleted nodes, amber border + MODIFIED badge for changed nodes. Edges follow the same coloring, including identity-only rewires. The canvas structure is the selected revision; `currentEditorYaml` is used only to compute the diff, not to render a second graph. The visual canvas is shown whenever both YAML strings parse, including when the graphs are identical (unchanged nodes, no chrome).
- **Restore validation** — Restore from either popup is not UI-only. After the selected YAML is written into the editor, the client dry-runs `POST /v1/workflows/:id/validate` (existing endpoint; no new backend API) and surfaces issues in the editor issues panel. Diff chrome itself remains a client-side comparison of YAML strings.

---

## Acceptance Criteria

1. YAML version history remains the main-branch `WorkflowVersionHistoryPopup` (text diff + Current/Previous). Visual version history is a separate `WorkflowVisualVersionHistoryPopup` opened from the visual editor toolbar. There is no YAML / Visual toggle inside either popup.
2. In the visual popup, a read-only xyflow canvas renders the selected revision's nodes and edges with diff chrome applied whenever both YAML strings parse.
3. Added nodes (present in selected revision, absent in baseline) render with a green solid border and an ADDED badge.
4. Removed nodes (absent in selected revision, present in baseline) render as ghost nodes at their baseline position: red solid border, REMOVED badge, label with line-through (via CSS class on the inner node label).
5. Modified nodes (present in both, content differs) render with an amber solid border and a MODIFIED badge. Content comparison excludes node position, `isAdvancedConfigField` fields, and xyflow layout metadata.
6. Edges whose source or target node is added, removed, or modified adopt the same status color as their most-severe endpoint (removed > modified > added). Identity-only rewires — a connection whose endpoints are unchanged but whose edge identity changed (`next.state_id`, switch-case targets, `switch.default`) — render as added/removed edges with matching chrome.
7. Node identity is matched by `state.id` only.
8. A change to a shared actor (`assistants[]`, `tools[]`, `custom_nodes[]`) marks every state that references that actor as modified, even if the state's own fields are unchanged.
9. Iterator children are diffed independently from their parent iterator; a child-level change ambers only the child. A removed iterator renders as a ghost frame with its children also rendered as ghost nodes inside it at baseline positions.
10. The canvas supports zoom and pan only. Nodes are not draggable, selectable, or connectable.
11. A legend is shown in the visual popup header row (via `secondaryContent`), not as a canvas overlay: green = ADDED, amber = MODIFIED, red = REMOVED. It is visible whenever a history entry is selected and both YAML strings parse (including identical graphs). It is hidden when the visual empty/error state is shown.
12. When both YAML strings parse, the visual canvas always mounts — including when there is no node diff and no edge rewire. Identical graphs render as an unchanged canvas (no status chrome). There is no auto-switch to YAML; YAML history is a separate popup.
13. When YAML fails to parse (or is empty), the visual popup does **not** show the YAML text diff (the visual popup has no YAML view). It shows an explicit empty state in the body, hides the legend, and does not toast. Copy distinguishes whether the selected version YAML, the current editor YAML, or graph construction failed. Restore stays available when `yaml_config` is non-null. Restore is not gated on a client-side write-permission check — the edit page is only reachable for users who can restore.
14. The Visual diff always compares the selected history entry against `serialize(editor.config)` (`currentEditorYaml`). The YAML popup Current tab uses the Ace editor buffer when Version History is opened from the YAML tab. Switching history entries in the visual popup re-renders the canvas in place.
15. `SystemPromptExpandedModal` continues to pass `previousHistoryText` and baseline-tab props to `VersionHistoryDiffView`.
16. Node border and badge colors use the saturated status tokens (`success-primary` for added, `failed-secondary` for removed, `aborted-primary` for modified) via Tailwind utility classes. These tokens give sufficient contrast on the canvas. The `surface.specific.diff` line-background tokens are used only for the YAML text diff view, not for node chrome. Edge stroke colors are resolved at runtime via `getDiffColor` / `getTailwindColor`. No hardcoded hex values.
17. Restore from YAML or Visual history writes the selected `yaml_config` into the editor, then dry-runs the existing `POST /v1/workflows/:id/validate` endpoint (`workflowsStore.validateWorkflow`). On success the issues panel is cleared; on a structured validation error the issues panel opens with the returned issues. The restore toast is `Workflow YAML restored — checking for issues…`. No new backend endpoints are added.

---

## Non-Goals

- Two-pane side-by-side graph layout (the mockup's alternate layout is explicitly excluded).
- A separate "Compare revisions" modal or revision pill selector (mockup chrome, not in scope).
- Two-pane side-by-side rendering of the same canvas with dagre positions forced — a single unified canvas with dagre auto-layout is intentionally used (stored positions produce visual overlap in the merged canvas+ghost-node view).
- Visual diff inside `SystemPromptExpandedModal` or any caller other than `WorkflowVisualVersionHistoryPopup`.
- YAML/Visual toggle inside `WorkflowVersionHistoryPopup` (reverted; visual history is a separate popup).
- Showing the YAML text diff inside the visual popup when parse fails — the visual popup has no YAML view; parse failure uses an empty state instead.
- Diff of advanced config fields (`isAdvancedConfigField`) — these do not affect the visual diff status.
- Undo/redo, keyboard shortcuts, or any editor interaction on the diff canvas.
- New backend endpoints — restore validation uses the existing `POST /v1/workflows/:id/validate` route. Diff chrome is still computed client-side from YAML already on the page.
- New unit tests for `VersionHistoryDiffView` covering its full restore flow (tests for the `secondaryContent` slot prop were added as part of this work; restore-flow tests were already present).
- Client-side write-permission checks on Restore — the edit page is not reachable without restore access.
- `surface.specific.diff` `linebg-modified` / `linenumber-modified` tokens — node chrome uses `aborted-primary`; YAML text diff keeps add/remove line tokens only.

---

## Architecture

### Component tree (new/modified only)

```
WorkflowVersionHistoryPopup          ← unchanged vs main: YAML text diff + Current/Previous
  VersionHistoryDiffView             ← unchanged vs main: previousHistoryText + baseline tabs
    TextDiffView                     ← unchanged

WorkflowVisualVersionHistoryPopup    ← NEW: visual-only history popup
  WorkflowVisualDiffView             ← NEW: read-only diff canvas
    ReactFlowProvider
      ReactFlow (bare instance)
        DiffNodeWrapper              ← NEW: per-node wrapper applying diff chrome
          <existing node component>
  DiffLegend                         ← NEW: header legend via secondaryContent
```

### New files

| Path | Purpose |
|---|---|
| `src/pages/workflows/components/WorkflowVisualDiffView.tsx` | Read-only xyflow canvas; orchestrates deserialization, diffing, and rendering |
| `src/pages/workflows/components/WorkflowVisualVersionHistoryPopup.tsx` | Visual-only version history popup |
| `src/utils/workflowEditor/diffWorkflowGraphs.ts` | Pure function: `diffWorkflowGraphs(canvas, baseline) → DiffResult` |
| `src/pages/workflows/editor/nodes/DiffNodeWrapper.tsx` | Composition wrapper adding border/badge chrome; used only in diff nodeTypes map |

### Modified files

| Path | Change |
|---|---|
| `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx` | Unchanged vs main (YAML + Current/Previous); no viewMode toggle; Restore hidden only when `yaml_config` is null |
| `src/components/form/VersionedField/VersionHistoryDiffView.tsx` | Unchanged vs main: keep `previousHistoryText` and Current / Previous baseline tabs |

---

## Diff Algorithm — `diffWorkflowGraphs`

Signature:

```typescript
type DiffStatus = 'added' | 'removed' | 'modified';

interface NodeDiffEntry {
  id: string;
  status: DiffStatus;
  canvasNode?: SerializedState;  // present for added/modified
  baselineNode?: SerializedState; // present for removed/modified
}

interface DiffResult {
  nodes: NodeDiffEntry[];
}

function diffWorkflowGraphs(
  canvas: WorkflowConfiguration,
  baseline: WorkflowConfiguration,
): DiffResult
```

Steps:
1. Build a `Map<id, SerializedState>` for each side.
2. Walk all ids from both maps. Classify each: added (canvas only), removed (baseline only), potentially modified (both sides). For modified, compare serialized YAML of the state excluding position, `measured`, and `isAdvancedConfigField` fields.
3. Build actor change sets: diff `assistants[]`, `tools[]`, `custom_nodes[]` by id, comparing serialized content. Collect all state ids from the canvas map that reference any changed actor id. Mark those states modified in `nodes` regardless of step 2's result.
4. Return `DiffResult`. Actor overrides are applied inside this function before return.

This function is pure (no side effects, no DOM access) and is the primary unit test target.

---

## Visual Chrome — `DiffNodeWrapper`

`DiffNodeWrapper` receives the node's `data` (which includes `diffStatus: DiffStatus | undefined`) and wraps the standard node component. It applies:

- **Added**: green solid ring, ADDED badge top-right, full opacity.
- **Removed**: red solid ring (`failed-secondary`), REMOVED badge top-right, full opacity, label text `line-through` (BaseNode descendants, Note header/body, and Iterator title). The node renders at baseline position.
- **Modified**: amber solid ring, MODIFIED badge top-right, full opacity.
- **Unchanged**: no status badge or status border; standard node rendered as-is, with pointer events blocked so the canvas stays zoom/pan only.

The diff canvas uses a separate `nodeTypes` map that maps each node type key (e.g., `'assistant'`) to a factory producing `DiffNodeWrapper` around the standard component. The standard `nodeTypes` map from `src/pages/workflows/editor/nodes/index.tsx` is unchanged.

Badge: small pill `<span>` absolutely positioned top-right of the wrapper element, using the appropriate diff color token.

---

## Canvas Setup — `WorkflowVisualDiffView`

1. Deserialize both YAML strings inside a `try/catch`. On canvas YAML failure, baseline YAML failure, or a throw from graph build, report that reason and render nothing; the parent popup shows the matching visual empty state. No toast.
2. Call `diffWorkflowGraphs(canvasConfig, baselineConfig)`.
3. Build xyflow `nodes` array from the canvas deserialization result. For removed nodes, append them from the baseline result. Attach `diffStatus` to each node's `data`.
3a. Apply dagre auto-layout (`applyLayout`) to the union of canvas nodes and removed-ghost nodes. Stored YAML positions are intentionally discarded — merged canvas+ghost graphs produce visual overlap when rendered at original coordinates, so beautification is required before display.
4. Build xyflow `edges` array: edges from canvas for non-removed nodes, edges from baseline for removed nodes. Derive edge `diffStatus` from its endpoints' most-severe status (removed > modified > added > undefined). Identity-only rewires are prefixed as added/removed edges and chromed even when both endpoints are unchanged.
5. Render `<ReactFlowProvider><ReactFlow nodeTypes={diffNodeTypes} nodes={nodes} edges={edges} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag zoomOnScroll fitView /></ReactFlowProvider>`.
6. `DiffLegend` lives in the popup header via `secondaryContent`, not as a canvas overlay.

---

## Error and Edge-Case Handling

| Condition | Behavior |
|---|---|
| Selected version YAML fails to parse or is empty | Visual popup shows empty state blaming the selected version (no canvas, no legend, no YAML text diff); no toast |
| Current editor YAML fails to parse or is empty | Visual popup shows empty state blaming the current editor YAML; no toast |
| Graph build throws after a successful deserialize | Visual popup shows empty state without blaming YAML emptiness; no toast |
| Both graphs have no node diff and no edge rewire | Canvas still mounts; nodes render without status chrome; legend stays |
| Selected history entry has no previous YAML history row | YAML popup: `previousHistoryText` empty, Previous tab disabled (main). Visual popup: baseline is always `currentEditorYaml` |
| History row `yaml_config` is null | Restore hidden; visual empty state if the canvas YAML is empty. Restore is not gated on client-side write permission |
| Iterator with removed children | Removed child ghosts rendered with `parentId` matching the removed iterator ghost frame; positions from baseline |

---

## Testing

**New unit tests** (in `src/utils/workflowEditor/__tests__/diffWorkflowGraphs.test.ts`):
- Added node: canvas has state absent from baseline → status `'added'`
- Removed node: baseline has state absent from canvas → status `'removed'`, baseline position preserved
- Modified node: same id, content differs → status `'modified'`
- Unchanged node: same id, same content → not in diff result (no status)
- Actor change propagation: actor id in `assistants[]` / `tools[]` / `custom_nodes[]` differs → referencing states marked `'modified'`
- Iterator `iter_key` / `meta_iter_state_id` on a meta parent's `getStateNext(state)` (not only `state.next`) are attributed to the iterator
- Iterator child independence: child state change ambers child only, not parent iterator
- Empty baseline: all canvas nodes classified `'added'`

**Existing test updates**:
- `WorkflowVersionHistoryPopup.test.tsx`: YAML popup still has Current/Previous baseline; restore still writes editor YAML then dry-runs validate.
- `WorkflowVisualVersionHistoryPopup.test.tsx`: canvas mounts for identical graphs; parse-error empty state for canvas vs editor vs graph failure; Restore hidden when `yaml_config` is null (not gated on write permission).

---

## Open Risks

- `VersionHistoryDiffView` previously had no tests; unit tests covering the `secondaryContent` slot were added as part of this work.
- Large workflows with many nodes may show a brief repaint when switching baseline tabs, as two `deserialize()` calls plus a full graph diff run synchronously. Defer optimization unless observed in testing.
