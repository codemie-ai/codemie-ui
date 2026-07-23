# Spec — EPMCDME-13673: Spacing between Submit button and message action toolbar

## Problem

In the CodeMie chat / test-interactions UI, when an AI message renders an interactive
*user input surface* (checkboxes + a **Submit** button), the Submit button sits flush against the
per-message action toolbar (Copy / Edit / Upload / thumbs) directly below it. There is no visual
separation, so the form control and the message-level controls read as one cramped cluster.

## Goal

Add clear vertical spacing below the interactive surface so its Submit (or action) buttons are
visually grouped with the input surface and separated from the message action toolbar.

## Design

Add a bottom-margin utility class (`mb-3`, 12px) to the **`InteractiveSurface` root container**:

- File: `src/components/InteractiveElements/InteractiveSurface.tsx`
- Root today: `<div className="mt-4 flex flex-col gap-3" data-testid="interactive-surface">`
- After: `<div className="mt-4 mb-3 flex flex-col gap-3" data-testid="interactive-surface">`

Rationale for this location:

- `InteractiveSurface` is rendered in exactly one place (`ChatAiInteractiveBlock`), so the change is
  scoped precisely to the reported chat context — no popup/workflow surface is affected.
- The surface already owns its top rhythm (`mt-4`); a symmetric bottom margin keeps the grouping
  self-contained and consistent.
- The shared `ChatAiMessageActions` toolbar (`mt-1`, used under **every** AI message) is **not**
  touched, so no other message's toolbar spacing changes — this avoids a global regression.
- Layout is reliable: the surface's parent is a flex column and its `messageElementRef` ancestor is
  a block-formatting-context root, so the bottom margin does not collapse and adds to the toolbar's
  own `mt-1`.

Spacing value `mb-3` (12px) chosen to mirror the existing `mt-4` top spacing (user-approved).

## Acceptance Criteria

- The Submit button has clear vertical spacing from the Copy/Edit/other message action buttons.
- The Submit button (and any action buttons) remains visually associated with the input surface.
- The message action toolbar remains visually separated as message-level controls.
- Works for user input surfaces with checkboxes (and all other surface element types, since the
  margin is on the shared surface root).
- No regression to the message action toolbar spacing for normal (non-interactive) AI messages —
  the shared `mt-1` toolbar margin is unchanged.

## Out of Scope

- Any change to `ChatAiMessageActions` or its shared `mt-1` spacing.
- Any change to surface internal spacing (`gap-3`) or element rendering.

## Testing

Unit test in `src/components/InteractiveElements/__tests__/InteractiveSurface.test.tsx`: render a
surface and assert its root (`data-testid="interactive-surface"`) carries the bottom-margin class.
RED before the class is added, GREEN after.
