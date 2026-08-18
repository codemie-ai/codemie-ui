# EPMCDME-14130: Refresh Button Alignment Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 px vertical misalignment between the "Add User Integration" button and the Refresh button in `IntegrationSection` when `isRequired=false` and no integrations exist (Git datasource type).

**Architecture:** Two changes in a single file (`IntegrationSection.tsx`): change `!h-8` → `h-8` on the Refresh button (removes `!important` antipattern; `tailwind-merge` v3 correctly merges plain `h-8` with `h-7`), and add `buttonClassName="h-8"` to `IntegrationSelector` so the "Add User Integration" button also reaches 32 px. Both paths then have a 32 px element on each side of the `flex items-end` row, producing correct alignment.

**Tech Stack:** React, Tailwind CSS v3, tailwind-merge v3, Vitest + React Testing Library

---

### Task 1: Add failing alignment tests

**Test-first: yes — two failing assertions verifying the `h-8` class on each button**

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/__tests__/IntegrationSection.test.tsx`

- [ ] **Step 1: Append two `it` blocks inside the existing `describe('IntegrationSection')` block, at the end of the file (before the closing `})`)**

  Add after line 169 (the last `})` inside the `describe('Refresh button', ...)` block), still inside `describe('IntegrationSection', ...)`:

  ```tsx
  describe('button alignment heights', () => {
    it('Refresh button carries h-8 class (not !h-8) for items-end alignment', () => {
      render(<TestWrapper hasNoSettings={true} isDropdownShown={false} settings={[]} />)
      const refreshBtn = screen.getByRole('button', { name: /refresh/i })
      expect(refreshBtn).toHaveClass('h-8')
      expect(refreshBtn).not.toHaveClass('!h-8')
    })

    it('Add User Integration button carries h-8 class to match Refresh button height', () => {
      render(
        <TestWrapper
          hasNoSettings={true}
          isDropdownShown={false}
          settings={[]}
          isRequired={false}
        />
      )
      const addBtn = screen.getByRole('button', { name: /add user integration/i })
      expect(addBtn).toHaveClass('h-8')
    })
  })
  ```

- [ ] **Step 2: Run the new tests to confirm they fail (RED)**

  ```bash
  npx vitest run src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/__tests__/IntegrationSection.test.tsx --reporter=verbose 2>&1 | tail -30
  ```

  Expected: two failures —
  - `Refresh button carries h-8 class (not !h-8)...` → FAIL: expected `h-8`, received class list includes `h-7 !h-8`
  - `Add User Integration button carries h-8 class...` → FAIL: expected `h-8`, received class list includes `h-7` only

- [ ] **Step 3: Commit the failing tests**

  ```bash
  git add src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/__tests__/IntegrationSection.test.tsx
  git commit -m "EPMCDME-14130: Add failing alignment tests for h-8 button heights"
  ```

---

### Task 2: Implement the fix

**Test-first: yes — tests written in Task 1**

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/IntegrationSection.tsx:118-127`

- [ ] **Step 1: Change `!h-8` → `h-8` on the Refresh button (line 124) and add `buttonClassName="h-8"` to `IntegrationSelector` (after `selectClassName`, line 109)**

  Current block (lines 103–127):

  ```tsx
  return (
    <IntegrationSelector
      value={selectedSetting}
      settingsDefinitions={isDropdownShown ? settingsDefinitions : []}
      label={integrationLabel}
      placeholder={integrationPlaceholder}
      addButtonLabel="Add User Integration"
      selectClassName="max-w-full w-full"
      onChange={(setting) => settingField.onChange(setting?.id)}
      onAddSettingClick={onOpenIntegrationPopup}
      disabled={isRequired && hasNoSettings}
    />
  ```

  Change `IntegrationSelector` to add `buttonClassName`:

  ```tsx
  return (
    <IntegrationSelector
      value={selectedSetting}
      settingsDefinitions={isDropdownShown ? settingsDefinitions : []}
      label={integrationLabel}
      placeholder={integrationPlaceholder}
      addButtonLabel="Add User Integration"
      selectClassName="max-w-full w-full"
      buttonClassName="h-8"
      onChange={(setting) => settingField.onChange(setting?.id)}
      onAddSettingClick={onOpenIntegrationPopup}
      disabled={isRequired && hasNoSettings}
    />
  ```

  Current Refresh button (lines 118–127):

  ```tsx
  <Button
    variant="secondary"
    size={ButtonSize.MEDIUM}
    onClick={handleRefresh}
    disabled={isRefreshing}
    aria-label="Refresh integrations"
    className="!h-8 shrink-0"
  >
  ```

  Change to:

  ```tsx
  <Button
    variant="secondary"
    size={ButtonSize.MEDIUM}
    onClick={handleRefresh}
    disabled={isRefreshing}
    aria-label="Refresh integrations"
    className="h-8 shrink-0"
  >
  ```

- [ ] **Step 2: Run the full test file to confirm all tests pass (GREEN)**

  ```bash
  npx vitest run src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/__tests__/IntegrationSection.test.tsx --reporter=verbose 2>&1 | tail -30
  ```

  Expected: all tests PASS, including the two new alignment tests.

- [ ] **Step 3: Run the integration test to confirm no regression**

  ```bash
  npx vitest run src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx --reporter=verbose 2>&1 | tail -20
  ```

  Expected: all tests PASS.

- [ ] **Step 4: Commit the implementation**

  ```bash
  git add src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/IntegrationSection.tsx
  git commit -m "EPMCDME-14130: Fix Refresh button alignment — use h-8 on both buttons in IntegrationSection"
  ```
