# Plan — Dynamic Customer Configuration (EPMCDME-13983)

Design: `design.md`. Requirements: `requirements.md`.
Branch (both repos): `feature/EPMCDME-13983-dynamic-customer-config`.

Backend repo: `~/Projects/codemie/codemie`. Frontend repo: `~/Projects/codemie/codemie-ui`.
Backend tasks B1-B8 land first because the frontend consumes the declarations contract.

---

## B1 — Declaration registry

**Files**: `src/codemie/service/customer_config_declarations.py` (new),
`tests/codemie/service/test_customer_config_declarations.py` (new)

Test-first: yes — `test_key_is_derived_from_component_id` asserts
`chatDisclaimer` → `CUSTOMER_CONFIG__CHAT_DISCLAIMER` and
`features:webSearch` → `CUSTOMER_CONFIG__FEATURES__WEB_SEARCH`, and fails because the module does
not exist.

- `FieldType` (switch/input/textarea), `Markup` (plain/markdown), `FieldDeclaration`,
  `SettingDeclaration` with a derived `key` property.
- `KEY_PREFIX = "CUSTOMER_CONFIG__"`; derivation uppercases, converts camelCase to snake and `:` to
  `__`; the result must satisfy `DynamicConfigService.KEY_PATTERN`.
- `DECLARATIONS` tuple holding only the chat disclaimer, plus `by_component_id()` / `by_key()`.
- Chat disclaimer declaration: `enabled` (switch), `text` (textarea, `markup: markdown`,
  `max_length` set).

## B2 — Generic helpers on DynamicConfigService

**Files**: `src/codemie/service/dynamic_config_service.py`,
`tests/codemie/service/test_dynamic_config_service.py`

Test-first: yes — `test_alist_by_key_prefix_returns_only_matching_keys` fails with `AttributeError`.

- `alist_by_key_prefix(prefix)` — async prefix listing; prefix is a caller-supplied parameter.
- `adelete(key) -> bool` — async delete returning whether a row existed; no embedded admin check.
- No change to existing methods, no schema change.

## B3 — Resolver and cache

**Files**: `src/codemie/service/customer_config_service.py` (new),
`tests/codemie/service/test_customer_config_service.py` (new)

Test-first: yes — `test_override_merges_before_enabled_filter` asserts a component disabled in YAML
appears in the result when its override enables it; fails because the module does not exist.

- `resolve_components()` — per-field override on top of YAML, merge before the enabled filter,
  runtime components appended unchanged.
- `_apply_override` — flat `dict` update limited to declared field names.
- `_OverrideCache` — process-local map plus expiry from `CUSTOMER_CONFIG_CACHE_TTL_SECONDS`
  (default 60), `invalidate()` for the writing pod, last-known-good snapshot retained.
- Degradation: DB error → last good → empty override map (today's YAML-only behaviour).
- Tests also cover: undeclared YAML fields keep following a later YAML change (the freeze
  regression); an override disabling a YAML-enabled component; TTL expiry; empty database is
  byte-identical to today's response.

## B4 — Validation and sanitisation

**Files**: `src/codemie/service/customer_config_service.py`,
`tests/codemie/service/test_customer_config_validation.py` (new)

Test-first: yes — `test_undeclared_field_is_rejected` expects a 400 and no stored row.

- Accept declared field names only; reject unknown names, wrong types, missing required fields and
  over-length values. Nothing is stored on failure.
- Fields with `markup: markdown` pass through `bleach`: HTML tags stripped, `javascript:` link
  targets rejected. Markdown syntax preserved.
- The serialised object must fit the `dynamic_config.value` column bound.

## B5 — Write authorisation dependency

**Files**: `src/codemie/rest_api/security/authentication.py`,
`tests/codemie/rest_api/test_customer_config_router.py` (new)

Test-first: yes — `test_project_admin_cannot_write` expects 403.

- `require_customer_config_write` delegating to the same `is_admin_or_maintainer` check, documented
  as the single substitution point for the future RBAC permission.

## B6 — Audit events

**Files**: `src/codemie/service/activity/activity_models.py`,
`src/codemie/service/customer_config_service.py`,
`tests/codemie/service/test_customer_config_audit.py` (new)

Test-first: yes — `test_update_emits_activity_event_with_old_and_new_value` fails on the missing
domain constant.

- `ActivityDomain.CUSTOMER_CONFIG`, `ActivityEntityType.CUSTOMER_CONFIG_SETTING`,
  `CustomerConfigEvent.SETTING_UPDATED` / `SETTING_RESET`.
- Emission carries actor, component id as `entity_id`, and `{key, old_value, new_value}` in
  `attributes`.

## B7 — Router endpoints

**Files**: `src/codemie/rest_api/routers/customer_config.py`,
`tests/codemie/rest_api/test_customer_config_router.py`

Test-first: yes — `test_declarations_endpoint_returns_current_value_and_marker` fails with 404.

- `GET /v1/config` switches to `resolve_components()`; response shape and anonymous access unchanged.
- `GET /v1/config/declarations` — declared fields, current values, `overridden` marker; admin-only.
- `PUT /v1/config/declarations/{component_id}` — validate, sanitise, store, audit, invalidate.
- `DELETE /v1/config/declarations/{component_id}` — delete, audit, invalidate; idempotent 204.

## B8 — YAML default for the disclaimer

**Files**: `config/customer/customer-config.yaml`,
`tests/codemie/service/test_customer_config_service.py`

Test-first: yes — `test_chat_disclaimer_default_is_disabled_and_empty` fails until the component
exists.

- Add `chatDisclaimer` with `{enabled: false, text: ""}`.

---

## F1 — API client for declarations

**Files**: `src/api/customerConfig.ts` (new), `src/types/entity/customerConfig.ts` (new),
`src/api/__tests__/customerConfig.test.ts` (new)

Test-first: yes — `test fetches declarations from v1/config/declarations` fails on the missing module.

- Typed declaration/field models mirroring the backend contract, plus fetch/save/reset calls.

## F2 — SchemaForm renderer

**Files**: `src/components/SchemaForm/SchemaForm.tsx`, `fields/SwitchField.tsx`,
`fields/InputField.tsx`, `fields/TextareaField.tsx`, `fieldRegistry.ts`, `index.ts` (all new),
`src/components/SchemaForm/__tests__/SchemaForm.test.tsx` (new)

Test-first: yes — `renders one control per declared field` fails on the missing component.

- `fieldRegistry` maps `type → component`; an unknown type renders nothing and logs a console
  warning. No `if (type === ...)` chains.
- Validation derived from the declared constraints (required, max length).
- The form is semantics-free: `textarea` is a plain text control.

## F3 — Customer Configuration page

**Files**: `src/pages/settings/administration/CustomerConfigurationPage.tsx`, its test,
`src/pages/settings/tabs.tsx`, `src/router.tsx`

Test-first: yes — `shows the overridden marker for an overridden setting` fails on the missing page.

- Page, route and tab recovered from branch `EPMCDME-13983_global-chat-disclaimer` and rewired to
  declarations; `DisclaimerCard` and `store/chatDisclaimer` are not carried over.
- Per setting: current value, overridden/default marker, reset control. Empty registry renders an
  empty state, not an error.

## F4 — Config refetch after save

**Files**: `src/store/appInfo.ts`, `src/store/__tests__/appInfo.test.ts`,
`src/constants/configKeys.ts`

Test-first: yes — `refetchCustomerConfig bypasses the fetched flag` fails because the method does not
exist.

- `refetchCustomerConfig()` clears `isConfigFetched` before fetching; called after a successful save.
- `CONFIG_KEYS.CHAT_DISCLAIMER` added; `getChatDisclaimer()` reads the component settings.

## F5 — Chat disclaimer wired to customer config

**Files**: `src/pages/chat/components/ChatDisclaimer/*`, its tests, `src/pages/chat/ChatPage.tsx`

Test-first: yes — `renders nothing when the disclaimer component is absent from config` fails on the
missing component.

- `ChatDisclaimer` recovered from the closed branch with its inline rendering, `line-clamp-2`,
  truncation tooltip and minimum width intact; source switched to `appInfoStore`.
- Hidden when disabled or empty; links clickable; tooltip only when actually truncated.

---

## Verification

- Backend gates: `poetry run ruff check`, `poetry run pytest` on the touched paths.
- Frontend gates: `npm run lint`, `npm run test` on the touched paths.
- Manual: local stack, admin enables the disclaimer with Markdown containing a link, confirms it
  appears in Chat without F5, resets it and confirms the YAML default returns.
