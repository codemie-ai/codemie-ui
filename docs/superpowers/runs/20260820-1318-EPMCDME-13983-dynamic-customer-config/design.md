# Design — Dynamic Customer Configuration

Run: `20260820-1318-EPMCDME-13983-dynamic-customer-config`
Ticket: EPMCDME-13983. Requirements: `requirements.md`.

## Decisions taken before design

| # | Decision | Rationale |
|---|---|---|
| D1 | **No schema change in `dynamic_config`.** The override is stored under `value_type=STRING` with the `settings` object serialised as JSON. | The pattern already exists: `MCP_AUTH_DISCOVERY_PRIVATE_NETWORK_ALLOWLIST` stores a JSON array as STRING and parses it in `_trust_policy.py:97`. Adding a `JSON` enum value would make the low-level layer interpret values, which the ticket explicitly forbids. |
| D2 | **`markup` is a server-side sanitisation parameter carried by the declaration**, not a hint to the form. The form renders a universal text control; what the stored value means and how it is rendered is decided by each point of use. | The ticket requires sanitising markup-bearing fields on write, so the backend must know which fields carry markup. The renderer does not: `textarea` is just a text control. A future key declares `markup: plain` and is sanitised differently without a code change. |
| D4 | **Per-field merge of declared fields**, revising decision A-3 of the decisions doc ("store the whole `settings` object, one merge level"). Only declared fields are stored; on read the override is applied field-by-field on top of the YAML settings. | Storing the whole object freezes the fields nobody edits. The largest group in the YAML — 19 `features:*` components shaped `{enabled, name, description}` — exposes one editable switch, so a whole-object override would pin `name` and `description` to whatever the YAML held at write time and stop them following deployments. Atomicity, the reason A-1 chose "key = component", is untouched: the whole declared field set is still written in one row in one request. |
| D3 | **No admin preview in this iteration.** | Not in the ticket's acceptance criteria. `SchemaForm` renders form controls only. Markdown rendering, inline flattening, clamping and the tooltip stay in `ChatDisclaimer` at the point of use. Consuming a future key's value is that key's own task, not this mechanism's. |

## Architecture

```
                    ┌─────────────────────────────────────────┐
  admin UI  ───────▶│ GET/PUT/DELETE /v1/config/declarations   │  admin-guarded
                    ├─────────────────────────────────────────┤
  any client ──────▶│ GET /v1/config                          │  anonymous, shape unchanged
                    └────────────────────┬────────────────────┘
                                         │
                         ┌───────────────▼──────────────────┐
                         │  customer-config layer (business)│
                         │  · declaration registry          │
                         │  · resolver: override ▸ YAML     │
                         │  · TTL cache + degradation       │
                         │  · validation + sanitisation     │
                         │  · audit emission                │
                         └────────┬──────────────┬──────────┘
                                  │              │
                 ┌────────────────▼───┐   ┌──────▼──────────────────┐
                 │ customer-config.yaml│   │ DynamicConfigService    │
                 │ (deployment default)│   │ (key-value, semantics-  │
                 └─────────────────────┘   │  free, unchanged API)   │
                                           └─────────────────────────┘
```

The layer boundary is the load-bearing part: `DynamicConfigService` gains only generic helpers
(prefix listing, async delete). It never learns what a customer-config key means.

## Backend

### 1. Declaration registry — `src/codemie/service/customer_config/declarations.py`

```python
class FieldType(str, Enum):
    SWITCH = "switch"
    INPUT = "input"
    TEXTAREA = "textarea"

class Markup(str, Enum):
    PLAIN = "plain"
    MARKDOWN = "markdown"

class FieldDeclaration(BaseModel):
    name: str                      # key inside the settings object, e.g. "text"
    type: FieldType
    label: str
    description: str | None = None
    required: bool = False
    max_length: int | None = None
    pattern: str | None = None     # format constraint, mirrored by the frontend validator
    pattern_message: str | None = None
    markup: Markup = Markup.PLAIN

class SettingDeclaration(BaseModel):
    component_id: str              # YAML component id, e.g. "chatDisclaimer"
    label: str
    description: str | None = None
    fields: list[FieldDeclaration]

    @property
    def key(self) -> str:          # CUSTOMER_CONFIG__CHAT_DISCLAIMER
        return f"{KEY_PREFIX}{to_upper_snake(self.component_id)}"

DECLARATIONS: tuple[SettingDeclaration, ...] = (CHAT_DISCLAIMER_DECLARATION,)
```

- `KEY_PREFIX = "CUSTOMER_CONFIG__"`. Derived keys satisfy the existing
  `DynamicConfigService.KEY_PATTERN` (`^[A-Z][A-Z0-9_]*$`) without touching the service.
- The registry is a module-level tuple with `by_component_id()` / `by_key()` lookups. A key absent
  from it is never read from or written to `dynamic_config`.
- Adding a key = appending a declaration. No API, schema or frontend change.

### 2. Resolver and cache — `src/codemie/service/customer_config/service.py`

```python
async def resolve_components() -> list[Component]:
    overrides = await _overrides_cache.get()          # {component_id: {declared field: value}}
    merged = [_apply_override(c, overrides.get(c.id)) for c in customer_config.components]
    return _filter_enabled(merged) + _enabled_runtime_components()


def _apply_override(component: Component, override: dict | None) -> Component:
    if not override:
        return component
    settings = component.settings.model_dump(exclude_none=True) | override
    return Component(id=component.id, settings=ComponentSetting(**settings))
```

- **Merge before the enabled filter** (FR-3): an override can enable a component disabled in YAML
  and vice versa. `get_enabled_components()` on the singleton keeps its current behaviour and the
  router switches to `resolve_components()`.
- **Per declared field** (D4): the stored object holds only the fields the declaration exposes, and
  they are laid over the YAML settings with a flat `dict` update. Fields absent from the declaration
  — `name`, `description`, `url` on most components — are never stored and keep following
  deployments. A field the declaration exposes but the admin never touched is stored too, because
  the whole declared set is written together; it is the *undeclared* fields that stay dynamic.
- **Cache**: process-local, `{component_id: settings}` plus an expiry stamp. TTL comes from
  `CUSTOMER_CONFIG_CACHE_TTL_SECONDS` (default 60). The writing pod calls `invalidate()` right after
  a successful write, so its own next read is fresh.
- **Degradation ladder** (FR-5): DB error → serve the last known good snapshot → if none, serve an
  empty override map, which is exactly today's YAML-only behaviour. The public endpoint never 500s
  because of `dynamic_config`.
- Reads use one async query filtered by key prefix, not one query per key.
- **The admin read path bypasses the cache.** `list_settings()` loads overrides directly, so an
  admin sees their own write even when the refresh lands on a pod that did not serve it. The cache
  serves the high-traffic public resolution only.
- **A declared component absent from YAML still resolves.** A customer's YAML is its own file and may
  predate a declaration, so a placeholder carrying declaration-level defaults is synthesised when an
  override exists for a component YAML does not contain.

### 3. Generic additions to `DynamicConfigService`

- `alist_by_key_prefix(prefix: str) -> list[DynamicConfig]` — generic prefix listing; the prefix is
  a parameter, so the service stays semantics-free.
- `adelete(key: str) -> bool` — async counterpart of `delete`, without the embedded admin check
  (authorisation belongs to the router dependency). The existing sync `delete` is left untouched.

### 4. Router — `src/codemie/rest_api/routers/customer_config.py`

| Method | Path | Guard | Behaviour |
|---|---|---|---|
| GET | `/v1/config` | anonymous | merged components, response shape unchanged |
| GET | `/v1/config/declarations` | `require_customer_config_write` | declarations + current value + `overridden` marker |
| PUT | `/v1/config/declarations/{component_id}` | admin | validate → sanitise → store → audit → invalidate |
| DELETE | `/v1/config/declarations/{component_id}` | admin | delete row → audit → invalidate |

- `GET /v1/config/declarations` is gated by the same dependency as the writes, so a later RBAC
  repoint cannot leave a user able to write but unable to read.
- `GET /v1/config/declarations` returns declared fields only. Non-migrated config never reaches the
  frontend (FR-7).
- `PUT` body is the whole `settings` object. Validation failures return 400 and store nothing.
- `DELETE` on a key with no row is a no-op returning 204, so reset is idempotent.

### 5. Write authorisation — `require_customer_config_write`

A new dependency in `src/codemie/rest_api/security/authentication.py` that today delegates to the
same `is_admin_or_maintainer` check as `admin_access_only`. It exists as a single substitution point
for the future RBAC permission, so routers need no edit when it lands (FR-6).

### 6. Validation and sanitisation

Per field, derived from the declaration:
- `required` — non-empty after trimming.
- `max_length` — declared bound, and the whole serialised object must fit `dynamic_config.value`.
- `type` — `switch` accepts booleans only; `input`/`textarea` accept strings.
- Only declared field names are accepted; anything else in the payload is rejected rather than
  silently stored. This is what keeps undeclared YAML fields out of the database (D4).

Fields with `markup: markdown` are sanitised on write with `bleach` (already a dependency,
`pyproject.toml:74`). Order matters and is load-bearing: the value is first canonicalised with
`html.unescape`, because a browser decodes character references inside an `href` and
`java&#115;cript:` would otherwise pass a check on the raw spelling; the scheme check runs on the
canonical form; HTML tags are then stripped; and the escaping `bleach` applies to bare `&`, `<` and
`>` is undone before storing, because the stored value is Markdown source and `AT&amp;T` would
otherwise surface in the admin form and the truncation tooltip. The frontend keeps sanitising with DOMPurify at render time as the
second line of defence.

### 7. Audit

Reuses `activity_events` (append-only, JSONB `attributes`). Adds to `activity_models.py`:
`ActivityDomain.CUSTOMER_CONFIG = "customer_config"`,
`ActivityEntityType.CUSTOMER_CONFIG_SETTING = "customer_config_setting"`,
and a `CustomerConfigEvent` class with `SETTING_UPDATED` / `SETTING_RESET`.

`entity_id` is the component id; `attributes` carries `{"key": ..., "old_value": ..., "new_value": ...}`.
The audit write is best-effort and cannot fail the request: the configuration change is already
committed by that point, so an audit failure would otherwise report a 500 for a write that is live.
Values are the same public texts that `GET /v1/config` serves anonymously, so they carry no
sensitive-data exposure beyond what the public endpoint already exposes.

### 8. YAML default

`config/customer/customer-config.yaml` gains:

```yaml
  - id: "chatDisclaimer"
    settings:
      enabled: false
      text: ""
```

## Frontend

### 1. `src/components/SchemaForm/`

A new renderer, not an extension of `CredentialFields` (which is bound to the integrations domain).

- `SchemaForm.tsx` — takes a declaration and a value, renders fields, reports changes.
- `fields/` — `SwitchField`, `InputField`, `TextareaField`.
- `fieldRegistry.ts` — a `type → component` map. An unknown type renders nothing and logs a console
  warning. Data-driven by construction: no `if (type === ...)` chains in the form component.
- Client-side validation is generated from the same declaration constraints (`required`,
  `max_length`, `pattern`) and never replaces the server check.

The form is deliberately semantics-free: `textarea` is a universal text control, and it does not
know that the disclaimer's text is Markdown. Interpreting a stored value — rendering it, flattening
it, truncating it — belongs to whichever surface consumes the key. For every key added later that is
a separate task; the disclaimer's consumer is the only one built in this iteration.

### 2. Administration page

`src/pages/settings/administration/CustomerConfigurationPage.tsx`, its route in `router.tsx` and the
tab entry in `tabs.tsx` are recovered from the closed branch `EPMCDME-13983_global-chat-disclaimer`
and rewired: the page lists declarations from `GET /v1/config/declarations` and renders each through
`SchemaForm`. `DisclaimerCard` and `store/chatDisclaimer` are not carried over.

Per setting the page shows the current value, an overridden/default marker and a reset control.
The page header carries a `Reset all to default` control through the layout's `rightContent` slot,
where the other administration pages keep their actions; it resets every overridden setting and is
disabled when there is nothing to reset. An empty registry renders an empty state, not an error, and
shows no reset-all control.

The Customer Configuration tab is registered for maintainers as well as admins, so navigation
reaches everyone the write guard admits.

### 3. Chat disclaimer

`ChatDisclaimer` is recovered from the closed branch with its inline rendering, `line-clamp-2`,
truncation tooltip and `min-w` intact — that logic is correct and stays at the point of use. Its
source changes from `chatDisclaimerStore` to the customer config already held in `appInfoStore`
(`CONFIG_KEYS.CHAT_DISCLAIMER`).

### 4. Config refetch after save

`appInfoStore.fetchCustomerConfig()` short-circuits on `isConfigFetched`, which is set even on error
(`store/appInfo.ts:164-179`). A `refetchCustomerConfig()` that clears the flag before fetching is
added and called after a successful save, so the admin sees the new value without F5.

## Testing

- Backend: declaration key derivation, including `features:webSearch` → `CUSTOMER_CONFIG__FEATURES__WEB_SEARCH`;
  a per-field override leaves undeclared YAML fields following a later YAML change (the freeze
  regression D4 guards against); merge before the enabled filter, both directions; reset
  restores the YAML value and follows a later YAML change; cache TTL and immediate local
  invalidation; DB failure degrades to last-good then to YAML; validation rejects bad payloads and
  stores nothing; sanitisation strips HTML and `javascript:` links; audit row shape; write guard
  rejects a project admin; empty database behaves exactly as today.
- Frontend: `SchemaForm` renders each declared type, skips unknown types with a warning, builds
  validation from constraints; page shows the override marker and resets; `ChatDisclaimer` hides
  when disabled or empty, renders links, clamps and shows the tooltip only when truncated.

## Open tails (not blocking)

- Admin preview of the inline-flattened rendering — deferred (D3).
- The banner as the second key — explicitly out of scope in the ticket.
