# EPMCDME-14659 — Hide Knowledge Bases / Datasources / Code Indexing when retrieval is unavailable

## Context

Backend work (EPMCDME-14564, out of scope here) introduces three feature-flag ids in the
existing app-info/config payload the frontend already consumes:

- `features:knowledgeBases`
- `features:datasources`
- `features:codeIndexing`

They are absent (or `enabled: false`) when no Elasticsearch is available. The current UI has no
separate pages for these three concepts — they converge into one existing route family and nav
entry, "Data Sources" (`src/pages/dataSources/DataSourcesPage.tsx`, route id `data-sources`,
`src/router.tsx:279-300`), currently registered and linked unconditionally.

**Resolved design decision (human-approved):** gate that single merged surface as a whole on
"any of the three flags enabled." No internal filtering by `index_type` within the page. This
follows the ticket's real-world trigger (binary Elasticsearch availability drives all three flags
together) and avoids inventing an index_type-to-flag mapping that exists nowhere in the codebase
or ticket today.

## Goal

When none of the three flags is enabled, "Data Sources" (covering Knowledge Bases, Datasources,
and Code Indexing) must be absent from the UI: not visible in navigation, not reachable via its
routes (including direct/deep-link URL entry), and not selectable from any entry point. When at
least one flag is enabled, the page, its routes, and its nav entry behave exactly as today — no
new internal gating.

## Approach

1. Add three entries to `FEATURE_FLAGS` (`src/constants/featureFlags.ts`): keys for
   `knowledgeBases`, `datasources`, `codeIndexing` mapping to their `features:*` ids, following
   the existing flat `as const` convention (17 entries today).
2. Derive one predicate, "is any retrieval-dependent flag enabled," from those three ids. Evaluate
   it in both places that must agree, using the mechanism appropriate to each call site (mirrors
   the existing `isEnterpriseEdition()` / gated-nav precedent):
   - Route composition (`src/router.tsx`) — outside React, non-reactive util
     (`isFeatureEnabled`), same as `analyticsRoutes`/`aiAdoptionConfigRoutes`.
   - Nav composition (`src/components/Navigation/Navigation.tsx`) — inside a component, reactive
     hook (`useFeatureFlag`), same as the existing Skills/Favorites/Analytics conditional pushes.
3. Route gating: apply the existing array-omission idiom to the whole `dataSourceRoutes` family
   (`src/router.tsx:279-300`) — spread it into the exported `routes` array only when the predicate
   is true, exactly as `analyticsRoutes`/`aiAdoptionConfigRoutes` do today. This omits all four
   routes (list, details, edit, create) uniformly at router construction, so a direct/deep-link
   URL falls through to the router's existing not-found handling rather than rendering a working
   page — no per-route `FeatureGuard` wrapping needed since the whole family moves together.
4. Nav gating: wrap the "Data Sources" push into `upperSecondaryItems` in the same
   conditional-construction pattern already used for Skills/Favorites/Analytics in the same file.
5. No other files change. `DataSourcesPage.tsx` internals, the AWS Bedrock "Knowledge Bases"
   vendor-integration page/routes/nav, and `src/utils/settings.ts` credential-type picker
   filtering are all untouched (see Non-goals).

## Acceptance criteria

- When none of `features:knowledgeBases`, `features:datasources`, `features:codeIndexing` is
  enabled, the "Data Sources" nav entry does not render.
- When none of the three flags is enabled, none of the four `dataSourceRoutes` routes
  (`data-sources`, `data-source-details`, `edit-data-source`, `create-data-source`) is reachable —
  neither via nav-driven navigation nor via direct/deep-link URL entry.
- When at least one of the three flags is enabled, the Data Sources page, its routes, and its nav
  entry behave exactly as today, unfiltered.
- Gating reads exclusively from the existing `appInfoStore`-backed flag mechanism
  (`useFeatureFlag`/`isFeatureEnabled` keyed by the three new `FEATURE_FLAGS` ids) — no new
  frontend detection logic of any kind.
- Non-retrieval functionality (chat, assistants that need no retrieval) is unaffected.
- The AWS Bedrock "Knowledge Bases" page, its routes, and its nav entry are unaffected.
- Generic Settings/Integrations credential-type pickers are unaffected.

## Non-goals

- Sub-filtering within the Data Sources page by `index_type` (Knowledge Bases vs. Code Indexing
  vs. generic Datasources) — the page is gated as one unit.
- Gating the AWS Bedrock "Knowledge Bases" vendor-integration page
  (`src/pages/settings/aws/dataSources/*`, `VendorEntityType.knowledgebases`) — out of scope,
  confirmed unrelated to Elasticsearch retrieval.
- Filtering generic Settings/Integrations credential-type pickers
  (`getCredentialUIMapping`/`isConfigItemEnabled` in `src/utils/settings.ts`).
- The retrieval implementation itself, vector storage, or any backend change.
- Gating any other Elasticsearch-dependent area not named by this ticket.
- Global search / quick-action discoverability surfaces — none were found to exist in this app;
  nothing to gate there.

## Testing notes

Neither `Navigation.tsx` nor the router's route-composition logic has existing test coverage.
New tests should cover, for both the nav entry and the composed route table: absent when all
three flags are disabled/unfetched, present when at least one is enabled — mirroring the mocking
pattern already used in `src/utils/__tests__/settings.test.ts`
(`vi.mock('@/store/appInfo', ...)`).
