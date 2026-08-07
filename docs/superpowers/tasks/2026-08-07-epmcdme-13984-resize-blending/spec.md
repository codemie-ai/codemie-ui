# Spec: Fix Chat Input Resize Handle Dark Theme Visibility

**Ticket:** EPMCDME-13984  
**Branch:** EPMCDME-13984_resize-blending

## Problem

The horizontal resize handle pill in `ChatResizableSeparator` uses the `border-subtle` design token for all colour states. In dark theme that token resolves to `neutral-700` (#4C4C4C), which at 40% opacity is near-invisible against the `neutral-900` (#1C1C1C) chat background. The component has no `[.codemieDark_&]` overrides.

## Solution

Replace the `border-subtle`-based colour classes on the pill `<div>` with the same explicit `bg-black/<opacity>` / `[.codemieDark_&]:bg-white/<opacity>` pattern already used by `ChatConfigResizableSeparator`. No other changes.

## Acceptance Criteria

- Resize handle pill is clearly visible in dark theme (sufficient contrast against dark background).
- Light theme appearance is unchanged.
- Hover and focus-visible states render correctly in both themes.
- Resize functionality is unaffected.
- No regressions in `ChatConfigResizableSeparator` or any other separator.

## File Changed

`src/pages/chat/components/ChatResizableSeparator.tsx` — pill `<div>` className only.

## Class Mapping

| State | Before | After |
|---|---|---|
| Resting | `bg-border-subtle/40` | `bg-black/20 [.codemieDark_&]:bg-white/25` |
| Hover color | `group-hover:bg-border-subtle/80` | `group-hover:bg-black/45 [.codemieDark_&]:group-hover:bg-white/50` |
| Focus color | `group-focus-visible:bg-border-subtle` | `group-focus-visible:bg-black/60 [.codemieDark_&]:group-focus-visible:bg-white/65` |
| Focus ring | `group-focus-visible:ring-border-subtle/60` | `group-focus-visible:ring-black/30 [.codemieDark_&]:group-focus-visible:ring-white/50` |

Pill dimensions (`w-10 h-1`, hover `w-12`, focus `h-[3px]`) are unchanged.

## Out of Scope

- Extracting a shared pill component (no third separator planned).
- Changes to `ChatConfigResizableSeparator` (already correct).
- Changes to `GenericResizableSeparator` (outside chat page, different use case).
