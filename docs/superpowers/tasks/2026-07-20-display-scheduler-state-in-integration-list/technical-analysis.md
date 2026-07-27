# Technical Research

**Task**: integration scheduler state toggle list-view
**Generated**: 2026-07-20T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Display Scheduler State (Enabled/Disabled) in Integration Page List View. Currently, users must open each scheduler record in the Integration page to determine whether an individual scheduler is enabled or disabled. This leads to inefficient navigation and poor user experience, especially when managing multiple schedulers. This feature will introduce a visual indicator (e.g., toggle, icon, or column) in the Integration page's scheduler list to immediately show each scheduler's current state (enabled/disabled) without requiring record expansion or additional steps. Acceptance Criteria: Each scheduler record on the Integration page list displays a readable state indicator (such as text, icon, or toggle) showing whether it is enabled or disabled. Users do not need to open/edit individual scheduler records to determine their state. State indicators are updated in real time or upon page refresh. No regressions in the current scheduler editing/creation logic or Integration page performance.

---

## 2. Codebase Findings

### Existing Implementations

**Pages (entry points):**
- `src/pages/integrations/IntegrationsPage.tsx` — Top-level page; renders the integration-type selector (User/Project) and toolbar, renders `IntegrationsTab`.
- `src/pages/integrations/IntegrationsTab.tsx` — Defines `getTableColumns(isUserColumns)` which builds the `ColumnDefinition[]` array passed to `UserSettings` and `ProjectSettings`. **Primary file for adding the new column.** Current columns: `project_name`, `alias`, `credential_type`, `is_global` (user only), `credential_values`, `actions`.
- `src/pages/integrations/components/UserSettings/UserSettings.tsx` — Renders the user-settings table; holds `customRenderColumns` map with renderers for `credential_type`, `credential_values`, and `actions`.
- `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx` — Identical pattern for project-scoped integrations.
- `src/pages/integrations/EditUserIntegrationPage.tsx` — Edit form for user integrations; reads `credential_values` to populate fields including the `is_enabled` switch.
- `src/pages/integrations/EditProjectIntegrationPage.tsx` — Same for project integrations.

**Reusable components:**
- `src/components/Table/Table.tsx` — Generic table accepting a `customRenderColumns` map; the `Custom` column type delegates rendering to the caller via a render function.
- `src/components/Table/TableCell.tsx` — Renders individual cells; `DefinitionTypes.Boolean` emits "Yes"/"No" text; `DefinitionTypes.Custom` calls the provided render function.
- `src/components/form/Switch/Switch.tsx` — Reusable toggle/switch (`forwardRef` over a native checkbox with `role="switch"`). Currently used in the scheduler edit form for `is_enabled`. Not currently used in any list view.
- `src/components/StatusBadge/StatusBadge.tsx` — Read-only pill badge with colored dot and status text. `StatusEnum` values: `not_started`, `in_progress`, `pending`, `error`, `warning`, `success`. Used in other list pages (e.g., AWS agent-core runtimes). The correct component for read-only state display in a list column.

**State management:**
- `src/store/userSettings.ts` — Valtio proxy store. Exposes `fetchUserSettings`, `updateUserSetting(id, values)` (calls `PUT v1/settings/user/{id}`), `deleteUserSetting`, and the `userSettings[]` list state.
- `src/store/projectSettings.ts` — Same pattern for project integrations; `updateProjectSetting(id, values)` calls `PUT v1/settings/project/{id}`.

**Domain config and utilities:**
- `src/utils/settingsUIConfig.ts` — `CREDENTIAL_UI_MAPPING` defines UI field schemas per credential type. The `scheduler` entry declares `is_enabled` as `CredentialComponentType.switch` at `position: CredentialComponentPosition.top`. The `webhook` type also has `is_enabled`. Both confirm that `is_enabled` is stored as a key-value entry inside `credential_values`.
- `src/utils/settings.ts` — Helpers: `getSettingCredsURL`, `getCredentialUIMapping`, `getOriginalCredentialType`, `convertCredsToKeyValue`.
- `src/constants/integration.ts` — Currently holds `IntegrationOption` enum (`USER`/`PROJECT`) and `GOOGLE_OAUTH_CREDENTIAL_TYPE`. New label constants for "Enabled"/"Disabled" should be added here if used in multiple places.

**Type definitions:**
- `src/types/entity/setting.ts` — `BaseSetting` interface. The `is_enabled` state is NOT a top-level field; it lives in `credential_values: SettingCredentialValue[]` where each entry is `{ key: string; value: string | boolean }`. To read it: `item.credential_values.find(cv => cv.key === 'is_enabled')?.value`.
- `src/types/table.ts` — `ColumnDefinition` interface and `DefinitionTypes` enum. Supports: `String`, `Date`, `User`, `Boolean`, `Custom`, `Selection`.
- `src/types/settingsUI.ts` — `CredentialComponentType.switch`, `CredentialComponentPosition`.

**Prior art for badge mapping pattern:**
- `src/pages/settings/aws/agentCoreRuntimes/constants.ts` — `RUNTIME_BADGE_MAP`: a `Record<string, { text: string; statusEnum: StatusType }>` constant mapping domain state strings to `StatusBadge` props. This exact pattern should be replicated for the scheduler enabled/disabled indicator.

### Architecture and Layers Affected

| Layer | Component | Change Required |
|---|---|---|
| Page / Column-definition | `IntegrationsTab.tsx` | Add new `ColumnDefinition` entry for scheduler state (`type: 'custom'`, key e.g. `'is_enabled'`) |
| Page / List renderer | `UserSettings.tsx` | Add `is_enabled` entry to `customTableColumns` map; render `StatusBadge` conditioned on `credential_type === 'scheduler'` |
| Page / List renderer | `ProjectSettings.tsx` | Same as `UserSettings.tsx` |
| Component | `StatusBadge` | Reused as-is; no changes needed |
| Constants | `src/constants/integration.ts` | Add label constants for `'Enabled'` / `'Disabled'` strings if used in multiple places |
| Store | `userSettings.ts`, `projectSettings.ts` | No changes needed — `credential_values` including `is_enabled` is already fetched and stored |
| API | `PUT v1/settings/user/:id`, `PUT v1/settings/project/:id` | No changes needed — used by existing update methods if interactive toggle is desired |
| Types | `src/types/entity/setting.ts` | No changes needed — `credential_values: SettingCredentialValue[]` with `value: string | boolean` already accommodates the boolean |

### Integration Points

**Internal dependencies touched by this task:**
- `src/store/userSettings.ts` and `src/store/projectSettings.ts` — data source for list rows via `useSnapshot()`
- `src/utils/settings.ts` — `getSettingCredsURL` already used in `credential_values` column renderer; no new utility needed unless a helper for extracting `is_enabled` is extracted
- `src/utils/settingsUIConfig.ts` — confirms the field exists and its key name (`is_enabled`) for both scheduler and webhook types
- `src/types/entity/setting.ts` — the type used throughout the list rendering pipeline
- `src/types/table.ts` — `DefinitionTypes.Custom` is the correct column type

**No external service calls are needed.** The `credential_values` array (including `is_enabled`) is already returned by the existing `GET v1/settings/user` and `GET v1/settings/project` list endpoints. No new API endpoints are required.

### Patterns and Conventions

**Column definition pattern (from `IntegrationsTab.tsx`):**
The `is_global` column uses `{ label: 'Global', key: 'is_global', type: 'boolean' }` which renders "Yes"/"No" text via `DefinitionTypes.Boolean`. For a visual badge, `type: 'custom'` is required, paired with a `customRenderColumns` entry.

**Custom column render pattern (from `UserSettings.tsx` / `ProjectSettings.tsx`):**
```ts
const customTableColumns: TableProps<UserSetting>['customRenderColumns'] = {
  credential_type: (item) => humanize(item.credential_type),
  credential_values: (item) => getSettingCredsURL(item.credential_values, ...),
  actions: (item) => <NavigationMore ...>
}
```
The new `is_enabled` entry follows this pattern with the key matching the column definition's `key`.

**Conditional column pattern:** The `is_global` column is conditionally included via `...(isUserColumns ? [isGlobalColumn] : [])`. If the scheduler state column should only appear for scheduler-type rows (rather than all rows), the same spread-conditional approach applies at the column definition level. Alternatively, the renderer can return `null` for non-scheduler rows.

**`StatusBadge` badge-map pattern (from `src/pages/settings/aws/agentCoreRuntimes/constants.ts`):**
```ts
export const SCHEDULER_BADGE_MAP: Record<string, { text: string; statusEnum: StatusType }> = {
  enabled: { text: 'Enabled', statusEnum: StatusEnum.Success },
  disabled: { text: 'Disabled', statusEnum: StatusEnum.NotStarted },
}
```
The badge map constant belongs in `src/constants/integration.ts` or a new `src/pages/integrations/constants.ts`.

**Accessibility requirement:** Per `accessibility-patterns.md`, color must NOT be the only means of conveying state. `StatusBadge` already satisfies this requirement as it renders both a colored dot AND a text label.

**No i18n system exists.** All UI text is hard-coded English strings. No translation files need updating.

---

## 3. Documentation Findings

### Guides and Architecture Docs

The `.ai-run/guides/` directory exists and contains the following guides directly relevant to this task:

- `.ai-run/guides/architecture/architecture.md` — Defines the strict three-layer pattern: Component → Store → API. All state must come from Valtio stores via `useSnapshot`; direct API calls must never appear in components.
- `.ai-run/guides/components/reusable-components.md` — Catalogs `Switch` (`@/components/form/Switch`), `StatusBadge` (`@/components/StatusBadge`), and `Table` with `DefinitionTypes.Custom`. The `Switch` is the canonical toggle; `StatusBadge` is the canonical read-only status indicator.
- `.ai-run/guides/components/component-patterns.md` — Mandates `useSnapshot` for reading store state, `cn()` for Tailwind conditionals, single-quotes, no inline styles, 300-line file limit per component file.
- `.ai-run/guides/development/api-integration.md` — Confirms `PUT v1/settings/user/:id` and `PUT v1/settings/project/:id` exist in the stores for updating a setting.
- `.ai-run/guides/development/constants-usage.md` — New string labels used in two or more places must be extracted to `src/constants/`.
- `.ai-run/guides/testing/qa-health.md` — Explicitly notes `src/pages/integrations/` has 0% test coverage. Any new column or component should include tests.
- `.ai-run/guides/patterns/accessibility-patterns.md` — WCAG 2.1 AA required; icon or text label must accompany any color indicator.

### Architectural Decisions

- `is_enabled` for schedulers is stored inside `credential_values[]` (not as a top-level field) — this is a deliberate data model decision applying to all integration credential types. The form-submission code in `SettingsForm` bundles all field values (including switches) into the `credential_values` array.
- A previous bug (EPMCDME-8108) resolved confusing "Authentication" title on the Enable/Disable switcher in the scheduler creation form. Resolution was setting `fieldsSectionTitle: ''` in `settingsUIConfig.ts`. No further changes to that form area are needed.
- A previous bug (EPMCDME-8025) confirmed scheduler type must appear in the type filter on the Integrations page — it is already correctly included.

### Derived Conventions

- **300-line component file limit** — If `UserSettings.tsx` or `ProjectSettings.tsx` grows beyond this with the new renderer, extract the renderer to a co-located sub-component file.
- **Constants for strings used in 2+ places** — `'Enabled'` and `'Disabled'` labels used in both `UserSettings` and `ProjectSettings` (and potentially in a badge map) must be constants in `src/constants/integration.ts`.
- **Valtio store pattern** — Toggling state inline (if interactive toggle is chosen) must go through the store's `updateUserSetting` / `updateProjectSetting` methods; never call `api.put()` directly from a component.

---

## 4. Testing Landscape

### Existing Coverage

**Scheduler cron utilities — covered:**
- `src/utils/__tests__/cronValidator.test.ts` — Comprehensive unit tests for `isValidCronExpression`, `isMoreFrequentThanHourly`, `validateCronExpression`, `getCronDescription`, `getNextCronRun`. Does NOT cover `is_enabled`.

**Settings utilities — partially covered:**
- `src/utils/__tests__/settings.test.ts` — Tests `getSettingCredsURL`, `getOriginalCredentialType`, `convertCredsToKeyValue`, `getAvailableCredentialsTypes`, `generateDefaultAlias`. Does NOT test `scheduler`-type credential extraction; only tests `github` type for `getSettingCredsURL`.

**No coverage for the affected pages:**
- `src/pages/integrations/IntegrationsPage.tsx` — 0% coverage
- `src/pages/integrations/IntegrationsTab.tsx` — 0% coverage
- `src/pages/integrations/components/UserSettings/UserSettings.tsx` — 0% coverage
- `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx` — 0% coverage
- `src/pages/integrations/components/SettingsForm/CredentialFields.tsx` — 0% coverage (includes existing `is_enabled` switch rendering)

### Testing Framework and Patterns

**Framework:** Vitest (two-project workspace: `unit` and `integration`).

**Libraries:** `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `vitest`.

**Unit test pattern:** `describe`/`it`/`expect` with `vi`. Valtio stores are mocked via `vi.mock('@/store', ...)`. No rendering required for pure-function tests.

**Integration test pattern:** `renderPage('/integrations')` helper (from `src/test-utils/integration.tsx`) renders the full app at a route via `createMemoryRouter`. `mockAPI('GET', 'v1/settings/user', responseData)` intercepts fetch. `userEvent.setup()` for interactions. `waitFor(() => expect(screen.getByText(...)).toBeInTheDocument())` for async assertions.

**Mock conventions:** `vi.mock('@/utils/toaster', ...)` suppressed globally in `setupTests.tsx`. Global default API mocks for `v1/user`, `v1/config`, etc. are in `setupTests.tsx`; per-test overrides use `mockAPI`.

**No fixture files or factory pattern** — test data is inlined per test file.

### Coverage Gaps

The following areas will be touched by this task and have zero existing test coverage:

1. `IntegrationsTab.tsx` — `getTableColumns()` function: no test for the column array content or conditional logic.
2. `UserSettings.tsx` — `customTableColumns` object: no test for the custom renderers; no component render test.
3. `ProjectSettings.tsx` — same gaps as `UserSettings.tsx`.
4. `CredentialFields.tsx` — the `Switch` render path for `is_enabled` is untested (used in create/edit forms for both scheduler and webhook types).
5. Any new `extractIsEnabled()` or `buildSchedulerBadgeProps()` utility helper: will need unit tests following the `settings.test.ts` pattern.
6. Any new integration-test scenario for the scheduler state column: no `IntegrationsPage.integration.test.tsx` file exists.

---

## 5. Configuration and Environment

### Environment Variables

No scheduler-specific or integration-state-specific environment variables exist. The only relevant env var is:
- `VITE_API_URL` — base path for all API calls (`/api` locally, proxied to the backend).

No new environment variables are needed for this feature.

### Configuration Files

- `vite.config.ts` — Build and dev-server proxy configuration. No changes needed.
- `src/utils/settingsUIConfig.ts` — Domain configuration for credential type field schemas. No changes needed; `is_enabled` as a `switch` field is already defined for both `scheduler` and `webhook`.

### Feature Flags and Deployment Concerns

- **No feature flag gates the scheduler credential type.** The `scheduler` type in `CREDENTIAL_UI_MAPPING` has no `enterpriseOnly` flag, no `personalFeatureFlag`, no `roleRestrictionType` override (defaults to `GENERAL`), and no `accessType` restriction (defaults to `ALL`). The feature is available in all editions to all users.
- The `VITE_IS_ENTERPRISE_EDITION` env var gates only LiteLLM integrations; not relevant here.
- No deployment manifest changes are needed.
- No secrets management changes are needed.

---

## 6. Risk Indicators

- **Zero test coverage for the entire integration page area** — `IntegrationsPage.tsx`, `IntegrationsTab.tsx`, `UserSettings.tsx`, `ProjectSettings.tsx`, and `CredentialFields.tsx` all have 0% coverage. Any regression introduced in the column definition or custom renderer would go undetected without new tests. The `.ai-run/guides/testing/qa-health.md` guide explicitly flags this.

- **`is_enabled` is not a top-level field** — it lives inside `credential_values[]` as `{ key: 'is_enabled', value: boolean }`. This is non-obvious; the extraction logic `item.credential_values.find(cv => cv.key === 'is_enabled')?.value` must be correct and null-safe. Scheduler entries without `is_enabled` in `credential_values` (e.g., legacy data) would silently show no indicator without defensive handling.

- **Both `scheduler` and `webhook` credential types have `is_enabled`** — if the column is added for all rows (not just scheduler), the same badge will appear for webhooks. The acceptance criteria mentions "scheduler" specifically; the renderer must conditionally handle rows where `credential_type.toLowerCase() !== 'scheduler'` (either hide the badge or also show it for webhook). This decision must be clarified before implementation.

- **No mock-server data for scheduler credential type** — the `mock-server/db.json` file contains webhook-type integration examples with `is_enabled` but no scheduler examples. Integration tests will need to mock the API response with a scheduler-type record including `credential_values[{ key: 'is_enabled', value: ... }]`.

- **`getSettingCredsURL` for scheduler returns `'AutoGenerated'`** — the existing `credential_values` column in the list already shows `'AutoGenerated'` for all scheduler rows. If the new column also renders alongside this, the `credential_values` column may look redundant for scheduler rows. A UX review of the full column set post-change is advisable.

- **No documentation** for the `CREDENTIAL_UI_MAPPING` pattern (`settingsUIConfig.ts`) in the guides. The pattern must be inferred from code. The `scheduler` config block at line 663–715 is the authoritative source.

- **300-line component file limit** — `UserSettings.tsx` and `ProjectSettings.tsx` are already reasonably sized. Adding an inline renderer plus a badge-map constant could push one or both toward the limit. If it does, the renderer should be extracted to a sub-component file (e.g., `SchedulerStateBadge.tsx`) to comply with the guide policy.

- **Accessibility constraint** — color-only status indicators are prohibited per `accessibility-patterns.md`. The `StatusBadge` component complies (renders both a colored dot and a text label). A plain colored icon or CSS-only indicator would violate WCAG 2.1 AA.

---

## 7. Summary for Complexity Assessment

This feature touches the **Page** and **Component** layers exclusively. The Store, API, and Type layers require no changes — the `is_enabled` boolean is already present in every scheduler integration's `credential_values` array returned by the existing paginated list endpoints (`GET v1/settings/user` and `GET v1/settings/project`). The primary file-change surface is three files: `IntegrationsTab.tsx` (column definition addition), `UserSettings.tsx` (custom renderer addition), and `ProjectSettings.tsx` (same custom renderer). A fourth file, `src/constants/integration.ts`, will need two string constants added. If a reusable `SchedulerStateBadge` sub-component is extracted (recommended by the 300-line guide policy), that adds one new file. Total estimated file changes: 4–5 files, all shallow edits.

The task follows an established pattern with prior art: the `StatusBadge` + `BADGE_MAP` constant pattern already exists in `src/pages/settings/aws/agentCoreRuntimes/constants.ts`, and the `DefinitionTypes.Custom` + `customRenderColumns` table extension pattern is used for the `credential_type` and `actions` columns already in `UserSettings.tsx` and `ProjectSettings.tsx`. No new patterns, new architectural layers, or new dependencies are introduced. Technical novelty is low.

The primary risk is the absence of any test coverage for the integration pages. The affected components (`IntegrationsTab`, `UserSettings`, `ProjectSettings`) have 0% coverage, meaning any regression introduced would be invisible without adding new tests. A component render test for the new scheduler state column and a utility unit test for any `is_enabled` extraction helper should be included. The integration test pattern (`renderPage` + `mockAPI`) is well-established in the codebase and can be applied directly. The secondary risk is the need to decide whether the state indicator should appear for all rows (scheduler and webhook both have `is_enabled`) or scheduler rows only — this ambiguity should be resolved before implementation begins.
