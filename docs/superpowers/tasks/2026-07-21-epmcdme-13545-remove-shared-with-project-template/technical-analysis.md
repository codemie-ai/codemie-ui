# Technical Research

**Task**: template card shared-with-project assistants workflows
**Generated**: 2026-07-21T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Remove 'Shared with Project' item from Assistants and Workflows template cards. The 'Shared with Project' item is displayed on template cards and must be removed from both Assistants and Workflows template cards. The removal must be clean (no leftover spacing/alignment issues) and must NOT regress the sharing display on non-template Assistant and Workflow cards. Acceptance criteria: (1) Remove from all Assistants template cards; (2) Remove from all Workflows template cards; (3) No empty spacing/alignment issue after removal; (4) Existing template card actions (create/add, more options, favorite) continue to work; (6) No regression for non-template cards where sharing info is expected.

---

## 2. Codebase Findings

### Existing Implementations

**Assistant sharing status flow:**
- `src/pages/assistants/components/AssistantList/AssistantCard/StatusLabel.tsx` — renders "Shared with Project" / "Not shared" / "X total uses" based on `isShared`, `isOwned`, `assistant.is_global`; defines `STATUS_TEXT.SHARED = 'Shared with Project'` at line 31; no `isTemplate` awareness
- `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx` — card component; `isTemplate` prop is already in scope; `renderStatus()` at line 250 always returns `<StatusLabel .../>` regardless of `isTemplate`; passes `status={renderStatus()}` to base `Card` at line 277 — this is the primary fix site for assistants
- `src/pages/assistants/components/AssistantList/AssistantCard/getAssistantCardInfo.tsx` — derives `isShared` (`= assistant.shared`) and `isOwned` for every card including templates; not a fix site
- `src/pages/assistants/components/AssistantList/AssistantGrid/AssistantGrid.tsx` — iterates assistant/template list; calls `getAssistantCardInfo` and passes `isShared`/`isOwned` to `AssistantCard` unconditionally
- `src/pages/assistants/components/AssistantList/AssistantList.tsx` — passes `isTemplate` down to `AssistantGrid`
- `src/pages/assistants/AssistantsListPage.tsx` — derives `isTemplate = (tab === AssistantTab.TEMPLATES)`; passes down to `AssistantsList`

**Workflow sharing status flow:**
- `src/pages/workflows/components/WorkflowShared.tsx` — standalone component; renders "Shared with Project" (line 35) or "Not shared" (line 43) based on `workflow.shared`; no `isTemplate` awareness
- `src/pages/workflows/components/WorkflowCard.tsx` — card component; `isTemplate` prop already in scope; lines 302–308 unconditionally render `WorkflowShared` (or `WorkflowMarketplace`) for all cards including templates via `{workflow.is_global ? <WorkflowMarketplace .../> : <WorkflowShared .../>}` — this is the primary fix site for workflows
- `src/pages/workflows/components/WorkflowTemplates.tsx` — renders `WorkflowCard` with `isTemplate` prop for each template

**Possible additional scope (needs confirmation):**
- `src/pages/workflows/components/ViewWorkflowHeader.tsx` line 115 — renders `WorkflowShared` unconditionally in the workflow template detail/view header; task text says "template cards" so this may be out of scope, but should be confirmed

**Base card:**
- `src/components/Card/Card.tsx` — shared base card component; renders the `status?` slot unconditionally when provided inside `<div class="flex items-center mt-3 h-7">`; has no template awareness and must not be changed — the guard belongs in the caller

### Architecture and Layers Affected

| Layer | Component | Change needed |
|---|---|---|
| Card — Assistants | `AssistantCard.tsx` | Pass `status={isTemplate ? null : renderStatus()}` at line 277 |
| Card — Workflows | `WorkflowCard.tsx` | Wrap lines 302–308 sharing block with `{!isTemplate && (...)}` |
| Status display | `StatusLabel.tsx`, `WorkflowShared.tsx` | No changes — suppressed at call site |
| Base shared component | `Card.tsx` | No changes |

The `isTemplate` prop is already threaded through both `AssistantCard` and `WorkflowCard` — it gates action buttons and navigation elsewhere in both files. The sharing status block is the only place the prop is not yet applied.

### Integration Points

- `AssistantCard` → `Card` (base component, `status` slot injection point)
- `AssistantCard` → `StatusLabel` (sharing display sub-component)
- `WorkflowCard` → `WorkflowShared` (sharing display sub-component)
- `WorkflowCard` → `WorkflowMarketplace` (global workflow display sub-component; also inside the unguarded block)
- `AssistantGrid` → `getAssistantCardInfo` (derives `isShared`; no change needed)
- Valtio stores: `assistantsStore`, `workflowsStore`, `favoritesStore` — state source, no changes needed

### Patterns and Conventions

- **`isTemplate` gate pattern**: the established convention for hiding UI on template cards is `{!isTemplate && (...)}`. This exact pattern was applied in EPMCDME-13544 (remove three-dots menu from workflow template cards) at `WorkflowCard.tsx` lines 284–299. The fix for this task follows the identical pattern.
- **Guard site is the caller, not the base component**: `Card.tsx` has no template awareness by design; any conditional rendering must live in `AssistantCard` or `WorkflowCard`.
- **No i18n system**: "Shared with Project" is a hardcoded string literal in two files (`StatusLabel.tsx` line 31 and `WorkflowShared.tsx` line 35). No translation keys to update.
- **No feature flags**: the sharing label is not behind any env var or runtime flag — it is rendered purely from component props and data fields.
- **Valtio + `useSnapshot`**: global state; components do not call APIs directly.
- **`isTemplate` propagation chain**: `AssistantsListPage` → `AssistantsList` → `AssistantGrid` → `AssistantCard` (already carries `isTemplate`); `WorkflowTemplates` → `WorkflowCard` (already carries `isTemplate`).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/.ai-run/guides/components/component-organization.md` — establishes that `AssistantCard` and `WorkflowCard` are feature-level components under `src/pages/<feature>/components/`; documents the `isTemplate` prop pattern for gating UI and the 300-line component size limit
- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/.ai-run/guides/components/reusable-components.md` — catalogs the shared `Card` component and its `status?` slot as the injection point for bottom-row status content; confirms guard must live in the caller
- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/.ai-run/guides/components/component-patterns.md` — hook-ordering conventions for page components
- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/.ai-run/guides/architecture/architecture.md` — confirms Valtio store pattern; no architectural decision about sharing visibility on template cards

### Architectural Decisions

- No ADR files found in the repository.
- The closest recorded design decision is the EPMCDME-13544 spec at `docs/superpowers/tasks/2026-07-16-epmcdme-13544-remove-three-dots-menu/spec.md`, which documents the `{!isTemplate && (...)}` pattern applied to `WorkflowCard.tsx` to remove the three-dots kebab menu from template cards. This task is a direct sibling change using the same pattern.

### Derived Conventions

- Template card UI suppression uses `{!isTemplate && (...)}` inline JSX — not a prop-drilling approach, not a higher-order component.
- Sharing status guard must be added in the card component itself, not in `StatusLabel` or `WorkflowShared` (those components are reused in non-template contexts).
- Changes to the base `Card` component are out of scope and would risk breaking other consumers.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/StatusLabel.test.tsx` — unit tests for `StatusLabel`; includes `'renders Shared with Project status when isShared is true'` which asserts the exact string and `aria-label`; tests `isShared`, `isOwned`, and `is_global` priority logic. **Will need updating** to reflect that `StatusLabel` is never called from template card contexts after the fix.
- `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx` — unit test renders with `isShared={true}` and asserts `role="status"` exists; does not assert text; does not test `isTemplate=true` suppressing the status. **Needs a new test case** for `isTemplate=true` asserting status is absent.
- `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/getAssistantCardInfo.test.tsx` — unit tests for the `isShared`/`isOwned` derivation helper; not affected by this task.
- `src/pages/workflows/components/__tests__/WorkflowCard.test.tsx` — minimal unit test; renders `isTemplate` but only asserts the heading; `WorkflowShared` is not mocked and would render if not suppressed. **Needs a new test case** asserting sharing block is absent when `isTemplate=true`.
- `src/pages/workflows/components/__tests__/WorkflowTemplates.test.tsx` — fully mocks `WorkflowCard`; sharing label not exercised; no update needed.
- `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` — integration tests at lines 264 and 278 assert `'shows Shared with Project text when workflow is shared'` and `'shows Not shared text when workflow is not shared'` on non-template cards. **Must not regress** — these are the primary regression guard for acceptance criterion (6).
- `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx` — renders real `WorkflowCard` via `renderPage`; template fixture has no `shared` field; no sharing label assertions currently. May need an assertion that sharing text is absent on template cards.
- `src/pages/assistants/__tests__/AssistantTemplatesPagination.integration.test.tsx` — renders real `AssistantCard`; template fixture sets `shared: false`; no sharing label assertions. May need an assertion for completeness.
- `src/pages/assistants/__tests__/AssistantsListPage.integration.test.tsx` — no sharing display assertions; tests basic card rendering and navigation.

### Testing Framework and Patterns

- **Vitest 1.6.1** with two workspace projects: `unit` (jsdom, stores mocked) and `integration` (custom environment, real stores, mocked `fetch`)
- `@testing-library/react` 16.3.0, `@testing-library/jest-dom` 6.6.3, `@testing-library/user-event` 14.6.1
- **Inline factory functions** per test file (`createMockAssistant`, `makeWorkflow`, `createTemplateFixture`) — plain objects with overrides spread
- **`vi.mock()`** at module level for stores, router hooks, heavy sub-components
- **`mockAPI(method, url, data)`** from `src/test-utils/integration.tsx` — populates `requestRegistry` Map consumed by global `fetch` mock
- **`renderPage(path)`** from `src/test-utils/integration.tsx` — creates `createMemoryRouter` with real app routes; used in all integration tests
- **`userEvent.setup()`** for interactions; `vi.useFakeTimers` in some integration tests
- **`screen.getByRole / queryByText / within()`** for assertions

### Coverage Gaps

1. No test asserts that template Assistant cards do NOT display "Shared with Project" — the `AssistantCard.test.tsx` `isTemplate` path does not check for sharing label absence
2. No dedicated unit test for `WorkflowShared.tsx` anywhere in the repo
3. No test asserts that template Workflow cards do NOT display "Shared with Project" — `WorkflowCard.test.tsx` renders `isTemplate` but does not check sharing label
4. No integration-level test covers "Shared with Project" on a non-template Assistant card — unlike workflows, the regression risk for assistant sharing on non-template cards has no integration test guard

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — backend API base path (no sharing relevance)
- `VITE_IS_ENTERPRISE_EDITION` — enables enterprise features (no sharing relevance)
- `VITE_SHOW_ALL_PROJECTS` — cross-project visibility (no sharing relevance)

None of the declared env vars gate or govern the "Shared with Project" label. No config change is needed for this task.

### Configuration Files

- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/config.js` — runtime env injection via `window._env_`; governs API URL, environment name, enterprise flags; no template or sharing flags
- `/Users/mykola_nehrych/WebstormProjects/codemie-ui/.env` — Vite build-time defaults; governs API URL, assistant slugs, workflow doc URLs, and `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED`; no sharing flags

### Feature Flags and Deployment Concerns

- The feature flag system (`src/utils/featureFlags.ts`) is server-driven via `appInfoStore.configs`. Flags present: `mcpConnect`, `features:costCenters`, `features:favorites`, `features:pinnedAssistants`, `features:favoritesPage`, `features:requestHedging`, `features:teamsBotIntegration`. No flag governs the sharing label.
- No deployment configuration changes are needed. This task is a pure UI change to two source files plus test updates.

---

## 6. Risk Indicators

- **Two hardcoded fix sites, both minimal (1–3 line change each)** — `AssistantCard.tsx` line 277 and `WorkflowCard.tsx` lines 302–308. Risk of missing one site is low given both are precisely identified.
- **Potential third change site — `ViewWorkflowHeader.tsx` line 115** renders `WorkflowShared` unconditionally in the workflow template detail/view header. The task acceptance criteria say "template cards" — if the view/detail header is considered a template page rather than a card, it may be in scope. This needs clarification before delivery; failing to address it would be an incomplete fix.
- **No integration test guards the "Shared with Project" absence on template cards** — both `WorkflowTemplatesPagination.integration.test.tsx` and `AssistantTemplatesPagination.integration.test.tsx` render real cards but make no sharing assertions. The fix will not be caught by existing tests if it regresses; new test cases are necessary for the acceptance criteria to be verifiable.
- **`StatusLabel.test.tsx` asserts the exact string "Shared with Project" in a test that does not differentiate template vs. non-template context** — this test will not fail when the fix is applied (since `StatusLabel` itself is unchanged), but it also does not protect against the fix being accidentally reverted; update it to cover the `isTemplate` suppression path explicitly.
- **`WorkflowsListPage.integration.test.tsx` is the only meaningful regression guard for non-template workflow sharing** — its tests at lines 264 and 278 must remain green after the fix. No equivalent guard exists for non-template Assistant cards (gap 4 in Section 4).
- **No i18n system** — "Shared with Project" is a hardcoded literal in two files. Any future localization work will need to find these sites again; not a delivery risk but a maintainability note.
- **`WorkflowTemplate` type has no `shared` field** — `WorkflowShared` receives `workflow.shared` which will be `undefined` on templates. Currently this renders "Not shared" on template cards (falsy check); after the fix this block is suppressed entirely, which is the correct behavior.

---

## 7. Summary for Complexity Assessment

This task has a precisely scoped, low-complexity implementation surface. Two source files require changes totalling 3–5 lines each: `AssistantCard.tsx` needs `status={isTemplate ? null : renderStatus()}` at line 277 (replacing the unconditional call), and `WorkflowCard.tsx` needs `{!isTemplate && (...)}` wrapping the sharing display block at lines 302–308. The `isTemplate` prop is already available in scope at both change sites and follows an established project pattern introduced by EPMCDME-13544. No architectural changes, no new components, no config changes, and no dependency changes are needed.

The primary technical risk is the potential third scope item: `ViewWorkflowHeader.tsx` line 115 renders `WorkflowShared` unconditionally in the workflow template view/detail header. If this page is considered in scope by the product definition of "template card", it requires a third fix. The acceptance criteria reference "template cards" specifically, so this should be confirmed before delivery. A secondary risk is the `WorkflowMarketplace` component inside the same unguarded block in `WorkflowCard.tsx` — it must also be suppressed on template cards (it is inside the same wrapping `div` as `WorkflowShared`, so the single `{!isTemplate && (...)}` guard covers both).

Test coverage posture is mixed. The `WorkflowsListPage.integration.test.tsx` regression tests for non-template workflow sharing are solid and must stay green. However, no tests currently assert that template cards do not show sharing, meaning the fix itself will not be validated by the existing suite. New test cases are needed in `AssistantCard.test.tsx` (unit) and `WorkflowCard.test.tsx` (unit) asserting sharing label absence when `isTemplate=true`, and optionally in the pagination integration tests. The overall file change surface is 2 source files plus 2–4 test files — this is a low-complexity, well-understood change with clear implementation guidance.
