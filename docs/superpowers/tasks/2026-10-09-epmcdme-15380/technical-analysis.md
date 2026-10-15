# Technical Research

**Task**: navigation sidebar layout styling
**Generated**: 2026-10-09
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-15380 — Left navigation menu is not vertically scrollable, blocking access to lower menu items.

Description: When the available viewport height is insufficient for the global CodeMie left navigation menu, the navigation panel does not provide vertical scrolling. As a result, items positioned below the visible portion of the sidebar cannot be reached. Depending on viewport size and menu content, users may be unable to access lower items such as Help, Profile, and Hide Menu. Reducing browser zoom is a workaround but should not be required.

Acceptance criteria:
- The global left navigation panel becomes vertically scrollable when its content exceeds the available viewport height.
- Every navigation item remains accessible at supported screen heights and default browser zoom, without requiring a zoom adjustment.
- The scrollbar is available through mouse, touchpad, and keyboard navigation where applicable.
- Menu items remain selectable and visually usable while the sidebar is scrolled.
- The fix does not regress sidebar expansion, collapse, resizing, or main-content scrolling.
- The behavior is verified in supported browsers and on representative limited-height viewport sizes, including Google Chrome 153.0.8010.53.
- The attached screenshot is available as supporting evidence (not accessible to you; assume standard limited-height viewport reproduction).

---

## 2. Codebase Findings

### Existing Implementations

The ticket's "global left navigation" is `src/components/Navigation/Navigation.tsx` — distinct from
the per-page `src/components/Sidebar/Sidebar.tsx` + `src/components/SidebarNavigation/SidebarNavigation.tsx`
(used by `Layout.tsx` for in-page tab rails such as Settings). The global nav is rendered once, in
`src/App.tsx:84`, as a sibling of the routed content:

```
<div className="min-h-0 grow flex max-lg:flex-col bg-surface-base-sidebar">
  ...
  <Navigation />
  <div data-app-content ...>{user && <Outlet />}</div>
</div>
```

`Navigation.tsx` renders a `<header id="navigation-menu">` that is `flex flex-col h-full ... px-2 pt-6
pb-4` (desktop) with no `overflow-y-*` anywhere on itself. Internal structure, top to bottom:

- Fixed-size top block (not scrollable, not meant to shrink): `NavigationLogo`, `NavigationSection`
  for `upperItems` (Chats, Assistants, Skills, Workflows, Applications), a divider, `NavigationSection`
  for `upperSecondaryItems` (Integrations, Data Sources, AI Katas, Schedulers, Analytics), another
  divider, `NavigationSection` for `favoritesItems`.
- A `flex-1 min-h-0 flex flex-col gap-3` block holding:
  - `<nav class="flex flex-col flex-1 min-h-0 gap-2">` containing `NavigationPinnedSection` inside a
    `flex-1 min-h-0 overflow-hidden` wrapper, a divider, then `NavigationSection isBottomSection`
    for `lowerItems` (currently just "Help").
  - `NavigationProfile` (avatar + "Profile" label, opens an `OverlayPanel`).
  - `NavigationExpandButton` (the "Hide Menu" / "Show Menu" toggle named in the ticket).

No ancestor from `#navigation-menu` down to the pinned-section wrapper has `overflow-y-auto`; the
only `overflow-hidden` is on the pinned-assistants list, which clips rather than scrolls. When the
combined height of logo + 3 sections + pinned list + Help + Profile + expand button exceeds the
viewport, the excess is pushed outside the `<header>`'s `h-full` box with nothing to scroll it back
into view — exactly the reported symptom (Help/Profile/Hide Menu unreachable).

Related files read in full: `NavigationProfile.tsx` (profile popup, focus trap, Escape handling),
`NavigationExpandButton.tsx` (the toggle button, `aria-label="Hide Menu"/"Show Menu"`),
`NavigationPinnedSection/NavigationPinnedSection.tsx` (pinned assistants list, already has its own
clipping logic via `computeCollapsedBubbles`/`computeExpandedBubbles` — not vertical page scroll).

### Architecture and Layers Affected

- **Component layer only** — `src/components/Navigation/` (presentational layout + Tailwind
  classes). No store, API, or routing change is implicated: `appInfoStore.navigationExpanded`,
  `useNavigationExpanded()`, and the mobile overlay path (`MOBILE_OVERLAY_CLASS_NAME`,
  `isMobileLayout`) are read, not changed, by this bug.
- Mobile layout already renders `Navigation` with `overflow-y-auto` as part of
  `MOBILE_OVERLAY_CLASS_NAME` (see `className` branch for `isMobileLayout` in `Navigation.tsx:206`) —
  the gap is specifically in the **desktop** branch (`isMobileLayout ? [...] : [...]`, the `else`
  arm starting `'h-full relative px-2 pt-6 pb-4 ...'`).

### Integration Points

- `src/App.tsx` — parent flex container (`min-h-0 grow flex`) that gives `Navigation` its height
  budget; any fix must keep working inside this container without pushing `data-app-content` or
  breaking `max-lg:flex-col` (mobile stacks nav above content).
- `appInfoStore` (`src/store/appInfo.ts`) — `navigationExpanded`, `sidebarExpanded`,
  `mobileNavigationOpen` toggles consumed via `useSnapshot`/`subscribe`; width/visibility, not
  height, so unaffected by a scroll fix but must not regress (ties to "does not regress sidebar
  expansion, collapse" AC).
- `NavigationExpandButton` dispatches `appInfoStore.toggleNavigationExpanded()` — must stay reachable
  by scroll per the ticket's named example.
- `react-tooltip` (`data-tooltip-id="react-tooltip"`) is attached to several nav items when
  collapsed — a scroll container must not clip or mis-position these tooltips.

### Patterns and Conventions

- `overflow-y-auto` is the established scroll idiom elsewhere in this codebase (`Sidebar.tsx:112`,
  `PageLayout.tsx`, popups) — no custom scrollbar component exists; native overflow is the
  convention, satisfying "mouse, touchpad, and keyboard" scrolling for free since no custom
  JS-driven scroll handling is used anywhere in `src/components/Navigation/`.
- `cn()` (`src/utils/utils.ts`) is the project's `clsx`-style class-merge helper used throughout
  `Navigation.tsx` for conditional Tailwind classes — any new classes should go through it.
- `min-h-0` + `flex-1` is already used repeatedly in this file to let flex children shrink instead
  of overflowing their flex parent (standard flexbox-scroll prerequisite); the fix is likely a
  continuation of this existing idiom rather than a new pattern.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/styling/styling-guide.md` — Tailwind conventions (not read in full; present and
  catalogued in `AGENTS.md` as P0 for styling tasks).
- `.ai-run/guides/components/component-patterns.md` — component construction conventions, P0 per
  `AGENTS.md`'s routing table for "building or placing UI components".
- `.ai-run/guides/patterns/accessibility-patterns.md` — listed as P0 for accessibility-flavored
  tasks (keyboard scroll reachability touches this).

No guide specifically documents sidebar/navigation scroll behavior; `architecture.md` and
`routing-patterns.md` cover page composition, not this component's internal layout.

### Architectural Decisions

No ADRs or inline `NOTE:`/`DECISION:` markers found in `src/components/Navigation/*.tsx` concerning
height or overflow. The one documented, deliberate behavior is the comment in `NavigationProfile.tsx`
(lines 159–162) explaining the `onExit`/`onHide` double-cleanup for the profile popup's focus trap —
unrelated to this ticket but notes that this component already carries careful a11y-timing logic
that a layout change must not disturb.

### Derived Conventions

- Mobile already solves "more items than viewport" with `overflow-y-auto` on the full-screen overlay
  variant of the same `<header>` — the desktop fix is plausibly the same primitive applied to the
  desktop branch, scoped to the region that needs it (consistent with the existing `isMobileLayout
  ? [...] : [...]` branching already in the file).

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/Navigation/__tests__/Navigation.test.tsx` — renders `<Navigation />` with mocked
  `appInfoStore`/`useVueRouter`/`useTheme`; asserts width classes (`w-navbar`, `w-navbar-expanded`),
  theme classes, section presence by role/text (`Help`, `Schedulers`, `Analytics`, `AI Katas`), and
  mobile open/close/Escape behavior. No assertion anywhere on overflow/scroll classes or on
  `document.getElementById('navigation-menu')` scroll metrics.
- `src/components/Navigation/__tests__/NavigationProfile.test.tsx` and
  `__tests__/NavigationExpandButton.test.tsx` — unit tests for those two child components in
  isolation; they do not render inside the real `Navigation` height context, so they would not catch
  a parent-level overflow regression.
- `src/components/Navigation/__tests__/MobileTopBar.test.tsx` — separate top-bar component for
  mobile, unrelated to the scroll fix.

### Testing Framework and Patterns

Vitest + React Testing Library (per `AGENTS.md` Stack section — "unit" and "integration" Vitest
projects). `Navigation.test.tsx` follows the repo's `vi.hoisted` mock pattern for stores and router,
`BrowserRouter` wrapper via a local `renderWithRouter` helper, and asserts via `screen.getByRole` /
`toHaveClass`.

### Coverage Gaps

- No test exercises a constrained-height container around `<Navigation />` to verify its lower
  items (Help, Profile button, Hide Menu button) remain reachable — jsdom does not lay out real
  pixel heights/overflow by default, so a height-constrained scroll assertion would need either a
  class-presence check (e.g. asserting `overflow-y-auto` on the correct element) or a
  `getBoundingClientRect`/scroll-property mock, following patterns already used for other
  non-layout assertions in this suite.
- No existing test asserts keyboard scroll reachability (e.g. `Tab` reaching the Hide Menu button
  when content overflows) — the accessibility-flavored acceptance criterion ("keyboard navigation
  where applicable") has no current regression guard.

---

## 5. Configuration and Environment

### Environment Variables

None specific to navigation layout. `NavigationProfile.tsx` reads `window._env_.VITE_APP_VERSION`
for an unrelated display concern (UI version string in the profile popup).

### Configuration Files

- `tailwind.config.ts` — defines custom width tokens referenced in `Navigation.tsx`
  (`w-navbar`, `w-navbar-expanded`, `min-w-navbar-expanded`); any new height/overflow utility class
  would be a plain Tailwind core utility (`overflow-y-auto`, `min-h-0`), not a custom token, matching
  existing usage.
- No `config.js` / `window._env_` entries govern navigation layout.

### Feature Flags and Deployment Concerns

No feature flag gates navigation scrollability. Several feature flags (`isSkillsEnabled`,
`isSchedulersViewEnabled`, `isDataSourcesSurfaceEnabled`, `isPinnedAssistantsEnabled`,
`isFavoritesEnabled`) control *how many* items render in the nav, which is precisely why its content
height is variable and can exceed short viewports — this is background for why the bug is
viewport/content-dependent, not a flag the fix needs to touch.

---

## 6. Risk Indicators

- Speculative: the fix likely needs to add a scroll container somewhere between `#navigation-menu`
  and the fixed-height items below it (logo through favorites) so the whole nav scrolls as one unit,
  or make the `flex-1 min-h-0` region itself scrollable while keeping Profile/Expand pinned — which
  of these two shapes is chosen affects whether Profile and Hide Menu scroll away or stay fixed at
  the bottom; the ticket's AC ("every navigation item remains accessible... while scrolled, items
  remain selectable") does not state which. This is a design decision for spec/plan, not something
  this research can resolve from the code alone.
- `NavigationPinnedSection`'s own `overflow-hidden` + bubble-collapsing logic
  (`computeCollapsedBubbles`/`computeExpandedBubbles`) already manages its internal height budget;
  a parent-level scroll fix must not conflict with or double-handle this nested, pre-existing
  clipping behavior.
- `NavigationProfile`'s `OverlayPanel` positions itself relative to its trigger button
  (`buttonRef`) and repositions on `window.resize` (lines 57–71) but not on container scroll — if the
  fix makes the profile button itself scroll out of its original position without a scroll-aware
  reposition, the popup could render detached from its trigger. Needs verification once a scroll
  container is chosen.
- Tooltips (`react-tooltip`, used on `NavigationExpandButton` and others when collapsed) may clip or
  mis-anchor inside a new `overflow` boundary — Tailwind's `overflow-y-auto` combined with
  `overflow-x-hidden` (already present on `Sidebar.tsx`'s pattern, not yet on `Navigation.tsx`) is
  the usual mitigation; worth checking visually once implemented.
- `Navigation.test.tsx` and the sibling child-component tests give no scroll-specific regression
  net today — any fix should add at least one assertion (e.g. the scroll-container element exists
  and carries the expected overflow class) so the fix doesn't silently regress.
- No guide documents this component's layout decisions, so there is no "intended" layering to defer
  to beyond what the code already does — this is a from-scratch layout judgment call, not a
  deviation from a documented design.

---

## 7. Summary for Complexity Assessment

This is a single-component, presentational-layer fix confined to
`src/components/Navigation/Navigation.tsx` (and possibly its direct Tailwind class wiring), with no
store, API, or routing changes. The root cause is clear from reading the code: the desktop branch of
the global nav `<header>` has no `overflow-y` anywhere along its height chain, while the mobile
branch already solves the identical problem with `overflow-y-auto` on the same element — the fix is
plausibly a small, well-precedented CSS change rather than new logic, which argues for a *small*
size band.

The main source of complexity is not implementation difficulty but verification breadth: the nav
composes several independently-flagged sections (Skills, Schedulers, Data Sources, Favorites,
pinned assistants) whose combined height is exactly what varies per account/config, so the fix must
be checked against several content-length states, not just one. There are also two interactive
elements nested in the lower region (`NavigationProfile`'s `OverlayPanel`, with resize-aware
repositioning, and tooltip-bearing buttons) whose positioning behavior inside a new scroll container
is not proven by the existing code and has no current test coverage.

Test coverage posture: `Navigation.test.tsx` exists and is a reasonable place to extend, but it
currently asserts no overflow/scroll classes and jsdom does not model real layout heights, so any
new regression check will likely be class-presence-based rather than a true pixel-overflow
simulation — a known limitation to flag rather than a blocker.

---

## 8. External References

None named by the task. The ticket text names no external file, path, directory, or URL as a source
of truth (it references an attached screenshot as supporting evidence only, which is explicitly
stated as not accessible to this research).
