# Spec — Dynamic Customer Configuration: Banner Settings

**Ticket**: EPMCDME-14649
**Branch**: `feature/EPMCDME-14649-dynamic-banner-config` (backend and frontend)
**Repositories**: `codemie` (backend), `codemie-ui` (frontend)

## Problem

The chat banner is configured through three independent customer-config components —
`bannerMessage`, `bannerLinkLabel`, `bannerLinkRoute` — each carrying its own `enabled`
flag and a field named `value`. Three components describe one feature, which is both
awkward to reason about and impossible to present as a single item in Administration.

The banner is also static: changing it requires a deployment. EPMCDME-13983 introduced a
dynamic customer-configuration mechanism for the chat disclaimer, and named the banner as
its pre-planned second consumer.

## Solution

Replace the three components with a single `banner` component and declare it for runtime
editing. No fallback onto the legacy components is provided.

### Configuration shape

`config/customer/customer-config.yaml` — the three legacy components are removed and
replaced by one:

```yaml
  - id: "banner"
    settings:
      enabled: false
      message: ""
      linkLabel: ""
      linkRoute: ""
```

One `enabled` flag governs the whole banner. The link is rendered when both `linkLabel`
and `linkRoute` are non-empty, which is what the component already does today; the link
has no flag of its own.

### Declaration

A `BANNER` declaration is appended to `DECLARATIONS` in
`src/codemie/service/customer_config_declarations.py`. Its dynamic-config key is derived
by `build_key()` as `CUSTOMER_CONFIG__BANNER`.

| Field | Type | Constraints |
|---|---|---|
| `enabled` | switch | — |
| `message` | textarea | `max_length: 1000`, `markup: plain` |
| `linkLabel` | input | `max_length: 100` |
| `linkRoute` | input | `max_length: 200`, `pattern: ^/[^\s]*$` with `pattern_message` |

`markup` is `plain` because the banner renders its message as text, not markdown.

`linkRoute` is constrained to an application-relative path. The value reaches a
react-router `<Link to={...}>` and is served from the unauthenticated `GET /v1/config`,
and the server-side link sanitiser only inspects markdown link syntax — so without the
pattern, absolute and `javascript:` URLs would pass validation.

### What does not change

The resolver, routers, request/response schemas, the `dynamic_config` table and its
migrations are untouched. Adding a declared setting requires no schema change: overrides
are rows keyed by the derived key, and `GET /v1/config` keeps returning already-merged
components in the existing shape. This is the extension path the mechanism was designed
for.

The banner's rendering, styling, dismiss control and its `localStorage` dismissal key
(a hash of the message text) are unchanged. An administrator editing the message
therefore re-shows the banner to users who dismissed it — existing behaviour, now
reachable more often.

### Frontend

`Banner.tsx` reads the single `banner` component through `useSnapshot(appInfoStore)` and
`getConfigItemSettings`, matching `ChatDisclaimer.tsx`. The three store getters
(`getBannerMessage`, `getBannerLinkLabel`, `getBannerLinkRoute`), their interface
declarations and the three entries in `configKeys.ts` are removed; `BANNER: 'banner'`
replaces them.

Reading a snapshot rather than the raw valtio proxy is required, not cosmetic. The
component currently re-renders only because its parent subscribes to `isConfigFetched`,
so picking up a configuration change without a redeploy holds by accident.

## Breaking change

Removing the legacy components is a breaking change and must be released as one.

1. The ConfigMap `codemie-customer-config` is managed outside this repository and mounted
   over `config/customer`. It must be updated with the `banner` component on every
   deployment, synchronously with this release. Until it is, neither the new nor the old
   components exist on that deployment and no banner is shown.
2. Values do not carry over. The legacy components and `banner` are unrelated keys, so
   any deployment with a configured banner must either ship the values in the new
   ConfigMap or have an administrator enter them once in Administration.
3. Nothing needs to be cleaned up in the database. The banner was never dynamic, so no
   `dynamic_config` rows exist for it.

`VITE_BANNER_MESSAGE` in `upgrade-package/codemie-ui/templates/configmap.yaml` is a
separate legacy path that bypasses customer-config entirely. It is out of scope here and
is left as-is.

## Deviation from the ticket

Acceptance criteria 3 and 4 require the three static parameters to act as
defaults/fallback. This is dropped by a team decision to remove the legacy shape outright
and release the change as breaking. The ticket is updated to match.

## Acceptance

1. Banner settings are editable in Administration as a single configuration item with
   four fields.
2. A saved override is reflected in the chat banner without a redeploy, within the
   existing cache and client-fetch propagation window.
3. When no override exists, the banner follows the `banner` component from
   customer-config.
4. Clearing the override returns the banner to its customer-config values.
5. `linkRoute` rejects values that are not application-relative paths.
6. Banner rendering, styling and dismissal behaviour are unchanged.
7. The chat disclaimer's configuration and behaviour are unaffected.
8. No reference to the legacy component ids remains in either repository.

## Testing

Backend:

- `banner` resolves from customer-config when no override exists, and from the override
  when one does.
- A disabled `banner` is absent from the resolved components.
- The declaration's key matches `DynamicConfigService.KEY_PATTERN` and is unique.
- Validation rejects an over-long `message`, a non-string field, an undeclared field, and
  a `linkRoute` that is absolute or uses a `javascript:` scheme.
- Router-level coverage for `/v1/config/declarations` (GET, PUT, DELETE), including the
  403 path for a caller without configuration-write permission. No router tests exist for
  this surface today, and the backend testing guide requires negative auth cases.

Frontend:

- `Banner` renders message, link and multiline text from the `banner` component, and
  renders nothing when the component is absent or its message is empty.
- The link appears only when both `linkLabel` and `linkRoute` are present.
- Dismissal through `localStorage` behaves as before.
- An integration test asserts the banner reacts to configuration arriving after the first
  paint, following the existing `ChatDisclaimer` integration test. No such test exists for
  the banner today.
