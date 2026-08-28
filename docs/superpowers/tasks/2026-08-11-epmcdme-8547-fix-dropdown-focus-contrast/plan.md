# WCAG 1.4.11 Dropdown Focus Contrast Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix WCAG 1.4.11 non-text contrast failure on keyboard-focused dropdown options across all three PrimeReact PT preset files.

**Architecture:** Add a dedicated `surface-specific-dropdown-focused` semantic token with sufficient dark-mode contrast (`neutral['600']` = `#707070`, 3.18:1 against panel `#212224`), then wire it into the `context.focused && !context.selected` branch of three PT preset files. No API, routing, or business-logic code is affected.

**Tech Stack:** Tailwind CSS 3 (semantic token system in `tailwind.config.ts`), PrimeReact 10.9.5 (PassThrough API), TypeScript.

## Global Constraints

- All colors must use Tailwind semantic token classes (`bg-<token>`). Raw hex, raw Tailwind palette classes (e.g. `neutral-600`), and inline styles are prohibited by `styling-guide.md`.
- New token tuples follow `[darkValue, lightValue]` convention enforced by `generateThemes`.
- Commit format: `EPMCDME-8547: <Capital sentence>`.
- No `jest-axe`/`vitest-axe` installed — automated contrast assertions are not available; validation is manual/visual.

---

### Task 1: Add `surface-specific-dropdown-focused` semantic token

**Files:**
- Modify: `tailwind.config.ts:279`

**Interfaces:**
- Produces: Tailwind class `bg-surface-specific-dropdown-focused` usable in Tasks 2–4.

- [ ] **Step 1: Edit `tailwind.config.ts`**

  After line 279 (`'dropdown-hover': [c['neutral']['725'], c['blue']['50']],`), insert the new token:

  ```diff
        'dropdown-hover': [c['neutral']['725'], c['blue']['50']],
  +     'dropdown-focused': [c['neutral']['600'], c['blue']['50']],
  ```

  `neutral['600']` = `#707070`, which gives **3.18:1** contrast against the dark panel `#212224` (`surface-base-secondary` = `neutral['875']`). The light value `blue['50']` follows the same pattern as `dropdown-hover`.

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd /Users/oleg_sotnichenko/codemie-dev/codemie-ui && rtk tsc --noEmit
  ```

  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/oleg_sotnichenko/codemie-dev/codemie-ui && rtk git add tailwind.config.ts && rtk git commit -m "EPMCDME-8547: Add surface-specific-dropdown-focused semantic token"
  ```

---

### Task 2: Fix `Autocomplete/ptPreset.ts` — add focused branch and fix selected token

**Files:**
- Modify: `src/components/form/Autocomplete/ptPreset.ts`

**Interfaces:**
- Consumes: `bg-surface-specific-dropdown-focused` from Task 1.
- Produces: `Autocomplete` item slot with visible keyboard-focus highlight and WCAG-compliant selected-state token.

Two sub-problems in this file:
1. **Missing `context.focused` branch** — keyboard-focused items have no visual indicator at all.
2. **Raw `bg-white/5`** — violates styling guide; must be replaced with semantic token `bg-surface-base-navigation` (the selected-unfocused token used in the lara/dropdown and MultiSelect presets).

- [ ] **Step 1: Edit `src/components/form/Autocomplete/ptPreset.ts`**

  Replace the `item` slot:

  ```diff
   item: ({ context }: AutoCompletePassThroughMethodOptions) => ({
     className: [
       'text-sm rounded-lg py-1.5 pl-2.5 mx-2 text-text-primary cursor-pointer hover:bg-surface-specific-dropdown-hover hover:text-text-accent transition',
       'overflow-hidden whitespace-nowrap truncate',
  -    { 'bg-white/5': context.selected },
  +    { 'bg-surface-specific-dropdown-focused text-text-primary': context.focused && !context.selected },
  +    { 'bg-surface-base-navigation text-text-primary': !context.focused && context.selected },
  +    { 'bg-surface-base-primary text-text-primary': context.focused && context.selected },
     ],
   }),
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd /Users/oleg_sotnichenko/codemie-dev/codemie-ui && rtk tsc --noEmit
  ```

  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  rtk git add src/components/form/Autocomplete/ptPreset.ts && rtk git commit -m "EPMCDME-8547: Fix Autocomplete item focus contrast and replace raw opacity token"
  ```

---

### Task 3: Fix `lara/dropdown/index.ts` — update focused-item token

**Files:**
- Modify: `src/styles/presets/lara/dropdown/index.ts`

**Interfaces:**
- Consumes: `bg-surface-specific-dropdown-focused` from Task 1.

Current state at line 164:
```typescript
{ 'bg-surface-interactive-active text-text-primary': context.focused && !context.selected },
```
`surface-interactive-active` dark value = `neutral['925']` = `#1A1A1A`, contrast against panel `#212224` ≈ 1.1:1. Must be replaced.

- [ ] **Step 1: Edit `src/styles/presets/lara/dropdown/index.ts`**

  ```diff
  -  { 'bg-surface-interactive-active text-text-primary': context.focused && !context.selected },
  +  { 'bg-surface-specific-dropdown-focused text-text-primary': context.focused && !context.selected },
  ```

  Also update the hover-while-focused branch (line 178) for consistency:

  ```diff
  -  { 'hover:text-text-primary hover:bg-surface-interactive-hover': context.focused && !context.selected },
  +  { 'hover:text-text-primary hover:bg-surface-specific-dropdown-hover': context.focused && !context.selected },
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd /Users/oleg_sotnichenko/codemie-dev/codemie-ui && rtk tsc --noEmit
  ```

  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  rtk git add src/styles/presets/lara/dropdown/index.ts && rtk git commit -m "EPMCDME-8547: Fix lara/dropdown item focus contrast"
  ```

---

### Task 4: Fix `MultiSelect/ptPreset.ts` — update focused-item token

**Files:**
- Modify: `src/components/form/MultiSelect/ptPreset.ts`

**Interfaces:**
- Consumes: `bg-surface-specific-dropdown-focused` from Task 1.

Current state at line 378:
```typescript
{ 'bg-surface-interactive-active text-text-primary': context.focused && !context.selected },
```
Same failure as lara/dropdown: `#1A1A1A` against `#212224` ≈ 1.1:1.

- [ ] **Step 1: Edit `src/components/form/MultiSelect/ptPreset.ts`**

  ```diff
  -  { 'bg-surface-interactive-active text-text-primary': context.focused && !context.selected },
  +  { 'bg-surface-specific-dropdown-focused text-text-primary': context.focused && !context.selected },
  ```

  Also update the hover-while-focused branch (line 395) for consistency:

  ```diff
  -  { 'hover:text-text-primary hover:bg-surface-interactive-hover': context.focused && !context.selected },
  +  { 'hover:text-text-primary hover:bg-surface-specific-dropdown-hover': context.focused && !context.selected },
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd /Users/oleg_sotnichenko/codemie-dev/codemie-ui && rtk tsc --noEmit
  ```

  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  rtk git add src/components/form/MultiSelect/ptPreset.ts && rtk git commit -m "EPMCDME-8547: Fix MultiSelect item focus contrast"
  ```

---

## Manual Validation Checklist

After all four tasks:

1. Start dev server: `cd /Users/oleg_sotnichenko/codemie-dev/codemie-ui && pnpm dev`
2. Open the datasource creation page (or any page with a dropdown).
3. Tab into the dropdown, open it, and use arrow keys to move focus.
4. **Expected**: focused item has a visually distinct background (`#707070` in dark mode) — clearly different from non-focused items (`#212224`).
5. **Expected**: selected (non-focused) item uses `bg-surface-base-navigation`.
6. Repeat for `Select` (pagination "items per page") and `MultiSelect` components.
7. Switch to light theme and verify no regression.
