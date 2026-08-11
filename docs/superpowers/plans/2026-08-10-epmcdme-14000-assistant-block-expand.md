# EPMCDME-14000 Configure & Test Width Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove three hardcoded `max-w-sm` Tailwind constraints that prevent accordion blocks and the LLM Model dropdown from filling the full width of the Configure & Test side panel.

**Architecture:** Pure CSS/Tailwind class removals across two files. No new components, no props, no state changes. Width is delegated entirely to parent containers, which already control it correctly for all render contexts.

**Tech Stack:** React, TypeScript, Tailwind CSS, PrimeReact

---

## File Map

| File | Change |
|---|---|
| `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx` | Remove `max-w-sm` from lines 66 and 250 |
| `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` | Remove `max-w-sm` from line 124 |

---

### Task 1: Remove `max-w-sm` from AssistantSetupSection accordions

**Test-first:** no — no test framework supports visual regression for Tailwind class changes in this codebase

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx:66,250`

- [ ] **Step 1: Open the file and locate line 66**

  File: `src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx`

  Current (line 66):
  ```tsx
  className={cn(isCompactView && 'max-w-sm mt-5')}
  ```

  Replace with:
  ```tsx
  className={cn(isCompactView && 'mt-5')}
  ```

  This is inside the outer `<Accordion title="Assistant Setup" ...>` component. The `max-w-sm` cap (384px) is removed; `mt-5` (top margin) is preserved.

- [ ] **Step 2: Locate line 250 in the same file**

  Current (line 250):
  ```tsx
  className={cn(isCompactView && 'max-w-sm')}
  ```

  Replace with: remove the `className` prop entirely from the `<Accordion title="Extra configuration" ...>` opening tag.

  Before:
  ```tsx
  <Accordion
    title="Extra configuration"
    defaultOpen={false}
    className={cn(isCompactView && 'max-w-sm')}
  >
  ```

  After:
  ```tsx
  <Accordion
    title="Extra configuration"
    defaultOpen={false}
  >
  ```

- [ ] **Step 3: Type-check**

  ```bash
  npx tsc --noEmit --project tsconfig.json
  ```

  Expected: no errors in `AssistantSetupSection.tsx`

- [ ] **Step 4: Commit**

  ```bash
  git add src/pages/assistants/components/AssistantForm/components/AssistantSetup/AssistantSetupSection.tsx
  git commit -m "EPMCDME-14000: remove max-w-sm from compact-view accordion blocks"
  ```

---

### Task 2: Remove `max-w-sm` from LLMSelector wrapper

**Test-first:** no — no test framework supports visual regression for Tailwind class changes in this codebase

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx:124`

- [ ] **Step 1: Open the file and locate line 124**

  File: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx`

  Current (line 124):
  ```tsx
  <div className="flex flex-col gap-2 grow max-w-sm">
  ```

  Replace with:
  ```tsx
  <div className="flex flex-col gap-2 grow">
  ```

  This is the outer wrapper `div` returned from the `LLMSelector` component. Removing `max-w-sm` lets the parent container control width. In the standalone assistant form (non-compact), the parent container is already `w-72` (288px < 384px), so visual output there is unchanged. In the chat config panel the selector now fills the container.

- [ ] **Step 2: Type-check**

  ```bash
  npx tsc --noEmit --project tsconfig.json
  ```

  Expected: no errors in `LLMSelector.tsx`

- [ ] **Step 3: Commit**

  ```bash
  git add src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx
  git commit -m "EPMCDME-14000: remove max-w-sm from LLMSelector wrapper"
  ```

---

## Verification

After both tasks are committed, manually verify in the browser:

1. Open a chat and click **Configuration** → **Configure & Test**.
2. Confirm all accordion blocks ("Assistant Setup", "Extra configuration", "Interactive features", "Context & Data Sources", "Image generation", "Skills") are the same full width.
3. In the **General** tab of the same panel, confirm the "LLM Model" dropdown is the same width as the "Skills" dropdown below it.
4. Open the standalone **Edit Assistant** page (not the chat panel). Confirm the assistant form layout is unchanged (logo, name, description fields still show the same layout as before).
