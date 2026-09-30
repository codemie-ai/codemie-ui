# Spec: Hide Decorative Background Images from Assistive Technologies

**Ticket:** EPMCDME-8456
**Date:** 2026-09-04
**Complexity:** XS — single file, two attribute changes, zero logic change

---

## Problem

The workflow editor's fullscreen background component (`src/pages/workflows/editor/EditorBackground.tsx`) renders two decorative gradient `<img>` elements with `alt="background-gradient"`. NVDA announces these as "graphic background-gradient" when a screen reader user navigates to the workflow editor in fullscreen mode. Decorative images must be hidden from assistive technologies; a non-empty `alt` text is the defect.

## Goal

Both `<img>` elements in `EditorBackground.tsx` must be invisible to screen readers and other assistive technologies. No visual change. No behaviour change.

## Approach

Replace `alt="background-gradient"` with `alt=""` and add `role="presentation"` on each of the two `<img>` elements.

This is the established pattern in this codebase: `StandaloneLayout.tsx` uses `alt=""` on its three gradient images. The project accessibility guide (`.ai-run/guides/patterns/accessibility-patterns.md`) states the same rule: decorative image → `alt=''` + `role='presentation'`.

## Files Changed

| File | Change |
|---|---|
| `src/pages/workflows/editor/EditorBackground.tsx` | Two `<img>` elements: `alt="background-gradient"` → `alt=""` + `role="presentation"` |

No other files require changes. `WorkflowEditor.tsx` (the sole caller) and `StandaloneLayout.tsx` are unaffected.

## Acceptance Criteria

1. `EditorBackground.tsx` contains no `alt="background-gradient"` attribute.
2. Both `<img>` elements in `EditorBackground.tsx` have `alt=""`.
3. Both `<img>` elements in `EditorBackground.tsx` have `role="presentation"`.
4. The workflow editor renders visually identically to before in both fullscreen and non-fullscreen modes.
5. NVDA does not announce the gradient images when navigating the workflow editor.
6. Lint and type-check gates pass.

## Non-Goals

- Adding automated accessibility tests for `EditorBackground` or `StandaloneLayout`.
- Fixing `DetailsGradientSvg` in `DetailsSidebar.tsx` (missing `aria-hidden="true"`); that is a separate finding outside this ticket's scope.
- Changing any other attribute, class, or behaviour of `EditorBackground.tsx`.
- Modifying `StandaloneLayout.tsx`; it already follows the correct pattern.
- Any change to `WorkflowEditor.tsx`.
