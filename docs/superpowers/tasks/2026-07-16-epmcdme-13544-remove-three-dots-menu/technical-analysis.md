# Technical Research

**Task**: templates workflow-template card three-dots-menu kebab-menu
**Generated**: 2026-07-16T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-13544 — Remove the three dots menu from workflow template cards.

Bug description: On the CodeMie Templates page, workflow template cards display a three dots menu (kebab menu) next to the add button. When opened, it shows actions: View Details, Copy Link, and Clone. According to the expected UI behavior, this menu must not be available on workflow template cards.

Steps to reproduce:
1. Open CodeMie.
2. Navigate to the Templates page.
3. Locate any workflow template card.
4. Observe the actions area on the card.
5. Click the three dots menu on the workflow template card.

Expected: The three dots menu is not displayed on workflow template cards.
Actual: The three dots menu is displayed and shows View Details, Copy Link, and Clone.

Acceptance Criteria:
- The three dots menu is removed from all workflow template cards on the Templates page.
- Users cannot open the menu with View Details, Copy Link, or Clone from workflow template cards.
- The workflow template card layout remains visually consistent after removing the menu.
- Other available card actions (e.g. the add button) remain unaffected.
- No regression is introduced for workflow template card rendering.

Affected Areas: Templates page, Workflow template card UI, Workflow template card actions menu, Frontend UI behavior.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/workflows/components/WorkflowTemplates.tsx` — Templates page; fetches template data from Valtio store, renders a grid of `WorkflowCard` components with `isTemplate={true}`, `onViewWorkflowTemplate`, and `onCreateFromWorkflowTemplate` props; never passes `navigationSlot`
- `src/pages/workflows/components/WorkflowCard.tsx` — Shared card component used for both regular workflow cards and template cards; uses `isTemplate` prop to branch the bottom-action area (lines 244-278); contains the bug at lines 280-293 where `WorkflowActions` is rendered unconditionally regardless of `isTemplate`
- `src/pages/workflows/components/WorkflowActions.tsx` — The kebab/three-dots menu component; assembles "View Details", "Copy Link", "Clone", "Edit", "Delete", "Publish/Unpublish" actions and renders them via `NavigationMore`; has no template-awareness
- `src/components/NavigationMore/NavigationMore.tsx` — Generic floating dropdown UI primitive using `@floating-ui/react`; renders the three-dots `NavigationMoreSvg` trigger and a floating list; no domain logic
- `src/pages/workflows/components/WorkflowsList.tsx` — Regular workflow list page; explicitly controls the `navigationSlot` prop on `WorkflowCard` (passed or suppressed for favorites view), demonstrating the intended pattern for menu control

**Bug — exact location:**

`src/pages/workflows/components/WorkflowCard.tsx`, lines 280-293:

```tsx
<div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
  {navigationSlot ?? (
    <WorkflowActions
      workflow={workflow}
      onView={() => router.push({ name: VIEW_WORKFLOW, params: { workflowId: String(workflow.id) } })}
      reloadWorkflows={reloadWorkflows}
    />
  )}
</div>
```

This block renders regardless of `isTemplate`. `WorkflowTemplates.tsx` never passes `navigationSlot`, so the fallback `WorkflowActions` always renders on template cards.

### Architecture and Layers Affected

- **UI Page layer** (`WorkflowTemplates.tsx`): passes `isTemplate={true}` to cards — no change required here unless the `navigationSlot` suppression approach is chosen
- **UI Card/Container layer** (`WorkflowCard.tsx`): the sole required change; the `isTemplate` guard must be added to the `navigationSlot ?? <WorkflowActions>` block at lines 280-293
- **UI Menu/Action layer** (`WorkflowActions.tsx`, `NavigationMore.tsx`): no changes required; these components have no template awareness and should remain unchanged

### Integration Points

- `WorkflowTemplates` → `WorkflowCard` → `WorkflowActions` → `NavigationMore` (rendering chain)
- `WorkflowCard` also used by `WorkflowsList.tsx` for regular workflow cards — the `!isTemplate` guard must not affect those (safe: `isTemplate` defaults to `false`)
- `WorkflowCard` uses `useFavoritesEnabled()` hook (feature flag `features:favorites`) for the favorites icon — unrelated to this task
- `valtio` store (`workflowsStore`) supplies template data to `WorkflowTemplates`

### Patterns and Conventions

- **`isTemplate` prop discriminator**: already used in `WorkflowCard` at lines 244-278 to branch the primary action buttons (Create Workflow vs Start Chat/Run); the fix follows this same established pattern
- **`navigationSlot` override prop**: `WorkflowCardProps.navigationSlot?: React.ReactNode` allows callers to inject a custom menu or suppress it; `WorkflowsList.tsx` demonstrates using `navigationSlot={undefined}` to suppress the menu in favorites mode — this is an alternative fix approach
- **Slot/prop convention**: documented in `.ai-run/guides/components/reusable-components.md` and `.ai-run/guides/components/component-patterns.md`; the slot mechanism is the "intended" external control surface, while `isTemplate` is the internal discriminator already embedded in the component

**Two valid fix approaches** (both minimal):
1. Guard in `WorkflowCard.tsx`: add `{!isTemplate && (` before line 280 and close it after line 293 — one file changed, single-line diff
2. Suppress via slot in `WorkflowTemplates.tsx`: pass `navigationSlot={null}` to all `WorkflowCard` calls — follows the external slot pattern used in `WorkflowsList`

Approach 1 is preferable because `isTemplate` is the semantic discriminator already used for this exact purpose in `WorkflowCard`. Approach 2 is valid but leaves the bug latent for any future caller that forgets to pass `navigationSlot={null}`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/reusable-components.md` — documents `Card`, `NavigationMore` (overflow actions menu), and `WorkflowCard` with its `actions?` / `navigationSlot` prop; directly relevant
- `.ai-run/guides/components/component-patterns.md` — covers card layout patterns and slot/prop conventions used in `WorkflowCard`; partially relevant

### Architectural Decisions

- Prior task EPMCDME-8521 (`docs/superpowers/tasks/2026-07-10-epmcdme-8521-workflows-templates-semantic-list/plan.md`) explicitly scoped its `WorkflowTemplates` change to only the list wrapper (`ul`/`li`) and decided not to change `WorkflowCard` itself, "in order to avoid unintended effects on other pages using WorkflowCard." This decision is informative but does not block the current fix — EPMCDME-13544 specifically requires a change scoped to the `isTemplate=true` code path, which is already a branching point in `WorkflowCard`.
- `.state.json` confirms the active branch is `EPMCDME-13544_remove-three-dots-menu-workflow-template`; no plan file exists yet.

### Derived Conventions

- `isTemplate` is the canonical boolean flag for distinguishing template cards from regular workflow cards inside `WorkflowCard`; new template-specific suppression logic should follow this discriminator
- `navigationSlot` is the external override surface for callers that need fine-grained menu control; internal branching belongs inside `WorkflowCard` itself
- Tests that need to suppress `WorkflowActions` use `vi.mock` to stub the entire component to `() => null`

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/workflows/components/__tests__/WorkflowCard.test.tsx` — renders `WorkflowCard` with `isTemplate` prop; only one test (name renders as h3); stubs `WorkflowActions` entirely with `() => null`, so the menu is never exercised
- `src/pages/workflows/components/__tests__/WorkflowTemplates.test.tsx` — loading spinner, empty state, template list count; mocks `WorkflowCard` with a stub div — real card UI invisible
- `src/pages/workflows/__tests__/WorkflowTemplatesPagination.integration.test.tsx` — pagination, URL sync, API error toast, semantic list; renders real `WorkflowTemplates` → real `WorkflowCard` but makes no assertions about the kebab menu
- `src/pages/workflows/__tests__/ViewWorkflowTemplatePage.integration.test.tsx` — template detail page (not the card grid); covers header buttons, YAML display, sidebar navigation
- `src/pages/workflows/components/__tests__/WorkflowActions.test.tsx` — tests `WorkflowActions` menu ordering and confirmation modals for regular workflows only; no `isTemplate` scenario covered

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1; two projects: `unit` (jsdom, fast) and `integration` (jsdom with real Valtio stores and mocked fetch)
- `@testing-library/react` 16.3.0, `@testing-library/user-event` 14.6.1, `@testing-library/jest-dom` 6.6.3
- Factory helpers per test file: `makeWorkflow(overrides)`, `makeTemplate(overrides)`, `createTemplateFixture(overrides)`, `createTemplates(count)` — plain object factories with spread overrides
- `vi.mock(...)` at module level for heavy dependencies (router, store, SVG imports, child components)
- Integration tests use `renderPage('/path')` + `mockAPI('GET', url, fixture)` from `src/test-utils/integration`
- `userEvent.setup()` for simulated interactions; `within(element)` for scoped queries; `beforeEach`/`afterEach` for Valtio store resets

### Coverage Gaps

- No test asserts that `WorkflowActions` (the three-dots menu) is absent when `isTemplate=true`
- `WorkflowTemplatesPagination.integration.test.tsx` renders real `WorkflowCard` with `isTemplate={true}` but never queries for the kebab menu button — this test should gain a `queryByRole('button', { name: /more/i })` absence assertion as a regression guard
- `WorkflowCard.test.tsx` stubs `WorkflowActions` to null, so it cannot catch a regression where the menu appears on template cards
- `WorkflowActions.test.tsx` has zero coverage for the template card code path

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_WORKFLOW_VISUAL_EDITOR_ENABLED` — enables/disables the visual workflow editor; unrelated to template card menus
- `VITE_ENABLE_USER_MANAGEMENT` — shows/hides user management UI; unrelated
- `VITE_ENABLE_BUDGET_MANAGEMENT` — shows/hides budget management UI; unrelated
- No env var controls the template card kebab menu visibility

### Configuration Files

- `config.js` — runtime `window._env_` overrides for API URL, environment, feature toggles (user mgmt, budget mgmt, login type); no template/menu-specific entries
- `.env` — Vite build-time vars; no template card menu entries
- `.env.local` — single override `VITE_IS_ENTERPRISE_EDITION='true'`; unrelated

### Feature Flags and Deployment Concerns

- `features:favorites` (runtime server-driven) — used directly in `WorkflowCard` via `useFavoritesEnabled()` for the favorites icon; unrelated to the three-dots menu
- No feature flag governs the template card kebab menu; the fix is a pure code change with no flag gating needed
- No deployment or infrastructure concerns for a frontend-only conditional render change

---

## 6. Risk Indicators

- **No test verifies menu absence on template cards** — `WorkflowCard.test.tsx` stubs `WorkflowActions` to null and `WorkflowTemplates.test.tsx` stubs the whole `WorkflowCard`, meaning neither test would catch a regression if `isTemplate` prop passing is removed or changed upstream
- **`WorkflowCard` is a shared component** — used by both `WorkflowTemplates` (templates grid) and `WorkflowsList` (regular workflow list); the `!isTemplate` guard must be verified not to affect the regular workflow path; low risk since `isTemplate` defaults to `false` and `WorkflowsList` always omits the prop
- **Prior task (EPMCDME-8521) deliberately avoided changing `WorkflowCard`** — this creates a mild caution note, but the present task's fix is strictly additive (a guard on an existing discriminator) rather than a structural refactor
- **`navigationSlot` fallback pattern** — if a future caller passes `navigationSlot={someMenu}` to a template card, the `!isTemplate &&` guard would suppress even the custom slot; this is intentional for templates but should be noted so future callers are aware
- **`WorkflowActions` has no template awareness** — the component itself does not know it is rendering inside a template card; moving the guard into `WorkflowCard` (rather than `WorkflowActions`) is correct and keeps the single-responsibility boundary clean
- **Integration test `WorkflowTemplatesPagination.integration.test.tsx` renders the real card stack** without asserting menu absence — this test is the natural place for a regression assertion and represents an existing gap

---

## 7. Summary for Complexity Assessment

This is a minimal, well-scoped bug fix confined to a single component file. The root cause is in `WorkflowCard.tsx` at lines 280-293: the `navigationSlot ?? <WorkflowActions />` fallback block has no guard for `isTemplate`, causing the three-dots menu to render on all template cards. The fix is a single conditional — wrapping the block with `{!isTemplate && ...}` — that follows the exact pattern already used at lines 244-278 of the same file for the primary action buttons. Only one file requires a production code change (`WorkflowCard.tsx`); no changes are needed in `WorkflowActions`, `NavigationMore`, `WorkflowTemplates`, or any data or service layer.

The affected area is purely the UI Component layer. The component tree is `WorkflowTemplates → WorkflowCard → WorkflowActions → NavigationMore`; only the second node requires modification. The `isTemplate` discriminator is already embedded and used in `WorkflowCard`, so the fix introduces no new patterns or abstractions. The `navigationSlot` slot mechanism (documented in `.ai-run/guides/components/reusable-components.md`) is an alternative fix surface but is less robust for this use case, since it relies on every caller to remember to suppress the slot.

Test coverage posture for the affected path is weak: `WorkflowCard.test.tsx` stubs out `WorkflowActions` entirely, and the integration test that renders the real card stack (`WorkflowTemplatesPagination.integration.test.tsx`) has no assertion about menu presence. The fix itself carries negligible regression risk because `isTemplate` defaults to `false` for regular workflow cards. However, a new absence assertion in the integration test should accompany the fix to prevent future regressions. Overall complexity is low (single-line guard + optional test assertion); the main risk factor is the pre-existing lack of behavioral test coverage for the template card menu.
