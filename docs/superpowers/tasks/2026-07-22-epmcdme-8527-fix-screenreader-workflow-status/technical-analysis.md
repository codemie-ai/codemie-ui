# Technical Research

**Task**: a11y accessibility StatusBadge aria screenreader workflow execution
**Generated**: 2026-07-22T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8527: Simplify screenreader workflow status announcement. The current branch implements a VoiceOver-specific singleton DOM utility (executionStatusAnnouncer.ts) with timers, off-screen live region, focus manipulation, and custom DOM events. The requirement is to replace all of that with a simpler approach: add role='status' (or aria-live='polite') directly on the StatusBadge component, following the same pattern already used in SkillStatusLabel. This works for NVDA/JAWS and removes the VoiceOver-only complexity. All VoiceOver-specific quirks must be removed.

---

## 2. Codebase Findings

### Existing Implementations

There are two parallel StatusBadge implementations:

- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/components/StatusBadge/StatusBadge.tsx` — the canonical versioned component used by the majority of callers. Props: `status: StatusType`, `text?: string`, `className?: string`. Renders a `<div>` with a colored dot and text. No ARIA attributes currently.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/components/StatusBadge/index.ts` — barrel re-exports `default`, `StatusEnum`, and `StatusType` from the above file.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/components/StatusBadge.tsx` — a flat-file variant (legacy or alternate). Props: `status: StatusType`, `text?: string` (no `className`). Different internal implementation using a `statusStyles` record map. No ARIA attributes. Used by `src/components/Thought/ThoughtHeader.tsx`.

The reference pattern to follow is in:
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/skills/components/SkillStatusLabel.tsx` — uses `role="status"` and `aria-label={visibilityText}` on a wrapper `<div>`. This is the established NVDA/JAWS-compatible approach.

The VoiceOver-specific singleton being deleted:
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/details/utils/executionStatusAnnouncer.ts` — 139-line singleton module that manages: an off-screen `aria-live="assertive"` DOM node, three module-level timer variables (`announceTimer`, `blurTimer`), a `lastWrittenStatus` dedup guard, focus manipulation (`stabilizeFocusAfterExecutionCreate` blurs active element after 200ms), and a `CustomEvent('workflow-execution-status-announce')` dispatch used for cross-component signaling. Exports: `initWorkflowExecutionStatusAnnouncer`, `clearWorkflowExecutionStatusAnnouncement`, `announceWorkflowExecutionStatus`, `stabilizeFocusAfterExecutionCreate`, `consumePendingExecutionStatusAnnouncement`, and three timing constants.

Consumer files with announcer usage to be cleaned:
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/details/WorkflowExecutions/WorkflowExecutions.tsx` — calls `initWorkflowExecutionStatusAnnouncer()` on mount, `consumePendingExecutionStatusAnnouncement()` to seed `announcedRef`, listens for `workflow-execution-status-announce` CustomEvent to update `announcedRef`, and calls `announceWorkflowExecutionStatus(executionId, status)` when execution status transitions. The entire `announcedRef`, event listener setup, and second `useEffect` tracking status changes are announcer-driven and can be removed. The component itself renders only the `<aside>` sidebar shell — it does not render `StatusBadge` directly.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx` — calls `initWorkflowExecutionStatusAnnouncer()`, `clearWorkflowExecutionStatusAnnouncement()`, `stabilizeFocusAfterExecutionCreate()`, `announceWorkflowExecutionStatus(execution.execution_id, execution.overall_status, { delayMs: 350 })` on successful execution creation. Also introduces `successCloseRef` and `cancelledRef` guard logic specifically to prevent stale announces after user cancels. All of this can be removed.

StatusBadge usage in the workflows domain (where `role="status"` needs to be added):
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/details/WorkflowExecutions/WorkflowExecutionsListItem.tsx:85` — `<StatusBadge text={execution.overall_status} status={WORKFLOW_STATUS_BADGE_MAPPING[execution.overall_status]} />`
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/components/WorkflowExecutionsTable.tsx:91` — `<StatusBadge status={WORKFLOW_STATUS_BADGE_MAPPING[item.overall_status] || 'pending'} text={item.overall_status} />`
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/details/WorkflowExecutionInfoPopup.tsx:72` — `<StatusBadge text={execution.overall_status} status={WORKFLOW_STATUS_BADGE_MAPPING[execution.overall_status]} />`

Other StatusBadge consumers (not in scope but affected if the component gains `role="status"` globally):
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/components/Thought/ThoughtHeader.tsx:52` — uses the flat-file variant; shows thought processing status.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/settings/aws/agentCoreRuntimes/` — multiple files render runtime/endpoint status badges (not live-updating in the same way).
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow.tsx:114` — renders auth gate status.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/editor/IssuesPanel.tsx:41,43` and `BaseNode.tsx:115` — static status labels in the workflow editor.

### Architecture and Layers Affected

This task touches two layers:

**Shared Component layer** (`src/components/`):
- `StatusBadge/StatusBadge.tsx` and `StatusBadge.tsx` both need `role="status"` and `aria-label={text}` added to their root `<div>`. The `aria-label` should conditionally render only when `text` is provided (to avoid empty `aria-label` attributes).

**Page / Feature layer** (`src/pages/workflows/details/`):
- `WorkflowExecutions.tsx` — remove all announcer imports, `announcedRef`, and both announcer-related `useEffect` blocks (keeping the polling and infinite scroll effects intact).
- `WorkflowStartExecutionPopup.tsx` — remove all announcer imports, `successCloseRef`, `cancelledRef`, `handleHide` clear logic, and all announcer calls in `handleSubmit` (keeping the rest of the submit flow: `createWorkflowExecution`, router navigation, `onHide`, `onStart`).

### Integration Points

- `WORKFLOW_STATUS_BADGE_MAPPING` in `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/constants.ts` — maps execution status strings (`'In Progress'`, `'Succeeded'`, `'Failed'`, `'Interrupted'`, `'Aborted'`, `'AUTHENTICATION_REQUIRED'`, `'Not Started'`) to `StatusType` enum values. This mapping is already used at every `StatusBadge` call site that receives `overall_status`, so the `text` prop passed to `StatusBadge` is the human-readable status string — which is exactly the correct value for `aria-label`.
- `workflowExecutionsStore` in `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/store/workflowExecutions.ts` — provides `executions` array and polling; no changes needed here.
- `Popup` component from `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/components/Popup/Popup.tsx` — `WorkflowStartExecutionPopup` wraps it; the `onHide`/`onSubmit` wiring remains unchanged after announcer removal.

### Patterns and Conventions

- **Accessibility pattern**: `role="status"` + `aria-label={text}` on the wrapper element, as demonstrated in `SkillStatusLabel.tsx`. `role="status"` implies `aria-live="polite"` and `aria-atomic="true"` per the ARIA spec, making it a polite live region — screen readers announce text changes without interrupting the current reading flow. This is appropriate for status updates that are informative but not urgent.
- **Component prop convention**: Both `StatusBadge` variants already accept `text?: string`. The `aria-label` should be set to `text` when provided, and omitted (or set to a fallback like the status key) when `text` is absent. The `className` prop only exists in the directory variant — the flat-file variant does not expose it.
- **Conditional aria-label**: Pattern from `SkillStatusLabel` shows `aria-label={visibilityText}` always set. For `StatusBadge`, `text` is optional, so `aria-label={text || undefined}` is the safe approach to avoid empty label attributes.
- **No timer or DOM manipulation**: The new approach has zero lifecycle side-effects — it relies entirely on React's render cycle to update the live region text, which is the standard React accessibility pattern.

---

## 3. Documentation Findings

### Guides and Architecture Docs

The `.ai-run/guides/` directory exists at the project root and contains:
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/.ai-run/guides/quality-gates.md` — lint, typecheck, unit test, and integration test commands.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/.ai-run/guides/testing/testing-patterns.md` — Vitest + React Testing Library patterns, AAA structure, file co-location in `__tests__/`, unit vs integration test naming.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/.ai-run/guides/components/component-patterns.md` — FC structure, prop typing conventions.
- No dedicated a11y or ARIA guide was found in `.ai-run/guides/`.

### Architectural Decisions

- The `SkillStatusLabel` pattern (`role="status"` on the element containing live-updating text) is the established project precedent for screen reader announcements. The task explicitly cites this as the target pattern.
- The existing `executionStatusAnnouncer` was a VoiceOver-specific workaround; the inline comments in that file document its rationale extensively (focus restore cycle timing, `aria-live="assertive"` to prevent cancellation). These constraints are being deliberately abandoned in favor of cross-reader compatibility via `role="status"`.
- The `ToastContainer` in `src/components/appLevel/ToastContainer.tsx` uses `aria-live="polite"` on a region div — confirming that inline `aria-live` attributes are used elsewhere in the codebase for notifications.

### Derived Conventions

- ARIA attributes belong on the topmost rendered element of the component, not on inner children.
- When `text` is used as the visual label and the accessible label, they should match (no separate `aria-label` diverging from visible text per WCAG 2.5.3 Label in Name).
- The flat-file `StatusBadge.tsx` and the directory `StatusBadge/StatusBadge.tsx` must both receive the same ARIA change, as they are independent implementations sharing the same interface.

---

## 4. Testing Landscape

### Existing Coverage

- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/details/utils/__tests__/executionStatusAnnouncer.test.ts` — 272 lines, Vitest unit tests covering all exports of `executionStatusAnnouncer.ts`: `initWorkflowExecutionStatusAnnouncer`, `clearWorkflowExecutionStatusAnnouncement`, `announceWorkflowExecutionStatus` (timing, dedup, CustomEvent dispatch), `stabilizeFocusAfterExecutionCreate` (blur guard), `consumePendingExecutionStatusAnnouncement`. Uses `vi.useFakeTimers()`. This entire file is deleted with the feature.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutions.test.tsx` — 187 lines. Mocks the announcer module. Tests: announcer init on mount, no-announce on final-status landing, announce on status transition, no-announce on execution navigation. The four announcer-related test cases must be removed; the remaining render and mock setup tests are valid.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.test.tsx` — 334 lines. Has a `describe('announcement integration')` block (lines 229–333) with 8 announcement-specific tests. This entire describe block must be removed. The remaining 6 tests covering rendering, attachment button, disabled state, and submission logic stay.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/src/pages/skills/components/__tests__/SkillStatusLabel.test.tsx` — uses `screen.getByRole('status')` and `toHaveAttribute('aria-label', ...)` to assert the pattern. This is the reference test pattern for verifying the new StatusBadge ARIA attributes.
- No existing test file for `StatusBadge/StatusBadge.tsx` or the flat-file `StatusBadge.tsx` was found in the codebase.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 + React Testing Library
- **Setup**: `setupTests.tsx` (shared) + `setupTests.unit.ts` (unit workspace mocks `useSnapshot` and `@/utils/api`). `SettingsLayout` and `useVueRouter` are globally mocked — do not re-mock in individual files.
- **File naming**: `*.test.tsx` = unit; `*.integration.test.tsx` = integration.
- **Location**: `__tests__/` folders co-located with source. A new `StatusBadge/__tests__/StatusBadge.test.tsx` would follow this convention.
- **ARIA assertion pattern** (from SkillStatusLabel tests): `screen.getByRole('status')` then `.toHaveAttribute('aria-label', expectedText)`.
- **Mock pattern for removed modules**: Since the announcer module is deleted, `vi.mock('../../utils/executionStatusAnnouncer', ...)` blocks in `WorkflowExecutions.test.tsx` and `WorkflowStartExecutionPopup.test.tsx` must be fully removed.

### Coverage Gaps

- `StatusBadge/StatusBadge.tsx` has no test file. The ARIA addition creates an opportunity (and mild obligation) to add a basic test asserting `role="status"` and `aria-label` are present — following the SkillStatusLabel test pattern. This is new surface without existing coverage.
- The flat-file `StatusBadge.tsx` likewise has no tests.
- After the announcer removal, `WorkflowExecutions.tsx` will have no tests asserting any accessibility behavior. A test for "StatusBadge within list items renders with role=status" would close this gap, but is out of scope if only the cleanup is required.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are used by `executionStatusAnnouncer.ts` or `StatusBadge`. No config changes are required.

### Configuration Files

- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/vitest.workspace.ts` — workspace config for unit and integration test projects. No changes needed.
- `/Users/bohdan_maliar/Projects/codemie-dev/codemie-ui/vite.config.ts` — modified per git status (unrelated staged change). No announcer-related config.

### Feature Flags and Deployment Concerns

No feature flags gate this behavior. The change is a direct ARIA attribute addition and a module deletion — no deployment configuration is affected.

---

## 6. Risk Indicators

- **Two parallel StatusBadge implementations diverge**: `src/components/StatusBadge/StatusBadge.tsx` (directory, with `className` prop) and `src/components/StatusBadge.tsx` (flat file, no `className`). Both must receive the same ARIA change or screen reader behavior will be inconsistent depending on which variant a caller uses. There is no single source of truth.
- **`role="status"` on a broadly-used shared component is a global change**: `StatusBadge` is used in 15+ call sites across workflows, settings, chat, and katas. Adding `role="status"` makes every rendered instance a live region. For static/decorative badges (e.g., `IssuesPanel`, `BaseNode`, version badges in AWS runtime settings), this is semantically incorrect — `role="status"` implies the content will update. Consider whether `role="status"` should be opt-in via a prop (e.g., `liveRegion?: boolean`) rather than always-on.
- **`aria-label` absent when `text` is undefined**: Several call sites pass no `text` (e.g., AWS runtime version badge `<StatusBadge text={\`v${runtime.version}\`} status={StatusEnum.Success} />`). When `text` is not provided, an empty or missing `aria-label` on a `role="status"` element may be flagged by accessibility linting tools. Ensure `aria-label={text || undefined}` or equivalent guard.
- **`WorkflowExecutions.tsx` removal scope**: The second `useEffect` in `WorkflowExecutions.tsx` (lines 83–95) tracks execution status changes and drives announcements. Its removal must be total — no partial refactor that leaves `announcedRef` dangling.
- **`WorkflowStartExecutionPopup.tsx` cancellation logic entangled with announcer**: `successCloseRef` and `cancelledRef` were introduced specifically to guard the announcer. After removal, `handleHide` simplifies to just calling `onHide()`, and `handleSubmit` loses the `if (cancelledRef.current) return` guard. The simplification is correct, but must not accidentally remove the `unblockTransition()` / `blockTransition()` calls which are unrelated navigation guards.
- **No existing StatusBadge unit tests**: Adding `role="status"` to a component with no test coverage means the change cannot be verified at the unit level without new tests. The `SkillStatusLabel` test pattern (`screen.getByRole('status')`) is available as a direct reference.
- **Custom DOM event `workflow-execution-status-announce` is deleted**: Any future code that adds an event listener for this event name will silently no-op. There is no consumer outside the three files being modified, but the event name should be considered dead.

---

## 7. Summary for Complexity Assessment

This task touches two architectural layers: the **Shared Component layer** (both `StatusBadge` variants in `src/components/`) and the **Page/Feature layer** (three workflow detail files). The total file change surface is 8 files: 2 component files receive a small ARIA attribute addition, 1 utility module and 1 test file are deleted outright, 2 page components have their announcer imports and lifecycle logic surgically removed, and 2 test files have their announcer-mocking infrastructure and announcement integration describe-blocks removed. No new files need to be created unless a StatusBadge unit test is added.

The change is technically straightforward — `role="status"` plus `aria-label` on a `<div>` is two attribute additions — but the **cleanup side is the complexity**: `WorkflowStartExecutionPopup.tsx` has ref-based state (`successCloseRef`, `cancelledRef`) and conditional logic that was introduced solely for the announcer. Removing this cleanly without disturbing the navigation guard (`unblockTransition`/`blockTransition`) and the file upload flow requires careful line-level reading. The `WorkflowExecutions.tsx` cleanup is more mechanical — the two announcer effects and the `announcedRef` ref can be lifted out without side-effects on the remaining polling and infinite-scroll logic.

Test coverage posture is mixed. The announcer utility is covered by 272 lines of unit tests (all deleted). The announcement integration tests in both consumer test files are substantial and well-structured but all map to code being removed. The remaining test suites for both components are healthy and require only mock cleanup. The **risk** is that `StatusBadge` itself has no unit tests, and the scope question of whether `role="status"` should be conditional (opt-in prop) vs. always-on could affect 15+ call sites. That design decision should be made explicit before implementation: always-on is simpler but semantically wrong for static badges; an `liveRegion` prop is safer but adds interface surface. The complexity-assessor should score this as low-to-medium: the implementation delta is small but the cleanup and design decision deserve careful attention.
