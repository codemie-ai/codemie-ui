# Spec — Model management admin UI (admin-ui)

**Slice**: `admin-ui` · **Ticket**: EPMCDME-15077 (parent) / EPMCDME-15078  
**Branch**: `EPMCDME-15077_model-management_FE`  
**Depends on**: backend slice `status-persistence-api` (EPMCDME-15080) — implement against mocked API contract; live E2E requires that slice merged.  
**Contract**: `docs/superpowers/tasks/2026-09-21-admin-ui/contract.md`

---

## 1. Goal

Add a new flat admin route `/settings/administration/models` that lists all platform models with their current admin-set status, and lets admins change that status (Enable / Disable / Mark as deprecated) via per-row actions. Follows the `ProvidersManagementPage.tsx` pattern throughout.

Out of scope: backend persistence, the `/help/models` catalog status display (sibling branch), notification rules, bulk-select checkboxes.

---

## 2. API contract (summary — contract.md is authoritative)

| Purpose | Call |
|---|---|
| List all models (including disabled) | `GET /v1/llm_models?include_all=true` — returns `ModelOption`-shaped objects with added `status` and `base_name` fields |
| Set status for one model | `PUT /v1/admin/llm/{base_name}/status` · body `{ status: "enabled" \| "disabled" \| "deprecated" }` |
| Set status for many | `POST /v1/admin/llm/status/bulk` (reserved for future bulk-select feature) |

Critical: `include_all=true` is mandatory on the read call — without it, `disabled` models are absent from the payload and cannot be re-enabled via the UI.

`enabled` (provider-sourced boolean) and `status` (admin-set string) are **separate fields**. A model can be `status: "enabled"` yet unavailable because the provider itself reports `enabled: false`. The UI must not conflate them.

---

## 3. Type layer

**File**: `src/types/entity/adminModel.ts` (new)

```ts
export type ModelPlatformStatus = 'enabled' | 'disabled' | 'deprecated'

export interface AdminModel {
  base_name: string               // identity key; use for all API calls
  label: string                   // display name
  provider?: string               // for PROVIDER_LABELS lookup
  isPremium?: boolean
  enabled: boolean                // provider-sourced; distinct from status
  status: ModelPlatformStatus     // admin-set
  cost?: { input: number; output: number }
  multimodal?: boolean
  supportsTools?: boolean
  supportsImageGeneration?: boolean
  defaultForCategories?: string[]
}
```

`ModelOption` in `src/types/entity/configuration.ts` is unchanged — it is the public-catalog type used by `appInfoStore`. `AdminModel` is the admin-management type used only by `adminModelsStore`.

---

## 4. Store

**File**: `src/store/adminModels.ts` (new)

```ts
interface AdminModelsStore {
  models: AdminModel[]
  loading: boolean
  indexModels: () => Promise<AdminModel[]>
  setModelStatus: (baseName: string, status: ModelPlatformStatus) => Promise<void>
}
```

- `indexModels()`: `GET /v1/llm_models?include_all=true` → sets `this.models`, flips `loading`.
- `setModelStatus(baseName, status)`: `PUT /v1/admin/llm/{baseName}/status` with `{ status }`. On success, patches `this.models[i].status` in place (optimistic update; no full re-fetch). On error, re-throws so the page can surface a toast.
- `loading` wraps `indexModels` only — individual status updates do not block the table.

---

## 5. Page component

**File**: `src/pages/settings/administration/ModelsManagementPage.tsx` (new)

Structure mirrors `ProvidersManagementPage.tsx`:

```
SettingsLayout (title: "Model management")
  └─ Table (items={models}, loading={loading}, columnDefinitions, customRenderColumns)
```

No header-action buttons (no Add / Import for this page).

**Column definitions** (`ColumnDefinition[]`):

| key | label | type | headClassNames |
|---|---|---|---|
| `model` | Model | Custom | `w-[45%]` |
| `provider` | Provider | Custom | `w-[20%]` |
| `status` | Status | Custom | `w-[20%]` |
| `actions` | _(empty)_ | Custom | `w-[15%]` |

**Custom renders**:

- `model`: `<span>` with `item.label` (bold) + `item.base_name` as a muted subtitle below. If `item.enabled === false`, append a small inline chip `"Provider offline"` styled with the `capabilityChipClass` pattern from `ModelsCatalogPage` (`text-xs border border-border-secondary rounded-full px-2 py-0.5 text-text-quaternary`).
- `provider`: `PROVIDER_LABELS[item.provider] ?? item.provider ?? '—'`. `PROVIDER_LABELS` is defined locally in this file (same map as `ModelsCatalogPage`; coordinate with the sibling `catalog-status-surfacing` branch before merge — do not extract now).
- `status`: `<ModelStatusBadge status={item.status} />` (see §6).
- `actions`: `<ModelActions model={item} onStatusChange={handleStatusChange} />` (see §7).

`handleStatusChange` calls `adminModelsStore.setModelStatus(model.base_name, status)` and catches errors with `toaster.error`.

`useEffect` fires `adminModelsStore.indexModels()` on mount, logging errors to console (same pattern as `ProvidersManagementPage`).

---

## 6. Status badge component

**File**: `src/pages/settings/administration/components/ModelStatusBadge.tsx` (new)

A small inline component — coloured dot + text:

| `status` | Dot colour | Label |
|---|---|---|
| `enabled` | `bg-success-primary` (green) | Enabled |
| `deprecated` | `bg-warning-primary` (amber) | Deprecated |
| `disabled` | `bg-surface-base-quaternary` (gray) | Disabled |

Uses Tailwind theme tokens only; no arbitrary hex.

---

## 7. Row-actions component

**File**: `src/pages/settings/administration/components/ModelActions.tsx` (new)

Props: `{ model: AdminModel; onStatusChange: (model: AdminModel, status: ModelPlatformStatus) => void }`

Uses `NavigationMore` with `hideOnClickInside renderInRoot`. Menu items are contextual — the model's current status is never offered as a choice (max two items visible at a time):

| Shown when | Item title | Confirmation? |
|---|---|---|
| `status !== 'enabled'` | Enable | No |
| `status !== 'disabled'` | Disable | Yes |
| `status !== 'deprecated'` | Mark as deprecated | Yes |

**Confirmation copy**:

- Disable: header `"Disable {model.label}?"` · message `"This model will be hidden from all catalogs. Existing work referencing it continues unaffected."` · confirm button text `"Disable"` / type `ButtonType.DELETE`.
- Mark as deprecated: header `"Mark {model.label} as deprecated?"` · message `"This model will remain visible in catalogs but cannot be selected for new work."` · confirm button text `"Mark as deprecated"` / type `ButtonType.DELETE`.

Uses `ConfirmationModal` (same import as `ProviderActions`). `isDeleteConfirmationVisible` / `isDeprecateConfirmationVisible` are separate booleans.

---

## 8. Navigation & routing

**`src/constants/index.ts`** — add to `SettingsTab` enum:
```ts
MODELS_MANAGEMENT = 'models_management',
```

**`src/pages/settings/tabs.tsx`** — add to `getEnterpriseAdminItems()` array (enterprise-admin-only, same tier as Providers/MCPs/Categories):
```ts
{
  id: SettingsTab.MODELS_MANAGEMENT,
  name: 'Model management',
  title: 'Model management',
  url: '/settings/administration/models',
},
```
Tabs are already sorted alphabetically in `buildAdministrationChildren`; the entry slots between MCPs and Providers.

**`src/router.tsx`** — add import and route entry (flat, no children):
```ts
import ModelsManagementPage from '@/pages/settings/administration/ModelsManagementPage'

// alongside the other admin sub-routes:
{
  path: '/settings/administration/models',
  Component: ModelsManagementPage,
},
```

---

## 9. Tests

### Unit — store (`src/store/__tests__/adminModels.test.ts`)

- `indexModels` fetches `v1/llm_models?include_all=true`, populates `models`, flips `loading`.
- `setModelStatus` calls `PUT v1/admin/llm/{base_name}/status`, patches `models[i].status` in place.
- `setModelStatus` re-throws on API error (caller receives the rejection).

Mock `api.get` / `api.put` via `vi.mock('@/utils/api')`.

### Integration — page (`src/pages/settings/administration/__tests__/ModelsManagementPage.test.tsx`)

Happy path:
- Renders table with model rows after `indexModels` resolves.
- Status badge displays correct text for each of the three states.
- "Provider offline" chip appears when `enabled === false`.

Status change flow:
- Opening row-actions menu shows only the two non-current items.
- Clicking Disable opens the confirmation modal with correct copy.
- Confirming calls `adminModelsStore.setModelStatus` with correct `baseName` + `'disabled'`.
- Enable (no confirmation) calls `setModelStatus` immediately on click.
- API error on status change shows error toast.

Navigation:
- `ModelsManagementPage` is rendered at `/settings/administration/models` in a router context.

---

## 10. Constraints & coordination

- Do not extract `PROVIDER_LABELS` or cost-formatting helpers from `ModelsCatalogPage` in this branch. Coordinate with the sibling `catalog-status-surfacing` branch at merge time.
- Pre-existing dirty files (`Dockerfile.dev`, `vite.config.ts`, `src/hooks/useFeatureFlags.ts`) must not be committed. Use path-scoped `git add`.
- Access control is enforced by the backend (`admin_access_only`). The tab visibility in `getEnterpriseAdminItems()` is the UX layer only.
- `ModelOption` in `src/types/entity/configuration.ts` is unchanged; `AdminModel` is a new type used only by this slice.
