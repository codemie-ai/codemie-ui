# EPMCDME-9314 — Fix table borders/sliders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three bugs in the shared `Table` component that caused the horizontal scrollbar to be invisible, hidden behind the pagination bar, and the pagination bar to flash misaligned on first render.

**Architecture:** Three surgical changes to two files — no new files, no structural refactor. Fix 1 adds `show-scroll` so WebKit browsers render the styled scrollbar. Fix 2 moves the pagination reserve space from `mb-[80px]` on the inner `<table>` (which inflated the scroll container height, hiding the scrollbar behind the fixed pagination) to `pb-20` on the outer wrapper (outside the scroll container). Fix 3 extracts the sidebar offset logic from `useSidebarOffsetClass` into a pure helper and initialises state synchronously, eliminating the pagination flash.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (utility classes), Valtio (store), Vitest (test runner)

---

### Task 1: Add `show-scroll` to Table scroll container

**Test-first: no — no existing test harness for Table.tsx; visual-only verification in the browser**

**Files:**
- Modify: `src/components/Table/Table.tsx`

- [ ] **Step 1: Apply the fix**

  In `src/components/Table/Table.tsx`, locate the scroll container div and add `show-scroll`:

  ```tsx
  // Before
  <div className={cn('w-full grow', { 'overflow-auto min-h-[300px]': !embedded })}>

  // After
  <div className={cn('w-full grow', { 'overflow-auto min-h-[300px] show-scroll': !embedded })}>
  ```

- [ ] **Step 2: Verify no TypeScript errors**

  ```bash
  npx tsc --noEmit
  ```
  Expected: zero errors (class string modification only).

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/Table/Table.tsx
  git commit -m "EPMCDME-9314: Fix invisible horizontal scrollbar in Table component"
  ```

---

### Task 2: Fix scroll container extending behind fixed pagination bar

**Test-first: no — visual-only; confirmed by browser measurement (`scrollbarHiddenByPagination: false`)**

**Files:**
- Modify: `src/components/Table/Table.tsx`

**Root cause:** `mb-[80px]` on the `<table>` element lived *inside* the `overflow-auto` container. It inflated the scroll container's auto-sized height so the bottom edge (and scrollbar track) extended behind the fixed `Pagination` bar (`z-40`).

- [ ] **Step 1: Apply the fix**

  Change the outer wrapper and remove the table margin:

  ```tsx
  // Before
  <div className="w-full relative flex flex-col">
    ...
    <table className={cn('mt-4 border-separate border-spacing-0 w-full text-[12px] leading-tight',
      { 'mb-[80px]': !embedded }, tableClassName, className)}>

  // After
  <div className={cn('w-full relative flex flex-col', { 'pb-20': !embedded && !!pagination })}>
    ...
    <table className={cn('mt-4 border-separate border-spacing-0 w-full text-[12px] leading-tight',
      {}, tableClassName, className)}>
  ```

  `pb-20` (80px) on the outer wrapper reserves the same pagination zone outside the scroll container. The scroll container now auto-sizes to only the table rows, keeping its bottom edge above the fixed pagination bar.

- [ ] **Step 2: Verify no TypeScript errors**

  ```bash
  npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 3: Browser smoke check**

  At a viewport narrower than the table's full column width:
  - Confirm the horizontal scrollbar track is visible above the pagination bar.
  - Confirm only table content scrolls horizontally (page/sidebar remain fixed).
  - Confirm no vertical scrollbar appears inside the table.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/Table/Table.tsx
  git commit -m "EPMCDME-9314: Fix Table scroll container extending behind fixed pagination bar"
  ```

---

### Task 3: Fix `useSidebarOffsetClass` null initial state

**Test-first: no — no existing test harness for this hook; correctness confirmed by visual check (pagination bar offset on first mount)**

**Files:**
- Modify: `src/hooks/useSidebarOffsetClass.ts`

- [ ] **Step 1: Apply the fix**

  Replace the entire file content with:

  ```ts
  import { useState, useEffect } from 'react'
  import { subscribe } from 'valtio'

  import { appInfoStore } from '@/store/appInfo'

  const computeOffsetClass = (): string => {
    if (!appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded) return 'left-navbar'
    if (appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
      return 'left-[calc(theme(spacing.navbar)+theme(spacing.sidebar))]'
    if (!appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
      return 'left-navbar-expanded'
    return 'left-[calc(theme(spacing.navbar-expanded)+theme(spacing.sidebar))]'
  }

  export const useSidebarOffsetClass = () => {
    const [offsetClass, setOffsetClass] = useState<string>(() => computeOffsetClass())

    useEffect(() => {
      setOffsetClass(computeOffsetClass())

      const unsubscribe = subscribe(appInfoStore, () => setOffsetClass(computeOffsetClass()))

      return () => {
        unsubscribe()
      }
    }, [])

    return offsetClass
  }
  ```

  Key changes:
  - `computeOffsetClass` is a pure module-level function — reads the Valtio proxy synchronously (safe; Valtio proxy is already initialised before this hook is ever called).
  - `useState<string>(() => computeOffsetClass())` — lazy initialiser computes the correct offset on the first render, eliminating the null-on-first-render flash.
  - The `update` inner function is removed; its callers are replaced with `setOffsetClass(computeOffsetClass())` inline.
  - Return type narrows from `string | null` to `string` — backward-compatible for all callers.

- [ ] **Step 2: Verify no TypeScript errors**

  ```bash
  npx tsc --noEmit
  ```
  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/hooks/useSidebarOffsetClass.ts
  git commit -m "EPMCDME-9314: Fix pagination offset flash in useSidebarOffsetClass"
  ```

---

## Verification

After all three tasks are committed:

1. Start the dev server: `npm run dev`
2. Open Chrome and navigate to the **Integrations** page.
3. Resize the browser window so the table overflows horizontally. Confirm:
   - A styled thin scrollbar track is visible at the bottom of the table area, above the pagination bar.
   - Scrolling horizontally moves only table column content — sidebar, filters, and header remain fixed (no page-level scroll).
4. Reload the page. Confirm the **pagination bar** renders at the correct left offset immediately — no full-width flash.
5. Repeat steps 2–4 in Firefox.
6. Navigate to the **Data Sources** page and repeat.
7. Check any page using `<Table embedded={true}>` — confirm it has no scrollbar and no height change.
