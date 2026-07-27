# Technical Analysis — fix-aria-tabs-roles

## Codebase Findings

### Component locations

| File | Role |
|---|---|
| `src/components/Tabs/Tabs.tsx` | Container — renders the tab-list `<div>` and tab panel |
| `src/components/Tabs/Tab.tsx` | Individual tab button (`TabsButton`) |
| `src/components/Tabs/index.ts` | Re-exports |

### Current ARIA audit

| Attribute | Required on | Status |
|---|---|---|
| `role="tablist"` | `<div>` wrapping all `<TabsButton>` elements (Tabs.tsx ~line 71) | **MISSING** |
| `role="tab"` | each `<button>` | Present (Tab.tsx line 38) |
| `aria-selected` | each `<button role="tab">` | **MISSING** — `isActive` prop drives only CSS classes |
| `role="tabpanel"` | content `<div>` | Present (Tabs.tsx line 91) |

### Affected surfaces

The shared `<Tabs>` component is used by:
- `src/components/form/VersionedField/VersionedField.tsx` — "Edit mode" / "Version History" on the edit-workflow page
- `src/pages/workflows/editor/ConfigPanel.tsx` — "Basic", "Advanced", "YAML", "Issues" in the workflow editor
- `src/pages/workflows/editor/configPanels/YamlPanel.tsx` — inner YAML panel tabs
- `src/pages/workflows/components/ViewWorkflow.tsx` — "Executions" / "Configuration" (currently orphaned)

All consumers inherit the fix automatically.

### Existing tests

No test file exists for the Tabs component (`src/components/Tabs/__tests__/` is absent). Other component tests use `@testing-library/react` + `vitest`.

## Risk Indicators

- Low risk: pure attribute additions; no behaviour change, no styling change.
- The `isActive` prop is already passed to `Tab.tsx`; adding `aria-selected={isActive}` requires no new props.
- Adding `role="tablist"` to the container `<div>` in `Tabs.tsx` requires no new props.
- No downstream consumers need updating.
