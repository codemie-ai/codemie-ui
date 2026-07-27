# Plan: Display Scheduler State in Integration Page List View

**Ticket**: EPMCDME-8260  
**Branch**: EPMCDME-8260_display-scheduler-state-in-integration-list  
**Scope clarification**: Badge shows for all rows with `is_enabled` in `credential_values` (scheduler + webhook).

---

## Requirements

Add an Enabled/Disabled status badge column to the Integration page list view (both User and Project tabs). The badge must show for any integration row whose `credential_values` array contains an entry with `key === 'is_enabled'` (currently: scheduler and webhook types). No backend changes are needed — `is_enabled` is already present in the existing list API response.

---

## Tasks

### T1 — Add badge-map constant to `src/constants/integration.ts`

Add `INTEGRATION_ENABLED_BADGE_MAP` — a `Record<string, { text: string; statusEnum: StatusType }>` that maps `'enabled'` → success badge and `'disabled'` → not-started badge. Add label string constants `INTEGRATION_STATE_ENABLED = 'Enabled'` and `INTEGRATION_STATE_DISABLED = 'Disabled'`.

Test-first: yes — unit test asserts the map has `'enabled'` and `'disabled'` keys and that each resolves the correct `statusEnum` and `text`.

### T2 — Create `IntegrationStateBadge` sub-component

New file: `src/pages/integrations/components/IntegrationStateBadge/IntegrationStateBadge.tsx`

Props: `credentialValues: SettingCredentialValue[]`. Reads `credentialValues.find(cv => cv.key === 'is_enabled')?.value`. Returns `null` if the key is absent (non-scheduler/webhook rows or missing data). Otherwise renders `<StatusBadge>` using `INTEGRATION_ENABLED_BADGE_MAP`.

Test-first: yes — unit tests: (a) `is_enabled: true` → renders "Enabled" badge; (b) `is_enabled: false` → renders "Disabled" badge; (c) `credential_values` without `is_enabled` → renders nothing (`null`).

### T3 — Add `is_enabled` column definition in `IntegrationsTab.tsx`

Insert `{ label: 'State', key: 'is_enabled', type: 'custom' }` into the `getTableColumns` array, between the `credential_values` (URL) column and the `actions` column.

Test-first: no — column definition is covered by downstream integration tests (T5).

### T4 — Add `is_enabled` renderer in `UserSettings.tsx`

Add `is_enabled: (item) => <IntegrationStateBadge credentialValues={item.credential_values} />` to `customTableColumns`.

Test-first: no — renderer is thin; covered by the integration test in T5.

### T5 — Add `is_enabled` renderer in `ProjectSettings.tsx`

Same as T4 for `ProjectSettings`.

Test-first: no — same reasoning; covered by T5 integration test.

### T6 — Write integration tests

New file: `src/pages/integrations/__tests__/IntegrationsPage.integration.test.tsx`

Tests:
1. Scheduler row with `is_enabled: true` → "Enabled" badge visible in the table.
2. Scheduler row with `is_enabled: false` → "Disabled" badge visible in the table.
3. Row without `is_enabled` in `credential_values` (e.g. GitHub) → no badge in that cell.

Use `renderPage('/integrations')` + `mockAPI('GET', 'v1/settings/user', ...)` pattern from the existing test infrastructure.

Test-first: yes — write the failing tests against the live component before implementing T3–T5.

---

## File surface

| File | Change |
|---|---|
| `src/constants/integration.ts` | Add 2 string constants + badge map |
| `src/pages/integrations/components/IntegrationStateBadge/IntegrationStateBadge.tsx` | New component |
| `src/pages/integrations/components/IntegrationStateBadge/IntegrationStateBadge.test.tsx` | Unit tests for T2 |
| `src/pages/integrations/IntegrationsTab.tsx` | Add column definition |
| `src/pages/integrations/components/UserSettings/UserSettings.tsx` | Add custom renderer |
| `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx` | Add custom renderer |
| `src/pages/integrations/__tests__/IntegrationsPage.integration.test.tsx` | Integration tests for T6 |
