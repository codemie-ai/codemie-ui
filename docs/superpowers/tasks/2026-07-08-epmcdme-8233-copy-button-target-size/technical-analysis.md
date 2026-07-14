# Technical Research

**Task**: profile copy button accessibility target-size
**Generated**: 2026-07-08T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

[2.5.8] The 'Copy' button doesn't meet a minimum size. The Copy icon target measures 12×18 CSS px. Per WCAG 2.2 Success Criterion 2.5.8 'Target Size (Minimum)', interactive targets must be at least 24×24 CSS px, or have sufficient spacing. The fix is on the profile page, near the email 'Copy' control. Options: add padding around the icon, set min-width/min-height on the button, or wrap the SVG in a button with a 24×24 box while keeping visual size stable. Must also maintain accessible name (aria-label='Copy email') and visible focus outline.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/components/ProfileCard.tsx` — profile card component; renders the user ID copy button (primary fix target); button uses `hover:opacity-80 ml-2` with `<CopySvg className="w-3" />` yielding a 12×18 px hit area; accessible name is `title="Copy user ID"` only (no `aria-label`)
- `src/components/Navigation/NavigationProfile.tsx` — navigation header profile dropdown; contains two copy buttons at lines 146–152 ("Copy username") and 158–164 ("Copy user ID"), both using `<CopySvg className="w-3" />` with `ml-1 text-text-primary hover:opacity-80`; same 12×18 px hit area, same `title`-only accessible name pattern
- `src/components/details/DetailsCopyField/DetailsCopyField.tsx` — reusable copy field; has `aria-label="Copy"` and `h-full px-2` sizing (~32 px tall); the closest compliant pattern in the codebase but still lacks explicit `min-width`/`min-height` guards
- `src/components/form/InputCopy/InputCopy.tsx` — another copy button variant; button styled `h-8 w-7` (28×32 px); has `min-w-[12px] min-h-[12px]` on the SVG only (not on the button); marginally passes width at 28 px but has no `aria-label`
- `src/assets/icons/copy.svg` — SVG icon; `width="18" height="18" viewBox="0 0 18 18"`; rendered at `w-3` (12 px) in the affected buttons

### Architecture and Layers Affected

- **UI / Presentation layer**: `ProfileCard.tsx` (settings page), `NavigationProfile.tsx` (navigation shell)
- **Shared component layer**: `DetailsCopyField.tsx`, `InputCopy.tsx` — reusable copy button patterns (not directly broken but exhibit related gaps)
- No service, API, or data layer is touched. This is a pure UI/CSS/accessibility change.

### Integration Points

- `ProfileCard.tsx` imports `CopySvg` from `src/assets/icons/copy.svg` (or equivalent icon import)
- `NavigationProfile.tsx` imports `CopySvg` the same way
- No external service dependencies; clipboard interaction is handled inline (likely `navigator.clipboard.writeText`)

### Patterns and Conventions

- Icon-only buttons in this codebase use either `title` (ProfileCard, NavigationProfile) or `aria-label` (DetailsCopyField) — no shared `IconButton` component enforces accessible sizing or naming
- Focus ring pattern used elsewhere in the codebase: `focus:ring-2 focus:ring-border-accent focus:ring-offset-0` (checkboxes), `focus-visible:ring-1 focus-visible:ring-border-accent` (PinnedRow), `focus:outline-none focus:ring-2 focus:ring-primary-500` (NavigationMore) — none of these patterns are applied to any copy button today
- Tailwind utility classes are the standard styling mechanism throughout the codebase; no CSS modules or styled-components for these components
- The fix pattern used by `DetailsCopyField` (`h-full px-2`, ~32 px tall row height) is the closest existing compliant example, but it relies on surrounding layout height rather than self-contained `min-w`/`min-h`

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/` directory exists and contains project guidance (see AGENTS.md for full index)
- No guide specifically covers WCAG 2.5.8 target size or icon button accessibility patterns; the closest relevant guide would be any UI component conventions guide, which does not appear to exist
- No `.ai-run/guides/` entry for accessibility or WCAG compliance was found

### Architectural Decisions

- No ADR or recorded decision found for icon button sizing or accessible name conventions
- No inline `DECISION:` or `ADR:` comments found in the affected files

### Derived Conventions

- Icon-only buttons use `title` for accessible names in older/profile-area components; `aria-label` is used in newer shared components (`DetailsCopyField`)
- Tailwind utility classes (`h-8`, `w-7`, `px-2`, `focus:ring-*`) are the standard mechanism for controlling button sizing and focus states
- The `w-3` (12 px) class on `CopySvg` is a visual sizing choice that, when applied without padding on the parent button, results in a sub-24 px hit area
- Adding `min-w-[24px] min-h-[24px]` (or `p-1.5`) to the button element is consistent with patterns already used in `InputCopy.tsx` (which uses `min-w` on the SVG — the fix should be on the button instead)

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/Navigation/__tests__/NavigationProfile.test.tsx` — covers copy button existence and click behavior; discovers buttons via `getByTitle`
- `src/components/details/DetailsCopyField/__tests__/DetailsCopyField.test.tsx` — covers rendering and aria role; does not assert accessible name value or target size

### Testing Framework and Patterns

- Testing framework: React Testing Library with Jest (inferred from `getByTitle`, `getByRole` usage in test files)
- Pattern: buttons discovered by `title` attribute in NavigationProfile tests — this will need updating if `title` is replaced or supplemented with `aria-label`
- No size/dimension assertions exist anywhere in the test suite

### Coverage Gaps

- `src/pages/settings/components/ProfileCard.tsx` — no test file exists; the primary fix target is entirely untested
- `src/components/form/InputCopy/InputCopy.tsx` — no test file exists
- No test anywhere asserts `min-width`, `min-height`, WCAG 2.5.8 compliance, or focus outline presence on copy buttons
- If `aria-label` is added to `ProfileCard.tsx` copy button, no existing test will verify it

---

## 5. Configuration and Environment

### Environment Variables

- None relevant to this UI-only change.

### Configuration Files

- Tailwind config (`tailwind.config.js` or equivalent) governs utility class availability; no custom changes needed — `min-w-[24px]`, `min-h-[24px]`, and `p-1.5` (6 px padding) are standard Tailwind utilities

### Feature Flags and Deployment Concerns

- No feature flags or deployment concerns for a CSS/accessibility fix of this scope.

---

## 6. Risk Indicators

- No `aria-label` on `ProfileCard.tsx` copy button — only `title="Copy user ID"` is present; `title` is not a reliable accessible name for screen readers; the task requires `aria-label="Copy email"` but the existing text is "Copy user ID" — clarification needed on the correct accessible name value
- `NavigationProfile.tsx` has two additional copy buttons with the same 12×18 px hit area and same `title`-only accessible name gap; they are not mentioned in the ticket but are affected by the same WCAG criterion
- No test file exists for `ProfileCard.tsx` — the primary fix target has zero test coverage; any regression would go undetected
- `NavigationProfile.test.tsx` discovers copy buttons via `getByTitle` — if `title` attribute is changed or supplemented, existing tests may need updating
- No shared `IconButton` component enforces 24×24 minimum sizing across the codebase; the fix will be ad-hoc unless a utility component is introduced
- Focus outline is not applied to any copy button today; adding `focus-visible:ring-*` is required by the ticket but no existing pattern for copy buttons serves as a template
- Ticket says `aria-label="Copy email"` but the field in `ProfileCard.tsx` is described as "user ID" — the correct accessible name string needs verification against the actual UI label

---

## 7. Summary for Complexity Assessment

This is a narrow, low-complexity UI accessibility fix confined to the presentation layer with no service, API, or data layer involvement. The primary change target is `src/pages/settings/components/ProfileCard.tsx`, where a single `<button>` element needs: (1) `min-w-[24px] min-h-[24px]` or equivalent padding to meet WCAG 2.5.8's 24×24 px minimum hit area, (2) an `aria-label` attribute to replace or supplement the unreliable `title`-only accessible name, and (3) a `focus-visible:ring-*` Tailwind class for the required visible focus outline. The same pattern issue exists in `src/components/Navigation/NavigationProfile.tsx` (two buttons), but those are out of ticket scope unless the team opts to fix them together. Total file change surface is 1–2 files, 5–10 lines each.

The task follows an established pattern (Tailwind utility classes for sizing, `aria-label` for accessible names as seen in `DetailsCopyField.tsx`) and introduces no architectural novelty. The main risk is the accessible name value discrepancy: the ticket specifies `aria-label="Copy email"` but the existing button title is "Copy user ID" — this needs clarification before the fix is landed. Additionally, `NavigationProfile.test.tsx` uses `getByTitle` to discover copy buttons; if the `title` attribute is modified, that test file will need a minor update.

Test coverage for the primary fix target (`ProfileCard.tsx`) is entirely absent — no test file exists. The complexity assessor should factor in the need to either add a basic smoke test for the profile card copy button or accept the coverage gap as out of scope. Overall complexity is low (1–2 files changed, well-understood Tailwind patterns, no cross-layer impact), with a minor accessibility-naming clarification needed before implementation.
