# Implementation Plan - EPMCDME-8546: Prevent Combobox From Opening Automatically on Focus

## Goal Description
Fix accessibility and UX violation (**WCAG 2.1 SC 3.2.1: On Focus**) where combobox fields (`Autocomplete` and `FormAutocomplete`) automatically open their suggestion overlays whenever receiving keyboard focus (e.g. navigating via `Tab`).

### Context & Version Differences
On `https://codemie.lab.epam.com/data-sources/create` and across the application:
* **"Datasource Type"**, **"Summarization Method"**, **"Model used for embeddings"**, and **"Model used for summary generation"** (as well as Integration fields like "Authentication Type" / "Credential Type") use the shared [`Autocomplete.tsx`](../../../../src/components/form/Autocomplete/Autocomplete.tsx) component.
* In [`Autocomplete.tsx`](../../../../src/components/form/Autocomplete/Autocomplete.tsx#L144-L148), `handleFocus` unconditionally triggered `autocompleteEl.current.search(e, '')`, forcing PrimeReact to evaluate all suggestions and pop open the overlay immediately on focus.
* Conversely, **"Reindex Type"** and **"Expression"** use [`Select.tsx`](../../../../src/components/form/Select/Select.tsx) (PrimeReact `<Dropdown>`) which works as intended (does not open on focus).
* In addition, the dropdown chevron icon button currently acts as a separate tab stop, forcing keyboard users to Tab twice per combobox.

```mermaid
flowchart TD
    subgraph Current Flow (Bug)
        A1["User Tabs to Autocomplete Input"] --> B1["handleFocus fires"]
        B1 --> C1["Calls search('', e)"]
        C1 --> D1["Overlay opens automatically ❌ (WCAG 3.2.1 Violation)"]
        D1 --> E1["User Tabs again -> lands on Chevron Button ❌ (Duplicate Tab stop)"]
    end

    subgraph Proposed Flow (Compliant with ARIA 1.2 & WCAG 3.2.1)
        A2["User Tabs to Autocomplete Input"] --> B2["Input receives focus"]
        B2 --> C2["Overlay remains closed ✅"]
        C2 --> D2{"User action"}
        D2 -- "Types query" --> E2["completeMethod fires -> Filters & opens options ✅"]
        D2 -- "Presses ArrowDown / ArrowUp" --> F2["Opens dropdown overlay & navigates items ✅"]
        D2 -- "Presses Escape" --> G2["Closes dropdown overlay ✅"]
        D2 -- "Clicks chevron button" --> H2["Toggles dropdown overlay ✅"]
        D2 -- "Presses Tab" --> I2["Moves directly to next form field ✅ (tabIndex -1 on chevron)"]
    end
```

---

## Edge Cases & Architectural Analysis

| Edge Case | Risk / Impact | Solution / Handling |
|---|---|---|
| **Custom Value Entry (`allowNew={true}`)** | If focus opened a popup, the popup would cover typed text and make editing frustrating. | Removing focus-triggered search allows free text entry and backspacing. `handleBlur` saves custom value cleanly. |
| **External API Filtering (`localFilter: false`, `minSymbolsToSearch > 0`)** | Previous auto-search on focus bypassed symbol limits or fired redundant empty queries over network. | Without auto-search on focus, API searches only trigger when user types $\ge$ `minSymbolsToSearch` characters. |
| **Keyboard Opening without typing** | Keyboard users who don't want to type need a way to open the full list of options. | In `handleKeyDown`, pressing `ArrowDown` or `ArrowUp` on a closed combobox calls `search(e, '')` to open the list and focus items. |
| **Closing via Keyboard** | User opens dropdown with keyboard and wants to dismiss without selection. | In `handleKeyDown`, pressing `Escape` when panel is open dismisses the overlay (`autocompleteEl.current?.hide()`). |
| **Duplicate Tab Stops** | PrimeReact renders a `<button>` for the chevron which by default is in the tab order. | Set `tabIndex: -1` on `dropdownButton.root` in `ptPreset.ts`. Mouse click still works, but keyboard tab order is streamlined to 1 stop per combobox. |
| **Option Selection & Blur Reset** | If user types invalid text and tabs away when `allowNew={false}`. | `handleBlur` checks `isExistingOption` and reverts to previously selected value if invalid. |

---

## SDLC & Git Environment State
* **Jira Ticket**: [EPMCDME-8546](https://jiraeu.epam.com/browse/EPMCDME-8546) moved to **`In Progress`** and assigned to **`Bohdan Leshko`**.
* **Target Branch**: Created `feature/EPMCDME-8546-prevent-combobox-auto-open-on-focus` branched from latest **`origin/main`** (`ad9ee8f57`).
* **Commit Message Format**: `EPMCDME-8546: Prevent combobox from opening automatically on focus`

---

## Proposed Code Changes

### Frontend Core Components (`codemie-ui`)

#### [MODIFY] [`src/components/form/Autocomplete/Autocomplete.tsx`](../../../../src/components/form/Autocomplete/Autocomplete.tsx)
- Remove `autocompleteEl.current.search(e, '')` from `handleFocus`.
- In `handleKeyDown`:
  - If closed and user presses `ArrowDown` / `ArrowUp`, call `autocompleteEl.current.search(e as any, '')` to open suggestions.
  - If open and user presses `Escape`, close the panel.
- In `handleDropdownClick`: Keep toggling dropdown on mouse click.

```typescript
// src/components/form/Autocomplete/Autocomplete.tsx

const handleFocus = () => {
  // Do not automatically trigger search on focus (WCAG 3.2.1 compliance)
}

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!isPanelOpen.current && autocompleteEl.current && !disabled) {
      e.preventDefault()
      autocompleteEl.current.search(e as any, '')
      return
    }

    const panel = document.querySelector('.p-autocomplete-panel')
    if (panel) {
      const items = panel.querySelectorAll<HTMLElement>('.p-autocomplete-items > li')
      if (items.length > 0) {
        e.preventDefault()
        if (e.key === 'ArrowDown') {
          items[0].focus()
        } else {
          items[items.length - 1].focus()
        }
      }
    }
  } else if (e.key === 'Escape' && isPanelOpen.current) {
    e.preventDefault()
    autocompleteEl.current?.hide()
  }
}
```

---

## Verification Plan

### Automated Tests
1. **Autocomplete Unit Tests**:
   ```powershell
   npm test -- src/components/form/Autocomplete/__tests__/Autocomplete.test.tsx
   ```
2. **DataSource Page Integration Tests**:
   ```powershell
   npm test -- src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx
   ```
3. **Pre-Commit Quality Gates**:
   ```powershell
   npm run typecheck
   npm run lint
   ```

### Manual Verification
1. Open `http://localhost:5173/data-sources/create`.
2. Press `Tab` repeatedly to cycle through the form controls:
   - Observe focus lands on "Name" -> "Description" -> "Shared with project" -> "Datasource Type" -> "Summarization Method" -> "Model used for embeddings".
   - Confirm **zero dropdown panels pop open automatically**.
   - Confirm pressing `Tab` advances from one combobox directly to the next without stopping on the chevron arrow.
3. On "Datasource Type", press `ArrowDown` -> confirm dropdown list opens and options can be navigated with arrows.
4. Press `Escape` -> confirm dropdown list closes.
5. Click the chevron button with mouse -> confirm dropdown toggles open and closed.
