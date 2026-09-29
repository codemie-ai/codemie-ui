# Spec — EPMCDME-8438: aria-label on Quill chat input

## Problem

Quill renders a `contenteditable` div whose placeholder is CSS-only (`.ql-editor::before`).
That visual placeholder is invisible to assistive technology. NVDA does not announce what the
chat input is for or what the user should type, making the field inaccessible.

## Solution

Set `aria-label` on `quill.root` imperatively at both existing call sites in
`src/components/Editor/Editor.tsx`. The value mirrors the `placeholder` prop already passed to
the component. No new prop, no API change, no caller modification.

The pattern is established: `src/components/Editor/quillModules.ts` (lines 113, 141) already
calls `container.setAttribute('aria-label', ...)` on Quill DOM nodes.

## Changes

**File:** `src/components/Editor/Editor.tsx` only.

**Site 1 — `useEffect([placeholder])` (lines 128–133)**

Inside the existing `if (quill && placeholder !== undefined)` block, add:

```
quill.root.setAttribute('aria-label', placeholder)
```

alongside the existing `quill.root.setAttribute('data-placeholder', placeholder)` call.
The guard is already present; the new line is a one-line addition.

**Site 2 — `onLoad` callback (lines 181–190)**

Add after the existing `quill.focus()` call:

```
if (placeholder !== undefined) {
  quill.root.setAttribute('aria-label', placeholder)
}
```

The `undefined` guard is mandatory here: Site 2 currently has no such guard, and
`setAttribute('aria-label', undefined)` would write the literal string `"undefined"`.

Both sites are necessary: `useEffect` re-syncs the attribute when the `placeholder` prop
changes (e.g. switching between `DEFAULT`, `WORKFLOW`, `WORKFLOW_INTERRUPTED` modes);
`onLoad` sets it at initial mount before any prop update fires.

## Acceptance Criteria

- `quill.root` carries `aria-label` equal to the current placeholder string after the editor
  mounts.
- `quill.root` carries an updated `aria-label` when the `placeholder` prop changes at runtime.
- When `placeholder` is `undefined`, `aria-label` is not written (no `"undefined"` string
  appears on the DOM node).
- Existing visual placeholder behaviour (`.ql-editor::before` CSS) is unchanged.
- No callers of `<Editor>` require modification.

## Non-Goals

- Changing the `placeholder` prop API or its consumers.
- Adding `role`, `aria-placeholder`, `aria-describedby`, or any other ARIA attribute not
  explicitly scoped here.
- Fixing accessibility of any other Quill instance or page element.
- Writing tests for `aria-label` on `quill.root` (no existing test exercises `quill.root` DOM
  attributes; a follow-up ticket may address the gap).
- Modifying `Editor.scss` or the CSS placeholder visual.
