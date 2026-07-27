# Technical Research

**Task**: workflow editor assistant duplication state visual
**Generated**: 2026-07-20T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Currently, the workflow visual editor does not allow a single virtual assistant to be reused across multiple steps. While it is possible to configure this manually via YAML editing, as soon as any of the affected steps is edited in the UI, the assistant is automatically duplicated in the system, instead of referencing the original one. This significantly complicates creating workflows from templates and limits the editor's flexibility. The core issue: when there are multiple steps (states) in the workflow YAML config that reference one virtual assistant and the user edits one of these states via UI, it should update the referenced assistant, not create a new one with changes. Steps to reproduce: 1. Open the workflow visual editor. 2. Manually configure the workflow in YAML so that multiple steps use the same virtual assistant. 3. Save the workflow. 4. Edit any of these steps using the UI editor. 5. Save changes to the step. 6. Check the list of assistants within the workflow - a duplicate has been created. Expected: editing a step should update the referenced assistant; no duplicate is created.

---

## 2. Codebase Findings

### Existing Implementations

The bug is fully localized. The complete call chain from user action to duplication:

**Root cause files:**

- `src/utils/workflowEditor/helpers/states/idGenerators.ts` — `shouldReuseActorId` (lines 114–132): returns `true` only when exactly one state references the given actor ID AND that state is the one currently being edited. When two or more states share the same `assistant_id`, it returns `false`, triggering new-ID generation. This is the predicate that produces the duplication.

- `src/pages/workflows/editor/configPanels/AssistantTab.tsx` — `saveData()` (lines 197–206): calls `shouldReuseActorId`; when it returns `false`, calls `generateActorID(ActorTypes.Assistant, config)` to generate a fresh ID (e.g., `assistant_2`) instead of retaining the existing `assistant_1`. Passes the new actor to `onConfigChange`.

**Same pattern in other config panel tabs (also affected):**

- `src/pages/workflows/editor/configPanels/ToolTab.tsx` (lines 161–163)
- `src/pages/workflows/editor/configPanels/CustomTab.tsx` (lines 109–118)
- `src/pages/workflows/editor/configPanels/TransformTab.tsx` (lines 121–126)

**Downstream processing (correctly implemented, not the bug):**

- `src/utils/workflowEditor/actions/states/updateState.ts` — `applyAssistantUpdates` (lines 158–175): upserts by actor ID. Because a brand-new ID was generated upstream, no existing entry matches, so it appends a new actor entry rather than updating the shared one.
- `src/utils/workflowEditor/actions/states/updateState.ts` — `cleanupOrphanedAssistants` (lines 112–125): removes actors no longer referenced by any state. After the edit, the original `assistant_1` is still referenced by the unedited state, so it is retained. Result: both `assistant_1` and `assistant_2` survive.

**Entry-point call chain (editor → update):**

- `src/pages/workflows/editor/WorkflowEditor.tsx` — mounts the editor, passes `editor.updateConfig` as `onUpdateConfig` to `ConfigPanel`
- `src/pages/workflows/editor/ConfigPanel.tsx` — receives `onConfigChange`, passes it to `AssistantTab` (and other tabs)
- `src/hooks/useWorkflowEditor.ts` — `updateConfig()` calls `actions.states.update(manager.config, update)`
- `src/utils/workflowEditor/index.ts` — `updateConfig` at lines 264–268 routes to `updateStateConfigurationAction`

**Supporting components:**

- `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx` — form for inline virtual assistant configuration; exposes `VirtualAssistantFormRef` with `getValues`, `validate`, `isDirty`, `reset`, `setAIGeneratedFields`
- `src/pages/workflows/editor/configPanels/components/AssistantSelector.tsx` — selector for pre-existing backend assistants (standalone, not virtual)
- `src/utils/workflowEditor/constants.ts` — `ACTOR_FIELD_MAP` maps actor types to their state field names (`assistant_id`, `tool_id`, `custom_node_id`)
- `src/utils/workflowEditor/helpers/states/idGenerators.ts` — `generateActorID`: scans existing actor IDs and picks the next incremental suffix

### Architecture and Layers Affected

| Layer | Components |
|---|---|
| React UI / Form | `AssistantTab.tsx`, `VirtualAssistantForm.tsx`, `AssistantSelector.tsx` — form rendering and `saveData()` logic |
| Config Panel controller | `ConfigPanel.tsx` — tab orchestration, delegates save to each tab |
| Editor orchestration | `WorkflowEditor.tsx` — root editor component |
| Hook / state bridge | `useWorkflowEditor.ts` — wraps the workflow manager in a React-compatible interface |
| Workflow manager (plain TS) | `src/utils/workflowEditor/index.ts` — `createworkflowEditor`: the authoritative mutable config holder |
| Actions (pure functions) | `updateState.ts`, `duplicateState.ts`, `createState.ts` — state mutation functions |
| ID generators (pure) | `idGenerators.ts` — `shouldReuseActorId`, `generateActorID`, `generateStateID` |
| Type definitions | `src/types/workflowEditor/configuration.ts`, `src/types/workflowEditor/base.ts` |

**State management**: no Redux or Zustand. The workflow manager is a plain mutable object created by `createworkflowEditor`, held in `useMemo` inside `useWorkflowEditor.ts`. React state (`useState`) holds nodes/edges for React Flow rendering only; `manager.config` is the authoritative workflow configuration. Valtio (`useSnapshot`) is used for global stores (`assistantsStore`, `settingsStore`) accessed by `AssistantSelector` and `VirtualAssistantForm`.

### Integration Points

- **Backend API**: All workflow data (including embedded actor pool) is serialized to YAML and sent as a single payload via `PUT v1/workflows/{id}` in `src/store/workflows.ts`. There is no separate API for creating/updating workflow-embedded virtual assistants. Standalone assistants use `POST/PUT v1/assistants` in `src/store/assistants.ts`, but these are not involved in the duplication bug.
- **React Flow**: `@xyflow/react` 12.8.6 drives the canvas. Nodes and edges are derived from `manager.config` on each update. The bug does not involve React Flow directly — it occurs during config mutation before rendering.
- **`VirtualAssistantForm`** reuses form sub-components from `src/pages/assistants/components/AssistantForm/` (same UI as standalone assistant creation: `ContextSelector`, `LLMSelector`, `ToolsConfiguration`, `SystemPromptGenAIPopup`).

### Patterns and Conventions

- **Ownership-based actor model**: current convention assumes each actor entry in `config.assistants` is referenced by exactly one state. `shouldReuseActorId`, `cleanupOrphanedAssistants`, and the `duplicateState` action all encode this assumption. The fix must introduce a shared-reference model or change the decision point to always reuse an existing actor ID.
- **Upsert-by-ID**: `applyAssistantUpdates` uses an upsert pattern — find by `id`, update in-place if found, append if not. This logic is already correct for the shared-actor scenario; the bug is that a new ID is generated before this function runs.
- **`generateActorID`**: incremental suffix scan (`assistant_1`, `assistant_2`, …). Safe to call for genuinely new actors; must not be called when the intent is to update an existing actor.
- **Config panels use imperative refs**: each tab exposes `isDirty()`, `save()`, `flush()` via `useImperativeHandle`. `ConfigPanel` coordinates tab saves through these refs.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- **`.ai-run/guides/development/workflow-editor-patterns.md`** — directly relevant. Documents the editor architecture: `src/utils/workflowEditor/` holds all logic; `src/pages/workflows/editor/` holds UI only. Describes the `WorkflowConfiguration` object, serializer/deserializer, and the actor configuration structure. Does NOT address actor sharing between states or multi-state assistant reuse.
- **`.ai-run/guides/patterns/state-management.md`** — documents the Valtio proxy store pattern. No workflow-editor-specific content.
- **`.ai-run/guides/architecture/architecture.md`** — general SPA architecture. Notes that complex canvas logic is extracted to `utils/`. No content on actor sharing.

### Architectural Decisions

No ADR, recorded decision, or inline design comment addresses actor sharing between workflow states. The `shouldReuseActorId` JSDoc describes behavior ("returns false when actor is used by multiple nodes") but gives no rationale for why shared ownership is not supported. The test file for `idGenerators.ts` (lines 196–207) explicitly asserts `returns false when actor is referenced by multiple nodes` — the multi-reference-returns-false behavior is treated as expected and correct in the test suite.

### Derived Conventions

- Actor IDs are local to the workflow (not UUIDs), e.g. `assistant_1`, `tool_2`. They are sequential and generated by `generateActorID`.
- `duplicateState` copies a state and preserves its `assistant_id` — so state duplication intentionally creates shared-actor situations. This is the only intentional sharing path in the current codebase.
- `cleanupOrphanedAssistants` is safe in the one-owner model but will need verification in a shared-actor model — it must not remove an actor referenced by any surviving state.

---

## 4. Testing Landscape

### Existing Coverage

- **`src/utils/workflowEditor/helpers/states/__tests__/idGenerators.test.ts`**: `shouldReuseActorId` fully tested — all branches covered including "actor referenced by multiple states → returns false". This test will fail if the function's behavior is changed.
- **`src/utils/workflowEditor/actions/states/__tests__/updateState.test.ts`**: `updateStateConfigurationAction` tested for orphan cleanup, actor upsert, actor update, and state rename. Does NOT test the shared-assistant-preservation scenario (two states referencing same actor, only one state updated, both must retain their reference).
- **`src/utils/workflowEditor/helpers/states/__tests__/cleanupUnusedReferences.test.ts`**: covers `keep when shared (two states → same assistant_id)` in isolation, but not through the full `updateStateConfigurationAction` path.
- **`src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx`**: `isDirty`, `save`, tab flushing, `getWorkflowFields` — `AssistantTab` is fully mocked with a stub. The real `saveData()` logic is never executed.
- **`src/pages/workflows/editor/configPanels/components/__tests__/AssistantSelector.test.tsx`**: only tests the "View Assistant" button URL construction and enable/disable state.
- **`src/pages/workflows/editor/nodes/__tests__/AssistantNode.test.tsx`**: node rendering only.
- **`src/utils/workflowEditor/actions/states/__tests__/duplicateState.test.ts`**: happy path; no coverage of how duplicated (shared-actor) states interact with subsequent save operations.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 with two projects — `unit` (jsdom environment, mocked stores) and `integration` (real Valtio stores, mocked API)
- **Libraries**: `@testing-library/react` v16, `@testing-library/user-event` v14, `@testing-library/jest-dom` v6
- **Setup files**: `src/setupTests.tsx` (shared globals), `src/setupTests.unit` and `src/setupTests.integration` (per-project store setup)
- **Patterns**: `vi.mock()` + `vi.hoisted()` for store isolation; `createRef<T>()` for imperative handle methods; `WorkflowContext.Provider` + `UnsavedChangesProvider` in render helpers; YAML fixture files in `src/utils/workflowEditor/serialization/deserializer/__tests__/fixtures/`
- **Commands**: `npm run test:unit`, `npm run test:integration`, `npm run test`

### Coverage Gaps

1. **`AssistantTab.saveData()` has no unit test** — the entire decision path (lines 197–206) that governs whether a shared assistant is duplicated is completely untested. This is the highest-priority gap for this bug.
2. **Shared-assistant scenario in `updateStateConfigurationAction`** — two states share `assistant_id`; one state is edited; the shared actor must be updated in-place, not duplicated. No integration test covers this end-to-end.
3. **`VirtualAssistantForm`** has no test file at all despite exposing a rich imperative handle and containing `useEffect` chains that load `datasource_ids`, `tools`, and `mcp_servers`.
4. **`ToolTab.saveData()`, `CustomTab.saveData()`, `TransformTab.saveData()`** — same `shouldReuseActorId` logic duplicated in each; none have unit tests for the shared-actor path.
5. **`shouldReuseActorId` test** at lines 196–207 will need to be updated or removed when the fix changes the function's semantics.

---

## 5. Configuration and Environment

### Environment Variables

| Variable | Value | Relevance |
|---|---|---|
| `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED` | `true` | Enables the visual editor (static, build-time gate) |
| `VITE_API_URL` | `/api` (prod), `http://localhost:8080` (local) | Base URL for all API calls including workflow save |
| `VITE_WORKFLOW_YAML_DOCUMENTATION_URL` | external URL | Linked from `YamlPanel.tsx` — unrelated to bug |
| `VITE_WORKFLOW_DOCUMENTATION_URL` | external URL | Linked from `EditorActions.tsx` — unrelated to bug |

No environment variable controls the shared-assistant behavior. The duplication occurs in all environments whenever the visual editor is enabled.

### Configuration Files

- `.env` / `.env.local` — standard Vite env files; `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED=true` is set in both
- `vite.config.ts` — Vite 5 build config, aliases (`@/` → `src/`), dev proxy (`/api` → `localhost:8080`), vitest config (unit + integration projects)
- `tsconfig.json` — TypeScript strict mode, ESNext/bundler module resolution

### Feature Flags and Deployment Concerns

Two independent paths enable the visual editor; either is sufficient:

1. **Static (build-time)**: `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED=true` — evaluated in `src/utils/workflows.ts` → `isVisualEditorEnabled()`
2. **Dynamic (server-side)**: config key `visualWorkflowEditor` — evaluated via `isConfigItemEnabled(configs, WORKFLOW_VISUAL_EDITOR_FLAG)` reading from `/v1/config` API, stored in `appInfoStore.configs`

No feature flag gates the shared-assistant behavior specifically. The fix applies globally when the visual editor is enabled.

---

## 6. Risk Indicators

- **`shouldReuseActorId` semantics change breaks existing test** — `src/utils/workflowEditor/helpers/states/__tests__/idGenerators.test.ts` lines 196–207 explicitly asserts multi-reference → `false`. Any fix that changes this function's return value must update or replace this test case.
- **Four config panel tabs share the same duplication pattern** — `AssistantTab.tsx`, `ToolTab.tsx`, `CustomTab.tsx`, `TransformTab.tsx` all replicate the `shouldReuseActorId` + `generateActorID` block. The fix must be applied consistently to all four or extracted to a shared utility.
- **`cleanupOrphanedAssistants` interaction** — the cleanup function runs after every `updateStateConfigurationAction`. In the current one-owner model it is safe. After the fix, shared actors must not be pruned when the edited state adopts the shared ID and the other state still references it. This path is already tested in `cleanupUnusedReferences.test.ts` in isolation but not through the full update action with a real two-state shared-actor config.
- **`duplicateState` already creates shared actors** — `src/utils/workflowEditor/actions/states/duplicateState.ts` copies a state and preserves `assistant_id`, intentionally creating the exact scenario the bug reports. This confirms the fix must handle shared-actor references as a first-class concern, not an edge case.
- **No unit tests for `AssistantTab.saveData()`** — the core save path has zero test coverage. The fix will introduce untested behavior in a critical code path unless new tests are added.
- **`VirtualAssistantForm` entirely untested** — `src/pages/workflows/editor/configPanels/components/VirtualAssistantForm.tsx` is involved in every virtual assistant save operation and has no test file.
- **No guide or ADR documents the intended actor-sharing model** — `.ai-run/guides/development/workflow-editor-patterns.md` does not address shared actors. The fix introduces a new behavioral contract with no documented precedent.
- **`shouldReuseActorId` may become dead code** — if the fix is to always reuse the existing `assistant_id` when it exists (regardless of how many states reference it), the function becomes unused across all four tabs and can be deleted. This simplifies the code but requires the calling sites and their tests to be updated.

---

## 7. Summary for Complexity Assessment

The bug is fully localized to a single predicate function and four call sites. The root cause is `shouldReuseActorId` in `src/utils/workflowEditor/helpers/states/idGenerators.ts`, which returns `false` whenever an actor ID is referenced by more than one state. All four config panel tabs (`AssistantTab.tsx`, `ToolTab.tsx`, `CustomTab.tsx`, `TransformTab.tsx`) call this predicate in their `saveData()` methods and branch to `generateActorID` when it returns `false`, producing a duplicate actor entry. The downstream `applyAssistantUpdates` and `cleanupOrphanedAssistants` functions in `updateState.ts` behave correctly — they would handle the shared-actor scenario properly if the upstream call preserved the existing ID. The data model (`WorkflowConfiguration` with a top-level actor pool referenced by ID from states) already supports sharing structurally; the bug is entirely in the ID-selection logic one layer above.

The fix surface is small — approximately 4–6 lines changed across the four tab files (the `canReuseId` + `assistantId` block in each `saveData()`), plus the `shouldReuseActorId` function itself which would either be modified or deleted. However, the change touches a behavioral assumption that is explicitly encoded in the existing test suite (`idGenerators.test.ts` lines 196–207 asserts multi-reference → `false`), so at least that test must be updated. New tests will need to cover the shared-actor save path that is currently entirely untested — `AssistantTab.saveData()` has no unit tests, and the integration scenario (two states, shared actor, edit one, verify no duplication) does not exist in `updateState.test.ts`.

Key risk factors: (1) the same fix pattern must be applied to four tabs consistently; (2) `cleanupOrphanedAssistants` must be verified correct for the shared-actor case under the new semantics (existing isolation tests cover this, but the integrated path through `updateStateConfigurationAction` with a two-state shared-actor config is not tested); (3) no architectural guide documents the intended actor-sharing model, so the fix introduces a new behavioral contract that should be documented. Overall complexity is low-to-medium — the change is surgical and well-bounded, but requires coordinated test updates and parallel application to four sibling files.
