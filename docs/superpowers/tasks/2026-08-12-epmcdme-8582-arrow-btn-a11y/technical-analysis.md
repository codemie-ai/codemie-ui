# Technical Research

**Task**: accessibility keyboard focus arrow button a11y
**Generated**: 2026-08-12
**Research path**: filesystem

---

## 1. Original Context

Fix A11y issue EPMCDME-8582: The 'Arrow' button is not keyboard accessible. Steps to reproduce: 1. Open any page as an authorised user. 2. Try to navigate to 'Arrow' button using Tab key on the keyboard. Actual result: The 'Arrow' button is inaccessible via keyboard. Expected result: The 'Arrow' button should receive keyboard focus. The issue affects All pages.

---

## 2. Codebase Findings

### Existing Implementations

The ticket term "Arrow button" covers any chevron/arrow SVG used as an interactive control. The codebase uses three chevron SVG assets (`chevron-left.svg`, `chevron-right.svg`, `chevron-down.svg`, `chevron-up.svg`) imported as `?react` SVG components. The following interactive uses were found:

**CONFIRMED A11Y DEFECT — Raw SVG with onClick, no `<button>` wrapper:**

- **`src/pages/chat/components/ChatHistory/ChatHistoryControls.tsx`** (lines 52–67)
  - `<ChevronLeftSvg onClick={setPrevIndex} className="... cursor-pointer ...">` — raw SVG, no `button`, no `tabIndex`, no `aria-label`. Same for `<ChevronRightSvg onClick={setNextIndex}>`. These are the "Previous/Next message variant" controls that appear inside AI chat turns when multiple message edits exist.
  - This is the primary, highest-confidence match for the ticket: two clickable arrow SVGs on every chat page that receive no keyboard focus at all.

**CONFIRMED A11Y DEFECT — `<div onClick>` wrapping toggle, arrow SVG inside, no `<button>` for the whole header:**

- **`src/pages/workflows/editor/configPanels/components/MappingRow.tsx`** (lines 350–377)
  - `<div onClick={onToggle} className="... cursor-pointer ...">` containing `<ChevronUpSvg>` for expand/collapse of mapping rows. The delete `<Button>` inside has `e.stopPropagation()` but the toggle trigger is a `<div>`, not a `<button>`.

- **`src/pages/workflows/editor/ConfigPanel.tsx`** (lines 553–588)
  - Outer `<div onClick={toggleCollapsed}>` wrapping the panel header. The `<Button>` for collapse/expand does NOT have its own `onClick` — it relies on the parent `<div>`'s handler via bubble. Keyboard users tabbing to the `<Button>` and pressing Enter/Space will fire the button's implicit submit (no action) not `toggleCollapsed`.

**PARTIALLY DEFECTIVE — `<div onClick>` wrapping whole drawer header:**

- **`src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerWrapper.tsx`** (lines 53–76)
  - The outer `<div onClick={() => onExpandedChange(!expanded)}>` handles the header click. The inner `<Button variant="tertiary" aria-label="Toggle drawer" aria-expanded={expanded}>` correctly has `onClick={() => onExpandedChange(!expanded)}`. So the `Button` itself IS keyboard-accessible (has proper `onClick`). However the broad `<div onClick>` wrapper also triggers the action — this is a minor redundancy but not a blocker for keyboard users since the Button itself works.

**PROPERLY IMPLEMENTED — `<button>` elements confirmed accessible:**

- **`src/components/Sidebar/SidebarToggle.tsx`** — `<button type="button" aria-label aria-expanded>` with `ChevronLeftSvg aria-hidden`. Fixed in EPMCDME-8417.
- **`src/components/Pagination/Pagination.tsx`** — `<button type="button" aria-label="Previous page">` / `aria-label="Next page"` wrapping `ChevronLeftSvg aria-hidden` / `ChevronRightSvg aria-hidden`. Already accessible.
- **`src/components/Thought/ThoughtHeader.tsx`** — `<button type="button" aria-expanded aria-label>` with `ChevronRightSvg aria-hidden`. Already accessible.
- **`src/pages/workflows/details/states/WorkflowExecutionStateControls.tsx`** — `<Button aria-label="Continue options"><ChevronDownSvg></Button>`. Already accessible.
- **`src/pages/katas/components/StepByStepNavigator.tsx`** — Uses `<Button>` wrapper for Previous/Next Step; chevrons are decorative inside proper `<Button>` elements. Already accessible.
- **`src/components/Onboarding/OnboardingFlowCard.tsx`** — Uses `role="button" tabIndex={0}` with `onKeyDown` Enter handler. Accessible via div+role pattern.

**PrimeReact Accordion-based arrow icons (managed by library):**

The following components use PrimeReact `<Accordion>` which handles keyboard navigation internally (the accordion header `<a>` is focusable). The chevron icons inside are decorative SVGs:
- `src/components/Accordion/Accordion.tsx` — custom header renders `ChevronDownSvg` inside the PrimeReact accordion header `div`.
- `src/components/FilterAccordionItem/FilterAccordionItem.tsx` — uses `collapseIcon`/`expandIcon` props.
- `src/components/Filters/Filters.tsx` — same pattern.
- `src/pages/chat/components/ChatSidebar/ChatSidebarLists/ChatSidebarAccordion.tsx`
- `src/pages/chat/components/ChatSidebar/ChatSidebarSection.tsx`
- `src/pages/settings/administration/components/ConfigSection.tsx` — uses `<button onClick={() => setIsExpanded(!isExpanded)}>` containing `ChevronDownSvg`. The `<button>` element is correct but lacks `type="button"`, `aria-expanded`, and `aria-label`. Minor gap.
- `src/pages/workflows/editor/configPanels/components/ConfigAccordion.tsx`
- `src/components/guardrails/GuardrailAssignmentPanel/GuardrailAssignmentPanelAccordion.tsx`
- `src/pages/assistants/components/RemoteAssistantForm/RemoteAssistantFormAccordion.tsx`
- `src/pages/assistants/components/RemoteAssistantDetails/components/DetailsAccordion.tsx`

### Architecture and Layers Affected

- **Presentational layer only**: all defects are in leaf React UI components.
- **Chat layer**: `src/pages/chat/components/ChatHistory/ChatHistoryControls.tsx` — within the chat message rendering tree.
- **Workflow editor layer**: `src/pages/workflows/editor/configPanels/components/MappingRow.tsx`, `src/pages/workflows/editor/ConfigPanel.tsx`.
- **Settings layer**: `src/pages/settings/administration/components/ConfigSection.tsx` (minor gap).
- No state management, API, service, or routing changes required.

### Integration Points

- `ChatHistoryControls` is rendered inside the chat turn component that shows multiple message variants. Its props are `messageIndex`, `totalMessages`, `onChangeMessageIndex` — all passed down from the parent message component. No store reads.
- `MappingRow` is rendered by the workflow transform tab config panel. `onToggle` is a callback prop.
- `ConfigPanel` uses `toggleCollapsed` referencing `isCollapsed` and `onCollapsedChange` props.
- `ConfigSection` uses local state `isExpanded`.

### Patterns and Conventions

The established pattern throughout this codebase for accessible arrow/chevron interactive elements:

1. **Icon-only button**: `<button type="button" aria-label="Descriptive label">` with `<ChevronXSvg aria-hidden="true" />` inside. See `Pagination.tsx`, `SidebarToggle.tsx`, `ThoughtHeader.tsx`.
2. **Toggle button (expand/collapse)**: add `aria-expanded={isExpanded}` on the `<button>`. See `SidebarToggle.tsx` (line 57), `ThoughtHeader.tsx` (line 80), `WorkflowDrawerWrapper.tsx` (line 68).
3. **Never** place `onClick` directly on an SVG element or on a plain `<div>` without a `role="button"` + `tabIndex={0}` + keyboard handler.
4. The project `Button` component (`src/components/Button/`) renders a `<button>` element; using it is the preferred wrapper pattern over raw `<button>`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- **`.ai-run/guides/patterns/accessibility-patterns.md`** — Directly covers this exact bug class. Key items:
  - "All interactive elements reachable by Tab" (pre-delivery checklist).
  - "Icon-only buttons have `aria-label`" (checklist).
  - "Decorative SVGs: `aria-hidden='true'`" (checklist).
  - Icon Button Pattern section: `<Button aria-label='Start chat'><ChatSvg aria-hidden='true' /></Button>`.
  - Semantic HTML table: `<button>` instead of `<div onClick>`.
- **`.ai-run/guides/testing/testing-patterns.md`** — Testing conventions (vitest + @testing-library/react).
- **`.ai-run/guides/quality-gates.md`** — Validation command reference.

### Architectural Decisions

- Prior a11y fix EPMCDME-8417 (commit `f92cb2087`) established: `aria-label`, `aria-expanded`, `type="button"` on toggle buttons, and `aria-hidden="true"` on decorative SVGs.
- Prior a11y fix EPMCDME-8460 established: state-dependent `aria-label` on toggle buttons; i18n is explicitly out-of-scope (hardcoded English strings are the convention).
- Prior a11y fix EPMCDME-13527 (commit `4045303c1`) established: `role` and keyboard handler patterns on chat prompt wrappers.
- All prior fixes added test coverage alongside the implementation fix.

### Derived Conventions

- `aria-label` strings are hardcoded English — no i18n framework (`i18next` is absent from `package.json`).
- Test files co-located in `__tests__/` subdirectories adjacent to the component.
- Vitest + @testing-library/react; SVG mocks: `vi.mock('...svg?react', () => ({ default: (props) => <svg data-testid="..." {...props} /> }))` — props are passed through so `aria-hidden` is assertable.
- Testing-library query pattern for accessible buttons: `screen.getByRole('button', { name: /label/i })`.

---

## 4. Testing Landscape

### Existing Coverage

- **`src/components/Pagination/__tests__/Pagination.test.tsx`** — Tests click behavior on page buttons; no keyboard/aria tests for chevron buttons. The file does not check `aria-label="Previous page"` / `aria-label="Next page"` (these are already correctly implemented — just not covered by tests).
- **`src/components/Sidebar/__tests__/SidebarToggle.test.tsx`** — Comprehensive: 15 tests covering button role, `type="button"`, `aria-label`, `aria-expanded`, keyboard shortcut (Ctrl+B). This is the gold-standard test template for this ticket's fixes.
- **No test file found** for `src/pages/chat/components/ChatHistory/ChatHistoryControls.tsx` — zero coverage.
- **No test file found** for `src/pages/workflows/editor/configPanels/components/MappingRow.tsx`.
- **No test file found** for `src/pages/settings/administration/components/ConfigSection.tsx`.
- `src/pages/workflows/editor/ConfigPanel.tsx` — no dedicated test file found in its directory.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 + @testing-library/react + jsdom.
- **SVG mocks**: `vi.mock('@/assets/icons/chevron-xxx.svg?react', () => ({ default: (props) => <svg data-testid="..." {...props} /> }))` — allows asserting `aria-hidden` on the mock.
- **A11y assertions**: `screen.getByRole('button', { name: /label text/i })`, `expect(btn).toHaveAttribute('aria-expanded', 'true')`, `expect(btn).toHaveAttribute('aria-label', '...')`.
- **Keyboard event**: `fireEvent.keyDown(element, { key: 'Enter' })` for testing keyboard activation on non-button elements.

### Coverage Gaps

- `ChatHistoryControls` — no test file at all; the arrow navigation buttons are untested.
- `MappingRow` — no test file; the expand/collapse header div is untested.
- `ConfigPanel` — no tests for the collapse toggle interaction.
- `ConfigSection` — no tests for the expand/collapse button.

---

## 5. Configuration and Environment

### Environment Variables

None relevant. No feature flags gate any of the affected components.

### Configuration Files

- `vite.config.ts` is currently modified in the working tree (pre-existing, unrelated to this task — noted in prior task plans; same exclusion applies here).
- No config changes needed for this fix.

### Feature Flags and Deployment Concerns

- No feature flags involved. All affected components are rendered unconditionally for authorized users.
- No i18n framework; accessible name strings stay as hardcoded English (established convention from EPMCDME-8460 review).

---

## 6. Risk Indicators

- **`ChatHistoryControls.tsx` — raw SVG `onClick`**: Raw `<ChevronLeftSvg onClick>` and `<ChevronRightSvg onClick>` are completely invisible to keyboard and screen readers. This is the highest-severity instance and the most likely match for the "all pages" scope in the ticket (every chat page with multi-variant messages renders this). Fix requires replacing both SVGs with `<button type="button" aria-label="...">` wrappers. No test file exists — tests must be created from scratch.
- **`MappingRow.tsx` — `<div onClick>` for expand/collapse toggle**: The entire row header div is the click target. Keyboard users cannot focus or activate it. Fix requires wrapping the interactive header in `<button type="button" aria-expanded aria-label>` (with the delete `Button` staying as a child with `e.stopPropagation()`). No test file exists.
- **`ConfigPanel.tsx` — `<div onClick={toggleCollapsed}>` with orphaned Button**: The collapse/expand `<Button>` inside the header div has NO `onClick` prop — it depends entirely on the parent `<div>`'s click handler via event bubbling. A keyboard user pressing Enter/Space on the `<Button>` fires its own click, which does NOT bubble up to `toggleCollapsed` (the button itself has no handler). Fix: move `onClick={toggleCollapsed}` to the `<Button>` and make it `type="button"` with `aria-expanded` and `aria-label`. No dedicated test file.
- **`ConfigSection.tsx` — `<button>` without `type="button"`, `aria-expanded`, or `aria-label`**: The button is at least a `<button>` element (focusable), but defaults to `type="submit"` (could trigger form submission if nested in a `<form>`) and gives no accessible name beyond the text content of `<h3>` (unclear to screen readers that it is interactive). Lower severity than the raw-SVG cases but should be addressed.
- **`WorkflowDrawerWrapper.tsx` — outer `<div onClick>` pattern**: The `<Button>` inside has its own `onClick` so keyboard users CAN activate it. The outer `<div>` is a cosmetic redundancy. Lower severity; may not need a fix but should be audited.
- **No test coverage** for `ChatHistoryControls`, `MappingRow`, `ConfigPanel` — new test files must be created alongside the fixes, following the `SidebarToggle.test.tsx` template.
- **Scope ambiguity**: The ticket says "All pages" and "Arrow button" without specifying a single component. The research found at least 4 distinct defective arrow/chevron interactive patterns. The plan must decide whether to fix all confirmed defects in one commit or scope to the highest-severity ones.
- **PrimeReact Accordion**: Accordion-based chevrons are managed by the PrimeReact library's `<a>` header. These are generally keyboard-accessible by the library. No defect found in accordion-based chevrons.

---

## 7. Summary for Complexity Assessment

The task touches the presentational layer across 4 confirmed defective files in 3 product areas (chat, workflow editor, settings/admin), with one additional lower-severity candidate. The highest-severity defect is `src/pages/chat/components/ChatHistory/ChatHistoryControls.tsx`: two raw SVG elements (`ChevronLeftSvg`, `ChevronRightSvg`) carry `onClick` handlers with no `<button>` wrapper, making them completely invisible to Tab navigation and screen readers. This component is rendered on every chat page whenever a message has multiple variants, matching the ticket's "All pages" scope. The fix is straightforward: replace both SVG elements with `<button type="button" aria-label="Previous version">` / `<button type="button" aria-label="Next version">` wrappers containing the SVGs with `aria-hidden="true"`, plus a disabled state via `aria-disabled` or `disabled` attribute when at the boundary.

The secondary defects in `MappingRow.tsx` and `ConfigPanel.tsx` follow the same `<div onClick>` / orphaned-button anti-pattern and require replacing or adding the `onClick` to a proper `<button>` element with `aria-expanded`. `ConfigSection.tsx` needs `type="button"`, `aria-expanded`, and an `aria-label` on its existing `<button>`. All fixes follow the same established pattern documented in `.ai-run/guides/patterns/accessibility-patterns.md` and demonstrated in prior commits (`f92cb2087` EPMCDME-8417, `4045303c1` EPMCDME-13527). No new patterns are introduced.

Test posture for the affected components is poor: none of the four primary defect files have an existing test file. New test files must be created from scratch following the `SidebarToggle.test.tsx` template (vitest + @testing-library/react, SVG mock passing props through, `getByRole('button', { name: /label/i })` assertions, `aria-expanded` state assertions). The change surface is 4–5 source files + 4–5 new test files — moderate scope for an a11y bug fix. Complexity is low-to-moderate: the patterns are well-established, the fixes are local to leaf components, and there are no state, API, or routing changes involved.
