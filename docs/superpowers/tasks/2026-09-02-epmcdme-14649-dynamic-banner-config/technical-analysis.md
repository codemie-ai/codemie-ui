# Technical Research

**Task**: customer-config dynamic-config banner disclaimer administration settings (EPMCDME-14649)
**Generated**: 2026-09-02
**Research path**: filesystem (codegraph MCP not available in this session)
**Scope**: two repositories — backend `/Users/evgeniikvasiuk/Projects/codemie/codemie`, frontend `/Users/evgeniikvasiuk/Projects/codemie/codemie-ui`

---

## 1. Original Context

## Summary
Add dynamic customer configuration support for the existing Chat banner settings.

## Description
The application already supports a configurable Chat banner, but currently it is managed through three separate static customer config parameters.
This story should add banner support to the dynamic customer configuration mechanism introduced in EPMCDME-13983 for the disclaimer.
Banner settings should be exposed in Administration as one logical configuration item, similar to the disclaimer settings. Existing static config values must remain supported as defaults/fallback.

## Preconditions
- Dynamic customer configuration from EPMCDME-13983 is available.
- Existing Chat banner configuration and rendering are already implemented.
- Banner is currently configured through three static customer config parameters.

## Scenarios of Use
1. Platform Admin opens Administration settings.
2. Platform Admin sees Banner settings as a dynamic customer configuration item.
3. Platform Admin updates banner settings and saves changes.
4. Chat uses the resolved banner settings without redeploy.
5. If no dynamic banner settings exist, Chat continues using the existing static customer config values.

## Affected Areas
- Administration settings
- Dynamic customer configuration
- Existing Chat banner
- Customer config resolution / `/v1/config`

## Acceptance Criteria
1. Existing banner configuration is supported by dynamic customer configuration.
2. Banner settings are presented as one logical configuration item, not as three unrelated config entries.
3. Current three static banner config parameters are used as defaults/fallback.
4. Dynamic banner settings override static config values when present.
5. Platform Admin can view and edit banner settings in Administration.
6. Existing Chat banner rendering uses the resolved banner settings.
7. No new banner behavior or redesign is introduced.
8. Existing disclaimer configuration is not affected.
9. Updated banner settings are applied without redeploy.

## Out of Scope
1. Creating a new banner component.
2. Redesigning the banner UI.
3. Adding new banner fields or behavior.
4. Migrating unrelated customer config items.

---

## 2. Codebase Findings

### The three static banner parameters (exact)

Defined in `codemie/config/customer/customer-config.yaml:251-264` as **three independent top-level components**, each with its own `enabled` flag and a field literally named `value`:

```yaml
  - id: "chatDisclaimer"      # :246-249 — for comparison
    settings:
      enabled: false
      text: ""

  - id: "bannerMessage"       # :251-254
    settings:
      enabled: false
      value: ""

  - id: "bannerLinkLabel"     # :256-259
    settings:
      enabled: false
      value: ""

  - id: "bannerLinkRoute"     # :261-264
    settings:
      enabled: false
      value: ""
```

Note the field-name asymmetry that shapes the whole task: the disclaimer stores `text`, the banner components store `value`. Neither is a declared pydantic field — both are extras permitted by `ComponentSetting.model_config = ConfigDict(extra="allow")` at `codemie/src/codemie/configs/customer_config.py:41`. Declared fields there are only `enabled: bool` (`:34`), `availableForExternal: bool` (`:35`), and optional `name/url/created_by/icon_url` (`:36-39`).

No backend code reads the banner values — `grep -rn "bannerMessage\|bannerLink" src/` returns nothing. They are pure pass-through to the UI. The keys were introduced by commit `22a1353b0` (EPMCDME-12746). A legacy parallel path also exists in helm: `VITE_BANNER_MESSAGE` in `upgrade-package/codemie-ui/templates/configmap.yaml:14-15`.

Frontend key mirror: `codemie-ui/src/constants/configKeys.ts:23-25` — `BANNER_MESSAGE: 'bannerMessage'`, `BANNER_LINK_LABEL: 'bannerLinkLabel'`, `BANNER_LINK_ROUTE: 'bannerLinkRoute'`.

### Disclaimer dynamic-config path, end to end (the pattern to replicate)

**BE — declaration registry** `codemie/src/codemie/service/customer_config_declarations.py`
- `CHAT_DISCLAIMER` declaration and `DECLARATIONS: tuple[SettingDeclaration, ...] = (CHAT_DISCLAIMER,)` at `:108-129`; lookup dicts `_BY_COMPONENT_ID` / `_BY_KEY` at `:131-140`.
- `build_key(component_id)` at `:50-58`: `:` → `__`, camelCase → `_`, uppercase, prefix `CUSTOMER_CONFIG__` (`KEY_PREFIX` at `:29`). So `bannerMessage` → `CUSTOMER_CONFIG__BANNER_MESSAGE`.
- Module docstring `:15-20` states the design intent verbatim: *"Making a component dynamic means appending a declaration here — no API, schema or frontend change is required."* This is the single append point.

**BE — storage** `codemie/src/codemie/rest_api/models/dynamic_config.py:35-55` — `DynamicConfig(BaseModelWithSQLSupport, table=True)`, Postgres table `dynamic_config`, unique indexed `key` (max 255), `value: str` (max 10000), `value_type`, `description`, `updated_by`. DAO: `codemie/src/codemie/service/dynamic_config_service.py` (`aset` upsert `:377-423`, `aget_by_key` `:337-352`, `alist_by_key_prefix` `:466-485`, idempotent `adelete` `:487-515`); key regex `KEY_PATTERN = ^[A-Z][A-Z0-9_]*$` at `:47`. Migration `src/external/alembic/versions/93e2d3c3b1c0_add_dynamic_config_table_for_runtime_.py:25-48` already exists — **a new declared setting needs no migration**, overrides are rows, not columns.

**BE — resolution/merge** `codemie/src/codemie/service/customer_config_service.py`
- `resolve_components()` `:147-158` — loads overrides from cache, applies them, then filters by `enabled`: override is applied **before** the enabled filter, so a dynamic `enabled: true` can surface a YAML-disabled component.
- `apply_override()` `:134-144` — `settings = component.settings.model_dump(exclude_none=True) | override`, i.e. per-field overlay; undeclared YAML fields keep following deployments.
- `_declared_components()` `:161-173` + `empty_value()` `:176-177` — synthesizes a neutral placeholder `{"enabled": False, **empty_value()}` when a declaration exists but YAML has no such component.
- `_load_overrides()` `:103-117` / `_parse_override()` `:120-131` — `alist_by_key_prefix(KEY_PREFIX)`, drop undeclared keys with a warning, JSON-decode, keep only declared field names.
- Admin read `list_settings()` `:373-401` + `_resolved_value()` `:404-411` — `merged = declaration.empty_value() | default_values | (override or {})`.
- Validation/sanitisation `validate_and_sanitize()` `:196+`, expected types `:187-191` (bool for SWITCH, str for INPUT/TEXTAREA).

**BE — cache** `customer_config_service.py:61-100` — process-local `OverrideCache`, TTL from `codemie/src/codemie/configs/config.py:792` `CUSTOMER_CONFIG_CACHE_TTL_SECONDS: int = 60`. `invalidate()` is called synchronously after `save_setting` (`:303`) and `reset_setting` (`:320`) so the writing pod is immediately fresh; other pods converge within TTL. DB failure serves the last snapshot (`:88-93`), else `{}` → YAML fallback.

**BE — HTTP** `codemie/src/codemie/rest_api/routers/customer_config.py`
- `GET /v1/config` `:46-48` — `List[Component]`, `response_model_exclude_none=True`, **unauthenticated**, returns already-merged components.
- `GET /v1/config/declarations` `:51-58`, `PUT /v1/config/declarations/{component_id}` `:61-73` (body `SettingUpdateRequest{settings: dict}`), `DELETE .../{component_id}` `:76-83` (204). All three guarded by `Depends(authenticate), Depends(require_customer_config_write)` → `codemie/src/codemie/rest_api/security/authentication.py:198-204` → `_deny_unless_admin_or_maintainer` `:184-195`.
- Schemas `codemie/src/codemie/rest_api/models/customer_config.py:26-53`. Router registration `main.py:915`.
- Audit: `_audit()` `customer_config_service.py:348-370`, constants in `activity/activity_models.py:33,43,52-54`; audit failure is deliberately swallowed.

**FE — runtime store** `codemie-ui/src/store/appInfo.ts` — `fetchCustomerConfig()` `:177` calls `api.get('v1/config')`, guarded once-per-tab by `isConfigFetched`; `refetchCustomerConfig()` `:172` resets the flag and refetches. Selector helpers `codemie-ui/src/utils/settings.ts:138,148,157` (`getConfigItem`, `isConfigItemEnabled`, `getConfigItemSettings`).

**FE — admin store** `codemie-ui/src/store/customerConfiguration.ts` — valtio proxy `:38`; `indexSettings()` `:44` → `GET v1/config/declarations` (`DECLARATIONS_URL` at `:25`); `saveSetting(componentId, settings)` `:62` → `PUT v1/config/declarations/{id}` body `{ settings }`; `resetSetting()` `:78` → DELETE. No react-query; invalidation is manual.

**FE — types** `codemie-ui/src/types/entity/customerConfiguration.ts` — `FieldType = 'switch'|'input'|'textarea'` `:16`, `Markup = 'plain'|'markdown'` `:18`, `SettingValue = boolean|string` `:20`, `FieldDeclaration` `:22` (`name, type, label, description, required, max_length, pattern, pattern_message, markup`), `SettingDeclaration` `:34` (`component_id, label, description, overridden, value, fields[]`), `SettingUpdateResponse` `:43`.

**FE — admin UI** `codemie-ui/src/pages/settings/administration/CustomerConfigurationPage.tsx` — `canEdit = isAdmin || isMaintainer` `:52`; load on mount `:64-67`; `refresh()` `:70-73` = `indexSettings()` then `appInfoStore.refetchCustomerConfig()`; `handleSave` `:75-87`, `handleReset` `:89-101`, `handleResetAll` `:103-118`; declarations mapped to `SettingCard` `:135-148`; hardcoded English copy `:31-43`. Card `components/SettingCard.tsx` — local `useState` (no form library) `:31-33`, JSON-content resync guard `:38-42`, Overridden/Default badge `:62-71`, `<SchemaForm>` `:74-79`. Generic form `codemie-ui/src/components/SchemaForm/SchemaForm.tsx:30`, registry `fieldRegistry.ts:32`, validation `validation.ts:19` (`required`, `max_length`, `pattern`). Route `router.tsx:70,458-461`, tab `pages/settings/tabs.tsx:99-108`.

**FE — disclaimer consumer** `codemie-ui/src/pages/chat/components/ChatDisclaimer/ChatDisclaimer.tsx:66-71` — `useSnapshot(appInfoStore)` + `getConfigItemSettings(configs, CONFIG_KEYS.CHAT_DISCLAIMER)`, hidden when `!enabled || !text.trim()`; markdown inline-parse + DOMPurify `:28-31`; mounted `ChatPage.tsx:36,206`.

### Banner's current read path (frontend only)

`codemie-ui/src/components/appLevel/Banner.tsx` — component at `:32`, primereact `Messages`, sticky info severity, dismissal in `localStorage` under `'bannerShown-' + hash(bannerMessage)` (`:22,:40,:65`). Three read sites, all **direct store reads, not `useSnapshot`**:
- `:34` `appInfoStore.getBannerMessage()`
- `:35` `appInfoStore.getBannerLinkLabel()`
- `:36` `appInfoStore.getBannerLinkRoute()`

Getters `appInfo.ts:159,163,167` (interface `:67-69`), each `this.configs.find(c => c.id === CONFIG_KEYS.X)?.settings.value ?? ''`. Mounted `App.tsx:22,67` — above the spinner/outlet, so it renders before config finishes loading. Link rendered only when both label and route are present `:43-57`; route goes straight into react-router `<Link to={...}>` at `:51`.

### Architecture and layers affected

| Layer | Components |
|---|---|
| BE config (static) | `config/customer/customer-config.yaml`, `configs/customer_config.py` |
| BE declaration registry | `service/customer_config_declarations.py` — the append point |
| BE service/merge | `service/customer_config_service.py` (resolve, merge, validate, cache, audit) |
| BE persistence | `dynamic_config` table via `DynamicConfigService` — no schema change |
| BE API | `routers/customer_config.py` (`/v1/config`, `/v1/config/declarations`) — no new endpoints expected |
| FE store | `store/appInfo.ts` (runtime), `store/customerConfiguration.ts` (admin) |
| FE admin UI | `pages/settings/administration/*` + `components/SchemaForm/*` — generic, likely no change |
| FE consumer | `components/appLevel/Banner.tsx` + `constants/configKeys.ts` |

### Integration points

- `/v1/config` is consumed anonymously by the UI once per tab; the same `resolve_components()` also backs `GET /v1/applications` (`customer_config.py:86-110`).
- Admin save → `override_cache.invalidate()` on the writing pod; other pods within 60 s.
- Writes through the generic super-admin router `routers/dynamic_config.py:33-37` (`/v1/dynamic-config`) **bypass** `override_cache.invalidate()` entirely.
- Deployment: `deploy-templates/values.yaml:523,531-533` mounts ConfigMap `codemie-customer-config` at `/app/config/customer`; the ConfigMap itself is managed outside this repo.

### Patterns and conventions

- Adding a dynamic setting = append one `SettingDeclaration` to `DECLARATIONS`; keys are derived, never enumerated.
- One `SettingDeclaration` ⇄ one `component_id` ⇄ one dynamic-config row whose `value` is `json.dumps(flat dict of declared fields)` with `ConfigValueType.STRING` (`save_setting` `:296-302`). No nesting, no typed union.
- Field types limited to `switch | input | textarea`; validation via `required`/`max_length`/`pattern`/`pattern_message`; `markup` is a **server-side sanitisation parameter**, not a form hint (decision D2 of 13983).
- FE: Component → Store → API, never skip layers; `??` not `||`; never mutate a `useSnapshot` result (`codemie-ui/.ai-run/guides/patterns/state-management.md`).
- Config keys live in `src/constants/configKeys.ts`, never raw strings.

---

## 3. Documentation Findings

### Guides and architecture docs

Both repos have `.ai-run/guides/`. Most relevant:
- BE: `api/endpoint-conventions.md`, `api/rest-api-patterns.md` (routers thin, reuse `authenticate` + role deps, shared exceptions); `architecture/service-layer-patterns.md`; `development/configuration-patterns.md` (never read env vars in feature code; central config in `src/codemie/configs/`); `testing/testing-patterns.md`, `testing-service-patterns.md`, `testing-api-patterns.md` (tests mirror `src/` under `tests/codemie/...`; "seam tests" — one callsite test per branch; router tests must cover negative auth/validation); `quality-gates.md` (`make ruff` → `make build` → `make license-check` → `make gitleaks` → `make test`; MR description must contain a `## Test harness` section with pasted `make test-harness` output or the compliance bot fails checks 3.1/3.2); `standards/git-workflow.md` (branch `EPMCDME-14649_short-description`, commit `EPMCDME-14649: Description`).
- FE: `patterns/state-management.md`, `testing/testing-patterns.md` (`__tests__/` co-located; `*.test.tsx` unit project mocks `useSnapshot` + `@/utils/api`, `*.integration.test.tsx` uses real valtio/fetch; `SettingsLayout`/`useVueRouter` mocked globally — do not re-mock); `development/constants-usage.md`; `quality-gates.md` (`npm ci` first, then lint → typecheck → license-check → secrets:check → test:unit → integration).
- `AGENTS.md` in both repos routes to these guides; BE `AGENTS.md` adds: no pipeline config in-repo, so the MR description must ask a reviewer to post `/sanity` when the change touches deps/Dockerfile/security.

### Architectural decisions

The richest source is the prior run: `codemie/docs/superpowers/runs/20260820-1318-EPMCDME-13983-dynamic-customer-config/` (`requirements.md`, `design.md`, `plan.md`, `qa-report.md`, `code-review-final.json`, `complexity.json`, `actual-complexity.json`, `evidence/`).
- **D1** — no schema change; override stored as a JSON string in `dynamic_config`, `value_type=STRING`.
- **D2** — `markup` is a server-side sanitisation parameter, not a form hint.
- **D3** — no admin preview; rendering stays at the point of use.
- **D4** — per-field merge; only declared fields are stored, undeclared YAML fields keep following deployments (`design.md:92-103`).
- `design.md:136-139` — `GET /v1/config` returns already-merged components; response shape unchanged.
- `design.md:152` — `require_customer_config_write` is the single substitution point for future RBAC.
- **`design.md:259` and `requirements.md:111` — the banner as the second key was explicitly deferred out of 13983 scope.** EPMCDME-14649 is the pre-planned follow-up.

### Derived conventions

Constraining inline notes (no TODO/FIXME markers exist in this code):
- `customer_config_declarations.py:17-19` — appending a declaration is the entire mechanism.
- `customer_config_service.py:131-133` — undeclared fields stay on their YAML value; `:159-161` — declared-but-missing-from-YAML gets a neutral placeholder.
- `SettingCard.tsx:36-38` — resync by JSON content, not object reference, so unsaved edits survive a refetch.
- `appInfo.ts:169` — config fetched once per tab; saved changes need explicit `refetchCustomerConfig`.
- `CustomerConfigurationPage.tsx:37` — user-facing copy already promises "New sessions pick it up within a minute; open tabs on the next reload".

---

## 4. Testing Landscape

### Existing coverage

Backend (pytest; `pytest.ini` → `testpaths=tests`, `pythonpath=src`, `--import-mode=importlib`; `unittest.mock` `patch.object`/`AsyncMock`, `@pytest.mark.asyncio`; no DB, no TestClient):
- `tests/codemie/service/test_customer_config_service.py` (297 lines) — merge, enabled-filter, unparseable override, DB-down degradation `:140-172`, cache hit/invalidate/TTL `:176-210`, runtime components `:214-227`, YAML-default assertion for chatDisclaimer `:233-240`, CR regressions `:245-297`; fixtures `_row()` `:29-33`, autouse `reset_cache` `:36-40`, `patched_yaml` `:53-58`.
- `tests/codemie/service/test_customer_config_declarations.py` (92 lines) — parametrized `build_key`, **already asserting `bannerMessage` `:35` and `bannerLinkRoute` `:45`**, compatibility with `DynamicConfigService.KEY_PATTERN` `:47-48`, uniqueness `:89+`.
- `test_customer_config_validation.py` (200 lines) — type rejection, undeclared-field rejection, max_length, markdown sanitisation, `javascript:` link rejection.
- `test_customer_config_audit.py` (152 lines); `test_dynamic_config_service.py` (1062 lines, DAO); `tests/codemie/configs/test_customer_config.py` (static loader, no banner assertions).

Frontend (vitest + @testing-library/react, `vi.mock` of stores, **no MSW**; helpers in `src/test-utils/`, `src/setupTests.tsx:331`):
- `src/components/appLevel/__tests__/Banner.test.tsx:26-35` — mocks the three getters; covers render / no-message / localStorage dismissal / multiline / severity `:45-165`.
- `src/pages/settings/administration/__tests__/CustomerConfigurationPage.test.tsx` — fixture builder `:40-70`, declared-field rendering `:98-100`, save asserts `saveSetting('chatDisclaimer', …)` + `refetchCustomerConfig` `:131-142`, reset `:152`, reset-all `:202-229` (fixtures already use a `bannerMessage` component id).
- `components/__tests__/SettingCard.test.tsx:44-97` — unsaved-edit preservation.
- `src/components/SchemaForm/__tests__/SchemaForm.test.tsx:35-85`.
- `src/pages/chat/components/ChatDisclaimer/__tests__/ChatDisclaimer.integration.test.tsx:27-68` — real valtio proxy, reactivity when config arrives after first paint. **This is the template for the missing banner reactivity test.**

### Coverage gaps

- BE: **no HTTP/router-level tests at all** for `/v1/config`, `/v1/config/declarations` (GET/PUT/DELETE) or `/v1/dynamic-config` — the `require_customer_config_write` 403 path is untested end-to-end (`grep "config/declarations" tests` → 0 hits).
- BE: no test asserting the banner YAML defaults exist (the disclaimer has one at `test_customer_config_service.py:233`).
- BE: no migration/backfill test; no concurrency test on `aset` upsert.
- FE: no test for `store/customerConfiguration.ts` itself (URL construction, PUT body shape, error mapping, loading flag).
- FE: no test asserting `Banner` reacts to a live `appInfoStore.configs` change — only mocked getters. No banner counterpart to the ChatDisclaimer reactivity test.
- FE: `InputField`/`SwitchField`/`TextareaField` untested; `pattern`/`pattern_message` path untested. No e2e for the admin page.

---

## 5. Configuration and Environment

### Environment variables

- `CUSTOMER_CONFIG_CACHE_TTL_SECONDS` — `configs/config.py:792`, default 60 — TTL of the process-local override cache; governs cross-pod propagation.
- `CUSTOMER_CONFIG_DIR` — `configs/config.py:112`, default `.../config/customer`; in k8s points at the mounted ConfigMap.
- `KEY_PREFIX = "CUSTOMER_CONFIG__"` — `customer_config_declarations.py:29` (constant, not env).
- No banner-specific env vars on the backend. Legacy `VITE_BANNER_MESSAGE` exists only in `upgrade-package/codemie-ui/templates/configmap.yaml:14-15`.

### Configuration files

- `codemie/config/customer/customer-config.yaml` — the four relevant components (`chatDisclaimer` + three banner ids), plus ~40 other components. Loaded at `configs/customer_config.py:79` (`_load_config` `:91-125`, singleton `:290`).
- `codemie-ui/src/constants/configKeys.ts:23-26` — FE key mirror.

### Feature flags and deployment concerns

- **Nothing in `deploy-templates` needs to change.** Making the banner dynamic is a registry append plus DB rows; the YAML/ConfigMap keeps serving the fallback. No alembic migration.
- `deploy-templates/values.yaml:523,531-533` mounts ConfigMap `codemie-customer-config`; that ConfigMap is managed by infra, **not editable from this repo** — relevant if the design requires a new YAML component id.
- `codemie-ui/deploy-templates/templates/configmap.yaml` is UI runtime `config.js` only, unrelated.
- Both repos are already on branch `feature/EPMCDME-14649-dynamic-banner-config` with `.state.json` present and **no implementation work started** (`git log main..HEAD` empty on BE).

---

## 6. Risk Indicators

- **Shape mismatch is the core design problem.** `SettingDeclaration` is strictly one-to-one with a YAML `component_id` (`key` property `:95-97`, `_BY_KEY` `:132`), but the banner is three ids each holding `{enabled, value}`. AC-2 ("one logical configuration item") therefore requires either (a) a new single component id (e.g. `chatBanner` with fields `enabled/message/linkLabel/linkRoute`) plus explicit fallback onto the three legacy ids, or (b) extending `SettingDeclaration` to span multiple component ids, which the current design does not support. Option (a) is far cheaper but is a frontend contract change and needs a stated precedence rule.
- **Placeholder path caveat for option (a):** `_declared_components()` `:161-173` injects a neutral placeholder only for a declared component *missing* from YAML. A new `chatBanner` id would resolve solely via that placeholder unless it is also added to `customer-config.yaml` — and to the externally-managed ConfigMap of every deployment, which this repo cannot update. The fallback onto `bannerMessage`/`bannerLinkLabel`/`bannerLinkRoute` (AC-3) is therefore *new logic*, not something the 13983 merge layer gives for free. This is the single largest novelty in the task.
- **`bannerLinkRoute` is an injection surface.** It is fed straight into react-router `<Link to={...}>` (`Banner.tsx:51`) and `/v1/config` is unauthenticated, so any stored value is public. Needs a `FieldDeclaration.pattern` (e.g. `^/`) plus `pattern_message` and BE validation. Note `Markup.PLAIN` does **not** run the link-scheme sanitiser — `_DANGEROUS_LINK_SCHEMES` only fires for `MARKDOWN` and only for `](scheme:` syntax, not a bare URL in an INPUT field.
- **`enabled` semantics.** The three banner ids are `enabled: false` in YAML today, and `resolve_components()` filters disabled components out before `/v1/config`. Since the override is applied before the filter, a dynamic override that sets text without `enabled: true` will silently not render. With a grouped item, decide which flag governs.
- **`Banner.tsx:34-36` reads the raw valtio proxy, not `useSnapshot`.** It re-renders only incidentally because `App.tsx:46` subscribes to `isConfigFetched`. Making the banner dynamic should switch to `useSnapshot(appInfoStore)` + `getConfigItemSettings`, matching `ChatDisclaimer.tsx:66` — otherwise AC-9 is satisfied only by accident.
- **Banner renders above the spinner** (`App.tsx:67`), so on first paint all three values are `''`; a flash/no-show window that widens if the banner starts depending on the same refetch cycle.
- **Dismissal-key semantics.** `localStorage` key hashes `bannerMessage` (`Banner.tsx:40`): an admin editing the message re-shows the banner to everyone; editing only the link label/route silently does not; reverting to previously dismissed text stays hidden. The design must state the intended behaviour — it is a behaviour question inside a ticket whose AC-7 forbids new behaviour.
- **Propagation is eventually consistent**, not instant: up to 60 s cross-pod cache plus once-per-tab client fetch. Existing UI copy (`CustomerConfigurationPage.tsx:37-38`) already promises this; keep it accurate for AC-9.
- Writes via the generic `/v1/dynamic-config` router bypass `override_cache.invalidate()` (`routers/dynamic_config.py:40-42` only invalidates a trust-policy cache) — a stale-config foot-gun if anyone edits banner rows there.
- `ComponentSetting` has `extra="allow"`, so a typo'd field name in a declaration silently creates a new key instead of erroring.
- `DynamicConfig.value` caps at 10000 chars; the banner message needs its own `max_length` in the declaration so it fails at 400, not at the DB.
- Audit write failure is swallowed (`customer_config_service.py:364-370`) — banner config changes can go unrecorded.
- **No router-level test coverage exists** for the entire admin surface being extended; the 403 guard path is unverified end-to-end.
- **Two-repo lockstep.** FE reading a new id before BE ships it yields an empty banner (safe); BE-only leaves an admin card editing a value nothing consumes. Merge order matters.
- Process gates: BE MR description must contain pasted `make test-harness` output or the compliance bot fails; UI requires `npm ci` before gates are trustworthy; BE changes touching deps/security need a reviewer-posted `/sanity`.

---

## 7. Summary for Complexity Assessment

**Layers and change surface.** This task touches both repositories but lands on a mechanism that was explicitly built to be extended — 13983's own design docs name the banner as the deferred second consumer (`design.md:259`, `requirements.md:111`). On the backend the happy path is genuinely small: append one `SettingDeclaration` to `DECLARATIONS` in `service/customer_config_declarations.py:129`. No new endpoint, no new schema, no alembic migration, no deploy-template change — keys are derived by `build_key()` and overrides are JSON rows in the existing `dynamic_config` table. The generic admin UI (`CustomerConfigurationPage` → `SettingCard` → `SchemaForm`) renders any declaration without modification, so AC-5 is likely free. Realistic file surface: 2–4 backend files (declarations registry, probably `customer_config_service.py` for fallback logic, `customer-config.yaml`, tests) and 3–5 frontend files (`Banner.tsx`, `appInfo.ts` getters, `configKeys.ts`, tests).

**Technical novelty.** The pattern is established, but one requirement falls outside it. AC-2 demands a single logical item while the banner exists as three independent `component_id`s each using the field name `value`, and `SettingDeclaration` is hard-wired one-to-one with a component id. The cheap route — declare a new grouped component (`chatBanner` with `enabled/message/linkLabel/linkRoute`) — collides with AC-3/AC-4: `_declared_components()` only synthesizes a placeholder for a component absent from YAML, so reading the three legacy ids as defaults is new merge logic that 13983 does not provide, and the externally-managed `codemie-customer-config` ConfigMap cannot be updated from this repo to seed the new id. The alternative — three declarations grouped only visually — violates AC-2 or requires touching the declaration model. **This precedence/fallback decision is the single point requiring real design work and should drive the complexity score more than the file count does.** A secondary decision is the `localStorage` dismissal key, which hashes the banner message: any admin edit re-shows the banner to all users, an observable behaviour change sitting awkwardly against AC-7.

**Test posture and risk.** Coverage is mixed and asymmetric. The backend service layer is well covered (four dedicated test files, ~740 lines, including merge, cache TTL, DB-down degradation, validation and audit) and `test_customer_config_declarations.py` already parametrizes `bannerMessage`/`bannerLinkRoute`, so extending it is mechanical. But there are **zero router-level tests** for `/v1/config` or `/v1/config/declarations` — the admin guard and the public payload shape are unverified end-to-end, and the backend testing guide explicitly requires negative auth/validation cases for routers. On the frontend, `Banner.test.tsx` mocks the three getters directly, so it will need rewriting for any read-path change and currently proves nothing about reactivity; the `ChatDisclaimer.integration.test.tsx` reactivity test is the template for the missing equivalent. Additional risk weight: `bannerLinkRoute` flows unvalidated into a react-router `Link` and is served from an unauthenticated endpoint (needs a `pattern`, and note that `PLAIN` markup skips the link sanitiser); `Banner.tsx` reads the raw valtio proxy rather than a snapshot, so AC-9 currently holds only by accident; propagation is eventually consistent (60 s cache + once-per-tab fetch); and the two repos must merge in the right order. Net: low-to-moderate implementation effort with one genuine design decision and a security-sensitive input field.
