# Technical Research

**Task**: accessibility skip-link layout navigation main-landmark (EPMCDME-8581)
**Generated**: 2026-08-14
**Research path**: filesystem (codegraph MCP not available — tool-not-found on first call)

---

## 1. Original Context

Jira ticket EPMCDME-8581 (Bug, Minor, labels: Frontend, Global, accessibility_issue, codemie_contribute).

Summary: [2.4.1] There is no mechanism to bypass repetitive blocks of content (no "Skip to main content" link)

Steps to reproduce:
1. Open https://codemie.lab.epam.com/#/.
2. Using the Tab key, try to navigate to the "Skip to main content" link at the start of the web page.

Actual result: The "Skip to main content" link is not provided.
Expected result: The mechanism to bypass repetitive blocks of content (the "Skip to main content" link) should be provided as the first interactive element on the web page. This is a WCAG 2.4.1 "Bypass Blocks" compliance issue.

Notes: Reproducible on all pages of the app.

Repo: /Users/Leonid_Kovalov/Developer/codemie-dev/codemie-ui (React 19 + Vite + TypeScript, react-router 7, Tailwind CSS, Vitest + RTL for tests).

---

## 2. Codebase Findings

### Existing Implementations

No skip-link implementation exists anywhere in `src/` today. Grep for "skip to main", "skip-link", "skip-nav", "bypass", "#main-content" across the repo returns no relevant hits (only an unrelated `#chat-main-content` resizable-panel id in `src/pages/chat/ChatPage.tsx:117` and `src/assets/stylesheets/main.scss:426,433`).

Key files and their current state (all confirmed by direct read):

- `src/main.tsx:40-42` — `ReactDOM.createRoot(root).render(<RouterProvider router={router} />)`. `RouterProvider` is imported from `react-router/dom`. Before mounting, `src/utils/redirectHashRoutes.ts` runs once (`main.tsx:32`) to rewrite legacy `#/...` URLs to real paths and reload — this explains the ticket's `#/` URL; the app's actual routing is path-based, not hash-based.
- `src/router.tsx:16,710` — `createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })`. **This contradicts `.ai-run/guides/architecture/routing-patterns.md`, which describes hash-based routing (`createHashRouter`) — the guide is stale on this specific point.**
- `src/router.tsx:670-708` — exactly 4 top-level routes:
  - `root` (`path: '/'`, `Component: App`, `ErrorBoundary: ErrorPage`) — wraps ~90 child routes rendered via `<Outlet/>`.
  - `login-success` (`path: '/login-success'`, `Component: LoginSuccessPage`) — top-level sibling, NOT a child of `root`.
  - `sign-in` (`path: '/auth/sign-in'`, `Component: SignInPage`) — top-level sibling.
  - `sign-up` (`path: '/auth/sign-up'`, `Component: SignUpPage`) — top-level sibling.
- `src/App.tsx:63-92` (confirmed, quoted):
  ```tsx
  <PrimeReactProvider value={primeReactPtOptions}>
    <OnboardingProvider>
      <UnsavedChangesProvider>
        <Banner />
        <ToastContainer />
        {!user || !isConfigFetched ? (
          <Spinner className="w-20 h-20" />
        ) : (
          <div className="min-h-0 grow flex bg-surface-base-sidebar">
            {showGradient && <Gradient />}
            <Navigation />
            <div className="z-0 grow min-w-0">{user && <Outlet />}</div>
          </div>
        )}
        {user && (<><AutoPopupManager/><FloatingKataWindow/><UnsavedChangesPopup/><HelpPanel/></>)}
        <SessionExpiredPopup />
      </UnsavedChangesProvider>
    </OnboardingProvider>
  </PrimeReactProvider>
  ```
  Confirms the original briefing: `App.tsx` renders `Navigation` immediately before the `<Outlet/>` wrapper div, and there is currently no skip link, no landmark/focus-management wrapper, and no `role="main"` in this file.
  **New finding beyond the briefing**: `<Banner />` (line 67) is rendered *before* `Navigation`, unconditionally, ahead of the `user`/`isConfigFetched` gate. `Banner.tsx` (`src/components/appLevel/Banner.tsx:32-88`) wraps PrimeReact `Messages` with `closable: true`; when a banner message is configured and not yet dismissed it renders a focusable `<Link>` (line 51) and/or a dismiss button — making `Banner`'s content the true first focusable element ahead of `Navigation` in that state. A skip link inserted only ahead of `Navigation` (but after `Banner`) would fail the "first interactive element" requirement whenever a banner is active. **The skip link must be the literal first child in `App.tsx`'s render output, ahead of `<Banner/>`.**
- `src/components/Layouts/Layout/PageLayout.tsx:66` (confirmed, quoted):
  ```tsx
  <main
    className="flex w-full h-full min-w-0 bg-surface-base-primary bg-contain bg-no-repeat bg-bottom"
    ...
  >
  ```
  Confirms the briefing exactly: this `<main>` has no `id` attribute and no `role` override. It is the **only** production `<main>` element in the entire app (`grep -rn "<main" src --include="*.tsx"` returns just this one production hit plus a `__tests__` mock in `src/pages/terms/__tests__/TermsAndConditionsPage.test.tsx:44` that is not rendered in production). Adding `id="main-content"` here is a one-line change with no duplicate-landmark risk.
  `PageLayout` is consumed by ~40+ page files directly (default export from `src/components/Layouts/Layout/index.ts:20`) plus indirectly via `src/components/Layouts/Layout/Layout.tsx` (Sidebar/tabs wrapper, 23 consumers) which itself delegates to `PageLayout` and does not render its own `<main>`.

### Architecture and Layers Affected

- **App shell layer** (`src/App.tsx`) — needs the skip-link anchor inserted as the first JSX child.
- **Layout layer** (`src/components/Layouts/Layout/PageLayout.tsx`) — needs `id="main-content"` added to the existing `<main>`.
- **Standalone/auth layout layer** (`src/components/Layouts/StandaloneLayout/StandaloneLayout.tsx`) — **out-of-scope-but-flagged**: renders no `<main>` at all (root is a plain `<div className="relative min-h-screen ...">`, line 64ish) and is not wrapped by `App.tsx`. Used by `LoginSuccessPage`, `SignInPage`, `SignUpPage`, `NotFoundError`, `RuntimeError`, and the Keycloak login `Template.tsx`. A fix scoped only to `App.tsx`/`PageLayout.tsx` will not appear on these routes.
- **Navigation layer** (`src/components/Navigation/Navigation.tsx`) — root element is `<header>` (not itself a landmark issue), first focusable child today is `NavigationLogo`'s `<a href="#" aria-label="EPAM AI/Run Codemie logo" ...>` (`src/components/Navigation/NavigationLogo.tsx:62-73`). This is the current "first Tab stop" the skip link needs to precede.

### Integration Points

- `App.tsx` is imported in exactly one place: `src/router.tsx:103` (`Component: App` for the `root` route). No other production consumer, so the App-level change is low blast-radius.
- `PageLayout.tsx` is imported by ~40 page files (directly) plus 23 more via `Layout.tsx` — all inherit the fix automatically once `id="main-content"` is added in one place; no per-page changes needed for pages using the authenticated shell.
- No i18n framework in this repo (confirmed: no `react-i18next`/`i18next`/`next-intl`, no `src/locales`/`src/i18n` directories). The "Skip to main content" string should be a hardcoded literal, consistent with existing `sr-only` label usage elsewhere (e.g. `src/components/NavigationMore/NavigationMore.tsx:180`).

### Patterns and Conventions

- Tailwind's `sr-only` utility is already used in 14+ files (e.g. `src/components/form/Switch/Switch.tsx:81`, `src/components/Navigation/NavigationAssistants.tsx:142`, `src/components/Announcement/Announcement.tsx:27`). `focus:not-sr-only` has zero existing usages — it will be a net-new (but Tailwind-native, no config change needed) pattern introduced specifically for this skip link.
- `tailwind.config.ts` has no `primary-500`/`primary` color token — the color palette uses `surface-*`, `border-*`, `text-*`, `blue-*` namespaced tokens (e.g. `border-accent` = `tailwind.config.ts:313`). The guide's example skip-link markup uses `focus:bg-primary-500`/`focus:text-white`, which does not map to a real token in this project and should be swapped for real tokens (e.g. `focus:bg-surface-specific-primary-button`, `focus:text-text-inverse`, or reuse the dominant `focus:outline-none focus-visible:ring-1 focus-visible:ring-border-accent` idiom seen in `src/components/Navigation/NavigationProfile.tsx:200,214` and `src/components/Navigation/NavigationPinnedSection/NavigationPinnedSection.tsx:260,281,316,333`).
- Established minimal-diff convention for this class of ticket (see Section 3) is: one small, surgical component/markup change, no broad refactors.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/patterns/accessibility-patterns.md` exists (292 lines) and is the authoritative pattern source for this task (per `AGENTS.md`, mapped as P0 for "Accessibility" tasks). Full list of guides present under `.ai-run/guides/`: `quality-gates.md`, `project.md`, `patterns/{modal,accessibility,state-management,form}-patterns.md`, `patterns/custom-hooks.md`, `development/*.md` (performance, constants, code-organization, refactoring, error-handling, workflow-editor, api-integration), `testing/{qa-strategy,qa-health,testing-patterns}.md`, `components/{component-patterns,component-organization,reusable-components}.md`, `architecture/{architecture,routing-patterns}.md`, `styling/{styling-guide,theme-management}.md`, `onboarding/flow-creation-guide.md`, `standards/git-workflow.md`.

### Architectural Decisions

Quoted verbatim from `.ai-run/guides/patterns/accessibility-patterns.md`, "Visually Hidden Text" section:
```tsx
<a href='#main-content'
  className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
             focus:bg-primary-500 focus:text-white focus:px-4 focus:py-2 focus:rounded'>
  Skip to main content
</a>
```
And from "Semantic HTML Quick Reference":
```
| Use | Instead of |
|-----|-----------|
| `<main id='main-content'>` | `<div className='main'>` |
```
This is the exact, project-sanctioned markup and target id convention — confirms the briefing precisely. Note: this appears once, inside "Screen Reader Patterns," not as its own dedicated "skip link" subsection, and is **not** listed in the guide's "Pre-Delivery Checklist" — i.e., documented but not currently enforced anywhere.

`docs/superpowers/tasks/` contains a continuous, adjacent-numbered series of prior accessibility-remediation tickets (EPMCDME-8417, 8420, 8460, 8558, 8582, and others dated 2026-07-16 through 2026-08-12) — strong evidence this is a planned WCAG audit sweep, not an isolated bug. The fully-read prior plan `docs/superpowers/plans/2026-07-16-epmcdme-8417-sidebar-toggle-a11y.md` establishes the convention for this ticket class: minimal surgical change to the affected component(s), test-first with a co-located `__tests__/*.test.tsx` mirroring an existing sibling test, then a single commit titled `EPMCDME-XXXX: Capital sentence` (plain style, **not** conventional-commit `feat(scope): ...` — a prior code review flagged conventional-commit style as a violation per `.ai-run/guides/standards/git-workflow.md`).

A task directory for this exact ticket already exists at `docs/superpowers/tasks/2026-08-14-skip-to-main-content-link/.state.json` (phase: `main`, branch `EPMCDME-8581_skip-to-main-content-link`) but contains no prior plan/spec content — this technical-analysis.md is the first substantive artifact for this run.

### Derived Conventions

- `.ai-run/guides/architecture/routing-patterns.md` states the app uses hash-based routing (`createHashRouter`) — **this is stale/incorrect**; the actual `src/router.tsx:16,710` uses `createBrowserRouter`, with a one-time legacy `#/`→path redirect in `src/utils/redirectHashRoutes.ts`. Treat the guide's routing description with caution; the ticket's `#/` reproduction URL is a legacy artifact, not the current routing scheme.
- No dedicated "PageLayout.tsx"/"Navigation.tsx" convention doc beyond general component-organization rules; App.tsx-level architectural notes in `.ai-run/guides/architecture/architecture.md` describe it as hosting app-level concerns (history stack, providers, initial data fetch, theme) but nothing accessibility-specific.

---

## 4. Testing Landscape

### Existing Coverage

- No `App.test.tsx`/`App.spec.tsx` exists anywhere — `App.tsx` has zero test coverage today (imported only once, from `router.tsx:103`).
- `src/components/Layouts/Layout/__tests__/PageLayout.test.tsx` exists (4 tests) but only covers title/subtitle/content rendering — none inspect the `<main>` element, its attributes, or landmark role.
- `src/components/Navigation/__tests__/Navigation.test.tsx:141` asserts `container.firstChild?.nodeName === 'HEADER'` when rendering `<Navigation/>` in isolation via a local `<BrowserRouter>` wrapper — this test renders `Navigation` standalone, not through `App`, so it will **not** break when a skip link is added ahead of `<Navigation/>` inside `App.tsx`. However it also means there is no existing test protecting the intended DOM order (skip link → Banner/Toast → Navigation → Outlet) at the `App.tsx` level.
- No router-level test exists (`router.tsx` has no co-located test file); routes are only exercised indirectly through page-level tests.

### Testing Framework and Patterns

- Vitest 1.6.1 with a two-project workspace split (`unit` vs `integration`) defined in `vitest.workspace.ts`; base config in `vite.config.ts` (`environment: 'jsdom'`, `globals: true`).
- `@testing-library/react` 16.3.0, `@testing-library/user-event` 14.6.1, `@testing-library/jest-dom` 6.6.3. No shared generic `renderWithProviders` helper exists — each test file builds its own local wrapper (e.g. `Navigation.test.tsx:107-109` `const renderWithRouter = (c) => render(<BrowserRouter>{c}</BrowserRouter>)`). A new App-level test would need its own local wrapper, and given `App.tsx`'s heavy provider nesting (`PrimeReactProvider`/`OnboardingProvider`/`UnsavedChangesProvider` + stores), it may be simpler to test the skip-link markup and `PageLayout`'s `<main id="main-content">` as two separate, narrower tests rather than one full `App` render.
- Closest existing idiom for focus/tab-order assertions: `src/hooks/__tests__/useFocusTrap.test.tsx` (uses `fireEvent.keyDown(document, { key: 'Tab' })` + `toHaveFocus()`) and `src/components/Navigation/__tests__/NavigationProfile.test.tsx:404-459` (focus-trap/focus-restore assertions with `toHaveFocus()`).
- `jest-axe`/`vitest-axe`/`axe-core` are **not installed** despite being referenced in the guide's own "Automated Testing" example (`accessibility-patterns.md` lines ~281-291, `import { axe } from 'jest-axe'`). That pattern is aspirational only.

### Coverage Gaps

- No test asserts "the skip link is the first focusable element on the page" — this assertion pattern does not exist anywhere in the repo and must be authored from scratch.
- No test on `PageLayout.tsx`'s `<main>` querying for `id="main-content"` or landmark role — needs to be added.
- No test guards against duplicate `<main>` landmarks (not currently a risk, since only one exists, but worth a regression test given the multi-layout structure — `StandaloneLayout` could later grow a `<main>` too).
- No axe/automated a11y test infra wired up; if the task wants to follow the guide's documented pattern literally, `jest-axe` (or `vitest-axe`) would need to be added as a new devDependency — treat as optional/stretch, not a hard requirement for a WCAG 2.4.1 fix.

---

## 5. Configuration and Environment

### Environment Variables

None specific to this feature. `import.meta.env.BASE_URL` is used for the router `basename` (`src/router.tsx:710`) but is unrelated to the skip-link fix.

### Configuration Files

- `tailwind.config.ts` — no `corePlugins` disabling, `sr-only`/`focus:not-sr-only` work out of the box (Tailwind built-ins); no custom "skip-link" utility exists. Color tokens are namespaced (`surface-*`, `border-*`, `text-*`, `blue-*`) — no `primary-500` token, so the guide's example color classes need substitution with real tokens.
- `.eslintrc.cjs:21` loads the `jsx-a11y` plugin but does **not** extend `plugin:jsx-a11y/recommended` — only one rule is explicitly enabled (`jsx-a11y/no-redundant-roles`, line ~130-133). No lint rule will flag or require a skip link; conversely, no lint rule will block the `<a href="#main-content">` anchor pattern either.
- `eslint-plugin-jsx-a11y` is not declared as an explicit `package.json` dependency despite being referenced in `.eslintrc.cjs` — present transitively only. Not a blocker for this task, but a pre-existing fragility worth a one-line mention if raised in review.

### Feature Flags and Deployment Concerns

- No feature flags relevant to this change.
- `.gitlab-ci.yml` defines no lint/test/build steps directly (delegates to an external template); actual gating happens via `.husky/pre-commit` running `lint-staged` (prettier + eslint --fix + tsc --noEmit) plus license-header and secrets checks. No accessibility-specific CI gate exists.
- No i18n — string can be hardcoded, no locale file to update.

---

## 6. Risk Indicators

- **Scope boundary risk**: `App.tsx`/`PageLayout.tsx` only covers the authenticated shell (`root` route and its ~90 children). `sign-in`, `sign-up`, `login-success`, and error pages (`NotFoundError`, `RuntimeError`) use `StandaloneLayout.tsx`, which is a top-level sibling route NOT wrapped by `App.tsx` and has **no `<main>` landmark at all**. The ticket's reproduction step is on `#/` (root/authenticated shell) and its note says "reproducible on all pages of the app" — ambiguous whether "all pages" includes the auth pages. This needs an explicit scope decision before implementation (recommend: fix the authenticated shell now per the reproduction steps; flag standalone/auth pages as a fast-follow or explicitly confirm out-of-scope with product/QA).
- **"First interactive element" nuance**: `<Banner/>` renders before `<Navigation/>` in `App.tsx` (line 67) and can contain a focusable `<Link>`/dismiss button when a banner message is active. The skip link must be inserted as the literal first child of `App.tsx`'s render tree — ahead of `<Banner/>` — not merely ahead of `<Navigation/>`, or the fix will silently fail WCAG 2.4.1 whenever a banner is showing.
- **No existing test coverage for `App.tsx`** — zero regression protection today; any skip-link test is net-new and must be authored without a template to copy directly (closest analog: `useFocusTrap.test.tsx`'s `fireEvent.keyDown` + `toHaveFocus()` idiom).
- **Guide's example markup uses non-existent color tokens** (`primary-500`) — must be adapted to real Tailwind tokens in `tailwind.config.ts` (e.g. `border-accent`) to render correctly; copy-pasting the guide's snippet verbatim will silently produce unstyled/invisible focus states.
- **Stale architecture guide**: `.ai-run/guides/architecture/routing-patterns.md` describes hash-based routing (`createHashRouter`), but the actual implementation uses `createBrowserRouter` with a legacy `#/`-to-path redirect utility (`src/utils/redirectHashRoutes.ts`). Do not rely on that guide's routing description when reasoning about the ticket's `#/` URL.
- **`focus:not-sr-only` is a brand-new pattern** in this codebase (zero prior usages) — while Tailwind-native and requiring no config change, it has no precedent to visually QA against; manual verification (Tab key, visual snapshot) is warranted since automated axe tooling is not installed.
- **No automated a11y (axe) test infra** — the guide documents a `jest-axe` pattern that isn't installed; if this or a follow-up ticket wants automated WCAG violation detection, that's a separate infra task, not a blocker for this fix.
- **Adjacent-ticket pattern**: this ticket is part of a dense, sequential accessibility-remediation batch (EPMCDME-8417 through at least 8582). Consistency with sibling ticket conventions (minimal diff, test-first, plain commit message format `EPMCDME-8581: <sentence>`, not conventional-commit style) should be followed to avoid review friction — a prior review explicitly flagged conventional-commit-style messages as a violation.

---

## 7. Summary for Complexity Assessment

This is a small, well-scoped, low-risk frontend accessibility fix touching two files in the Layout/Presentation layer: `src/App.tsx` (insert a skip-link `<a>` as the literal first child, ahead of `<Banner/>`) and `src/components/Layouts/Layout/PageLayout.tsx` (add `id="main-content"` to the sole production `<main>` element, line 66). No API, service, repository, database, or state-management layers are touched. The project's own guide (`.ai-run/guides/patterns/accessibility-patterns.md`) already documents the exact intended markup and target-id convention, so there is no design ambiguity about the pattern itself — only a minor adaptation needed to swap the guide's placeholder color tokens (`primary-500`, not present in this project's Tailwind config) for real tokens.

Technical novelty is low: `sr-only` is an established, widely-used convention in this codebase (14+ files); only `focus:not-sr-only` is net-new, but it is a stock Tailwind utility requiring no config changes. The one genuine judgment call is scope: whether the fix must also extend to the standalone/auth-route layout (`StandaloneLayout.tsx`, used by sign-in/sign-up/login-success/error pages), which is a separate top-level route tree not wrapped by `App.tsx` and currently has no `<main>` landmark at all — this should be explicitly resolved (in scope vs. fast-follow) before implementation, as it roughly doubles the file-change surface if included (2 files → 4+).

Test coverage posture is a genuine gap rather than a blocker: neither `App.tsx` nor `PageLayout.tsx`'s `<main>` element has any existing test coverage, and no "first focusable element" or landmark-id assertion pattern exists anywhere in the suite — a new test must be authored from scratch, though a close analog exists (`useFocusTrap.test.tsx`'s `toHaveFocus()` + `fireEvent.keyDown` idiom) to model it on. Given the tiny diff size, established pattern availability, and single clear scope ambiguity (auth pages), this task should score as low-to-moderate complexity, with the auth-page scope question and the App.tsx-first-child-ordering nuance (ahead of Banner) as the two factors most likely to affect an accurate estimate.
