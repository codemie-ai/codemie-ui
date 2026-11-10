# EPMCDME-16885 Standalone Core Gating: UI

## Goal
When the backend reports "core" (Chats, Assistants, Workflows, Skills, Schedulers, webhooks) as unavailable, the UI hides every entry to those areas, opens on Analytics and shows no error caused by the disabled features. When core is available or the backend says nothing, nothing changes.

## Core availability signal
- One place defines it: a single constant (config id, `FEATURE_FLAGS`-style) plus one hook `useCoreAvailable()` and one non-React `isCoreAvailable()` next to `useMermaidEnabled` (`src/hooks/useFeatureFlags.ts:158`) and `src/utils/settings.ts`. Both read `appInfoStore.configs` (`src/store/appInfo.ts:173`, `GET v1/config`).
- Rule: core is unavailable only when the item is present with `settings.enabled === false`. Absent item, empty `configs` or failed config fetch (`appInfo.ts:223-226`) = available (AC7). This copies the Mermaid "older backend" rule, not the `useFeatureFlag` "absent = off" rule.
- Contract, verified against the backend spec (`../codemie/docs/superpowers/tasks/2026-11-05-epmcdme-16884/spec.md`, item 3): the backend emits one runtime component `core` through `_get_runtime_config`, read as `is_feature_enabled("core")`, which prefixes `features:`. So the `v1/config` item is `{ id: 'features:core', settings: { enabled } }` and the constant is `FEATURE_FLAGS.CORE = 'features:core'`. `enabled` is false when no LLM provider is configured in standalone mode; with standalone off it is always true. The payload never carries the standalone value. EPMCDME-16884 is still unmerged, so re-check the id if its implementation differs; a change touches only that constant and the two helpers.
- `App` renders a spinner until config is fetched (`App.tsx:78`), so every shell consumer sees a settled value.

## Behavior when core is unavailable
1. **Navigation** (`Navigation.tsx:90-184`): omit Chats, Assistants, Skills, Workflows, Schedulers, Favorites, Help. Kept: Applications, Integrations, Data Sources, AI Katas, Analytics. Existing flags (`skills`, `schedulersView`, `favorites`+`favoritesPage`) stay and combine with the core rule (hidden if either says hidden).
2. **Logo and mobile top bar** (`Navigation.tsx:75-78`, `MobileTopBar.tsx:124,140`): go to Analytics instead of starting a new chat.
3. **Pinned shortcuts and help-assistant rows** (`NavigationPinnedSection`, `NavigationAssistants`): not rendered.
4. **HelpPanel** self-hides on non-core routes (`ROUTE_ID_TO_PAGE_ID`); no change.
5. **Onboarding**: `navigationIntroduction` steps for Chats, Assistants, Workflows, Skills, Schedulers, Favorites, Help and the logo get a `condition` (existing mechanism, `assistantsOverview.ts:198`). Core-page tours (`chatInterfaceBasics`, `assistantsOverview`, first-visit page tours) cannot start because their routes are unreachable.
6. **Routes** (`router.tsx`): chats (`:119`), assistants (`:142`), skills (`:228`), workflows (`:433`) and help incl. `help/models` (`:824`) get a pathless `FeatureGuard`-style parent keyed on core availability, rendering the standard not-found page (AC4). Favorites (`:843`) and schedulers (`:351`) keep their guards and also require core. The shared-chat link `/share/conversations/:token` is left as is (see Risks).
7. **Landing**: the index route (`router.tsx:815`) renders Chat when core is available, otherwise redirects (replace) to Analytics. Sign-in (`SignInPage.tsx:53`), sign-up, not-found "go home" and SSO all land on `/`, so they need no change. A stored post-login path to a disabled page ends in not-found (accepted).

## App-load call trace (`useInitialDataFetch.tsx:26`)
`api.get` shows an error toast on any non-OK response unless the call passes `skipErrorHandling` (`src/utils/api.ts:398`). So a call that fails on a turned-off backend route toasts even where the store `catch` only logs. Therefore, when core is unavailable, the hook does not run these calls (they are core-only):
- `assistantsStore.fetchPinnedAssistants`, `getHelpAssistants` (`assistants.ts:975`, no skip), `getDefaultAssistant`, `getAssistantCategories` (`:600`, no catch), `loadShowNewAssistantAIPopup` (local only, harmless)
- `chatsStore.getFolders`, `getAssistantFolders`, `getChats`
- `skillsStore.getSkillCategories` (`skills.ts:396`; its "no toaster" comment is wrong, `api.get` toasts)
- `applicationsStore.fetchApplications`: kept (Applications stays visible); assumed not core-dependent, unverified.

Calls that stay for all users: `fetchCustomerConfig`, `loadUser`, `fetchPreferences`, `fetchProfileSettings`, `loadAppInfo`, `fetchToolConfigs`, `getLLMModels`, `getEmbeddingsModels`. Assumption: `v1/llm_models` can answer without a provider; unverified. If implementation finds it errors, it passes `skipErrorHandling` when core is unavailable.

Analytics (AC5): `AnalyticsPage` calls `loadDashboards` on mount plus per-tab requests; with no data, tabs must show their normal empty state and no toast. Implementation traces each tab request and uses `skipErrorHandling` or an empty state where the backend answers an error. No tab is hidden.

Selectors (AC6): `useResourceOptions` (`SettingsForm/hooks/useResourceOptions.ts:70`) already returns `[]` without a toast on failure; it should not issue the assistants/workflows request when core is unavailable. Other selectors on still-visible pages (guardrail `WorkflowSelector`, admin/settings) do the same: empty list, no request, no toast.

## Acceptance criteria
Those of the ticket (AC1-AC7), unchanged.

## Non-goals
- Any backend change; reading the standalone setting itself.
- Voice input, smart tool selection, conversation analytics, marketplace similarity gating.
- Hiding Analytics tabs per data source.
- A new on-screen message about the missing provider.
- Changing existing `skills`, `schedulersView`, `favorites` flag semantics.
- Writing tests (only on explicit request).

## Decisions
- Core is off only on explicit `enabled === false`, over the plain feature-flag "absent = off" rule: AC7 requires older backends and failed config fetches to keep core visible.
- One constant plus one hook plus one non-React helper for the signal, over reading the config id at each call site: the backend key is not final.
- Route hiding via guard rendering the standard not-found page, over redirect to Analytics: AC4.
- Landing via index route that redirects to Analytics, over a loader or a change in sign-in: config is fetched inside `App`, after loaders run, and every entry already goes through `/`.
- Skip core-only app-load calls when core is unavailable, over letting them fail: `api.get` toasts by default.
- Existing flags combined with the core rule, over replacing them: older flags still serve deployments with core on.
- Applications, Integrations, Data Sources, Katas kept visible: not on the disabled list.
- Help route `help/models` hidden along with `help`: it belongs to the Help area.
- Core-only tour steps made conditional, over disabling the whole navigation tour: the remaining steps stay valid.

## Risks
- Config id/shape from EPMCDME-16884 may differ from the provisional constant.
- `/share/conversations/:token` and `AwsAgentCoreRuntimeDetails`, `SignUpPage`, settings/admin selectors still reference chat routes; share link stays reachable but is not an app-shell control.
- Whether `getLLMModels`, `fetchApplications` and Analytics tab requests error on a standalone backend is unverified.
- Hidden test gaps: `HelpPanel`, `AutoPopupManager`, `useInitialDataFetch`, sign-in redirect.
