# Implementation Plan - Fix Visible Focus Indicator on MultiSelect Comboboxes (EPMCDME-8437)

## Goal Description
In the Chat Configuration sidebar, when navigating via keyboard `Tab` to the **"LLM Model"** (previously "Primary LLM Engine"), the **"Skills"** selector, and other comboboxes, the control does not display a visible focus indicator.

This violates WCAG success criteria for Focus Visible and Focus Appearance. We will address this by applying standard focus-visible border styles directly to the shared `MultiSelect` component's wrapper.

## Proposed Changes

### Task 1: Update `ptPreset.ts`
- **File**: `src/components/form/MultiSelect/ptPreset.ts`
- **Description**: Add `focus-within:border-border-secondary` and replace the existing static focused border style with `!border-border-secondary` when focused and not invalid.
- **Test-first**: yes — Unit test `renders a visible focus indicator class on the root element when focused` currently fails because this class is missing from the component root.

### Task 2: Update `MultiSelect.tsx`
- **File**: `src/components/form/MultiSelect/MultiSelect.tsx`
- **Description**: Merge and compose the root className from the pass-through preset dynamically instead of overwriting the root configuration with static properties that discard the preset's core root classes.
- **Test-first**: yes — The unit test `renders a visible focus indicator class on the root element when focused` requires `MultiSelect.tsx` to properly compose the custom error border class with the base preset classes.

---

## Verification Plan

### Automated Tests
- Run unit tests: `npm run test src/components/form/MultiSelect/__tests__/MultiSelect.test.tsx`
- Check type safety: `npm run typecheck`
- Run linter: `npm run lint`

### Manual Verification
1. Tab to "LLM Model" (or other MultiSelect comboboxes) -> Verify visible focus border (`border-border-secondary`).
2. Tab away -> Verify focus style is removed.
