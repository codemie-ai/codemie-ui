# EPMCDME-14265: Workflow graph must render every state

## Problem

A ~50-state workflow opens on the Workflows details page as a graph with a handful of nodes (Start, Parse-request, Validate-request, Conditional, Fetch-full-issue, End, Parse-jira-response), while the execution drawer lists more steps (validate-full-issue, resolve-sme, route-existing-ai-plan). The graph is built entirely in the frontend utils layer (technical-analysis.md §2 Purpose A): `deserialize` -> `buildNodes`/`buildEdges` -> `applyLayout`, rendered by `WorkflowEditor`. Nothing downstream of `buildNodes` filters or caps nodes. The Philips YAML is not in the repo, so the exact cause is unconfirmed (hypotheses H1-H5, analysis §6).

One cause is not in the build layer at all: with a run selected, the page graphs a `yaml_config_history` entry chosen by date, not the current `yaml_config` (`useWorkflowData.ts:104-130`, H4). If that is the Philips cause, a build-layer fix ships and the user still sees the short graph. So H4 is checked first, by data, and decides what the rest of the work is.

## Approach

0. **Check H4 on the real data, before any code or fixture (manual).** For the Philips workflow read `yaml_config`, `yaml_config_history`, `update_date` and the dates of the runs in the ticket screenshot. Let G = the YAML the page graphs for that run (the rule at `useWorkflowData.ts:116-130`), P = the current `yaml_config`, S = the step ids in that run's drawer. Record G, P and S counts in the MR. Decision rule:
   - **G equals P** (or no run selected): H4 is ruled out. Do steps 1-4.
   - **G differs from P and every step of S is in G**: G is the version the run executed; the graph is a faithful snapshot and the short graph on this path is by design. Keep G. Steps 1-4 still run if the same builder renders G short in the repro.
   - **G differs from P, some step of S is missing from G but all of S is in P**: the version pick is wrong for this run (or history dates differ from the assumption at `useWorkflowData.ts:121-128`). That is existing behavior outside this spec's fix location and a user-visible change: stop and take it to the requester before editing `useWorkflowData`. Recommended: graph P for that run.
   - **Some step of S is in neither G nor P**: backend or data issue, out of scope.
1. **Reproduce.** Add a synthetic ~50-state fixture (YAML under `src/utils/workflowEditor/build/__tests__/fixtures/`) covering: linear chains, `condition` branches, `switch` cases, `state_ids` fan-out, iterators, a duplicate `meta_next_state_id`, a user state named like a generated id (`conditional_1`), a `meta_next_state_id` that collides with a generated branch id, and `meta_states` with partial positions. Run it through `buildGraph` and compare node ids and edges to the YAML. Also rule out duplicate YAML keys in the real YAML (last key silently wins, analysis §2).
2. **Fix the confirmed causes** at the smallest blast radius: `build/nodes/buildNodes.ts`; `serialization/deserializer/deserializer.ts` (id uniqueness, unconditional, see below; H5 only if confirmed); `build/index.ts` (placement of unpositioned nodes). Files outside these need the requester.
3. **Node membership is one contract.** Which states get a node is decided by a flat pass over `config.states` by id, run after the other node producers and before the `end` fallback. The entry walk only orders the nodes it reaches; states it misses are appended in `config.states` order. The pass adds a node for each connected or orphan state whose id is not yet present, through the same per-state builders the walk uses (a decision parent brings its branch node; an iterator child goes through `buildOrAdjustIteratorNode`). It never adds `start`, `end`, iterator nodes or a bare branch state with no parent in the config, and it never adds an id twice. It `console.warn`s each id it had to add, so a gap in the walk is visible rather than silently repaired.
4. **Id uniqueness in the deserializer.** `generateStateID` builds its existing-id set from `states`, `orphaned_states`, `meta_states` and already-pushed branch ids. A later duplicate `meta_next_state_id` gets a fresh id, written back into the parent's `next`.
5. **Placement of unpositioned nodes** in `build/index.ts`, before `saveStatesToMetaState` on initial load: when some nodes have saved positions, run `applyLayout` on the whole graph and copy positions only onto nodes whose `_meta.position` is undefined. Saved positions are untouched. Read: `saveStatesToMetaState` (`build/index.ts:38-40`, `actions/states/utils.ts:58`) writes every node's position, including the `{100,100}` default, into the config on initial load, so the next edit-page save would persist stacked nodes; placement must run first.
6. **Lock it with tests** (below), then verify the real Philips workflow manually.

## Acceptance criteria

1. For the ~50-state fixture, the set of node ids contains every YAML state id, plus only the expected synthetic nodes (`start`, `end`, branch and iterator nodes).
2. Node count for the fixture equals YAML states + the synthetic nodes, asserted exactly.
3. Every edge produced for the fixture has both endpoints present in the node list (no dangling edges), and the edge set equals the transitions in the fixture YAML: each `state_id`, `state_ids`, `condition` and `switch` target gives exactly one edge from its source or branch node.
4. No two nodes share an id; a duplicate `meta_next_state_id` and a user state named like a generated id (`conditional_N`, `switch_N`) each end with distinct ids and correct branches for both parents (deserializer test added).
5. On the fixture's partial `meta_states`, nodes that lack a saved position do not share a position with each other, and saved positions do not change.
6. Existing deserializer fixtures (`workflow-with-{branches,iterator,multiple-iterators,same-iter-key}.yaml`) produce the same node ids and edges before and after the change, and `buildVisualDiffGraph.test.ts` passes unchanged, or with each changed expectation listed in the MR (small/medium regression check).
7. A new regression test builds the large fixture and runs through `WorkflowEditor` (ReactFlow mocked per the testing guide) with all expected nodes passed to the canvas.
8. Zoom, pan, fit-to-screen and fullscreen are untouched in code (no node-count dependency, analysis §2). Manual on the real workflow: fit-to-screen shows all nodes in windowed (min zoom 0.1) and fullscreen (min zoom 0.2), or the shortfall is recorded in `## Verified locally`.
9. Manual, post-fix, with the YAML named: with no run selected, the Philips workflow graphs every state of the current `yaml_config`; with a run selected, every drawer step whose id is in the graphed YAML has a node, Evidence, including the Step 0 record, goes to the MR's `## Verified locally`.
10. A `buildNodes` unit test with a hand-built config in which a connected state is not reached by the walk (a decision plus a sibling `state_id`, and the same for an iterator child) asserts exactly one node per state, the walk's nodes first, and a `console.warn` per added id.

## Non-goals

- No change to the backend, the `/v1/workflows/{id}/` payload, or the YAML schema.
- No change to zoom limits, `EditorControls`, `fitView`, or fullscreen behavior; no virtualization (`onlyRenderVisibleElements`) or node caps.
- No redesign of reachability (still `states[0]` as entry) or of how the deserializer's DFS and `buildEdges` decide connectivity; only `buildNodes` membership is restated (Approach 3).
- No change to how execution steps are listed in the drawer, and no auto-adding of nodes for execution states absent from the config. A follow-up ticket (execution-only nodes merged before `WorkflowEditor`) is named for the requester to raise; this ticket's "execution steps and graph consistent" bullet is met only for steps present in the graphed YAML.
- No visible notice on the details page when the graphed YAML is a historical entry or drawer steps have no node; not in the ticket's ACs, left for the requester to raise.
- No change to `useWorkflowData` unless the Step 0 rule reaches its third outcome and the requester approves.
- No re-layout of workflows that already have saved positions, except placing nodes that have no saved position (Approach 5).
- No update of `.ai-run/guides/development/workflow-editor-patterns.md` (it does not match the source; flagged, not fixed).
- No Philips data committed to the repo; fixtures are synthetic.

## Decisions

- Check H4 on the real data as Step 0 over writing the fixture first: it is the one cause the build-layer fix cannot reach, and it needs no code.
- Decide on H4 by the rule in Approach 0 (G versus P versus S) over a fixed choice now: each outcome has a different correct response, and the third changes existing behavior.
- Keep graphing the historical YAML when an execution is selected (`useWorkflowData.ts:104-136`) over forcing the current `yaml_config`: it shows the structure that run executed; reopened only at the rule's third outcome.
- Leave execution-only nodes in the graph to a named follow-up over auto-adding them: it changes what `WorkflowEditor` receives.
- Reproduce with a synthetic fixture before choosing the fix, over fixing the most likely hypothesis (H1) blind: the real YAML is unavailable and the hypotheses lead to different fixes.
- Decide node membership by a flat pass over `config.states`, with the walk only ordering, over a sweep beside the walk's first-match rules: one rule instead of three, and a gap in the walk cannot hide.
- Make the deserializer id fix unconditional over doing it only if H2/H5 is confirmed: AC4 holds regardless of cause.
- Place unpositioned nodes with a whole-graph layout copied onto nodes without a saved position over leaving the `{100,100}` default: otherwise a partly positioned large workflow looks small, and the default would be saved to the config.
- Fix at the node-build layer (and deserializer ids, `build/index.ts` placement) over changing `buildEdges` or `WorkflowEditor`: edges already iterate all states, and the component filters nothing.
- Define "node count matches" as YAML states plus the synthetic nodes, over a literal equal count: iterator, branch, `start` and `end` nodes are synthetic by design.
- Keep the drawer unfiltered over aligning it to the graph: steps absent from the config remain visible to the user.
- Tests live at the build layer with a YAML fixture, following the deserializer test convention, over component-only tests: `buildNodes`/`buildGraph`/`layout` have none today and carry the logic.
- Treat the Philips verification as a manual post-fix item, over an automated one: the workflow is not reachable from the test environment.

## Assumptions

- The Philips YAML is valid and the cause is in the frontend mapping, as the ticket states; Step 0 or the repro may disprove this, in which case the spec is revisited.
- `yaml_config_history` entries are dated at replacement time, as `useWorkflowData.ts:121-128` assumes; Step 0 checks it on the Philips data.
- The backend schema may forbid a `state_id` beside `condition` on one `next`; the sibling case therefore lives only in the hand-built test (AC10), not in the YAML fixture.
- A fix touching `buildNodes` also affects the edit page, visual diff and `createState` (analysis §2 Consumers); AC6 and the new build-layer tests cover them.
- A bare missing branch node is not reachable after `deserialize` (arch review AR-2); only duplicate branch ids and a decision plus sibling state are.

## Open risks

- The synthetic fixture may not trigger the Philips cause; the manual check on the real workflow is the final proof.
- The follow-up for execution-only nodes has no owner until the requester raises it.
- At the Step 0 third outcome the fix location changes and needs a requester decision before code.
