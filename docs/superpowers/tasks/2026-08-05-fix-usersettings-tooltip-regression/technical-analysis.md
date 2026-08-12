# Technical Research

**Task**: UserSettings integrations NavigationMore contextId tooltip
**Generated**: 2026-08-05T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Fix tooltip regression in UserSettings.tsx integration row. This branch (EPMCDME-8420) added a UserSettingActionsCell component to UserSettings.tsx that passes data-tooltip-content to NavigationMore. This causes a visible react-tooltip on hover of the three-dots button, blocking Playwright click on the Delete menu item. Fix: use contextId instead of data-tooltip-content, following the same pattern as MCPServerActions and UsersManagementPage on this branch. Requires: (1) add id to the integration name cell in the name column renderer using naming convention user-setting-name-${item.id}, (2) remove data-tooltip-content from UserSettingActionsCell, (3) add contextId prop referencing that id.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/integrations/components/UserSettings/UserSettings.tsx` — target file; `UserSettingActionsCell` (lines 62–94) contains the regression; `customTableColumns` (lines 205–214) needs the alias renderer
- `src/components/NavigationMore/NavigationMore.tsx` — `contextId` prop supported (line 55); when set: button gets `aria-labelledby="${buttonId} ${contextId}"`, drops `aria-label`; `data-tooltip-content` only shows tooltip when explicitly passed — omitting it removes the tooltip entirely
- `src/pages/settings/administration/components/MCPServerActions.tsx` — reference pattern: `const serverNameId = \`admin-mcp-name-${server.id}\`` → `contextId={serverNameId}`, no `data-tooltip-content`
- `src/pages/settings/administration/UsersManagementPage.tsx` — reference pattern: name column has `<div id={\`user-name-${item.id}\`}>`, actions column passes `contextId={\`user-name-${item.id}\`}` (lines 223–226, 299)
- `src/pages/integrations/IntegrationsTab.tsx` — defines tableColumns passed to UserSettings; `alias` column has key `'alias'`, type `'string'`, no custom renderer currently (line 46)

### Architecture and Layers Affected
- **Integrations page layer**: `IntegrationsTab` → `UserSettings` component → table rendering
- **Shared component layer**: `NavigationMore` (accessibility props)
- The fix is scoped to `UserSettings.tsx` only; `ProjectSettings.tsx` uses a different column set and is unaffected

### Integration Points
- `UserSettingActionsCell` is a new component introduced by this branch; its `contextId` must reference the `id` placed on the alias cell in the same table row
- `NavigationMore` constructs `aria-labelledby="${buttonId} ${contextId}"` — the `contextId` value must be the `id` attribute of the name element in the same DOM row

### Patterns and Conventions
- Naming convention: `{page-prefix}-name-${item.id}` — `user-name-${item.id}` (UsersManagementPage), `admin-mcp-name-${server.id}` (MCPServerActions) → use `user-setting-name-${item.id}` for UserSettings
- When using `contextId`, do NOT pass `data-tooltip-content` — the two props serve different accessibility strategies; mixing them produces both a tooltip and `aria-labelledby`, which is redundant and causes the Playwright interference
- `accessibleName` variable in `UserSettingActionsCell` was used only for the tooltip text — must be removed with the tooltip

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/patterns/accessibility-patterns.md` — project a11y guide; `aria-labelledby` and `sr-only` patterns documented; directly relevant

### Architectural Decisions
- This branch established the `contextId` pattern for NavigationMore throughout admin tables; this fix extends that decision to the integrations table

### Derived Conventions
- When `contextId` is used: no `data-tooltip-content`, no `accessibleName` variable, name cell carries the `id`, actions cell carries `contextId`

---

## 4. Testing Landscape

### Existing Coverage
- `src/components/NavigationMore/__tests__/NavigationMore.test.tsx` — tests `NavigationItem` type, not the trigger button ARIA behavior
- No unit tests for `UserSettingActionsCell` or `UserSettings` column renderers

### Testing Framework and Patterns
- Vitest + React Testing Library; `jest-axe` for accessibility checks per project guide
- Playwright (external test harness) provides the integration test that gates this fix

### Coverage Gaps
- `UserSettingActionsCell` has no unit test coverage — the Playwright test `test_delete_integration_with_confirmation` is the only gate
- No test verifies the `id`/`contextId` wiring in UserSettings

---

## 5. Configuration and Environment

### Environment Variables
- None relevant to this change

### Configuration Files
- None relevant to this change

### Feature Flags and Deployment Concerns
- None; this is a pure DOM attribute change with no feature-flag dependency

---

## 6. Risk Indicators

- `UserSettingActionsCell` has no unit test coverage — fix is unverifiable at unit level; Playwright is the only gate
- `item.alias` on `UserSetting` may be empty string at runtime — should render `item.alias || '-'` consistent with sibling patterns
- The `alias` column in `IntegrationsTab.getTableColumns()` is shared with `ProjectSettings` — adding the renderer only inside `UserSettings.customTableColumns` correctly scopes the change; verify `ProjectSettings` is not affected
- `NavigationMore` blast-radius is narrow (2 existing callers) — adding a third caller via `contextId` is safe

---

## 7. Summary for Complexity Assessment

The task touches one file (`UserSettings.tsx`) in the integrations page layer and one shared component (`NavigationMore`) as a read-only reference. The change is mechanical: remove one prop (`data-tooltip-content`), remove one variable (`accessibleName`), add one prop (`contextId`), and add one column renderer (`alias`). All required patterns are already established and in use on this branch by MCPServerActions and UsersManagementPage.

Test coverage at unit level is absent for the affected component. The only verification path is the external Playwright test (`test_delete_integration_with_confirmation`) which directly exercises the regression. The fix eliminates the tooltip that caused the block; no new test infrastructure is required beyond confirming the Playwright test passes.

Risk is low: the change is isolated, the pattern is proven, and the file surface is minimal (2 targeted edits in one file). The one subtle risk is ensuring the `alias` renderer is added only to `UserSettings.customTableColumns` and not to the shared `IntegrationsTab` column definitions, which would affect `ProjectSettings` unexpectedly.
