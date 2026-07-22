# Technical Research

**Task**: workflow edit ai refine revert frontend react typescript
**Generated**: 2026-07-09T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-12616: Enhance Workflow Edit with 'Refine/Modify with AI' and 'Revert to Previous' Option. Currently, workflow edit does not offer users AI-powered refine/modify options, nor the ability to revert to a previous workflow state if an AI-driven change is unsatisfactory. Enhancements needed: (1) Integrate 'Refine/Modify with AI' into workflow edit so users can apply AI suggestions for workflow optimization. (2) Add a 'Revert to Previous' action, enabling rollback to the last saved workflow version in case AI modifications are not desired. (3) Ensure these functionalities are intuitive and clearly available within edit UI. Acceptance Criteria: 'Refine/Modify with AI' button is added to workflow edit interface. 'Revert to Previous' option is available after AI modification. After revert, workflow is restored to last saved version; user can continue editing. Action history is logged for all AI modifications and reverts. No regression in workflow edit/save functionality. This is a FRONTEND-ONLY task in the codemie-ui React/TypeScript project.

---

## 2. Codebase Findings

### Existing Implementations

**Workflow edit entry points:**
- `/src/pages/workflows/EditWorkflowPage.tsx` — Page component for editing a workflow. Reads `workflowsStore.currentWorkflow` via Valtio `useSnapshot`. Holds a `formRef: WorkflowFormRef`. Header `rightContent` contains Cancel / Save / Save and Run buttons. This is where the new "Refine with AI" and "Revert" buttons must be added.
- `/src/pages/workflows/components/WorkflowForm.tsx` — `forwardRef` orchestrator for both editor modes. Exposes `WorkflowFormRef` interface: `validateWorkflow()`, `triggerValidation()`, `save()`, `getFormValues()`, `openIssuesPanel()`, `clearAllResolvedFields()`. Must be extended with `replaceYamlConfig(yaml: string)` / `setYamlConfig(yaml: string)` for AI-generated YAML injection.

**Visual editor path:**
- `/src/pages/workflows/editor/WorkflowEditor.tsx` — Top-level visual editor component (ReactFlow). Exposes `WorkflowEditorRef`. Has no external method to replace the full YAML config; this gap must be closed for AI refine integration.
- `/src/pages/workflows/editor/EditorActions.tsx` — Floating button row in the visual editor (YAML, Undo, Beautify, Workflow Config). Has established button pattern with icon buttons and tooltips. The existing "Undo" button uses `RevertSVG`. Adding a "Revert to History" button here is viable.
- `/src/pages/workflows/editor/ConfigPanel.tsx` — Right-side panel with tabs. Passes `yaml_config_history` down to `YamlPanel`.
- `/src/pages/workflows/editor/configPanels/YamlPanel.tsx` — YAML tab in ConfigPanel. Already has a "Version History" sub-tab with `Autocomplete` selector, readonly `AceEditor`, and a "Restore" button (`handleRestore` sets local YAML state, no API call). This is the existing "revert" mechanism — buried inside a tab panel.

**Legacy form path (non-visual editor):**
- `/src/pages/workflows/components/WorkflowFormFields.tsx` — Standard form fields using React Hook Form.
- `/src/pages/workflows/components/WorkflowConfigField.tsx` — YAML field wrapped in `VersionedField` with history/restore already wired. `WorkflowFormFields.test.tsx` mocks this component entirely.

**Reusable history/revert component:**
- `/src/components/form/VersionedField/VersionedField.tsx` — Generic "Edit mode / Version History" tabs component. Used in `WorkflowConfigField`. Could be reused in a new `RevertWorkflowModal`.
- `/src/components/form/VersionedField/VersionedFieldHistoryTab.tsx` — History picker tab with diff view. No test files exist.

**In-session undo (existing):**
- `/src/hooks/useUndo.ts` — Custom hook: 50-item history stack of YAML strings. Exposes `{ canUndo, undo, trackChange }`. Fully integrated into the visual editor via `useWorkflowEditor.ts`. Already rendered in `EditorActions.tsx` as "Undo" button. No new work needed for in-session undo.

**Existing AI refine pattern (Assistants — primary reference):**
- `/src/pages/assistants/EditAssistantPage.tsx` — "Refine with AI" `ButtonType.MAGICAL` button in page header, calls `formRef.current.handleRefineWithAI()`.
- `/src/pages/assistants/components/AssistantForm/components/RefineWithAIPromptPopup.tsx` — Step 1: optional free-text prompt popup.
- `/src/pages/assistants/components/RefineAssistantModal/RefineAssistantModal.tsx` — Step 2: recommendations modal with per-item "Apply" and "Apply All Changes" buttons.
- `/src/pages/assistants/components/AssistantForm/hooks/useRefineAIRecommendations.ts` — Applies field recommendations to React Hook Form via `setValue`.
- `/src/types/entity/assistant.ts` (lines 268–326) — `AssistantAIRefineFields`, `AssistantAIRefineResponse`, `FieldRecommendation`, `ToolkitRecommendation`, `RecommendationAction` enum, `RecommendationSeverity` enum.

**Existing AI refine pattern (Skills — secondary reference):**
- `/src/pages/skills/components/EditSkillForm.tsx` — Same `ButtonType.MAGICAL` pattern.
- `/src/pages/skills/components/RefineSkillModal.tsx` — Reuses `FieldRecommendationItem`, `ToolRecommendationItem` from AssistantModal components.
- `/src/pages/skills/hooks/useRefineSkillRecommendations.ts`
- `/src/types/entity/skill.ts` (lines 139–151) — `SkillAIRefineFields`, `SkillAIRefineResponse`.

**Stores:**
- `/src/store/workflows.ts` — `workflowsStore` Valtio proxy. Methods: `fetchWorkflow`, `updateWorkflow`, `createWorkflow`, `deleteWorkflow`, `getWorkflowDiagram`. No `refineWorkflowWithAI` method exists. The `WorkflowsStore` interface and proxy must be extended.
- `/src/store/assistants.ts` line 820 — `refineAssistantWithAI(fields)` → `api.post('v1/assistants/refine', fields)` (direct reference template).
- `/src/store/workflowExecutions.ts` line 877 — `requestWorkflowExecutionStateOutputChange` hits `PUT v1/workflows/:id/executions/:id/output/request_changes` (AI for execution outputs, not workflow YAML — different concern).

**Types:**
- `/src/types/entity/workflow.ts` — `Workflow` interface includes `yaml_config_history: WorkflowConfigHistoryItem[]` where `WorkflowConfigHistoryItem = { yaml_config: string; date: string; created_by: { user_id, username, name } }`. No `WorkflowAIRefineFields` or `WorkflowAIRefineResponse` types exist yet.

**Constants and routing:**
- `/src/constants/routes.ts` line 35 — `EDIT_WORKFLOW` route constant.
- `/src/constants/workflows.ts` — `WORKFLOW_VISUAL_EDITOR_FLAG` constant and other workflow feature flag names. New AI refine flag name should be added here.
- `/src/router.tsx` line 384 — `workflows/:id/edit` → `EditWorkflowPage`.

### Architecture and Layers Affected

| Layer | Components / Modules |
|---|---|
| Page (entry point) | `EditWorkflowPage` — button placement, state for popup/modal visibility |
| Component (visual editor) | `EditorActions`, `WorkflowEditor`, `ConfigPanel`, `YamlPanel` |
| Component (legacy editor) | `WorkflowForm`, `WorkflowFormFields`, `WorkflowConfigField` |
| Component (new) | `RefineWorkflowPromptPopup`, `RefineWorkflowModal` (to be created) |
| Hooks | `useWorkflowEditor`, `useUndo` (existing); `useRefineWorkflowRecommendations` (new) |
| Store | `workflowsStore` — new `refineWorkflowWithAI` method |
| Types | `workflow.ts` — new `WorkflowAIRefineFields`, `WorkflowAIRefineResponse` interfaces |
| Shared Component | `VersionedField` / `VersionedFieldHistoryTab` — reuse for revert modal |

### Integration Points

**Internal:**
- `workflowsStore.refineWorkflowWithAI` → calls `api.post('v1/workflows/refine', ...)` (new backend endpoint required).
- `WorkflowFormRef.replaceYamlConfig(yaml)` (new method) → invoked by `EditWorkflowPage` on recommendation apply or revert confirm.
- `WorkflowEditorRef` — needs a new `setYamlConfig(yaml: string)` method to accept externally pushed YAML (visual editor path).
- `UnsavedChangesProvider` / `useUnsavedChanges` — any programmatic YAML replacement must call `blockTransition()` afterwards to re-enable the unsaved-changes guard.
- Feature flag system: `isConfigItemEnabled(configs, 'workflowAIRefine')` (or similar constant from `src/constants/workflows.ts`) gates the "Refine with AI" button visibility.

**External:**
- Backend `POST v1/workflows/refine` endpoint — does not yet exist. The frontend implementation will fail at runtime until the backend delivers this endpoint. The request/response shape must be agreed with the backend team.

### Patterns and Conventions

- **Two-step refine flow**: `RefineWithAIPromptPopup` (optional prompt) → `RefineWorkflowModal` (recommendations + apply). This pattern is established in both assistants and skills.
- **Button variant**: `ButtonType.MAGICAL` for the trigger button, placed in `EditWorkflowPage` `rightContent` alongside existing header buttons.
- **Modal implementation**: Use `Popup` from `@/components/Popup` (never raw PrimeReact `Dialog`). Custom footer via `footerContent` prop. `dismissableMask={false}` on prompt popup. `overlayClassName="z-60"` for layering.
- **Store method**: Plain `async` function on the Valtio proxy returning `Promise<T>`. No loading/error fields on the store; the modal manages its own loading/error state locally.
- **Recommendation apply logic**: Extracted into a co-located hook `useRefineWorkflowRecommendations.ts`. Uses React Hook Form `setValue` or a `replaceYamlConfig` ref method depending on field type.
- **Revert (server-side history)**: Reuse `VersionedField` / `VersionedFieldHistoryTab` components. History data comes from `currentWorkflow.yaml_config_history` already loaded in the store. No API call on revert — push the selected YAML back into the editor, let the user confirm with Save.
- **Feature flag gating**: New feature flag constant in `src/constants/workflows.ts`, checked via `isConfigItemEnabled(configs, CONSTANT)` in `EditWorkflowPage`.
- **License headers**: Every new `.tsx`/`.ts` file must include the Apache 2.0 header (enforced by pre-commit `license-headers:check`).
- **Conditional icon buttons**: Icon-only buttons need `aria-label` (WCAG AA, enforced by `accessibility-patterns.md` guide).

---

## 3. Documentation Findings

### Guides and Architecture Docs

Guides found under `/Users/yevhen_slyva/codemie-dev/codemie-ui/.ai-run/guides/`:

| Guide | Relevance |
|---|---|
| `architecture/architecture.md` | Three-layer rule (Component → Store → API), feature folder layout, extension points — mandatory |
| `patterns/state-management.md` | Canonical Valtio proxy pattern for new store methods |
| `patterns/modal-patterns.md` | Popup usage rules, footer layout for "Apply All" / "Close" pattern |
| `patterns/form-patterns.md` | React Hook Form + Yup for the optional prompt input in `RefineWorkflowPromptPopup` |
| `patterns/custom-hooks.md` | Co-location rules for `useRefineWorkflowRecommendations` hook |
| `patterns/accessibility-patterns.md` | WCAG AA minimum, aria-label requirements for icon buttons |
| `standards/git-workflow.md` | Branch naming `EPMCDME-12616_short-description`, commit format |
| `quality-gates.md` | Pre-MR: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration` |

Note: `AGENTS.md` / `CLAUDE.md` are backend-scoped Python/FastAPI guides; frontend-relevant source of truth is the `.ai-run/guides/` files above.

### Architectural Decisions

- **No Axios**: HTTP goes through `src/utils/api.ts` (custom fetch wrapper). Responses parsed with `.json()` directly.
- **Valtio-only state**: No Redux, Zustand, Jotai, or React Query. All server state and async actions live in proxy store objects.
- **Hash-based routing**: SPA with React Router, hash URLs.
- **Dual editor modes**: The `isVisualEditorEnabled(configs)` utility in `src/utils/workflows.ts` checks both backend flag (`WORKFLOW_VISUAL_EDITOR_FLAG`) and `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED` env var. Any new feature must work in both editor modes.
- **Existing "Revert" surfaces are buried**: The `YamlPanel` "Version History" tab and `WorkflowConfigField` `VersionedField` restore are already functional but only accessible deep inside a tab panel — not at the page-header level. The ticket requires promoting this to the top-level edit UI.

### Derived Conventions

- New component files go under `src/pages/workflows/components/` (for shared workflow UI) or a sub-folder following the existing `RefineAssistantModal/` structure for multi-file modal components.
- New hooks co-located with the component that uses them (e.g. `src/pages/workflows/hooks/useRefineWorkflowRecommendations.ts`).
- New type interfaces appended to `src/types/entity/workflow.ts` following the assistant type block pattern.
- New store methods appended to both the `WorkflowsStore` interface and the `workflowsStore` proxy object in `src/store/workflows.ts`.
- New feature flag constants added to `src/constants/workflows.ts` as named exports.
- The `AGENTS.md` task classifier table points to backend guides; for frontend work, the governing guides are the ones listed in the table above.

---

## 4. Testing Landscape

### Existing Coverage

**Well-covered (directly relevant):**
- `/src/hooks/__tests__/useUndo.test.tsx` — Full coverage of `trackChange`, cooldown deduplication, `undo`, `canUndo`, `MAX_HISTORY_SIZE`. In-session undo is solid.
- `/src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` — Tests `isDirty`, `save`, `showUnsavedChangesDialog`, `getWorkflowFields`, `triggerGeneralConfigValidation`. All child tab components are mocked.
- `/src/pages/workflows/editor/nodes/__tests__/` — Individual node type component tests (AssistantNode, ToolNode, ConditionalNode, etc.).
- `/src/utils/workflowEditor/` — Serialization, deserialization, state create/update/remove/duplicate — all have dedicated unit tests.
- `/src/pages/workflows/components/__tests__/WorkflowActions.test.tsx` — Workflow action buttons.
- `/src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` — "Share with Project" toggle; `WorkflowConfigField` is mocked entirely (its restore behavior is untested).

**Integration tests:**
- `/src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx`
- `/src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx`

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 with two named projects in `vitest.workspace.ts`:
  - `unit` — all `__tests__/**/*.{test,spec}.*` except `.integration.test.*`. Valtio `useSnapshot` is mocked to return the store object directly. Uses mock of `@/utils/api`.
  - `integration` — only `.integration.test.*`. Real Valtio proxy reactivity. Global `fetch` mock via `setupTests.tsx` `requestRegistry` map.
- **Rendering**: `@testing-library/react` + `@testing-library/user-event`.
- **Integration helpers**: `src/test-utils/integration.tsx` exports `mockAPI(method, url, data)` and `renderPage(path)` with real router.
- **Mocks**: `src/test-utils/_mock-state.ts` (shared `requestRegistry` and `navigate` spy). PrimeReact component interaction helpers in `src/test-utils/component-interactions/`.
- **No E2E**: No Playwright or Cypress found.

### Coverage Gaps

The following components and modules touched by this feature have **no existing tests**:

- `EditWorkflowPage` — no test file.
- `WorkflowForm` — no test file.
- `WorkflowEditor` (visual editor top-level) — no test file.
- `EditorActions` — no test file.
- `YamlPanel` (including its Version History tab and `handleRestore`) — no test file.
- `WorkflowConfigField` — no test file (mocked in `WorkflowFormFields.test.tsx`).
- `VersionedField` / `VersionedFieldHistoryTab` — no test files anywhere under `src/components/form/VersionedField/`.
- `workflowsStore` — no store-level unit tests. Methods exercised only indirectly through integration tests.
- `workflowsStore.refineWorkflowWithAI` (new method to be added) — needs a unit test for the API call and an integration test for the full modal flow.
- `useRefineWorkflowRecommendations` (new hook to be created) — needs a unit test for recommendation apply logic.
- `RefineWorkflowPromptPopup`, `RefineWorkflowModal` (new components) — need unit tests.

---

## 5. Configuration and Environment

### Environment Variables

| Variable | Source | Purpose |
|---|---|---|
| `VITE_API_URL` | `.env` / `.env.local` | Base URL for all API calls (e.g. `/api` or `http://localhost:8080`) |
| `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED` | `.env` | Enables visual node-based editor (also checked via backend flag) |
| `VITE_WORKFLOW_YAML_DOCUMENTATION_URL` | `.env` | Documentation link shown in YAML editor toolbar |
| `VITE_WORKFLOW_DOCUMENTATION_URL` | `.env` | General workflow docs link |

No new environment variables are expected for this feature. The AI refine toggle will use the existing backend config item system.

### Configuration Files

- `/vite.config.ts` — Vite 5 bundler config. Has a proxy rule rewriting `/api` → backend in dev.
- `vitest.workspace.ts` — Defines `unit` and `integration` test projects.
- `tsconfig.json` — TypeScript config with `@/*` path alias mapping to `src/`.

### Feature Flags and Deployment Concerns

- Runtime flags come from `GET v1/config` → `appInfoStore.configs` (array of `ConfigItem`).
- Checked via `useFeatureFlag(name)` hook (reactive) or `isConfigItemEnabled(configs, name)` (non-reactive).
- Existing workflow feature flags: `WORKFLOW_VISUAL_EDITOR_FLAG` (`'workflowVisualEditor'`) and `'workflowDocumentation'`, `'workflowYamlDocumentation'` — all defined in or checked against `src/constants/workflows.ts`.
- A new flag `workflowAIRefine` (or similar) should be added to `src/constants/workflows.ts` as a named constant and used to gate the "Refine with AI" button visibility in `EditWorkflowPage`.
- The `isVisualEditorEnabled(configs)` utility (`src/utils/workflows.ts` line 170) gates visual editor UI; any "Refine with AI" feature that behaves differently between editor modes must also check this.
- No Docker / CI/CD changes are needed for a frontend-only feature toggle.

---

## 6. Risk Indicators

- **No `v1/workflows/refine` backend endpoint exists**: The entire "Refine/Modify with AI" frontend feature is blocked at runtime until the backend delivers this endpoint. The frontend can be built speculatively against an agreed contract, but end-to-end testing requires backend delivery. This is the highest-priority external dependency.
- **`WorkflowEditorRef` has no `setYamlConfig` method**: Injecting AI-generated YAML into the running visual editor requires adding a new imperative handle method to `WorkflowEditor`. Without it, the refine result cannot be applied to the canvas in visual editor mode. This is a non-trivial ref interface change.
- **`WorkflowFormRef` has no `replaceYamlConfig` method**: Same gap for the legacy form editor path. Must be added to `WorkflowFormRef` and implemented in `WorkflowForm.tsx`.
- **`UnsavedChangesProvider` interaction**: Any programmatic replacement of YAML config must correctly call `blockTransition()` to re-arm the unsaved-changes guard. Failure to do so will allow navigation away without the "unsaved changes" warning after AI refine is applied.
- **No tests for `EditWorkflowPage`, `WorkflowEditor`, `EditorActions`, `YamlPanel`**: The main UI surfaces touched by this ticket are all untested. Any regression in save/edit flow introduced by the new buttons or ref methods will not be caught by existing tests.
- **`WorkflowConfigField` restore path is untested**: The `WorkflowFormFields.test.tsx` mocks `WorkflowConfigField` entirely. The existing "Version History" restore in the legacy editor is not covered and a new prominent "Revert" button will use the same data path.
- **`VersionedField` / `VersionedFieldHistoryTab` have no tests**: If these shared components are used for a new "Revert to Previous" modal, their behavior (diff view, `onRestore` callback, history dropdown) will need test coverage added.
- **Dual editor mode complexity**: Features must work in both visual editor (ReactFlow + `WorkflowEditor`) and legacy form editor (`WorkflowFormFields` + `WorkflowConfigField`). Each path has separate YAML state management. AI refine must correctly update both paths.
- **`workflowsStore` has no unit tests**: The new `refineWorkflowWithAI` store method will join a store with zero test coverage, making it easy to introduce regressions in adjacent store logic.
- **No existing `WorkflowAIRefineResponse` type**: The recommendation data shape from the backend is unknown at this time. Type definitions in `src/types/entity/workflow.ts` must await or be agreed with the backend team. Using `AssistantAIRefineResponse` shape as a starting template is reasonable but not guaranteed to match.
- **"Action history is logged" acceptance criterion**: The ticket requires logging AI modifications and reverts. There is no existing frontend action-history/audit-log mechanism in the workflow domain. This may require a new log store, a backend logging endpoint, or a clarification that logging is purely server-side. Scope is unclear.
- **Thin task description for "Action history is logged"**: The acceptance criterion is stated without any detail on implementation (server-side log? UI audit trail? toast notifications?). Needs clarification before implementation begins.

---

## 7. Summary for Complexity Assessment

The "Refine/Modify with AI" sub-feature follows a well-established two-step popup + recommendations modal pattern that exists in full production form for Assistants (`EditAssistantPage` + `RefineAssistantModal`) and Skills (`EditSkillForm` + `RefineSkillModal`). The frontend structure is clear: add a `ButtonType.MAGICAL` button to `EditWorkflowPage`, create `RefineWorkflowPromptPopup` and `RefineWorkflowModal` components, add `refineWorkflowWithAI` to `workflowsStore`, and add `WorkflowAIRefineFields` / `WorkflowAIRefineResponse` types. The main complication is that the AI-generated YAML must be injected back into the running visual editor via a new `setYamlConfig` method on `WorkflowEditorRef` — a ref interface change that requires careful coordination with the `useImperativeHandle` in `WorkflowEditor.tsx` and the `WorkflowFormRef` in `WorkflowForm.tsx`. The feature also has a hard external dependency: the backend `POST v1/workflows/refine` endpoint does not exist and must be delivered before end-to-end testing is possible.

The "Revert to Previous" sub-feature is substantially pre-built. Both editor paths already have a working version-history UI: `YamlPanel`'s "Version History" tab (visual editor) and `WorkflowConfigField`'s `VersionedField` (legacy editor). The ticket's requirement is to surface this functionality more prominently — likely a "Revert" button in the `EditWorkflowPage` header that opens a modal using the existing `VersionedField` / `VersionedFieldHistoryTab` components. No new state or API calls are needed for revert itself; the challenge is integrating the restore action with the `UnsavedChangesProvider` guard and the dual editor mode YAML state. The "action history is logged" acceptance criterion is ambiguous — it could mean a backend audit log (already implicit in `yaml_config_history`) or a frontend UI element — and requires clarification.

Test coverage posture is poor for the affected area: `EditWorkflowPage`, `WorkflowEditor`, `EditorActions`, `YamlPanel`, `WorkflowConfigField`, and `VersionedField` have no existing test files. The `workflowsStore` has no unit tests. New components and hooks introduced by this ticket will need unit tests for the refine modal flow and a recommendation-apply hook, plus integration tests verifying the full "click Refine with AI → apply recommendations → YAML updated in editor" flow. The ticket estimates a medium-to-high file change surface: approximately 8–12 files modified, 5–7 files created new, spanning the Page, Component, Hook, Store, and Types layers.
