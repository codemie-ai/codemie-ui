# Technical Research

**Task**: workflow creation popup natural-language generate
**Generated**: 2026-06-29T00:00:00Z

---

## 1. Original Context

Update workflow creation page: add popup element to generate workflow using natural language. Should have text input, confirm and cancel buttons. Sends request to '/workflow/generate' with body {include_tools: bool, text: str}, receives response with {name: str, description: str, yaml_config: str} and displays workflow edit page with new workflow. Ticket: EPMCDME-10037.

**Clarification from requester (1)**: The popup should also open automatically when the workflow creation page is opened (i.e. `NewWorkflowPage` mounts with `showGeneratePopup = true` by default, not only when triggered by a button click).

**Clarification from requester (2)**: The confirmed backend endpoint is `POST /workflows/generate` (plural, no `v1/` prefix ambiguity resolved — full path is `v1/workflows/generate` following the existing store convention).

---

## 2. Codebase Findings

### Existing Implementations

**Workflow creation entry points:**
- `src/pages/workflows/WorkflowsListPage.tsx` — list page hosting the "Create Workflow" button; its `createWorkflow()` navigates to `router.push({ name: 'new-workflow' })`.
- `src/pages/workflows/NewWorkflowPage.tsx` — **primary modification target**. The page where the popup must appear on mount. Current state initialization (lines 61–66):
  ```ts
  const [isCloning] = useState(!!id)
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null)
  const [showExecutionPopup, setShowExecutionPopup] = useState(false)
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string>('')
  const [issues, setIssues] = useState<WorkflowIssue[] | null>(null)
  ```
  A new `const [showGeneratePopup, setShowGeneratePopup] = useState(true)` would open the generate popup immediately on mount. Must be conditional on `!isCloning && !isFromTemplate` to avoid showing the popup on clone and from-template flows (see Risk Indicators).
- `src/pages/workflows/EditWorkflowPage.tsx` — edit page navigated to after successful generation, route `'edit-workflow'` (`/workflows/:id/edit`).

**Workflow store (the only API call location):**
- `src/store/workflows.ts` — Valtio proxy. All workflow API methods live here. No `generateWorkflow` method exists yet; it must be added. Confirmed endpoint: `v1/workflows/generate`. Closest model methods: `createWorkflow()` (POST to `v1/workflows`) and `getWorkflowDiagram()` (POST with payload).

**Popup infrastructure:**
- `src/components/Popup/Popup.tsx` — mandatory modal wrapper. Key props: `visible`, `onHide`, `onSubmit`, `submitText`, `cancelText`, `submitDisabled`, `header`, `children`, `limitWidth`, `dismissableMask`, `isMagic`.
- `src/components/Popup/index.ts` — re-exports `Popup` as default.

**Existing workflow popup references (structural analogues):**
- `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx` — uses `Popup` with `limitWidth`, `dismissableMask={false}`, `isLoading` state, `<Spinner inline />` on loading, and `onSubmit`. Closest structural match.
- `src/pages/workflows/details/popups/WorkflowExecutionExportPopup.tsx` — simpler popup with state-driven form controls and `onSubmit`/`onHide`.
- `src/components/CreateSkillPopup.tsx` — popup in a creation flow; resets on close, uses `isSubmitting` state.

**Form components for the popup body:**
- `src/components/form/Textarea/Textarea.tsx` — multi-line text input; props `label`, `placeholder`, `rows`, `value`, `onChange`, `error`, `disabled`.
- `src/components/form/Switch/Switch.tsx` — toggle for the `include_tools` boolean; props `label`, `value`, `onChange`, `disabled`, `hint`.
- `src/components/Spinner/index.tsx` — `<Spinner inline />` for loading state inside the popup body.

**Routing:**
- `src/router.tsx` — route `'edit-workflow'` maps to `/workflows/:id/edit` → `EditWorkflowPage`.
- `src/constants/routes.ts` — exports `EDIT_WORKFLOW = 'edit-workflow'`, `NEW_WORKFLOW = 'new-workflow'`, etc. No new route constants needed.

**Types:**
- `src/types/entity/workflow.ts` — `Workflow` interface (`id`, `name`, `description`, `yaml_config`, etc.). No `GenerateWorkflowRequest` or `GenerateWorkflowResponse` types exist yet.

### Architecture and Layers Affected

| Layer | Component | Change |
|---|---|---|
| **Page** | `NewWorkflowPage.tsx` | Add `showGeneratePopup` state (default `true`, conditioned on `!isCloning && !isFromTemplate`); render `<GenerateWorkflowPopup visible={showGeneratePopup} onHide={() => setShowGeneratePopup(false)} />` |
| **Component (new)** | `src/pages/workflows/components/GenerateWorkflowPopup.tsx` | New popup: Textarea + Switch + loading/submit/cancel; calls `workflowsStore.generateWorkflow()`; navigates to edit page on success |
| **Store** | `src/store/workflows.ts` | Add `generateWorkflow(text: string, includeTools: boolean): Promise<GenerateWorkflowResponse>` calling `api.post('v1/workflows/generate', { text, include_tools: includeTools })` |
| **Types** | `src/types/entity/workflow.ts` | Add `GenerateWorkflowRequest` and `GenerateWorkflowResponse` interfaces |
| **Constants** | `src/constants/routes.ts` | No change — `EDIT_WORKFLOW` already defined |

### Integration Points

**Internal:**
- `src/store/workflows.ts` ← called by `GenerateWorkflowPopup` (`workflowsStore.generateWorkflow(...)`)
- `src/hooks/useVueRouter.tsx` ← `router.push({ name: EDIT_WORKFLOW, params: { id: workflow.id } })` after successful generation
- `src/utils/toaster.ts` ← `toaster.error(...)` on API failure
- `src/components/Popup` ← mandatory modal wrapper

**External API (confirmed endpoint):**
- `POST v1/workflows/generate`
- Request body: `{ include_tools: boolean, text: string }`
- Response: `{ name: string, description: string, yaml_config: string }` — does not include an `id` per the ticket spec; see Risk Indicators for the navigation consequence.

### Patterns and Conventions

- **Store-only API calls**: Components never call `api.*` directly. The popup calls `workflowsStore.generateWorkflow(...)`.
- **`visible` default `true` on the page**: `const [showGeneratePopup, setShowGeneratePopup] = useState(!isCloning && !isFromTemplate)` opens the popup immediately on a plain new-workflow mount while skipping clone and from-template flows.
- **Loading state inside popup**: `const [isLoading, setIsLoading] = useState(false)` + `submitDisabled={isLoading}` + `{isLoading ? <Spinner inline /> : <content />}`. Exactly as in `WorkflowStartExecutionPopup`.
- **State reset on close**: `onHide` resets textarea value and `includeTools` switch to defaults.
- **`dismissableMask={false}`**: Standard for form popups in this codebase.
- **Navigation after success**: `router.push({ name: EDIT_WORKFLOW, params: { id: String(createdId) } })` — requires an `id`; see Risk Indicators.
- **License header**: All new `.tsx`/`.ts` source files require the Apache 2.0 block (enforced by pre-commit hook).
- **`isMagic` prop**: The `Popup` component has an `isMagic` prop (gradient background) used in `OnboardingModal.tsx` for AI-themed UX. Optional styling consideration for a "generate with AI" popup.

---

## 3. Documentation Findings

### Guides and Architecture Docs

The project has a `.ai-run/guides/` directory. Relevant guides for this ticket:

| Guide | Relevance |
|---|---|
| `.ai-run/guides/patterns/modal-patterns.md` | **Critical**: Popup usage, never-use-Dialog rule, patterns 1–4, pre-delivery checklist |
| `.ai-run/guides/patterns/state-management.md` | Component → Store → API pattern, proxy template, async method shape |
| `.ai-run/guides/patterns/form-patterns.md` | Form components catalog; React Hook Form not needed here (two `useState` fields is sufficient) |
| `.ai-run/guides/patterns/custom-hooks.md` | Extraction threshold for `useGenerateWorkflowPopup.ts`; unlikely needed at this popup's complexity |
| `.ai-run/guides/development/api-integration.md` | `import api from '@/utils/api'`; POST pattern; `await response.json()` |
| `.ai-run/guides/architecture/architecture.md` | Layer diagram; forbidden cross-layer calls |
| `.ai-run/guides/testing/testing-patterns.md` | Vitest + RTL; unit vs integration test structure |
| `.ai-run/guides/quality-gates.md` | All four gates must pass: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration` |
| `.ai-run/guides/components/reusable-components.md` | `Popup`, `Button`, `Spinner` catalog with props |

### Architectural Decisions

- **PrimeReact `Dialog` is forbidden** for feature code; always use `Popup` from `@/components/Popup`.
- **Valtio proxy** is the only state management library.
- **React Router v7** navigation via `useVueRouter()` wrapper.
- **Tailwind CSS only** for styling.

### Derived Conventions

- New popup file: `src/pages/workflows/components/GenerateWorkflowPopup.tsx` — co-located with other workflow components.
- React Hook Form + Yup is not required for two fields; `useState` for `text` and `includeTools` is consistent with `WorkflowStartExecutionPopup` and `WorkflowExecutionExportPopup`.
- Props interface: `GenerateWorkflowPopupProps { visible: boolean; onHide: () => void }`.

---

## 4. Testing Landscape

### Existing Coverage

**Workflow component tests in `src/pages/workflows/components/__tests__/`:**
- `WorkflowFormFields.test.tsx`, `WorkflowActions.test.tsx`, `WorkflowsList.test.tsx`, `PublishWorkflowToMarketplaceModal.test.tsx`.

**Popup tests in `src/pages/workflows/details/popups/__tests__/`:**
- `WorkflowExecutionExportPopup.test.tsx` — **closest test template**: mocks `Popup`, store, `valtio`, `toaster`; tests visible/hidden render, submit invocation, error handling, and close behavior. Copy this structure for `GenerateWorkflowPopup.test.tsx`.

**No existing test for `NewWorkflowPage.tsx`.**

### Testing Framework and Patterns

- Vitest 1.6.1 + `@testing-library/react` 16.3.0 + `@testing-library/jest-dom` 6.6.3.
- **Unit tests** (`*.test.tsx`): mock `valtio` (`useSnapshot`), mock `@/store/workflows`, mock `@/components/Popup`, mock `@/utils/toaster`, mock `@/hooks/useVueRouter`.
- **Popup mock pattern**: `vi.mock('@/components/Popup', () => ({ default: ({ visible, header, children, onHide, onSubmit, submitText }: any) => visible ? <div data-testid="popup">...</div> : null }))`.
- `afterEach(cleanup)` in every file.
- `vi.mock()` at module top level only.

### Coverage Gaps

- `GenerateWorkflowPopup.tsx` (new) — zero coverage; needs `src/pages/workflows/components/__tests__/GenerateWorkflowPopup.test.tsx`.
- `workflowsStore.generateWorkflow` (new) — zero coverage.
- `NewWorkflowPage.tsx` — no existing tests; the auto-open behavior is unverifiable without a new test.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — base URL for all API calls. No new env vars needed.

### Configuration Files

- `vite.config.ts` — `@/` alias to `src/`.
- `vitest.workspace.ts` — `unit` and `integration` test projects.
- `.husky/` — pre-commit: lint-staged, license header check, secret detection, Sonar.

### Feature Flags and Deployment Concerns

- No feature flag gating the generate popup is described; if needed, follow `isVisualEditorEnabled(configs)` pattern from `src/utils/workflows.ts`.
- The `include_tools` toggle implies the backend queries the project's tool list. No UI guard for "no tools configured" — backend errors will be surfaced by the auto-toasting API error handler.
- No new environment variables needed.

---

## 6. Risk Indicators

- **`id` missing from generate response**: The ticket specifies the response as `{ name, description, yaml_config }` with no `id`. Navigation to `/workflows/:id/edit` requires an `id`. Either (a) the backend also returns `id` (undocumented in the ticket), or (b) the frontend must POST the generated data to `v1/workflows` to persist it first and obtain an `id`. This is a **critical requirements gap** that must be resolved with the backend team before coding the success/navigation path.
- **Auto-open on clone and from-template flows**: `NewWorkflowPage` serves three distinct URL patterns: plain new, clone (`/workflows/:id/clone`), and from-template (`/workflows/from-template/:slug`). Defaulting `showGeneratePopup` to `true` unconditionally would disrupt clone and from-template UX. The initial state must be `useState(!isCloning && !isFromTemplate)`.
- **No unit tests for `NewWorkflowPage.tsx`**: The page being modified has zero test coverage, raising regression risk for the auto-open state addition.
- **No `generateWorkflow` store method**: Greenfield addition; must follow the `loading = true / error = null / finally { loading = false }` pattern from `state-management.md` guide.
- **`include_tools` default and label wording**: Product clarification needed; using the wrong default could result in silent unexpected behavior on the backend.
- **License header enforcement**: Pre-commit hook rejects any `src/` file without the Apache 2.0 header block.

---

## 7. Summary for Complexity Assessment

This ticket modifies three layers across approximately 3–5 files. Store layer: one new method `generateWorkflow` in `src/store/workflows.ts` calling the confirmed endpoint `POST v1/workflows/generate`. Component layer: one new file `src/pages/workflows/components/GenerateWorkflowPopup.tsx` containing a `Popup` with a `Textarea`, a `Switch`, and a `Spinner`-on-loading body — directly templated from `WorkflowStartExecutionPopup`. Page layer: `NewWorkflowPage.tsx` gets a new `showGeneratePopup` boolean state (conditionally `true` for plain new-workflow, `false` for clone and from-template), and mounts the popup. Additionally `src/types/entity/workflow.ts` gets two new interfaces. Total new/modified source files: 4. Total new test files needed: 1 minimum (`GenerateWorkflowPopup.test.tsx`).

The implementation follows established patterns with no technical novelty: all guides provide direct templates and the closest reference component (`WorkflowStartExecutionPopup`) lives in the same repository and uses every mechanism this feature needs. The auto-open-on-mount behavior is the only non-standard wrinkle and requires a single conditional on two flags already present in `NewWorkflowPage`. Test coverage posture is adequate for the new popup component (clear template exists) but absent for the host page. The one remaining critical unknown is whether the `POST v1/workflows/generate` response returns a workflow `id` for direct edit-page navigation, or whether a follow-up `POST v1/workflows` create call is required — this must be confirmed with the backend before the success-path code can be written.
