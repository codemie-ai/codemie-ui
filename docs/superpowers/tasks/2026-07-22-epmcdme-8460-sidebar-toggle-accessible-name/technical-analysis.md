# Technical Research

**Task**: sidebar navigation toggle collapse aria-label accessibility
**Generated**: 2026-07-22
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8460 (codemie-ui). Minor accessibility bug, WCAG 2.4.6 / 4.1.2. The sidebar collapse/expand toggle button at the bottom of the navigation sidebar lacks an accessible name when the sidebar is collapsed. Current behaviour: when the sidebar is expanded, the button renders with visible text "Hide Menu" (accessible name OK); when collapsed, the same button renders icon-only with no aria-label / title / text, so screen readers announce it only as "button". Fix: give the toggle a state-dependent accessible name — aria-label="Hide Menu" when expanded, aria-label="Show Menu" when collapsed. Keep the visible "Hide Menu" text in the expanded state. No visual/behaviour changes — labelling only. NOTE: the ticket text names the "EPAM AI/RUN CodeMie" element, but that is the application LOGO (`<a aria-label="EPAM AI/Run Codemie logo">`) which already has an accessible name and must NOT be modified — the real target is the separate bottom sidebar toggle button.

---

## 2. Codebase Findings

### Existing Implementations

- **Target component**: `src/components/Navigation/NavigationExpandButton.tsx` (53 lines). This is the exact button described in the ticket:
  - Line 47: `{navigationExpanded ? 'Hide Menu' : ''}` — visible text only when expanded; icon-only when collapsed.
  - Lines 31–41: `<button type="button" ...>` with **no `aria-label`, no `title`** in either state. Confirmed bug.
  - Lines 38–40: react-tooltip attrs — `data-tooltip-content={!navigationExpanded ? 'Expand Menu' : undefined}` (tooltip text says "Expand Menu", ticket asks for aria-label "Show Menu" — wording divergence to be aware of).
  - Lines 42–46: `<SidebarSvg>` icon (from `@/assets/icons/sidebar-alt.svg?react`), rotated 180° when collapsed; the SVG carries no `aria-hidden`.
- **Parent**: `src/components/Navigation/Navigation.tsx:203` — `<NavigationExpandButton onClick={toggleNavigation} />`, rendered after `<NavigationProfile>` at the bottom of the sidebar, **outside** the `<nav aria-label="bottom-nav-links">` element.
- **State source**: `src/store/appInfo.ts` (valtio store):
  - `navigationExpanded: boolean` (line 56), initialized from localStorage (line 84).
  - Toggle at lines 265–266 flips the flag and persists to `NAVIGATION_EXPANDED_KEY`.
  - Component reads it via `useSnapshot(appInfoStore)` (NavigationExpandButton.tsx:28).
- **Element to NOT touch**: `src/components/Navigation/NavigationLogo.tsx:64` — `aria-label="EPAM AI/Run Codemie logo"` (already accessible; the ticket's element name is a red herring, per task_context).

### Architecture and Layers Affected

- Single layer: presentational React component (`src/components/Navigation/`). No service, store, or routing changes needed — the state (`navigationExpanded`) already drives conditional rendering in the component; the fix only adds a state-dependent attribute.
- Expected change surface: 1 source file (`NavigationExpandButton.tsx`) + 1 test file (`__tests__/NavigationExpandButton.test.tsx`).

### Integration Points

- valtio `useSnapshot(appInfoStore)` — already wired in the component; no new integration.
- react-tooltip via `data-tooltip-*` attributes — coexists with `aria-label`; no conflict, but note the existing tooltip string is "Expand Menu" while the ticket mandates aria-label "Show Menu".

### Patterns and Conventions

- **Icon-only button aria-label pattern** is well established in the same directory (111 files codebase-wide use `aria-label`):
  - `NavigationProfile.tsx:184` — `aria-label="User profile"`
  - `NavigationPinnedSection/PinnedRow.tsx:67` — `` aria-label={`Unpin ${item.name}`} ``
  - `NavigationPinnedSection/OverflowButton.tsx:38` — `` aria-label={`Show ${count} more assistants`} ``
- **Project a11y guide**: `.ai-run/guides/patterns/accessibility-patterns.md` — checklist item "Icon-only buttons have `aria-label`" and the Icon Button Pattern section: label on the button, `aria-hidden='true'` on the decorative SVG. Guide also notes that with visible text, an aria-label is "unnecessary" — but the ticket explicitly requests a state-dependent aria-label in both states, which is also valid (aria-label overrides text content; keeping label text identical to visible text "Hide Menu" satisfies WCAG 2.5.3 label-in-name).
- **Precedent fix**: commit `5cde2ab17` (EPMCDME-8433, pinned-chat indicator) — same class of change: sr-only span + `aria-hidden="true"` on decorative SVG + testing-library `getByRole('button', { name: /.../i })` assertions, with run artifacts under `docs/superpowers/tasks/`. Its code review dismissed i18n concerns with "main app is not localized".
- Note: the SVG test mock pattern (`vi.mock` returning `<svg data-testid=... {...props} />`) passes props through in this test file, unlike the ChatListItem mock that swallowed props — `aria-hidden` on the icon would be assertable here if added.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/` exists with frontend-specific content (despite AGENTS.md describing backend guides — the guide tree is UI-oriented: `components/`, `styling/`, `patterns/`, `testing/`).
- Directly relevant: `.ai-run/guides/patterns/accessibility-patterns.md` (WCAG 2.1 AA target, icon-button aria-label pattern, decorative SVG `aria-hidden`).
- Testing: `.ai-run/guides/testing/testing-patterns.md`, `qa-strategy.md`, `qa-health.md`.
- Quality gates: `.ai-run/guides/quality-gates.md`.

### Architectural Decisions

- Prior code-review artifact (`docs/superpowers/tasks/2026-07-20-pinned-chat-accessible-label/code-review-final.json`) records the decision that **i18n is out of scope** for a11y label strings ("main app is not localized") and that hardcoded English UI strings are the norm.

### Derived Conventions

- Hardcoded English strings for UI labels (`'Hide Menu'`, `'Expand Menu'`, `'User profile'`, etc.) — consistent across Navigation components.
- Accessible-name tests use `screen.getByRole('button', { name: /.../i })` (see `ChatListItem.test.tsx:114`), with companion negative tests recommended by the project's own review standards (CR-002 in the 8433 review).

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/Navigation/__tests__/NavigationExpandButton.test.tsx` — 15 tests covering: render, button role, `type="button"`, icon render/rotation, onClick, "Hide Menu" text presence/absence per state, tooltip attribute per state, and rerender transitions. **Zero accessible-name assertions** for the collapsed state.
- Tests mock valtio (`useSnapshot` returns a mutable `mockAppInfoStore`), `@/store/appInfo`, and the SVG import.

### Testing Framework and Patterns

- Vitest 1.6.1 + @testing-library/react. Scripts: `npm run test` (`vitest run`), `test:unit` (`--project unit`), `test:integration`, `test:coverage`. Tests co-located in `__tests__/` directories.
- State-per-test via `mockAppInfoStore.navigationExpanded = <bool>` in each test, reset in `beforeEach`.
- `jest-axe` is referenced in the a11y guide's Automated Testing section (verify availability in devDependencies before relying on it).

### Coverage Gaps

- No test asserts the button's accessible name in the collapsed state (the bug itself).
- No test asserts `getByRole('button', { name: ... })` in either state.
- Several existing tests will interact with the fix: `getByRole('button')` queries (lines 63, 68, 79, 113, 120, 159) remain valid; the "renders empty text when collapsed" test (line 90) stays valid since aria-label adds no text node. **However**, if the implementer keeps visible text AND adds aria-label="Hide Menu" when expanded, `getByText('Hide Menu')` tests (lines 87, 131, 137) still pass — aria-label does not remove the text node. No existing test conflicts expected.

---

## 5. Configuration and Environment

### Environment Variables

- None relevant. The only adjacent persistence is `NAVIGATION_EXPANDED_KEY` in localStorage (managed by `appInfoStore`), untouched by this fix.

### Configuration Files

- None relevant. `vite.config.ts` is currently modified in the working tree (pre-existing, unrelated) — prior task plans explicitly excluded it; same exclusion applies here.

### Feature Flags and Deployment Concerns

- No feature flags gate the sidebar toggle. No i18n framework in `package.json` (no i18next/react-i18next) — label strings are hardcoded English by convention; no localization work required.

---

## 6. Risk Indicators

- **Wording divergence**: existing tooltip says "Expand Menu" (`NavigationExpandButton.tsx:39`) but the ticket mandates aria-label "Show Menu" for the collapsed state. Result: sighted-tooltip text and screen-reader name will differ ("Expand Menu" vs "Show Menu"). Low severity, but the plan should either flag it or confirm the ticket wording is intentional; changing the tooltip is out of the stated "labelling only" scope.
- **aria-label vs visible text (WCAG 2.5.3)**: adding `aria-label="Hide Menu"` in the expanded state is safe only because it exactly matches the visible text "Hide Menu". Any future divergence would break label-in-name; the test should pin the exact strings.
- **Guide nuance**: `.ai-run/guides/patterns/accessibility-patterns.md` says aria-label is "unnecessary" when visible text exists — the state-dependent-always-labeled approach mandated by the ticket is a deliberate, valid deviation (simpler than conditionally attaching the attribute). Not a conflict, but worth one sentence in the plan.
- **Decorative SVG**: `SidebarSvg` lacks `aria-hidden="true"`. The guide checklist requires it for decorative SVGs. Once aria-label is set, the SVG is redundant to AT. Optional one-attribute addition; the SVG mock in this test file passes props through, so it is testable — but strictly it is scope creep beyond "labelling only".
- **codegraph unavailable** — research done via filesystem fallback; findings are grep/read-based but the surface is small and fully read.
- No test coverage today for the exact regression being fixed (collapsed-state accessible name) — the fix must add it or the bug can silently return.

---

## 7. Summary for Complexity Assessment

This is a minimal, single-component accessibility fix in the presentational layer only. The target is `src/components/Navigation/NavigationExpandButton.tsx` (53 lines), a leaf component with one prop and one valtio-store read (`navigationExpanded`). The fix is one attribute: `aria-label={navigationExpanded ? 'Hide Menu' : 'Show Menu'}` on the existing `<button>`. Expected change surface: 2 files — the component and its co-located test file `__tests__/NavigationExpandButton.test.tsx` (15 existing tests, none of which conflict with the change). No state, routing, API, or config changes; no i18n framework exists so labels stay hardcoded English per convention.

Technical novelty is zero: the identical pattern (state/context-dependent `aria-label` on icon-only buttons) already exists in sibling files (`NavigationProfile.tsx`, `PinnedRow.tsx`, `OverflowButton.tsx`) and was exercised end-to-end two days ago in the EPMCDME-8433 pinned-chat fix (commit `5cde2ab17`), which also established the test idiom (`getByRole('button', { name: /.../i })` plus a negative companion test) and the ruling that i18n is out of scope. The project has an explicit a11y guide (`.ai-run/guides/patterns/accessibility-patterns.md`) endorsing exactly this pattern.

Test posture is good: the component has a thorough vitest + testing-library suite with a working valtio mock harness; the only gap is the accessible-name assertion for the collapsed state, which is precisely what the fix must add (one positive assertion per state, per the project's own review standards). Risk factors are cosmetic-level: a tooltip/aria-label wording divergence ("Expand Menu" vs "Show Menu") that should be acknowledged in the plan, and an optional `aria-hidden="true"` on the decorative SVG that is guide-recommended but outside the strict "labelling only" scope. This task sits at the low end of the complexity scale.
