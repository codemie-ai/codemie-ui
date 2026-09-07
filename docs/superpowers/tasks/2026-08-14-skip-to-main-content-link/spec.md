# Spec: Skip-to-main-content link (EPMCDME-8581)

## Problem

WCAG 2.1 "2.4.1 Bypass Blocks" violation: `codemie-ui` provides no mechanism to skip repetitive
navigation content. Keyboard/screen-reader users have no way to jump directly to the main content
of a page; the first Tab stop today is the navigation logo link.

Reproduction: open `https://codemie.lab.epam.com/#/` and Tab from page load — no "Skip to main
content" link is offered before `Navigation`.

## Scope

**In scope:** the authenticated app shell — `src/App.tsx` and
`src/components/Layouts/Layout/PageLayout.tsx`. This covers every route rendered under the `root`
route (`~90` child routes, including the ticket's reproduction path `#/` → `Chat`), since all of
them render through `App.tsx` → `PageLayout.tsx`'s single production `<main>` element.

**Out of scope:** `src/components/Layouts/StandaloneLayout/StandaloneLayout.tsx` (used by
sign-in, sign-up, login-success, and error pages). It is a separate top-level route tree not
wrapped by `App.tsx` and currently has no `<main>` landmark at all. Explicitly deferred to a
fast-follow ticket — not addressed here.

**Also out of scope:** automated axe/a11y test infrastructure (not installed in this repo; the
guide's `jest-axe` example is aspirational only), and any `.eslintrc.cjs` changes.

## Design

### 1. New component: `src/components/SkipLink/SkipLink.tsx`

A single-purpose, prop-less component rendering the skip-link anchor:

```tsx
const SkipLink: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
               focus:rounded focus:bg-surface-base-primary focus:px-4 focus:py-2
               focus:text-text-primary focus:outline-none focus:ring-2 focus:ring-border-accent"
  >
    Skip to main content
  </a>
)

export default SkipLink
```

Adapted from `.ai-run/guides/patterns/accessibility-patterns.md`'s "Visually Hidden Text"
skip-link markup, substituting real Tailwind tokens for the guide's non-existent `primary-500`
placeholder (`bg-surface-base-primary`, `text-text-primary`, `ring-border-accent` — matching the
focus-ring idiom used in `NavigationProfile.tsx`).

Extracted as its own component (rather than inlined in `App.tsx`) so it has a colocated,
independently testable unit test and can be reused by other entry shells later without
duplicating markup.

### 2. `src/App.tsx`

Render `<SkipLink />` as the literal first child inside `<UnsavedChangesProvider>`, ahead of
`<Banner />`:

```tsx
<UnsavedChangesProvider>
  <SkipLink />
  <Banner />
  <ToastContainer />
  ...
```

This ordering is required because `Banner` can render its own focusable `<Link>`/dismiss button
when a banner message is active — if the skip link were placed only ahead of `Navigation` (but
after `Banner`), it would fail to be the "first interactive element" whenever a banner is showing.

### 3. `src/components/Layouts/Layout/PageLayout.tsx`

Add `id="main-content"` and `tabIndex={-1}` to the existing `<main>` element (currently line 66):

```tsx
<main
  id="main-content"
  tabIndex={-1}
  className="flex w-full h-full min-w-0 bg-surface-base-primary bg-contain bg-no-repeat bg-bottom"
  ...
>
```

`tabIndex={-1}` makes the element programmatically focusable (via `href="#main-content"`
activation) without adding it to the normal Tab order — needed because some browsers only move
focus to a fragment target if it's already focusable.

This is the sole production `<main>` in the app (confirmed via `grep -rn "<main" src`), consumed
by ~40 page files directly plus 23 more via `Layout.tsx`, so this one change propagates the fix to
every authenticated page automatically.

## Testing

- **New**: `src/components/SkipLink/__tests__/SkipLink.test.tsx` — renders `<SkipLink />` in
  isolation (no router needed, it's a plain anchor) and asserts: the link text is "Skip to main
  content", `href="#main-content"`, and the `sr-only` class is present. Modeled on
  `Announcement.test.tsx`'s structure.
- **Extended**: `src/components/Layouts/Layout/__tests__/PageLayout.test.tsx` (existing, 4 tests)
  — add one assertion that the rendered `<main>` has `id="main-content"`.
- **Not added**: no new `App.tsx`-level test. `App.tsx` has heavy provider nesting
  (`PrimeReactProvider` / `OnboardingProvider` / `UnsavedChangesProvider` + stores) with zero
  existing test coverage, and a full render harness would be costly to build for low marginal
  value — the DOM-order guarantee (`SkipLink` before `Banner`) is a one-line JSX ordering fact
  verified by review, not runtime behavior that needs its own harness.

## Risks / notes

- `focus:not-sr-only` is a new pattern in this codebase (zero prior usages) but is a stock
  Tailwind utility requiring no config change.
- No lint rule enforces or blocks this pattern (`jsx-a11y` plugin is loaded but not extended with
  `recommended`).
- Manual verification (Tab key from page load, confirm skip link is the first visible focus
  target, confirm activating it moves focus into `<main>`) is warranted since no automated axe
  tooling exists in this repo.
