# Technical Research

**Task**: workflows refine-popup generate-popup component-pattern
**Generated**: 2026-07-17T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Refactor RefineWorkflowPromptPopup in the workflow editor (EPMCDME-12616) to follow the same async-state-internal pattern used by GenerateWorkflowPopup from EPMCDME-10037. Currently RefineWorkflowPromptPopup receives `isLoading` as a prop and the parent page manages the API call. We want to move the API call inside the popup (as GenerateWorkflowPopup does), align the loading UI (centered spinner replacing form content instead of spinner inside button), and simplify the parent page state. Also remove the `isRefining` state from EditWorkflowPage header button.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/workflows/components/RefineWorkflowPromptPopup.tsx` — Current popup. Accepts `isVisible`, `isLoading?: boolean`, `onHide`, `onRefine: (prompt: string) => void`. Uses RHF (`useForm`/`Controller`/`yupResolver`) with a single `refine_prompt` textarea, Yup schema, and a `ref`-focused textarea. Loading state is purely cosmetic: spinner rendered inside the MAGICAL button, both buttons `disabled={isLoading}`. The `onRefine` callback is fired synchronously by the form submit handler — the actual API call lives entirely in the parent.

- `src/pages/workflows/components/GenerateWorkflowPopup.tsx` — Target pattern. Props: `visible`, `onHide`, `onGenerated: (data: GenerateWorkflowResponse) => void`. Manages `const [isLoading, setIsLoading] = useState(false)` internally. On submit, calls `workflowsStore.generateWorkflow(text, false)` directly, wraps in try/catch/finally, calls `onGenerated(data)` + `handleHide()` on success, `toaster.error(...)` on failure, resets `isLoading` in `finally`. Loading UI: `{isLoading && <div className="flex justify-center mt-4 mb-12"><Spinner inline /></div>}` — the entire form content block is conditionally hidden while loading (`{!isLoading && ...}`). No RHF — uses plain controlled `useState` for the textarea.

- `src/pages/workflows/EditWorkflowPage.tsx` — Parent page. Currently owns: `const [isRefining, setIsRefining] = useState(false)`, `const [showPromptPopup, setShowPromptPopup] = useState(false)`, and `handlePromptSubmit(prompt)` which calls `workflowsStore.refineWorkflowWithAI(id, {...})`, sets `preRefinementYaml`, calls `formRef.current?.replaceYamlConfig(...)`, and shows toasts. The `isRefining` state drives two places: the header "Refine with AI" button (shows spinner + "Refining…" label, is disabled) and is passed as `isLoading={isRefining}` to `<RefineWorkflowPromptPopup>`. After refactoring, `isRefining` and `handlePromptSubmit` are removed from this file; the popup takes over both.

- `src/pages/workflows/NewWorkflowPage.tsx` — Sibling page using `GenerateWorkflowPopup` with the target pattern: `showGeneratePopup` boolean state, `onGenerated={handleGenerated}` callback. No loading state in the page.

- `src/store/workflows.ts` — `workflowsStore.refineWorkflowWithAI(id: string, fields: WorkflowAIRefineFields): Promise<WorkflowAIRefineResponse>` — posts to `v1/workflows/${id}/refine`, returns `{ yaml_config: string }`. This is what the popup needs to call after the refactor.

- `src/types/entity/workflow.ts` — `WorkflowAIRefineFields = { yaml_config: string; refine_prompt?: string }`, `WorkflowAIRefineResponse = { yaml_config: string }`.

### Architecture and Layers Affected

**UI Component layer (popup)**:
- `RefineWorkflowPromptPopup.tsx` — gains internal `isLoading` state, imports `workflowsStore`, calls the API, changes loading UI pattern, drops `isLoading` prop.

**Page / Orchestration layer (parent)**:
- `EditWorkflowPage.tsx` — removes `isRefining` state, removes `handlePromptSubmit`, changes `onRefine` prop to `onRefined` callback that receives the refine result (or only the YAML), simplifies header button (always shows static label/icon when popup is closed).

**No database, router, or API layer changes** — the store method `refineWorkflowWithAI` is unchanged.

### Integration Points

- `workflowsStore.refineWorkflowWithAI` — called from `EditWorkflowPage.handlePromptSubmit` today; will be called directly from within `RefineWorkflowPromptPopup` after refactoring.
- `formRef.current?.getFormValues()` — the popup needs the current YAML to send as `yaml_config`. This value must come from the parent. Two options: (a) parent reads YAML before opening popup and passes it as a prop, or (b) parent reads YAML inside the new `onRefined` callback. The current code reads YAML inside `handlePromptSubmit` immediately before the API call, so it must be passed as a prop (`workflowId` + `yamlConfig` props) into the popup, or the popup receives a getter callback.
- `toaster.info('AI refine applied — save to confirm')` — currently called in `EditWorkflowPage`. After refactoring, `GenerateWorkflowPopup` calls `handleHide()` but no toast; the toast for refine is user-visible and should stay. Likely stays in the popup (same as how `GenerateWorkflowPopup` calls `toaster.error` internally).
- `setPreRefinementYaml(yamlBeforeRefine)` and `formRef.current?.replaceYamlConfig(result.yaml_config)` — these must remain in `EditWorkflowPage` because they touch page-level state and the form ref. The popup callback (`onRefined`) must therefore supply the result YAML back to the parent, analogous to `onGenerated` supplying `GenerateWorkflowResponse`.

### Patterns and Conventions

- **Async-state-internal popup pattern** (established by `GenerateWorkflowPopup`): popup owns `isLoading` via `useState`, calls store directly, invokes a success callback (not a fire-and-forget side-effect), shows centered `<Spinner inline />` that replaces form content, keeps error handling with `toaster.error` inside the popup.
- **`Popup` component** (PrimeReact `Dialog` wrapper, `src/components/Popup/Popup.tsx`): accepts `visible`, `onHide`, `hideFooter`, `dismissableMask`, `className`, `header`, `isMagic`, etc. Both existing popups use `hideFooter` and render their own footer inside `children`.
- **`ButtonType.MAGICAL`** (`src/constants/index.ts`, value `'magical'`): applies `bg-magical-button border-border-specific-button-service text-text-inverse` Tailwind classes. Used for AI-action primary buttons in both popups. `Button` also accepts an `isLoading` prop that adds a shimmer overlay — but neither current popup uses this; they render the spinner manually.
- **`<Spinner inline />`**: `inline` prop replaces `min-h-screen` with `pt-5` — gives compact centering suitable for popup content areas. Used identically in `GenerateWorkflowPopup`.
- **`Spinner` ARIA**: the `<output>` element (not `<div>`) bears `aria-label="Loading"` — tests assert on `role="status"` (output element's implicit role).
- **RHF usage**: `RefineWorkflowPromptPopup` is the only one of the two popup siblings using RHF. `GenerateWorkflowPopup` uses plain `useState` for text. The refactored popup can retain RHF or switch to plain state — the only field is a single optional textarea, so plain state simplifies the diff, but retention is acceptable.
- **Textarea ref + focus autofocus**: `RefineWorkflowPromptPopup` uses a `useRef<TextareaRef>` to focus the textarea when `isVisible` becomes true. This behaviour should be preserved or the UX regresses.
- **Error message structure**: `EditWorkflowPage.handlePromptSubmit` extracts `error?.parsedError?.error?.message ?? error?.message ?? 'Failed to refine workflow'`. `GenerateWorkflowPopup` uses `error instanceof Error ? error.message : 'Failed to generate workflow'`. The refactored popup should use the same pattern as the current page handler for correct error extraction.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No `.ai-run/guides/` files were checked — this is a UI (React/TypeScript) codebase; the guides listed in `AGENTS.md` are backend-focused. No frontend-specific guide exists for popup component patterns. The `GenerateWorkflowPopup` implementation on this branch is the authoritative pattern reference.

### Architectural Decisions

- EPMCDME-10037 established the async-state-internal popup pattern when `GenerateWorkflowPopup` was introduced. The current task (EPMCDME-12616) explicitly canonises that pattern and retrofits `RefineWorkflowPromptPopup` to match.
- The `Popup` component renders via PrimeReact `Dialog` with `focusOnShow={false}` — manual focus management via `useRef` is the established approach.

### Derived Conventions

- Popup components in `src/pages/workflows/components/` are self-contained: they import from `@/store/*` directly and use `toaster` for error feedback.
- Page-level components (`EditWorkflowPage`, `NewWorkflowPage`) hold only visibility boolean state for popups (`showPromptPopup`, `showGeneratePopup`) and a result callback.
- Loading spinners in popups are centered and replace content, never appear inside buttons alongside text.

---

## 4. Testing Landscape

### Existing Coverage

**`src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx`** (5 tests):
1. Renders with correct header when visible.
2. Does not render when not visible.
3. Calls `onRefine` with empty string when submitted without prompt.
4. Calls `onRefine` with the entered prompt.
5. Calls `onHide` when Cancel is clicked.
6. Disables both buttons and shows spinner (`role="status"`) when `isLoading=true`.

After refactoring: tests 3 and 4 change significantly — `onRefine` callback is replaced by `onRefined(result)` which fires only after a successful API call. Test 6 (isLoading prop) is entirely removed; replaced by tests that assert on the internal loading state via mocked store calls (as `GenerateWorkflowPopup.test.tsx` does). Tests 1, 2, and 5 need only minor prop adjustments.

**`src/pages/workflows/components/__tests__/GenerateWorkflowPopup.test.tsx`** (9 tests) — model for the rewrite of `RefineWorkflowPromptPopup.test.tsx`. Covers: renders when visible, not when hidden, disables submit when empty, calls store method, calls `onGenerated`+`onHide` on success, shows toaster.error on failure, does not call `onHide` on failure, resets state on Cancel.

**`src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx`** (9 tests) — integration tests using `renderPage('/workflows/wf-edit-1/edit')` with real router and `mockAPI`. Currently: clicks "Refine with AI" header button → popup opens → clicks popup "Refine with AI" button → asserts API called, toasts shown, revert button enabled. After refactoring: the flow through the integration tests should remain largely the same because the popup still receives `workflowId` and the API call still happens; the tests interact at the DOM level and do not depend on where `isRefining` lives. One assertion that may need updating: any test checking the header "Refine with AI" button shows a spinner during in-flight refinement will need to be removed or replaced with an assertion on popup-level loading.

### Testing Framework and Patterns

- **Vitest** + **@testing-library/react** + **@testing-library/user-event** throughout.
- Unit tests for popup components mock `@/components/Popup`, `@/components/Spinner`, `@/components/form/Textarea`, and the store (`vi.hoisted` + `vi.mock`).
- Integration tests use `renderPage()` (creates `MemoryRouter` with full route config) and `mockAPI()` (registers fetch interceptors via `requestRegistry`).
- `vi.clearAllMocks()` in `beforeEach`; `cleanup` in `afterEach`.
- Spinner is asserted via `screen.getByRole('status')` — the `<output>` element's implicit ARIA role.

### Coverage Gaps

- No existing test covers the **happy-path API call from inside the popup** for `RefineWorkflowPromptPopup` (currently the API is in the page). New unit tests must be added matching `GenerateWorkflowPopup.test.tsx` structure: mock `workflowsStore.refineWorkflowWithAI`, assert success path, error path, and that `isLoading` replaces form content with a spinner.
- No test covers the `workflowId` + `yamlConfig` prop passing to the popup (new props after refactoring).
- Integration tests do not assert spinner visibility inside popup during in-flight API; this gap exists for `GenerateWorkflowPopup` too and is acceptable.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this refactor. The store's `api.post` uses the global API base URL configured at the app level.

### Configuration Files

No feature flags or per-environment config affect this change.

### Feature Flags and Deployment Concerns

None. The visual editor feature flag (`isVisualEditorEnabled`) is used in `EditWorkflowPage` for save/run behaviour but does not gate the refine flow.

---

## 6. Risk Indicators

- **Callback contract change**: `onRefine: (prompt: string) => void` becomes `onRefined: (result: WorkflowAIRefineResponse) => void` (or a narrower `onRefined: (yamlConfig: string) => void`). The parent page must be updated in lockstep — missing this breaks the revert flow entirely since `setPreRefinementYaml` and `replaceYamlConfig` depend on having the result YAML.

- **YAML capture timing**: the popup needs `yaml_config` to send to the API (`WorkflowAIRefineFields.yaml_config`). `formRef.current?.getFormValues()` is only accessible in `EditWorkflowPage`. The popup must receive either a `yamlConfig: string` snapshot prop (captured by the page when it opens the popup) or a `workflowId` + `getYamlConfig: () => string` callback prop. The snapshot prop approach is simpler and matches the pattern used in `GenerateWorkflowPopup` (which has no equivalent — it generates from scratch with no YAML input). This is the main design decision the refactor must make explicit.

- **`workflowId` prop**: the popup must know the workflow ID to call `v1/workflows/${id}/refine`. Currently the page holds `id` from route params. The popup needs this as a new required prop.

- **Header button spinner removal**: removing `isRefining` from the header "Refine with AI" button is explicitly part of the task. The integration test `EditWorkflowPage.integration.test.tsx` clicks the header button once, then the popup button once. After the refactor the header button shows a static icon+label always. Any integration test that checks the header button is `disabled` during refinement or shows a spinner must be removed or updated.

- **RHF vs plain state**: keeping RHF means the new unit test must mock `@hookform/resolvers/yup` or allow it to run. The `GenerateWorkflowPopup` pattern uses plain `useState` — aligning fully means removing `useForm`, `Controller`, `yupResolver`, and the Yup schema. The `refine_prompt` field has no validation constraint (just optional trim) so RHF adds no value here. Removing it simplifies both the implementation and the tests.

- **`useEffect` focus behaviour**: the current popup uses a 100ms `setTimeout` to focus the textarea when `isVisible` becomes true. When `isLoading` is true the textarea is hidden. The focus effect must be guarded so it does not try to focus a non-rendered element.

- **Test file: `isLoading` prop test**: test 6 in `RefineWorkflowPromptPopup.test.tsx` passes `isLoading={true}` as a prop and asserts on disabled buttons and spinner. This test will need to be completely rewritten as a mock-store async test (matching `GenerateWorkflowPopup.test.tsx` lines 112–170).

- **Error extraction pattern mismatch**: `GenerateWorkflowPopup` uses `error instanceof Error ? error.message : '...'` but the current `EditWorkflowPage` handler uses `error?.parsedError?.error?.message ?? error?.message`. The API error shape must be verified — using the wrong extraction pattern silently swallows backend error messages.

---

## 7. Summary for Complexity Assessment

This refactor touches two files primarily (`RefineWorkflowPromptPopup.tsx` and `EditWorkflowPage.tsx`) and one test file with substantial rewrites (`RefineWorkflowPromptPopup.test.tsx`). The integration test (`EditWorkflowPage.integration.test.tsx`) will need minor updates to remove assertions tied to header-button spinner state. The total file change surface is approximately 4 files with moderate churn in each. The architectural layers involved are: UI Component (popup) and Page/Orchestration (parent page), with no changes to the store, API, or routing layers.

The task follows a well-established pattern already present in the same directory (`GenerateWorkflowPopup`), so there is no technical novelty. The main design constraint is that the popup requires two new input props — `workflowId: string` and `yamlConfig: string` (or equivalent getter) — because the API call needs the workflow ID and the current YAML config, both of which are only available in the parent page. The `onRefine` callback signature must change to `onRefined: (result: WorkflowAIRefineResponse) => void` to allow the parent to update `preRefinementYaml` and call `formRef.current?.replaceYamlConfig`. These are the only coupling points that make this more than a simple lift-and-shift.

Test coverage for the affected area is mixed: the unit tests for `RefineWorkflowPromptPopup` exist but are testing the current (prop-driven) contract, so they need significant rewrite rather than incremental update. The `GenerateWorkflowPopup.test.tsx` file (9 tests) provides a direct template to follow. The integration tests cover the end-to-end flow adequately and should continue to pass with at most minor assertion updates. The key risk for complexity scoring is the callback contract change, which requires coordinated edits across the popup and its parent page, plus test rewrites that must mirror the `GenerateWorkflowPopup` test pattern precisely.
