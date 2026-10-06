# Spec — EPMCDME-14840: Like icon dark-theme highlight

## Problem

In the codemieDark theme, the like (thumb-up) feedback icon shows no visible selected state after
the user clicks it. The class `text-text-accent` (the current selected-state class) resolves to
`neutral.50` (`#F2F0EF`) in dark mode — indistinguishable from the base icon color `#FFFFFF`
at `opacity-80`. The codemieLight theme is verified correct (`#007AFF`) and is out of scope.

The dislike button is unaffected; it uses `text-failed-secondary` which resolves to red in both
themes.

## Fix

### 1 — Add a purpose-named token

In `tailwind.config.ts`, under `text.accent`, add:

```ts
feedback: [c['blue']['300'], c['blue']['400']],
```

**Token resolution:**

| theme | value | hex |
|-------|-------|-----|
| codemieDark | `blue.300` | `#2297F6` — clearly distinct from base `#FFFFFF` ✓ |
| codemieLight | `blue.400` | `#007AFF` — byte-identical to current behavior ✓ |

This generates the Tailwind utility `text-text-accent-feedback`. It is additive: no existing token
value changes, the `text.accent.DEFAULT` constraint is honoured, and the token is semantically
scoped to feedback — not borrowed from the run-status family (`in-progress`, `success`, etc.),
so a future retune of those tokens cannot silently affect this control.

### 2 — Apply the token

In `MessageFeedbackActions.tsx`, line 170: replace `text-text-accent` with
`text-text-accent-feedback` on the like icon's selected-state class.

### 3 — Fix the tooltip typo (adjacent, one-line)

Line 178: `"Click to remove yout negative feedback"` → `"Click to remove your negative feedback"`

## What does NOT change

- `text.accent.DEFAULT` — not modified.
- codemieLight like-selected color — `#007AFF` today, `#007AFF` after the fix.
- Feedback submit/remove behavior — state logic is not touched.
- Any component outside `MessageFeedbackActions.tsx` and `tailwind.config.ts`.

## Out of scope (confirmed with reporter 2026-09-22)

- Feedback-state hydration after page reload — separate ticket.

## Acceptance Criteria

1. After clicking like, the like icon shows a distinct blue selected state in codemieDark.
2. After clicking dislike, the dislike icon shows red — unchanged.
3. Only the currently selected action is highlighted.
4. Removing feedback resets the icon to default — unchanged.
5. codemieLight behavior is pixel-identical before and after.
6. Existing feedback submit/remove behavior is unchanged.

## Evidence Required

Computed colors via `getComputedStyle` for all four cases (like/dislike × dark/light) after the
fix. The like-selected dark value must read `#2297F6` (or close, accounting for opacity rendering).
Screenshots in both themes.
