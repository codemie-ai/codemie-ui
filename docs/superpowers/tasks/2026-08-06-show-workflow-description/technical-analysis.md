# Technical Research

**Task**: workflow description details-page metadata rendering
**Generated**: 2026-08-06T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Show Description field on Workflow details page (not just in Configuration tab). Currently, the Workflow Description is only visible in the Configuration tab, even though this information is relevant to anyone viewing the workflow details. This creates unnecessary friction for users needing context about a workflow before editing or running it. The workflow description should be displayed prominently on the Workflow details page alongside metadata, so users can quickly understand a workflow without switching tabs or entering configuration mode. Acceptance Criteria: 1) The Workflow Description field is displayed on the Workflow details page for all users. 2) Description is shown in a readable, formatted manner (not editable unless in configuration mode). 3) No regression of description display in the Configuration tab. 4) Applies to every workflow where a description exists. 5) Documentation is updated to clarify the new location of the Description field.

---

## 2. Codebase Findings

### Existing Implementations

**Page entry point:**
- `/src/pages/workflows/WorkflowDetailsPage.tsx` — the only active details page. Both router routes (`workflows/:workflowId` and `workflows/:workflowId/workflow-executions/:id`) resolve to this component. `workflow.description` is loaded at line 75 via `useWorkflowData()` but is not rendered anywhere on this page.

**Where description is currently rendered (active code):**
- `/src/pages/workflows/components/WorkflowCard.tsx` lines 235–243 — read-only, truncated with tooltip in the list view.
- `/src/pages/workflows/components/WorkflowFormFields.tsx` lines 232–245 — editable `<Textarea>` in Create/Edit workflow forms.
- `/src/pages/workflows/editor/configPanels/GeneralConfigTab.tsx` lines 169–184 — editable `<Textarea>` in the visual YAML editor.

**Where description was intended to render (dead code — not mounted):**
- `/src/pages/workflows/components/ViewWorkflowConfiguration.tsx` lines 63–67 — renders `{workflow?.description}` under "About Workflow:" label with `text-text-quaternary break-words whitespace-pre-wrap`. This component is never imported by any routed page.

**Primary insertion candidates for the task:**
- `/src/pages/workflows/details/configuration/WorkflowExecutionConfigDetails.tsx` — configuration sidebar panel already showing workflow name + ID; receives the full `Workflow` prop; no description block present. This is the most natural location satisfying "alongside metadata."
- `/src/pages/workflows/WorkflowDetailsPage.tsx` — `PageLayout` accepts a `subtitle?: string` prop (currently unpopulated) that renders below the title. Suitable only for short single-line descriptions.

**Supporting types and data:**
- `/src/types/entity/workflow.ts` line 38 — `description?: string` on the `Workflow` interface.
- `/src/pages/workflows/details/hooks/useWorkflowData.ts` lines 116–118 — spreads `originalWorkflow` (including `description`) into the returned `workflow` object; no additional fetching needed.
- `/src/store/workflowExecutions.ts` — Valtio proxy store; `workflow: Workflow | null` populated by `getWorkflow()` after `GET v1/workflows/id/{id}`.

**Routing:**
- `/src/router.tsx` lines 393–402 — defines both workflow detail routes pointing to `WorkflowDetailsPage`.

### Architecture and Layers Affected

| Layer | Component / File | Change Required |
|---|---|---|
| Page (UI orchestration) | `WorkflowDetailsPage.tsx` | Optional: pass `subtitle` or add inline description block below header |
| Metadata display (UI leaf) | `WorkflowExecutionConfigDetails.tsx` | **Primary**: add conditional description rendering |
| Shared layout | `PageLayout.tsx` | No change; `subtitle` prop already supported |
| Type definitions | `types/entity/workflow.ts` | No change; `description?: string` already defined |
| Data hook | `useWorkflowData.ts` | No change; `description` already passed through |
| Store | `workflowExecutionsStore` | No change; `workflow.description` already stored |

### Integration Points

- **Data source**: `GET v1/workflows/id/{workflowId}` — already called on page mount; response includes `description`.
- **Store subscription**: components subscribe to `workflowExecutionsStore` via `useSnapshot()`; `workflow.description` is already available.
- **Edit form path** (no regression risk): `WorkflowExecutionConfigForm` → `WorkflowForm` → `WorkflowFormFields` — the editable textarea remains unaffected as it is only mounted when the Configure button is clicked (`isEditFormVisible` state in `WorkflowExecutionConfiguration.tsx`).
- **Configuration tab** (AC 3 — no regression): `ViewWorkflowConfiguration` is dead code; not mounted on any active route. The Configuration sidebar in `WorkflowExecutionConfiguration.tsx` has never rendered description, so there is no existing display to regress.

### Patterns and Conventions

- **Optional field rendering**: the component guide mandates short-circuit `&&`: `{workflow?.description && <div className="...">...</div>}`.
- **Read-only description styling** (from `ViewWorkflowConfiguration.tsx`): `text-text-quaternary break-words whitespace-pre-wrap` — preserves newlines and wraps long text.
- **Semantic Tailwind tokens only** — `text-text-quaternary`, `text-text-secondary`, `text-text-primary`; no hardcoded colors.
- **`cn()` utility** for conditional class application.
- **Local `interface Workflow` in `WorkflowExecutionConfigDetails.tsx`** uses `[key: string]: any` index signature — `description` is accessible via this signature but not explicitly typed. The local interface should be updated or replaced with an import from `@/types/entity/workflow`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

The `.ai-run/guides/` directory exists at `/Users/yevhen_slyva/codemie-dev/codemie-ui/.ai-run/guides/`.

Relevant guides found:

- `.ai-run/guides/development/workflow-editor-patterns.md` — documents `WorkflowDetailsPage` as the canonical details entry point and the store separation rules; does not address description display.
- `.ai-run/guides/architecture/architecture.md` — confirms `PageLayout` supports `subtitle` prop; documents the three-layer data flow (Page → Store → API).
- `.ai-run/guides/components/component-patterns.md` — prescribes the `{field && <element>}` pattern for optional fields, 300-line component limit, and the pre-delivery checklist.
- `.ai-run/guides/styling/styling-guide.md` — mandates Tailwind-only styling with semantic token classes; no inline styles.
- `.ai-run/guides/quality-gates.md` — defines the four pre-MR validation gates: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`.

### Architectural Decisions

- `WorkflowDetailsPage` is the single routed component for all workflow detail views (no separate view-only page). This is a router-level decision reflected in `/src/router.tsx`.
- Valtio is the state management solution; no React Query or Redux in this domain.
- `PageLayout.subtitle` is styled for short, single-line text (`whitespace-nowrap overflow-hidden text-ellipsis`) — not suitable for multi-paragraph descriptions.
- Description is already typed and fetched; the absence of its display on the details page appears to be an omission, not a deliberate decision. No ADR or inline comment explains the omission.

### Derived Conventions

- Description text elsewhere uses `whitespace-pre-wrap` to preserve newlines — follow this for the new display.
- Conditional rendering with `workflow?.description &&` guards against `undefined`.
- The sidebar's read-only/edit toggle (`isEditFormVisible` in `WorkflowExecutionConfiguration.tsx`) should gate the description to the read-only view only — hiding it when the edit form is visible avoids duplication with the editable textarea in `WorkflowFormFields`.
- Components in `/src/pages/workflows/details/configuration/` follow the pattern of explicit TypeScript interfaces. Any local `interface Workflow` in `WorkflowExecutionConfigDetails.tsx` should have `description?: string` added explicitly or be replaced with an import.

---

## 4. Testing Landscape

### Existing Coverage

| File | Type | Workflow Description Coverage |
|---|---|---|
| `/src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx` | Integration | None — fixture omits `description`; no assertions on description text |
| `/src/pages/workflows/details/configuration/__tests__/WorkflowExecutionConfiguration.test.tsx` | Unit | Passes `description: 'Test Description'` in `mockWorkflow`, but `WorkflowExecutionConfigDetails` is fully mocked — description text is never rendered or asserted |
| `/src/pages/workflows/details/configuration/__tests__/WorkflowExecutionConfigForm.test.tsx` | Unit | Edit form buttons only; no description assertions |
| `/src/pages/workflows/details/__tests__/WorkflowHeader.test.tsx` | Unit | Header action buttons only; fixture has no description |
| `/src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` | Unit | Covers description `<Textarea>` input via react-hook-form |
| `/src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` | Integration | Has explicit description assertions for the list page |
| `/src/pages/workflows/__tests__/ViewWorkflowTemplatePage.integration.test.tsx` | Integration | Has description present/absent assertions for templates |
| `/src/pages/workflows/components/__tests__/WorkflowCard.test.tsx` | Unit | Fixture includes description but no display assertion |

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 with two named projects — `unit` (isolated, Valtio mocked) and `integration` (real Valtio + mocked `fetch`).
- **Libraries**: `@testing-library/react` 16.3, `@testing-library/user-event` 14.6, `@testing-library/jest-dom` 6.6.
- **Shared utilities**: `src/test-utils/integration.tsx` exports `mockAPI(method, url, data, status?)` and `renderPage(path)` for full app rendering via `createMemoryRouter`.
- **Fixture factories**: defined locally in each integration test file. `createWorkflowFixture()` in `WorkflowDetailsPage.integration.test.tsx` does NOT include a `description` field.
- **`WorkflowExecutionConfigDetails` has no standalone test file.** Any changes to it need either a new unit test file or direct unmocking in `WorkflowExecutionConfiguration.test.tsx`.

### Coverage Gaps

1. **`WorkflowDetailsPage.integration.test.tsx`** — no description assertions; `createWorkflowFixture()` needs `description` field added; new test cases needed for: (a) description shown when workflow has description, (b) description absent when workflow has no description.
2. **`WorkflowExecutionConfigDetails`** — no test file exists; if description is added here, a new unit test file is required.
3. **`WorkflowExecutionConfiguration.test.tsx`** — fully mocks `WorkflowExecutionConfigDetails`; tests cannot catch description changes in that child without unmocking or adding a dedicated test.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are required for this change. The workflow `description` field is part of the standard `Workflow` API response and is already fetched on page load.

Variables in `.env.local` (`VITE_WORKFLOW_YAML_DOCUMENTATION_URL`, `VITE_WORKFLOW_DOCUMENTATION_URL`, `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED`) have zero `import.meta.env` references in `src/` — they are dead and not relevant.

### Configuration Files

- `/vite.config.ts` — no workflow-specific settings; no changes needed.
- `/tsconfig.json` — no changes needed.
- `/src/types/global.ts` — `EnvConfig` interface covers only `VITE_ENV`, `VITE_API_URL`, `VITE_APP_VERSION`; no changes needed.

### Feature Flags and Deployment Concerns

- **No feature flags gate description display.** The only workflow-adjacent flag in `src/constants/featureFlags.ts` is `WORKFLOW_AI: 'features:workflowAI'` — unrelated.
- **No deployment changes needed.** The Kubernetes ConfigMap (`deploy-templates/templates/configmap.yaml`) and Helm values (`deploy-templates/values.yaml`) need no updates.
- **No new secrets or credentials.** The change is purely client-side rendering of data already returned by the existing API.
- **AC 5 ("Documentation updated")**: This repo is a frontend UI repo. If "documentation" refers to user-facing docs or release notes outside this repo, that is out of scope for this codebase. If it refers to `.ai-run/guides/`, the `workflow-editor-patterns.md` guide could be updated to note the description display location.

---

## 6. Risk Indicators

- **No test coverage for description rendering on `WorkflowDetailsPage`** — `createWorkflowFixture()` in `WorkflowDetailsPage.integration.test.tsx` omits `description`; no test will catch regressions without explicit additions.
- **`WorkflowExecutionConfigDetails` has no test file** — the primary insertion candidate has zero test coverage; new tests must be written from scratch.
- **`WorkflowExecutionConfiguration.test.tsx` mocks `WorkflowExecutionConfigDetails` entirely** — any description added in that child component is invisible to existing unit tests without unmocking.
- **Local `interface Workflow` in `WorkflowExecutionConfigDetails.tsx`** does not explicitly declare `description?: string`; only the catch-all index signature `[key: string]: any` covers it — this is not type-safe and could confuse future readers.
- **`PageLayout.subtitle` is truncation-styled** (`whitespace-nowrap overflow-hidden text-ellipsis`) — unsuitable for multi-line workflow descriptions; using it would silently truncate long descriptions without user affordance.
- **AC 3 ("no regression of description in Configuration tab")**: The statement refers to `ViewWorkflowConfiguration.tsx`, which is dead code not mounted on any route. There is no active "Configuration tab" rendering description today. The risk is near-zero, but the phrasing may indicate the ticket author was working from an outdated understanding of the UI.
- **AC 5 ("Documentation updated")**: No user-facing documentation lives in this repo. This AC may require coordination with an external docs team or release notes process — cannot be satisfied by a frontend code change alone.
- **Description field is optional** (`description?: string`) — conditional rendering is required; forgetting the guard causes a runtime rendering of `undefined` as text.

---

## 7. Summary for Complexity Assessment

This task targets a single, well-bounded UI gap: `workflow.description` is already fetched on `WorkflowDetailsPage` via `useWorkflowData` and available in the component tree, but is never rendered there. The data layer, API contract, TypeScript model, and state store require zero changes. The implementation surface is narrow: one conditional JSX block in `WorkflowExecutionConfigDetails.tsx` (the configuration sidebar panel that already renders workflow name and ID) and optionally a `subtitle` prop addition on `PageLayout` in `WorkflowDetailsPage.tsx`. The rendering pattern and Tailwind styling tokens are already established in `ViewWorkflowConfiguration.tsx` (`text-text-quaternary break-words whitespace-pre-wrap`) and in the component guide. No feature flags, no env vars, no API changes, and no migration scripts are involved.

The test posture is the primary source of complexity. The affected domain has an integration test file (`WorkflowDetailsPage.integration.test.tsx`) with 35+ cases that never reference `description`, and the direct insertion target (`WorkflowExecutionConfigDetails.tsx`) has no test file at all. Additionally, the unit test for the wrapping panel (`WorkflowExecutionConfiguration.test.tsx`) fully mocks `WorkflowExecutionConfigDetails`, meaning any new rendering in that child is invisible to existing tests. Proper test coverage will require: (1) updating `createWorkflowFixture()` with a `description` field, (2) adding two integration test cases (description present, description absent), and (3) creating a new unit test file for `WorkflowExecutionConfigDetails`. The test work is likely to exceed the implementation work in scope.

Key risk factors for complexity scoring: the local `interface Workflow` in `WorkflowExecutionConfigDetails.tsx` needs an explicit `description?: string` addition (minor but easy to overlook), and AC 5 ("documentation updated") cannot be fulfilled within this codebase alone — it requires a decision about whether to update `.ai-run/guides/workflow-editor-patterns.md` or coordinate with an external documentation team. Overall, this is a low-to-medium complexity change: the implementation is a few lines, but test coverage gaps elevate the total delivery effort.
