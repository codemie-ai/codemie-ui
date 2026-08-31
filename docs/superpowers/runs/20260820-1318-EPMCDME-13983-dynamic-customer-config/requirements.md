# Requirements — Dynamic Customer Configuration Managed by Platform Admin

- **Source**: external ticket `EPMCDME-13983` (Story, In Progress) + architecture decisions
  in `~/Projects/codemie/customer-config-dynamic-decisions.md` (resolutions of
  `customer-config-dynamic-open-questions.md`).
- **Repos**: `codemie` (backend, mechanism) and `codemie-ui` (frontend, admin page + chat disclaimer).
- **Branch**: `feature/EPMCDME-13983-dynamic-customer-config` in both repos.

## Goal

A Platform Admin changes customer configuration at runtime from the Administration UI, so that
settings such as the chat disclaimer are updated without a redeploy. The first iteration ships the
mechanism plus exactly one dynamic key: the chat disclaimer.

## Layering

Three layers, built on the two existing APIs rather than beside them:

1. `dynamic-config` stays a low-level key-value store (read/write/delete by key). It knows nothing
   about value semantics, customer config or YAML.
2. `customer-config` (`GET /v1/config`) becomes the business layer: declaration registry, defaults,
   merge rules, validation, cache. Consumers keep calling `/v1/config` only.
3. Value resolution per key: a row in `dynamic-config` wins; otherwise the value comes from YAML.

The product is deployed per customer, so its YAML is an overlay on the system default and no
multi-tenant key scoping is needed.

## Functional requirements

### FR-1 — Declaration registry
- A single in-code registry is the source of truth for which keys may be dynamic. A key absent from
  the registry is read from YAML only.
- A declaration carries: key, value type, reference to the YAML path holding the default,
  requiredness, constraints (length, format as an optional pattern, permitted markup), label and
  description for the UI.
- Validation on write, UI form generation and documentation all derive from the registry; rules are
  not duplicated across layers.
- Making a new key dynamic means adding a declaration only: no API, schema or frontend change.

### FR-2 — Key namespace and storage
- One key equals one customer-config component. The stored value is a JSON object holding the
  declared fields, so a multi-field setting is written atomically in a single row.
- Keys live under the `CUSTOMER_CONFIG__` prefix so they never collide with existing dynamic-config
  keys (user-management feature flag, TMS keys).
- No seeding on startup: a row exists only when an admin explicitly overrides a value.
- With an empty database the system behaves exactly as it does today.

### FR-3 — Resolution and merge
- `GET /v1/config` returns the merged result: overrides applied on top of YAML **before** the
  "enabled" filter, so an override can both enable a component disabled in YAML and disable an
  enabled one.
- Merge is per declared field: a stored override holds only the fields its declaration exposes and
  is laid over the YAML settings field by field. Fields absent from the declaration keep coming from
  YAML and keep following deployments.
- The public response shape of `/v1/config` does not change; existing consumers need no rework.
- `GET /v1/config` stays anonymous. Everything moved into dynamic configuration is public by
  definition.

### FR-4 — Write, reset and markers
- A write is per key: `PUT` with the declared fields. A payload carrying an undeclared field, or a
  value that fails its declaration, is rejected and nothing is stored.
- Reset (`DELETE`) removes the row; the value then comes from YAML again. The YAML value is never
  copied into the database, so a reset override does not freeze and keeps following deployments.
- Each key exposes an `overridden` / `default` marker.
- A declarations endpoint under admin protection returns the declared dynamic fields with their
  current values and override markers; it returns dynamic fields only.

### FR-5 — Caching and resilience
- The cache lives in the `customer-config` layer; consumers do not cache.
- An admin change becomes visible on every pod within a bounded, configurable interval (default
  60 seconds). The pod that performed the write invalidates its own cache immediately.
- A failure of `dynamic-config` or of the database does not break `/v1/config`: it degrades to the
  last cached value, then to YAML.

### FR-6 — Security and audit
- Write access is guarded by a dedicated dependency that today resolves to admin-or-maintainer and
  can later be repointed at an RBAC permission without touching routers. A project admin does not
  qualify.
- Every change is recorded in the existing append-only activity log: actor, timestamp, key, old and
  new value. Recording is best-effort: it never turns a committed change into a failed request.
- Text fields carrying markup are sanitised on write; the frontend keeps sanitising on render as a
  second line of defence.

### FR-7 — Administration page
- The administration page is reachable by everyone the write guard admits, and no one else.
- The page renders only fields declared in the registry. Non-migrated config never reaches the
  frontend, neither for display nor in the API response.
- The field list comes from the backend. The frontend holds no hardcoded field list and no knowledge
  of the YAML structure. Adding a key requires no frontend release.
- The form is generated from the declarations (type, constraints, label, description), not
  hand-assembled per field. Field types in this iteration: switch, input, textarea. An unknown type
  is not rendered and produces a console warning.
- An empty registry renders an empty page in a meaningful state, not an error.
- Each field shows its current value, the overridden/default marker and a reset control.
- The page header carries a single control that resets every overridden setting at once. It is
  inactive when nothing is overridden.
- Client-side validation is built from the same constraints and does not replace server-side
  validation.
- After a successful save the admin sees the new value without a manual page reload.

### FR-8 — Chat disclaimer as the first key
- `chatDisclaimer` is declared in `customer-config.yaml` with the default `{enabled: false, text: ""}`.
- The disclaimer is shown in Chat below the message input, only when enabled, for every user.
- It is non-dismissible and separate from the existing banner component.
- Links in the disclaimer text render as clickable.
- It keeps a minimum width and does not collapse to zero.
- When space is limited the text is truncated with an ellipsis and a tooltip shows the full text.
- Block-level markup is flattened inline so admin input cannot break the two-line layout.

## Out of scope
- The banner (the natural second key) — deferred to a follow-up.
- Bulk migration of the remaining config keys.
- Migration of existing customer YAML values into the database (unnecessary: an empty database means
  no overrides).
- Config versioning and gradual rollout of changes.
- Cross-pod pub/sub invalidation (TTL is the first-iteration mechanism).

## Reused from the closed scope
The previous iteration (MRs !4014 backend and !1710 frontend, both closed) leaves reusable material:
`ChatDisclaimer.tsx`, the Customer Configuration page shell, its route and admin tab, the validation
rules and the testing approach. Dropped: the `chat_disclaimer` table with its service, router and
migration, plus `DisclaimerCard` and `store/chatDisclaimer`.

## Resolved questions
1. **Admin preview of the flattened rendering** — out of scope for this iteration. It is not in the
   ticket's acceptance criteria, and the generic form renders controls only: interpreting a stored
   value belongs to the surface that consumes it.
2. **Permitted markup** — full Markdown minus unsafe HTML. `markup` is an attribute of the field
   declaration driving server-side sanitisation, not a property hardcoded for the disclaimer.
3. **Sensitive data in the audit log** — not a constraint here. The stored texts are the same public
   values `GET /v1/config` already serves anonymously.
4. **Storage type** — no schema change. The override is stored under the existing `value_type=STRING`
   with the object serialised as JSON, matching how `MCP_AUTH_DISCOVERY_PRIVATE_NETWORK_ALLOWLIST`
   already stores a JSON array.
5. **Merge granularity** — per declared field, revising decision A-3 of the decisions doc. Storing
   the whole `settings` object would freeze the undeclared `name`/`description` fields of the 19
   `features:*` components against later deployments.
