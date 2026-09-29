# Technical Analysis - EPMCDME-8546: Prevent Combobox From Opening Automatically on Focus

## Codebase Findings
1. **Autocomplete.tsx**:
   - The shared `Autocomplete` component wrapped PrimeReact's `<AutoComplete>`.
   - The component had an `onFocus` handler that unconditionally called `autocompleteEl.current.search(e, '')`. This triggered suggestion filtering and forced the overlay panel to open automatically when receiving keyboard focus (e.g. during `Tab` navigation), violating WCAG 2.1 SC 3.2.1 (On Focus).
   - In addition, the dropdown chevron icon button acted as a separate tab stop, which forced keyboard-only users to Tab twice per combobox.

2. **ptPreset.ts**:
   - The pass-through preset for Autocomplete configures the styles of its inner elements, including the root wrapper, list items, and `dropdownButton`.
   - The dropdown button had no custom accessibility configuration, causing it to remain tabbable by default.

## Risk Indicators
- **UI/Component Scope**: Low risk. Isolated entirely to the shared `Autocomplete` component and its pass-through style preset.
- **Backend / Database Changes**: None. Zero impact on API contracts or database schemas.
- **Dependencies**: No new npm packages or version bumps.
