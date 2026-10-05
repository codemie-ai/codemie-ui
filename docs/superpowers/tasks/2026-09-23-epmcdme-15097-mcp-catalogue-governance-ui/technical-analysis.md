# Technical Research

**Task**: mcp governance settings administration
**Generated**: 2026-09-23
**Research path**: filesystem

---

## 1. Original Context

Ticket EPMCDME-15097 "MCP Governance Settings in the Web UI" (sub-task of Story EPMCDME-15094 "MCP Catalogue Governance"). Repo: codemie-ui (frontend only — this repo root is C:/Users/Mate_Jambricska/IdeaProjects/codemie-full/codemie-ui). Backend work for sibling sub-tasks EPMCDME-15096 and EPMCDME-15098 is already implemented and merged in the sibling backend repo (/codemie), so treat the API contract below as ALREADY LIVE, not something to be built.

STORY: As an administrator, I want a place to set the MCP governance toggle, and I want the assistant builder to reflect it, so that governance is something I can operate myself and my team sees what is allowed instead of discovering it through a rejected save.

BACKGROUND (from ticket): Governance is platform-wide, administered by platform admins and maintainers only — no project-level settings surface. The administration surfaces live under `src/pages/settings/administration/`, sitting beside existing `MCPManagementPage.tsx` and `CustomerConfigurationPage.tsx`. Tabs are registered in `src/pages/settings/tabs.tsx`, which already composes tabs from `isAdmin` / `isMaintainer` / a feature flag — the new tab's access gate should follow that existing pattern, not introduce new access-control code. One toggle drives two consequences in the assistant builder's MCP section: (1) no hand-written servers offered, (2) catalogue-referenced server's connection config is read-only (only catalogue-declared user-supplied fields, e.g. credentials, remain editable). There is existing duplication to clean up: `src/utils/mcpMode.ts` exports `isMCPRestrictedMode()` reading the flag from `appInfoStore`, but nothing in production imports it (only its own test does) — `MCPToolkit.tsx` re-implements the same lookup inline instead. Whatever this task adds should resolve the toggle through one accessor and fold both the stray helper and the inline duplicate into it.

ACCEPTANCE CRITERIA:
1. Admin/maintainer can open MCP governance settings and set the toggle; change takes effect without redeploy.
2. A user who is neither admin nor maintainer cannot navigate to MCP governance settings (not available/not visible).
3. When toggle is ON, opening the MCP section of the assistant builder: creating a server by hand is NOT offered; selecting from the catalogue is the only available path.
4. When toggle is ON, adding a catalogue MCP server to an assistant: its connection configuration is read-only; only catalogue-declared user-supplied values (e.g. own credentials) remain editable.
5. When a save is rejected by policy, the rejection UI shows the actual reason the backend reported (names the server, states platform policy caused it) — not a generic error.
6. When toggle is OFF, assistant builder behaves exactly as today (hand-written servers + catalogue config editing both available).

OUT OF SCOPE: backend store/resolution/enforcement (done in EPMCDME-15096/15098), tool approval surface, built-in toolkit governance, any project-level governance screen.

LIVE BACKEND API CONTRACT (already deployed, verified by reading the backend source — codemie-ui must consume this, not invent its own):
- Component id: `mcpCustomServersDisabled`. Declared field: `enabled` (boolean switch).
- `GET /v1/config` — NO auth required. Returns `List[Component]` of only *enabled* components: `[{"id": "mcpCustomServersDisabled", "settings": {"enabled": true, ...}}]`. If the toggle is off, the component is simply ABSENT from the array (not present-with-false). This is the "effective policy" read any part of the app (including the assistant builder) should use to check current state.
- `GET /v1/config/declarations` — admin/maintainer only (`require_customer_config_write` guard, same one gating `webSearch`/`schedulersView` toggles today). Returns all declared settings with current value + `overridden` flag: `[{"component_id": "mcpCustomServersDisabled", "label": ..., "description": ..., "overridden": bool, "value": {"enabled": bool}, "fields": [{"name": "enabled", "type": "switch", "label": "Restrict to catalog MCP servers", ...}]}]`.
- `PUT /v1/config/declarations/mcpCustomServersDisabled` — admin/maintainer only. Request body: `{"settings": {"enabled": true}}`. Response: `{"component_id": "mcpCustomServersDisabled", "settings": {"enabled": true}}`.
- `DELETE /v1/config/declarations/mcpCustomServersDisabled` — admin/maintainer only. Reverts to YAML default. Returns 204.
- Write guard 403 shape: standard `ExtendedHTTPException` — need to confirm existing frontend error-toast handling pattern already used for `webSearch`/`schedulersView` PUT failures; reuse it, don't invent new handling.
- Save-path rejection (assistant/workflow/skill create or update, when toggle is on and payload violates policy): backend raises a domain `ValidationException`, HTTP 400. **The JSON error shape is NOT uniform across save paths**: most paths (assistant create/update, workflow update) return `{"error": {"message": "<full descriptive text naming the server and, for field violations, the field>", "details": null, "help": null}}`; but workflow CREATE wraps it differently: `{"error": {"message": "Workflow Configuration error", "details": "<the same original descriptive text>", "help": ""}}`. The frontend's error-message extraction for this rejection path must therefore prefer `details` when present and non-null, falling back to `message`, so the user always sees the original descriptive text (which already names the server and says policy caused it) regardless of which save path failed. Find out how the codebase's existing API error-handling layer (`src/utils/api.ts` or wherever HTTP errors are unwrapped) currently surfaces backend error bodies to the UI (toast? inline form error?) so this task's error text can flow through the existing mechanism rather than a new one.

RESEARCH GOALS — please produce concrete findings on:
1. Exact structure/pattern of `src/pages/settings/administration/MCPManagementPage.tsx` and `CustomerConfigurationPage.tsx` (component shape, how they fetch/save settings, any shared settings-form component) as the template to follow for the new governance tab.
2. Exact contents of `src/pages/settings/tabs.tsx` — how `isAdmin`/`isMaintainer`/feature-flag gating currently composes the tab list, so the new tab slots in identically.
3. Exact contents of `src/utils/mcpMode.ts` (`isMCPRestrictedMode()`) and every current call site — confirm the "nothing in production imports it" claim and find the exact inline duplicate logic in `MCPToolkit.tsx` that needs folding into one accessor.
4. Where/how the assistant builder currently renders the MCP section (component tree: hand-written server form vs catalogue-server picker vs connection-config fields) — find the exact component(s) that need to branch on the restricted-mode toggle to hide "create by hand" and make catalogue connection fields read-only, and how "catalogue-declared user-supplied fields" (e.g. credentials) are currently distinguished from other connection fields in that component (if such a distinction already exists in the catalogue entry's schema/type).
5. How the frontend currently calls `GET /v1/config`, `GET /v1/config/declarations`, `PUT /v1/config/declarations/{id}` (or their equivalents) for the existing `webSearch`/`schedulersView` toggles — exact API client functions/store methods in `src/utils/api.ts` and/or `src/store/` to reuse the same pattern for `mcpCustomServersDisabled`.
6. How `src/utils/api.ts`'s HTTP layer currently unwraps `{"error": {"message", "details", "help"}}` bodies into whatever the UI displays (toast, inline error, thrown Error object with what `.message`) — the exact code path, so the plan can specify the minimal change (prefer `details` over `message` when non-null) precisely, and whether this unwrapping is a single shared point or duplicated in multiple callers.
7. Existing test patterns for settings pages / toggles and for assistant-builder MCP section, so the plan can specify test-first tasks correctly.

feature_area: mcp governance settings administration

---

## 2. Codebase Findings

### Existing Implementations

**Governance toggle plumbing already exists — this is not greenfield.** A prior change (matching this exact ticket's shape) has already landed most of the *consuming* side; only the admin-facing settings surface (AC1/AC2) and the error-message fix (AC5) plus the accessor consolidation remain undone.

- `src/constants/mcp.ts:43` — `export const MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID = 'mcpCustomServersDisabled'` — matches the live backend component id exactly.
- `src/utils/mcpMode.ts` — `isMCPRestrictedMode()`: `appInfoStore.configs.find(c => c.id === MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID)?.settings.enabled === true`. Grep confirms **zero production imports** — the only importer is `src/utils/__tests__/mcpMode.test.ts` (4 unit tests: absent-entry→false, enabled:true→true, enabled:false→false, unrelated id ignored).
- `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPToolkit.tsx:67-69` — the inline duplicate the ticket names:
  ```ts
  const appInfoSnapshot = useSnapshot(appInfoStore)
  const isRestricted = appInfoSnapshot.configs.some(
    (c) => c.id === MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID && c.settings.enabled === true
  )
  ```
  `isRestricted` then drives: `showCustomSetup = !isRestricted` (passed to `MCPActionButtons`/`MCPEmptyState`/`MCPDetailModal` as `customSetupEnabled`, hiding "Manual Setup"/"Add Custom"), `handleSelectFromMarketplace` (when restricted, strips `config`/`isFromMarketplace`/`categories`/`logo_url` from the constructed `MCPServerDetails` so the server stays a pure catalogue reference), and `isCatalogRef={isRestricted && !!selectedMcpServer?.mcp_config_id}` passed into `MCPToolkitForm`.
- `src/utils/featureFlags.ts:44-51` — `isFeatureEnabled(featureName)` is the *generic* non-reactive version of the exact same lookup pattern (`configs.find(c => c.id === featureName)`, `?.settings?.enabled ?? false`), already used for `mcpConnect`, `features:costCenters`, etc. `isMCPRestrictedMode()` is structurally identical minus the `isConfigFetched` gate.
- `src/hooks/useFeatureFlags.ts:62-74` — `useFeatureFlag(featureName)` is the reactive (`useSnapshot`) counterpart returning `[isEnabled, isLoaded]`; `useMcpEnabled()` is one of its named wrappers. This hook already does — generically — what `MCPToolkit.tsx`'s inline `useSnapshot(appInfoStore)` block reimplements by hand.
- MCP-section consumers of the restricted flag, all downstream of `MCPToolkit.tsx`'s `isRestricted`/`isCatalogRef`:
  - `MCPActionButtons.tsx`, `MCPEmptyState.tsx` — `customSetupEnabled` prop hides "Manual Setup" button and swaps empty-state copy (`DESCRIPTION_RESTRICTED` vs `DESCRIPTION_OPEN`).
  - `MCPToolkitForm/index.tsx` → `useMCPForm({ mcpServer, mcpServerNames, isCatalogRef })` → `formSchema.ts` `createFormSchema({ nameUniqueValidator, isCatalogRef })` — when `isCatalogRef` is true, skips the `command-or-url-xor` and `streamable-http` Yup validators (irrelevant once the connection is catalogue-owned).
  - `MCPServerConfigStep.tsx` — passes `customSetupEnabled={!isCatalogRef}` into `MCPBasicFields` (disables Name/Description there) and conditionally omits the `connectUrl` Input entirely when `isCatalogRef`.
  - `MCPBasicFields.tsx` — `disabled={isEditing || !customSetupEnabled}` on Name, `disabled={!customSetupEnabled}` on Description.
  - `MCPConfigSection.tsx` — the JSON config textarea is `readonly`/`disabled` whenever `hasCatalogReference && !useCustomConfig` (the pre-existing Global/Custom toggle from the unrelated EPMCDME-13500 feature, see Documentation Findings). **This component does not currently receive `isCatalogRef`/governance-restricted state at all** — see Risk Indicators.
  - `MCPEnvVarsSection.tsx` — always editable regardless of `isCatalogRef`; renders `MCPServerEnvVars` (manual entry against `mcp_config_id`'s `required_env_vars`) or `IntegrationSelector` (pick an existing Integration/credential Setting). This is the existing mechanism that already distinguishes "catalogue-declared user-supplied fields" from the rest of the connection config — `MCPConfig.required_env_vars: MCPVariableDefinition[]` (`src/types/entity/mcp.ts:41-60`) is the catalogue schema's declared list of fields the *user* must supply (credentials etc.), separate from the connection `config` (`command`/`url`/`args`) which is catalogue-owned.
- Settings-page templates to follow for the new tab:
  - `src/pages/settings/administration/MCPManagementPage.tsx` — gates on `useMcpEnabled()` (`[isMcpFeatureEnabled, isConfigLoaded]`), returns `null` until loaded / if disabled, redirects to `/settings/administration` via `useEffect`+`navigate`, renders through `SettingsLayout`.
  - `src/pages/settings/administration/CustomerConfigurationPage.tsx` — gates on `(user?.isAdmin ?? false) || (user?.isMaintainer ?? false)`; on non-edit access, toasts `ACCESS_DENIED_MESSAGE` and navigates to `/settings/administration`; fetches via `customerConfigurationStore.indexSettings()`; renders one `SettingCard` per declared setting; save flow is `customerConfigurationStore.saveSetting(componentId, value)` → `appInfoStore.refetchCustomerConfig()` (so the effective-policy cache used elsewhere in the app, e.g. by `MCPToolkit.tsx`, is refreshed) → `toaster.info(SAVED_MESSAGE)`; reset flow mirrors it via `resetSetting`.
  - `src/pages/settings/administration/components/SettingCard.tsx` — fully generic renderer: `<SchemaForm fields={setting.fields} value={value} onChange={setValue} onValidityChange={setIsValid} />`, "Overridden"/"Default from config" badge, "Save"/"Reset to default" buttons. Any declared component (including a `switch`-type `enabled` field) renders through this with zero component-specific code.
  - **`customerConfigurationStore` (`src/store/customerConfiguration.ts`) is itself generic**, keyed only by `componentId`: `indexSettings()` → `GET v1/config/declarations`, `saveSetting(componentId, settings)` → `PUT v1/config/declarations/${componentId}` with body `{ settings }`, `resetSetting(componentId)` → `DELETE v1/config/declarations/${componentId}`. This is the exact `webSearch`/`schedulersView` pattern the ticket asks to confirm and reuse — it needs no MCP-specific code to talk to the live backend contract for `mcpCustomServersDisabled`.
  - `appInfoStore.fetchCustomerConfig()`/`refetchCustomerConfig()` (`src/store/appInfo.ts:183-203`) — `GET v1/config` (no-auth "effective policy" read), cached behind `isConfigFetched`, populates `appInfoStore.configs: ConfigItem[]` — this is what `isMCPRestrictedMode()`, `isFeatureEnabled()`, `useFeatureFlag()`, and `MCPToolkit.tsx`'s inline check all read from.

### Architecture and Layers Affected

- **Settings/administration page layer** (`src/pages/settings/administration/*Page.tsx` + `src/pages/settings/tabs.tsx` + `src/router.tsx`): no MCP-governance-specific page or route exists yet — this is the greenfield part of the task (AC1/AC2).
- **Store layer** (`src/store/customerConfiguration.ts`, `src/store/appInfo.ts`): both already generic/reusable as-is for the new component id; no store change appears required to talk to the live endpoints.
- **Assistant-builder MCP toolkit layer** (`src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/**`): already branches on the restricted flag end-to-end for AC3 (hand-written servers hidden) and mostly for AC4 (basic fields + connect URL read-only); the one gap is `MCPConfigSection.tsx`'s Global/Custom toggle not being told about `isCatalogRef` (see Risk Indicators).
- **HTTP/error layer** (`src/utils/api.ts`): single shared `handleError`/`formatErrorMessage` point already surfaces backend `{error:{message,details,help}}` bodies as a toast for every default (non-`skipErrorHandling`) call, including assistant/workflow save. This is the "existing mechanism" AC5 should flow through.
- **Utils/accessor layer** (`src/utils/mcpMode.ts`, `src/utils/featureFlags.ts`, `src/hooks/useFeatureFlags.ts`): three structurally-identical lookups over `appInfoStore.configs` exist for this exact id/pattern; consolidating is a like-for-like refactor, not new logic.

### Integration Points

- `appInfoStore.configs` (populated by `GET v1/config`) is the single source of truth every consumer reads from — `isMCPRestrictedMode()`, `isFeatureEnabled()`, `useFeatureFlag()`, and `MCPToolkit.tsx`'s inline check all key off the same array by `id === MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID`.
- `CustomerConfigurationPage`'s save/reset handlers call `appInfoStore.refetchCustomerConfig()` after every write — this is how a saved governance toggle would become visible to the assistant builder without a page reload/redeploy (AC1), since `MCPToolkit.tsx` reads the same `appInfoStore.configs` reactively via `useSnapshot`.
- `mcpStore` (`src/store/mcp.ts`) — `getConfig`/`getCachedConfig`/`indexConfigs` — supplies the catalogue entries (`MCPConfig`, including `required_env_vars`) that `MCPToolkit.tsx`, `MCPServerConfigStep.tsx`, and `MCPConfigSection.tsx` resolve `mcp_config_id` against; not modified by this ticket per the live backend contract but is the data source the read-only rendering depends on.
- `src/store/assistants.ts` `createAssistant`/`updateAssistant` (lines 763-896) call `api.post('v1/assistants', …)` / `api.put('v1/assistants/${id}', …)` with **no `skipErrorHandling`**, so a 400 `ValidationException` from a policy-violating save already triggers `api.ts`'s default `handleError` → toast, *before* the `catch` block here builds a fallback `{ error, message, assistantId: null }` object from `error.message` (which is `undefined` on the rejected `Response`, so this fallback string is generic — the real backend text only reaches the user via the toast that already fired inside `api.ts`, not via this returned object).
- `src/pages/settings/components/SettingsLayout.tsx` calls `getNavigationTabs(...)` (from `tabs.tsx`) and fetches `appInfoStore.fetchCustomerConfig()` on every settings-page mount — the same tab list computation the new governance tab must slot into.

### Patterns and Conventions

- **Tab gating pattern** (`src/pages/settings/tabs.tsx`): `buildAdministrationChildren(ctx)` branches on `ctx.isAdmin` (full list, alphabetically sorted) vs `ctx.isAuditor` (read-only subset) vs the fallback maintainer/regular-user branch, which explicitly comments *"the write guard admits maintainers too, so the tab must reach them"* and conditionally includes `customerConfigurationTab` only `if (ctx.isMaintainer)`. A new MCP-governance tab following this exact convention would be admitted in both the `isAdmin` branch and the maintainer-only fallback branch, exactly like `customerConfigurationTab` is today — this is the literal template the ticket's background section points at.
- **Access-denied-then-redirect pattern**: both `MCPManagementPage.tsx` (feature-flag gate, silent redirect once loaded) and `CustomerConfigurationPage.tsx` (role gate, toast + redirect) return `null` while unresolved and redirect via `useEffect`+`navigate('/settings/administration')` once resolved — the same shape a new governance page would need for AC2 (defense in depth beneath the tab-list gate).
- **Generic settings-declaration rendering**: `SettingCard` + `SchemaForm` + `customerConfigurationStore` together mean *any* declared component with a `switch` field renders and saves with no per-component frontend code — this is the existing convention for admin-toggle UI in this codebase, already exercised by the tests below for a `switch`+`textarea` combination.
- **Feature-flag accessor duplication convention already exists and is tolerated elsewhere** (`isFeatureEnabled`/`useFeatureFlag` vs one-off files like `mcpMode.ts`) — but this ticket explicitly asks to collapse it for this one flag, which is a spot cleanup, not a repo-wide refactor.
- **MCP-section restricted-mode propagation convention**: a single `isRestricted` boolean computed once in `MCPToolkit.tsx` is threaded down as differently-named props (`customSetupEnabled`, `isCatalogRef`) at each layer rather than each descendant re-deriving it — any consolidation should preserve this single-computation-at-the-top shape, just swap the computation itself for the shared accessor.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` exists at the repo root (see `AGENTS.md`) and covers routing, components, state-management, api-integration, testing, and styling generically, but has no MCP-governance-specific guide. No guide file names `mcpCustomServersDisabled` or "governance".

### Architectural Decisions

- `docs/superpowers/specs/2026-07-17-mcp-global-custom-toggle-design.md` and `docs/superpowers/plans/2026-07-17-mcp-global-custom-toggle.md` (issue EPMCDME-13500, unrelated to this ticket) designed the **Global/Custom mode toggle** now implemented in `MCPConfigSection.tsx`/`useMCPForm.ts`/`formHelpers.ts` (`use_custom_config` field, `SelectButton` with `[Global, Custom]` options). Its "Edge Cases" section explicitly anticipated this ticket's restricted mode: *"4. Restricted mode (custom MCPs disabled): Toggle forced to Global, disabled. Config always read-only. Existing `isCatalogRef` flag remains for this case."* — confirming `isCatalogRef` was already reserved as the seam for this exact governance feature, but the "toggle forced to Global, disabled" behavior was **not** actually wired into `MCPConfigSection.tsx` (see Risk Indicators) — the design doc's stated intent and the current code disagree.
- No ADR or inline `DECISION:`/`ADR:` marker found for the governance toggle itself; `isMCPRestrictedMode()`'s own test file and the inline comment in `MCPToolkit.tsx`'s marketplace-selection branch (stripping `config`/`categories`/`logo_url` when restricted) are the closest things to recorded intent for AC3/AC4's current partial implementation.

### Derived Conventions

- New admin-only settings pages under `src/pages/settings/administration/` consistently: gate on role/flag → render via `SettingsLayout` → register a route in `router.tsx` → register a tab entry (with matching `SettingsTab` enum member) in `tabs.tsx`, exactly mirroring `CustomerConfigurationPage`/`MCPManagementPage`.
- Toggles that need to be both admin-editable and app-wide-readable are declared once on the backend and read from two endpoints: the admin-only `/v1/config/declarations` (edit surface) and the public `/v1/config` (effective-policy read) — `appInfoStore` already treats these as two caches (`fetchCustomerConfig` for the latter; `customerConfigurationStore.indexSettings` for the former) that must be refreshed together on save, which `CustomerConfigurationPage.refresh()` already does.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/__tests__/CustomerConfigurationPage.test.tsx` — exercises the exact generic-declaration flow (render-per-declared-setting, overridden badge, save→refetch, reset, reset-all, access-denied redirect, invalid-form disables Save) against a `chatDisclaimer` fixture with `switch`+`textarea` fields — directly reusable as the shape for a governance-page test once/if a dedicated page exists, or as the shape already covering `mcpCustomServersDisabled` if it renders through this same generic page.
- `src/pages/settings/__tests__/tabs.customerConfiguration.test.tsx` and `tabs.auditor.test.tsx` — exercise `getNavigationTabs` tab-visibility gating (admin sees it / maintainer-not-admin sees it / project admin does not / regular user does not) — the literal template for a new governance-tab visibility test (AC2).
- `src/utils/__tests__/mcpMode.test.ts` — 4 tests for `isMCPRestrictedMode()` in isolation; no test currently exercises it (or its production duplicate) integrated into `MCPToolkit.tsx`'s behavior.
- `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPToolkit.test.tsx` — covers warning-banner-for-unavailable-catalogue-entry and `getConfig`/`getCachedConfig` caching behavior; mocks `appInfoStore` as `{ configs: [] }` in every case — **no test in this file exercises the restricted (`isRestricted: true`) branch** (Manual Setup hidden, marketplace-selection payload stripped, `isCatalogRef` passed through).
- `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPServerConfigStep.test.tsx` — directly tests `isCatalogRef`: connect-URL hidden, `MCPBasicFields` receives `customSetupEnabled=false` (asserted via a `data-readonly` test attribute on a mocked child), and explicitly notes in a test name/comment that `MCPConfigSection` is *always* rendered "for Global/Custom toggle" regardless of `isCatalogRef` — this is direct test evidence of the gap called out in Risk Indicators.
- `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPActionButtons.test.tsx` and `MCPEmptyState.test.tsx` — cover `customSetupEnabled` prop behavior at the leaf-component level (button/description hidden or shown).
- `src/utils/__tests__/api.test.ts` — covers `api.ts`'s error-handling/`formatErrorMessage` behavior generally (exact assertions not read in this pass, but this is the file to extend for the "prefer `details` over `message`" change).

### Testing Framework and Patterns

Vitest + React Testing Library, two projects (`unit`, `integration`) per `vitest.workspace.ts`. Observed conventions: `vi.mock('valtio', …)` to stub `useSnapshot` per-store in component tests that read Valtio stores directly (see `MCPToolkit.test.tsx`); mocking child components to a `data-testid`/`data-*` stub to assert prop-driven behavior without rendering the full subtree (see `MCPServerConfigStep.test.tsx`'s `MCPBasicFields` mock); `withSettings(...)` helper pattern in `CustomerConfigurationPage.test.tsx` to seed a Valtio store synchronously before render (commented as required because "the unit setup mocks valtio without reactivity"); `toaster` mocked as `{ info, error, success }` jest-style spies.

### Coverage Gaps

- No test exercises `MCPToolkit.tsx`'s `isRestricted === true` path end-to-end (hand-written path hidden, marketplace selection stripped to reference-only).
- No test exercises `MCPConfigSection.tsx` under a governance-restricted `isCatalogRef`/`isRestricted` context specifically (its existing tests, not read in this pass beyond the `MCPServerConfigStep` mock, appear scoped to the unrelated Global/Custom EPMCDME-13500 feature).
- No settings page/tab/route exists yet for MCP governance, so there is no test coverage for AC1/AC2 at all — this is the primary net-new test surface.
- No test exercises the save-rejection error-message path (AC5) for either error-body shape (`details: null` vs `details: "<text>"`) through `formatErrorMessage`/`handleError`.
- No test currently covers the three-way duplication (`mcpMode.ts`, inline `MCPToolkit.tsx`, generic `isFeatureEnabled`/`useFeatureFlag`) being collapsed to one accessor — consolidating will need to either update `MCPToolkit.test.tsx`'s mocking approach or leave it unaffected depending on which accessor is kept.

---

## 5. Configuration and Environment

### Environment Variables

None specific to MCP governance. `api.ts` reads `window._env_?.VITE_API_URL || import.meta.env.VITE_API_URL` for the API base URL (applies to every endpoint, including the ones this task would call); no MCP- or governance-specific env var exists in `src`.

### Configuration Files

- `src/constants/mcp.ts` — already declares `MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID`.
- `src/constants/featureFlags.ts` — `FEATURE_FLAGS` map of unrelated flags (`mcpConnect`, `features:schedulersView`, `features:costCenters`, etc.); `mcpCustomServersDisabled` is **not** listed here — it is referenced only via the dedicated constant in `constants/mcp.ts`, consistent with how a governance policy id (read via the public `/v1/config` "effective policy" list) differs from a `features:*`-namespaced feature flag id, though both are read through the same `appInfoStore.configs` array and the same `isFeatureEnabled`/`useFeatureFlag` machinery would work unmodified.
- `src/constants/index.ts` — `SettingsTab` enum (`PROFILE`, `ADMINISTRATION`, `ACTIVITY_EVENTS`, `BUDGETS_MANAGEMENT`, `COST_CENTERS_MANAGEMENT`, `PROJECTS_MANAGEMENT`, `CUSTOMER_CONFIGURATION`, `USERS_MANAGEMENT`, `CATEGORIES_MANAGEMENT`, `MCP_MANAGEMENT`, …) — has no member yet for an MCP-governance tab.
- `src/router.tsx` — registers `customer-configuration` at `/settings/administration/customer-configuration` (line ~486) and the MCP catalogue management route at `/settings/administration/mcps` (line ~529) — no governance-specific route exists yet.

### Feature Flags and Deployment Concerns

- `mcpCustomServersDisabled` is read from `GET /v1/config`'s "effective policy" list (no-auth, only-enabled-components shape) exactly like every other item in `appInfoStore.configs` — takes effect on next `fetchCustomerConfig`/`refetchCustomerConfig` call, i.e., without redeploy, matching AC1. `isConfigFetched` gates a one-time-per-tab fetch; `refetchCustomerConfig()` forces a refresh (used by `CustomerConfigurationPage` after every save/reset).
- `MCP_MANAGEMENT` tab/page is itself gated behind the `mcpConnect` feature flag (`useMcpEnabled()`), so if this ticket's tab also depends on `isMcpFeatureEnabled` for visibility (per the ticket background listing it "beside" `MCPManagementPage.tsx`), that dependency already exists in `tabs.tsx`'s `getEnterpriseAdminItems` as a precedent, though the ticket's own AC2 only requires admin/maintainer gating, not an MCP-feature-flag gate.

---

## 6. Risk Indicators

- **`MCPConfigSection.tsx` does not receive `isCatalogRef`/restricted-mode state at all.** Its Global/Custom `SelectButton` toggle is shown/enabled purely off `hasCatalogReference` (`!!mcp_config_id`), so under the live governance toggle a user can still switch a catalogue-referenced server to "Custom" and hand-edit its connection JSON — directly at odds with AC4 ("connection configuration is read-only" when the toggle is ON). The design doc `docs/superpowers/specs/2026-07-17-mcp-global-custom-toggle-design.md` explicitly anticipated this ("Toggle forced to Global, disabled... Existing `isCatalogRef` flag remains for this case") but the wiring was never completed — `MCPServerConfigStep.test.tsx` even documents the current (gap) behavior in a test name: "MCPConfigSection is always shown (for Global/Custom toggle)" regardless of `isCatalogRef`.
- **Three-to-four structurally identical lookups over the same `appInfoStore.configs` entry exist** (`isMCPRestrictedMode()` in `mcpMode.ts`, the inline block in `MCPToolkit.tsx`, plus the fully generic `isFeatureEnabled()`/`useFeatureFlag()`) — consolidating per the ticket's explicit ask means choosing which of these becomes the one accessor and updating/removing the others' call sites and tests; `MCPToolkit.test.tsx`'s `vi.mock('@/store/appInfo', ...)` approach will need to keep working under whichever accessor is chosen.
- **No settings page/route/tab exists yet for MCP governance** — AC1/AC2 are a greenfield addition on top of an otherwise-generic `customerConfigurationStore`/`SettingCard` machinery that may already be sufficient without new code, *if* the backend's `/v1/config/declarations` response already includes `mcpCustomServersDisabled` alongside `webSearch`/`chatDisclaimer`/etc. — in which case it would render automatically inside the existing `CustomerConfigurationPage` list today. Whether the ticket wants that generic surface reused as-is, or a dedicated "MCP Governance" tab/page beside `MCPManagementPage.tsx` (as the ticket's background section states), is a design decision this research does not resolve — worth confirming before planning, since the two paths have very different change sizes.
- **AC5's error-shape fix touches a single shared function** (`formatErrorMessage` in `src/utils/api.ts`), but that function currently *concatenates* `message` then `details` then `help` rather than preferring one over the other — for the workflow-create wrapped shape (`message: "Workflow Configuration error"`, `details: "<original text>"`) the current toast already contains the original text, just not exclusively/first. Changing the "prefer details" behavior for this one call path without affecting every other caller of `formatErrorMessage`/`handleError` (used broadly across `src/store/*.ts`, 70+ files reference `handleError`/`formatErrorMessage`/`skipErrorHandling`-adjacent patterns per a repo-wide grep) needs care — this is a shared, heavily-used function, not a single-purpose one.
- **No test coverage exists for AC1, AC2, or AC5 in any form today** — these are entirely new test surfaces, while AC3/AC6 and most of AC4 already have partial coverage to extend rather than create from scratch.
- **`updateAssistant`/`createAssistant`'s own `catch` blocks build a fallback error object from `error.message`**, which is `undefined` on the rejected `Response` object `api.ts` actually rejects with (per its own `// NOSONAR - callers use instanceof Response to detect API errors` comments) — meaning any caller relying on that returned `.error`/`.message` field (rather than the toast `api.ts` already fired) would currently see a generic string regardless of the backend's real text. Confirming whether `AssistantForm` (or its callers) render this returned field anywhere in addition to the toast was not fully traced in this pass and should be checked before assuming the toast alone satisfies AC5.

---

## 7. Summary for Complexity Assessment

This ticket lands almost entirely in three places: a net-new admin/maintainer-gated settings tab+page+route under `src/pages/settings/administration/` (AC1/AC2, currently nonexistent), a small consolidation of an already-duplicated config lookup into one accessor (`src/utils/mcpMode.ts`, `MCPToolkit.tsx`'s inline block, and the generic `isFeatureEnabled`/`useFeatureFlag` machinery all read the same `appInfoStore.configs` entry today), and a targeted fix to the shared `formatErrorMessage` function in `src/utils/api.ts` so a policy-rejection toast prefers `details` over `message` (AC5). Critically, the *consuming* side that the ticket describes as work to do — AC3 (hide hand-written servers) and most of AC4 (read-only catalogue connection config, editable credentials) — turns out to already be implemented in `MCPToolkit.tsx` and its descendants (`MCPActionButtons`, `MCPEmptyState`, `MCPBasicFields`, `MCPServerConfigStep`, `formSchema.ts`) via an `isRestricted`/`isCatalogRef` prop chain, apparently landed as part of an earlier, closely-related change. The one confirmed gap in that chain is `MCPConfigSection.tsx`'s Global/Custom toggle, which a prior design doc explicitly flagged as needing to be "forced to Global, disabled" under restricted mode but which was never wired to `isCatalogRef` — evidenced directly by a test comment stating the toggle "is always shown."

Technical novelty is low: every mechanism this ticket needs — generic declared-setting CRUD (`customerConfigurationStore` + `SettingCard` + `SchemaForm`), admin/maintainer tab gating (`tabs.tsx`'s `buildAdministrationChildren`), access-denied-then-redirect pages (`CustomerConfigurationPage`/`MCPManagementPage`), and effective-policy read-through-refresh (`appInfoStore.fetchCustomerConfig`/`refetchCustomerConfig`) — already exists in working, tested form for structurally identical toggles (`webSearch`, `schedulersView`, `chatDisclaimer`). The open design question this research surfaces but does not resolve is whether the new governance UI needs to be a dedicated page/tab (as the ticket's background section states) or whether it would already render inside the existing generic `CustomerConfigurationPage` list once the backend declares the component — the two paths differ substantially in change size and should be settled before planning.

Test-coverage posture is mixed: AC2's tab-gating pattern and the generic settings-page CRUD flow both have close, directly-adaptable existing test templates (`tabs.customerConfiguration.test.tsx`, `CustomerConfigurationPage.test.tsx`); AC3's hand-written-hidden behavior and most of AC4's read-only behavior have real but incomplete coverage (`MCPServerConfigStep.test.tsx` tests `isCatalogRef` at the field level but `MCPToolkit.test.tsx` never exercises `isRestricted: true`); AC1, AC5, and the `MCPConfigSection.tsx` gap have no coverage at all today. The main risk factors are (1) confirming the settings-surface design decision above, (2) closing the `MCPConfigSection.tsx` Global/Custom-toggle gap without regressing the unrelated EPMCDME-13500 feature it shares code with, and (3) scoping the `formatErrorMessage` change carefully since that function is shared by a large number of unrelated call sites across the store layer.

---

## 8. External References

None named by the task. The ticket names a sibling backend repo (`/codemie`) as the source of the already-live API contract, but the contract itself is given inline in full in the ticket text (component id, all four endpoints, request/response shapes, and the non-uniform error-shape detail), and the ticket does not ask this research to open the backend repo directly — it asks only that this repo's *own* existing error-handling and settings-CRUD mechanisms be identified so the (already-fully-specified) contract can be wired through them. No other external path, guide, or URL is named as a source of truth.
