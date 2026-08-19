# Plan — EPMCDME-14263

## Tasks

### Task 1 — Update IntegrationSelectDropdown test (TDD red)
Test-first: yes — update the test `"renders a disabled Select (not the add button) when disabled=true and settingsDefinitions is empty"` in `IntegrationSelectDropdown.test.tsx` to expect the "Add User Integration" button instead of a combobox.

File: `src/pages/assistants/components/AssistantForm/components/Toolkits/__tests__/IntegrationSelectDropdown.test.tsx`

### Task 2 — Update IntegrationSection test (TDD red)
Test-first: yes — update the test `"renders a disabled dropdown instead of the standalone add button"` in `IntegrationSection.test.tsx` to expect the button and no disabled combobox.

File: `src/pages/dataSources/components/DataSourceForm/IndexTypeField/shared/__tests__/IntegrationSection.test.tsx`

### Task 3 — Fix IntegrationSelectDropdown (TDD green)
Remove `!disabled &&` from the empty-state branch condition at line 80.

File: `src/pages/assistants/components/AssistantForm/components/Toolkits/IntegrationSelectDropdown.tsx`

Change:
```tsx
if (!disabled && (!selectOptions || !settingsDefinitions || settingsDefinitions.length === 0)) {
```
To:
```tsx
if (!selectOptions || !settingsDefinitions || settingsDefinitions.length === 0) {
```
