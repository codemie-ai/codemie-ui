# Technical Research

**Task**: navigation sidebar accessibility aria-hidden decorative icons
**Generated**: 2026-09-06T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8455 Bug: Decorative images inside interactive elements in the collapsed Navigation Sidebar are not hidden from assistive technologies. They can be focused with Arrow keys and are announced by NVDA as 'graphic'. Fix: add aria-hidden='true' or alt='' to decorative icons inside the collapsed Navigation Sidebar interactive elements.

---

## 2. Codebase Findings

### Existing Implementations

Three components in `src/components/Navigation/` are missing `aria-hidden="true"` on their decorative SVG icons; a fourth is partially affected:

- `src/components/Navigation/NavigationSection/NavigationLink.tsx` — renders `<NavLink>` with an SVG icon wrapped in a `<div>` and a `<span>` label. The label is hidden with `opacity-0` (not removed from DOM) when the sidebar is collapsed, making the icon purely decorative. The icon `<div>` wrapper lacks `aria-hidden="true"`.
- `src/components/Navigation/NavigationExpandButton.tsx` — collapse/expand toggle `<button aria-label="Hide Menu" | "Show Menu">` with `<SidebarSvg>` inside; button has an explicit `aria-label` so the SVG is decorative, but `aria-hidden="true"` is absent from the SVG.
- `src/components/Navigation/NavigationLogo.tsx` — `<a aria-label="EPAM AI/Run Codemie logo">` renders `<LogoFullDarkSvg>` or `<LogoFullLightSvg>` without `aria-hidden="true"`; custom logo path uses `<img alt="EPAM AI/Run Codemie logo">` which gives the image an accessible name instead of marking it decorative.
- `src/components/NavigationMore/NavigationMore.tsx` — trigger `<button>` renders `<NavigationMoreSvg />` with no `aria-hidden`; menu item icons are already wrapped in `<span aria-hidden="true">`, so only the trigger icon is affected.

Components already correct (reference):
- `src/components/Navigation/NavigationProfile.tsx` — popup SVGs have `aria-hidden="true"` ✓
- `src/components/Navigation/NavigationAssistants.tsx` — avatar `aria-hidden="true"` ✓
- `src/components/Navigation/NavigationPinnedSection/PinnedRow.tsx` — `<DeleteSvg aria-hidden="true">` and `<img alt="">` ✓
- `src/components/Navigation/NavigationPinnedSection/PinnedAssistantsOverflowDropdown.tsx` — `<DeleteSvg aria-hidden="true">` ✓

### Architecture and Layers Affected

- **Component layer** (`src/components/Navigation/`): all affected files live here. No store, routing, API, or styling changes needed.
- **SVG assets** (`src/assets/icons/`): icons are imported as `?react` components and rendered inline. No changes to the asset files themselves — `aria-hidden` is passed as a prop at the call site.

### Integration Points

- `appInfoStore.navigationExpanded` (Valtio) — drives collapsed vs expanded rendering; not changed.
- `react-router` `NavLink`/`useMatch` in `NavigationLink` — not changed.
- SVG components receive spread props via `?react` plugin, so `aria-hidden="true"` passed as a JSX prop is forwarded to the rendered `<svg>` element automatically.

### Patterns and Conventions

- Established pattern (NavigationProfile, PinnedRow, PinnedAssistantsOverflowDropdown, NavigationMore menu items): decorative SVGs inside buttons/links that already carry an `aria-label` or `aria-labelledby` receive `aria-hidden="true"`.
- `opacity-0` (not `display:none` or `visibility:hidden`) is used to hide text labels when collapsed, meaning text stays in the AT tree and provides the interactive element's accessible name. The SVG icon is therefore redundant and decorative.
- For `<img>` elements: `alt=""` (not `aria-hidden`) is the correct pattern; `Avatar` already uses this when `withTooltip=false`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — directly relevant; mandates `aria-hidden='true'` on decorative SVGs; provides the Icon Button Pattern showing the icon hidden inside a labeled button; includes pre-delivery checklist item "Decorative SVGs: aria-hidden='true'".
- `.ai-run/guides/components/component-patterns.md` — secondary reference for component construction patterns.

### Architectural Decisions

- The codebase already applies `aria-hidden="true"` consistently to decorative SVGs inside labeled interactive elements (see NavigationProfile, PinnedRow, PinnedAssistantsOverflowDropdown). The three sidebar components that are missing it are inconsistent with this existing decision.
- `opacity-0` is intentionally chosen over `display:none` / `sr-only` to keep label text in the AT tree as the accessible name source.

### Derived Conventions

- All SVG icons that are siblings of a visible text label OR inside a button/link that already has an explicit `aria-label`/`aria-labelledby` must carry `aria-hidden="true"`.
- `<img>` elements use `alt=""` (decorative) rather than `aria-hidden`; Avatar already satisfies this.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/Navigation/NavigationSection/__tests__/NavigationLink.test.tsx` — icon rendering, tooltip attributes, active-route styling, label display, link href.
- `src/components/Navigation/__tests__/NavigationExpandButton.test.tsx` — `aria-label` assertions, icon rotation, tooltip.
- `src/components/Navigation/__tests__/NavigationLogo.test.tsx` — tooltip, theme switching, click behavior.
- `src/components/Navigation/__tests__/Navigation.test.tsx` — integration smoke test.
- `src/components/Navigation/NavigationPinnedSection/__tests__/NavigationPinnedSection.test.tsx` — collapsed/expanded rendering.
- `src/components/Navigation/__tests__/NavigationProfile.test.tsx` — `aria-hidden` on `#app` during panel lifecycle.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library; `unit` project (`*.test.tsx`).
- `vi.hoisted` + `vi.mock('@/store/appInfo', ...)` for store mocks.
- SVG mocks: `vi.mock('@/assets/icons/sidebar-alt.svg?react', () => ({ default: (props) => <svg data-testid="..." {...props} /> }))` — props are spread, so `aria-hidden` passed at the call site will appear on the rendered `<svg>`.
- Assertions: `toHaveAttribute('aria-hidden', 'true')` on the icon element obtained via `screen.getByTestId`.

### Coverage Gaps

- `NavigationLink.test.tsx` — no assertion on `aria-hidden="true"` on the icon wrapper `<div>`.
- `NavigationExpandButton.test.tsx` — no assertion on `aria-hidden="true"` on the `SidebarSvg` element.
- `NavigationLogo.test.tsx` — no assertion on `aria-hidden="true"` on the rendered SVG logo elements.
- `NavigationMore` trigger icon — no dedicated `aria-hidden` test.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this task.

### Configuration Files

None relevant to this task.

### Feature Flags and Deployment Concerns

None. The change is a pure HTML attribute addition; no feature flags, no deployment config changes.

---

## 6. Risk Indicators

- **Scope creep risk (low)**: `NavigationLogo.tsx` custom logo path uses `<img alt="EPAM AI/Run Codemie logo">` which gives the image an accessible name rather than marking it decorative — this is a separate issue from the decorative SVG fix and should be handled carefully to avoid breaking the logo's accessible name.
- **`opacity-0` label dependency**: accessible names for `NavigationLink` items come from the `opacity-0` `<span>` children. If any future change removes those spans from the DOM, the `aria-hidden` icon pattern would break the accessible name. This is an existing structural choice, not introduced by this fix.
- **SVG prop forwarding assumption**: `aria-hidden` is passed as a JSX prop and relies on the `?react` Vite plugin forwarding props to the `<svg>` root. This is already proven by the existing correct implementations (NavigationProfile, PinnedRow) — not a new risk.
- **No existing `aria-hidden` test coverage** for the three affected components — tests must be added to prevent regression.
- **`NavigationMore` trigger icon** may not appear in the collapsed sidebar view per the bug report scope; should confirm during implementation whether it is part of the collapsed state.

---

## 7. Summary for Complexity Assessment

This is a focused, low-risk accessibility fix touching exactly 3–4 files in the `src/components/Navigation/` component layer. No state, routing, API, or build changes are required. The fix is a well-established pattern already applied consistently in sibling components: add `aria-hidden="true"` to decorative SVG icons inside interactive elements that already carry an explicit accessible name.

The main technical work is adding `aria-hidden="true"` (or the equivalent prop) to: the icon `<div>` in `NavigationLink`, the `<SidebarSvg>` in `NavigationExpandButton`, and the logo SVGs in `NavigationLogo`. The `NavigationMore` trigger icon is a candidate for the same fix but needs confirmation of scope. Each change is a one-line addition at the JSX call site; SVG components receive spread props via Vite's `?react` plugin, so no asset files need modification.

Test coverage must be added for each changed component (3–4 new test cases using `toHaveAttribute('aria-hidden', 'true')`). Existing SVG mocks in the test files already spread props, so test assertions will work without changes to mock configuration. The accessibility guide at `.ai-run/guides/patterns/accessibility-patterns.md` explicitly prescribes this exact fix, grounding the approach in project documentation.
