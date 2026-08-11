# EPMCDME-14000 — Fix Configure & Test Panel Width Constraints

**Date**: 2026-08-10
**Branch**: EPMCDME-14000_assistant-block-expand
**Ticket**: EPMCDME-14000

---

## Problem

In the **Configure & Test** side panel (chat page), two layout issues are visible:

1. **Accordion block width mismatch (Bug 1)**: The "Assistant Setup" and its nested "Extra configuration" accordion blocks are constrained to `max-w-sm` (384px) in compact view, while all other blocks below them ("Interactive features", "Context & Data Sources", "Image generation", "Skills") span the full panel width.

2. **LLM Model dropdown too narrow (Bug 2)**: In the chat General settings panel, the "LLM Model" dropdown is capped at `max-w-sm` (384px) while the "Skills" dropdown renders at full container width.

Both issues share the same root cause: hardcoded `max-w-sm` Tailwind classes applied in the compact-view context (i.e., when `isCompactView === true` / `isChatConfig === true`).

---

## Context

`isCompactView` in `AssistantSetupSection` is `true` exclusively when `AssistantForm` is rendered inside the Configure & Test panel (`isChatConfig={true}` from `ChatConfigAssistantForm`). On the standalone Create/Edit Assistant page `isCompactView` is `false`, so the fixes below have no effect there.

---

## Fix

### Bug 1 — `AssistantSetupSection.tsx`

Two `max-w-sm` constraints applied via `isCompactView`:

| Location | Current | After fix |
|---|---|---|
| Line 66 — outer "Assistant Setup" Accordion | `cn(isCompactView && 'max-w-sm mt-5')` | `cn(isCompactView && 'mt-5')` |
| Line 250 — nested "Extra configuration" Accordion | `cn(isCompactView && 'max-w-sm')` | remove `className` prop |

Removing these makes both accordion blocks fill the full panel width, matching the behaviour of the other blocks rendered below them in `AssistantForm`.

### Bug 2 — `LLMSelector.tsx`

The outer wrapper div at line 124 has a hardcoded `max-w-sm`:

```tsx
// Before
<div className="flex flex-col gap-2 grow max-w-sm">

// After
<div className="flex flex-col gap-2 grow">
```

Removing `max-w-sm` lets the parent container control the width. This is safe:
- In the standalone assistant form (non-compact), the containing `div` already constrains width to `w-72` (288px), narrower than `max-w-sm`, so visual output there is unchanged.
- In the chat config panel (compact), the selector now fills the container, matching the Skills dropdown.

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx` | Remove `max-w-sm` from two `cn()` calls (lines 66, 250) |
| `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` | Remove `max-w-sm` from wrapper div (line 124) |

---

## Acceptance Criteria

- In the Configure & Test panel, all accordion blocks ("Assistant Setup", "Extra configuration", "Interactive features", "Context & Data Sources", "Image generation", "Skills") are the same full width.
- In the chat General settings panel, the "LLM Model" dropdown spans the same full width as the "Skills" dropdown.
- On the standalone Create/Edit Assistant page, no visual change.

---

## Out of Scope

- Accordion expand/collapse animation (not broken; the original misdiagnosis was ruled out)
- Any backend or state changes
