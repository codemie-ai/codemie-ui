# Technical Research

**Task**: accessibility aria-hidden background-image sidebar
**Generated**: 2026-09-04T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

[1.1.1] The background image is not hidden from assistive technologies. Bug: decorative background image on the login/home page can be focused with Arrow keys and is announced by NVDA screen reader as 'graphic background-gradient'. Fix: add aria-hidden="true" or empty alt attribute to the decorative background image so it is hidden from screen reader assistive technologies. Steps to reproduce: open app, use Arrow key to navigate to Navigation sidebar, screen reader announces 'graphic background-gradient'. Expected: decorative background image is hidden from screen reader.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/workflows/editor/EditorBackground.tsx` — renders two decorative `<img>` elements (dark and light gradient variants) with `alt="background-gradient"`. This is the exact string NVDA announces. Both images already carry `pointer-events-none select-none` and are positioned absolutely; they are purely decorative. The non-empty alt attribute is the defect.
- `src/components/Layouts/StandaloneLayout/StandaloneLayout.tsx` — renders three decorative gradient `<img>` elements (left, right, bottom) with `alt=""` already set correctly. This is the established correct pattern for this codebase.
- `src/components/Layouts/StandaloneLayout/GradientBlur.tsx` — decorative blur rendered as a `<div>` with CSS `background` property; no `<img>`, no issue.
- `src/components/details/DetailsSidebar/DetailsSidebar.tsx` — renders `DetailsGradientSvg` as an inline SVG without `aria-hidden="true"`, but this is outside the scope of the reported ticket.

### Architecture and Layers Affected

- **Presentation layer / Workflow editor** — `EditorBackground` is a leaf component rendered only by `WorkflowEditor`. No shared layout component is involved; the fix is isolated to one file.

### Integration Points

- `EditorBackground` is consumed exclusively by `src/pages/workflows/editor/WorkflowEditor.tsx`. No other callers exist per the blast-radius analysis.
- The component receives one prop (`isFullscreen: boolean`); the defective `<img>` elements render only when `isFullscreen` is `true`.

### Patterns and Conventions

- Decorative `<img>` elements use `alt=""` — demonstrated by `StandaloneLayout` (lines 71, 80, 87).
- Decorative SVGs use `aria-hidden="true"` — documented in `.ai-run/guides/patterns/accessibility-patterns.md` and demonstrated in `LoginPageExpired.tsx` (line 40).
- The accessibility guide (Image Alt Text table) states: Decorative image → `alt=''` + `role='presentation'`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — covers decorative image handling explicitly. Image Alt Text table: decorative images use `alt=''` + `role='presentation'`; decorative SVGs use `aria-hidden='true'`.

### Architectural Decisions

No ADRs recorded for this area. Convention is derived from code (see below).

### Derived Conventions

`StandaloneLayout` is the reference: three gradient `<img>` elements each carry `alt=""` and `pointer-events-none`. The `EditorBackground` was authored with `alt="background-gradient"` which deviates from this established pattern.

---

## 4. Testing Landscape

### Existing Coverage

No tests exist for `EditorBackground` or `StandaloneLayout`. The blast-radius analysis found no tests within three caller hops of either component.

Test utilities for accessibility assertions exist in `src/authentication/components/__tests__/testUtils.ts` (`expectAriaLabel`, `expectAriaRequired`), but these cover form fields, not decorative images.

### Testing Framework and Patterns

Vitest with React Testing Library (`unit` and `integration` projects). Accessibility testing via `jest-axe` is documented in the accessibility guide but not yet applied to layout/background components.

### Coverage Gaps

No tests cover the decorative background image rendering in either `EditorBackground` or `StandaloneLayout`. The fix itself is a one-attribute change with no logic, so the coverage gap is low risk for this ticket.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to this change.

### Configuration Files

`appearance.gradients` (runtime config via `appInfoStore`) controls whether gradient images render in `StandaloneLayout` and `Sidebar`. `EditorBackground` does not read this flag — its images are always rendered when `isFullscreen` is true.

### Feature Flags and Deployment Concerns

None. The fix is a pure markup change with no runtime condition.

---

## 6. Risk Indicators

- **Narrow blast radius**: `EditorBackground` has exactly one caller (`WorkflowEditor`) and renders the defective elements only under `isFullscreen`. Risk of regression is minimal.
- **Pattern already established**: `StandaloneLayout` already uses `alt=""` on identical gradient images, so the fix follows a clear precedent.
- **No tests for the component**: the absence of tests means the fix cannot be verified by an automated suite, but the change is structural (attribute value), not behavioural.
- **`DetailsGradientSvg` in `DetailsSidebar`**: an SVG rendered without `aria-hidden="true"` — possibly a second decorative image not hidden from assistive tech, but outside the ticket scope.
- **Scope of "login/home page"** in the ticket: the ticket description mentions the login page, but `StandaloneLayout` (used by login pages) already has correct `alt=""`. The reproduction path ("navigate to Navigation sidebar, screen reader announces 'graphic background-gradient'") points to the workflow editor's fullscreen mode, where `EditorBackground` is rendered. The string `'background-gradient'` matches `alt="background-gradient"` in `EditorBackground.tsx` exactly.

---

## 7. Summary for Complexity Assessment

The defect is isolated to a single file: `src/pages/workflows/editor/EditorBackground.tsx`. Two `<img>` elements at lines 32–41 carry `alt="background-gradient"`, causing NVDA to announce the decorative images as "graphic background-gradient". The fix is to replace both `alt="background-gradient"` values with `alt=""` (and optionally add `role="presentation"` per the guide). The component has one caller, no tests, and the pattern is already established by `StandaloneLayout`.

Architectural surface is a single leaf component in the workflow editor. No shared layout, store, or hook is involved. The change touches one file and two attribute values. The `StandaloneLayout` gradient images already follow the correct pattern and require no change.

Test coverage for this area is absent; the accessibility guide documents `jest-axe` as the testing approach for violations of this kind, but adding a test is not required by the ticket. The primary risk is that the "login/home page" framing in the ticket description could lead to searching the wrong component; the reproduction evidence ("graphic background-gradient") pins the root cause to `EditorBackground.tsx` unambiguously.

---

## 8. External References

None named by the task.
