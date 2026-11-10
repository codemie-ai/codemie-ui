# Technical Research

**Task**: standalone core gating navigation routes analytics
**Generated**: 2026-11-05
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-16885, "Standalone Core Gating: UI"

**Description**
- **Context:** Navigation items and routes for Chats, Assistants, and Workflows have no guard. Some Skills, Favorites, and Schedulers surfaces have flags, but none reflects provider availability. The UI never sees the standalone setting, only the availability result from the backend (child `standalone-core-gating-api`).
- **Story:** As a user of a standalone CodeMie deployment with no LLM provider, I want features that cannot work to be hidden and Analytics to open by default, so that I see a working app rather than errors.
- **Background:** With no LLM provider, the backend turns off Chats, Assistants, Workflows, Skills, Schedulers, and webhooks. The UI must hide those pages and the pages that depend on them, open on Analytics, and show no error messages on the pages that remain.
- **Out of scope:** All backend changes; voice input, smart tool selection, conversation analytics, and marketplace similarity gating; hiding Analytics tabs per data source; a new on-screen message about the missing provider.
- **Decisions:** D2, D3, D5, D7, D9, D10, D14, D19. Key points: Analytics is the landing page; Analytics loads without errors; a direct link to a disabled page shows the standard not-found page; hiding covers all app-shell controls; no new on-screen message; Skills, Help, Favorites, and Schedulers are hidden too; if the backend sends no availability result, core stays visible.
- **Constraints:** Depends on `standalone-core-gating-api` (EPMCDME-16884), which must land first. The spec must trace which calls run on app load, because a turned-off route must not produce an error message.
- **Open questions:** None.

**Acceptance Criteria**
1. Backend reports core available → navigation, routes, landing page unchanged.
2. Core not available → Chats, Assistants, Workflows, Skills, Help, Favorites, Schedulers do not appear in navigation, and no other app-shell control (logo, mobile top bar, pinned shortcuts, onboarding tours) leads to them.
3. Core not available → opening app root or signing in lands on Analytics.
4. Core not available → direct link to a Chats, Assistants, Workflows, Skills, Help, Favorites, or Schedulers page does not open; the standard not-found page shows.
5. Core not available and Analytics has no data → no error message; tabs without data show normal empty state.
6. Core not available → no error message on any visible page because of disabled features; a selector of assistants or workflows (e.g. in Integrations) shows an empty list.
7. Backend sends no availability result (older version) → core stays visible, landing page unchanged.

Note: the branch already has related gating work (feature flags e.g. googleOauth, sharepoint, mermaid gating by feature-flag availability) — find the existing feature-flag/config store pattern to reuse.

---

## 2. Codebase Findings

### Existing Implementations

**Purpose A: the UI learns a capability is on/off from the backend**
- `appInfoStore` (`src/store/appInfo.ts:173`) holds `configs: ConfigItem[]` + `isConfigFetched`; `fetchCustomerConfig` (`:213`) calls `GET v1/config` once per tab; on error it sets `isConfigFetched = true` and leaves `configs` empty (`:223-226`). `refetchCustomerConfig` (`:208`). ~150 consumers.
- `ConfigItem` = `{id, settings:{enabled, value?, availableForExternal?, ...}}` (`src/types/entity/configuration.ts:16`).
- Flag ids: `FEATURE_FLAGS` (`src/constants/featureFlags.ts:19`). Rule of every flag: enabled only if `settings.enabled` true (absent = false).
- Hooks: `useFeatureFlag(id)` (`src/hooks/useFeatureFlags.ts:62`) returns `[isEnabled, isLoaded]`, absent = disabled; named wrappers (`useFavoritesEnabled`, `useFavoritesPageEnabled`, `usePinnedAssistantsEnabled`, `useSchedulersViewEnabled`, ...). 74 callers.
- **`useMermaidEnabled` (`useFeatureFlags.ts:158`)** is the on-branch precedent for "absent = enabled": only explicit `settings.enabled === false` disables (older-backend default, matches AC7). Added in commit 4fca84cb4.
- Non-React: `isConfigItemEnabled(config, id)` / `getConfigItemSettings` (`src/utils/settings.ts:187,196`): absent = false; also false for external users when `availableForExternal === false`. 25 callers.
- Credential gating: `config.featureFlag` in `getCredentialUIMapping` (`settings.ts:80`) filters Integration credential types (googleOauth, sharepoint work).
- No config id for provider/core availability exists in `src/`. grep for standalone / coreAvailable / llmAvailable: only `StandaloneLayout` (auth page layout, unrelated). The id and shape come from EPMCDME-16884 (not in this repo).

**Purpose B: hide pages/controls when a feature is off**
- `Navigation` (`src/components/Navigation/Navigation.tsx:52`) builds items by hand:
  - `upperItems` (`:90`): Chats and Assistants always; Skills if `useFeatureFlag('skills')`; Workflows always; Applications if any.
  - `upperSecondaryItems` (`:129`): Integrations, Data Sources (flag any of knowledge bases/datasources/code indexing), AI Katas, Schedulers (`isSchedulersViewEnabled`, spliced at 2), Analytics.
  - `favoritesItems` (`:170`): needs `favorites` AND `favoritesPage`.
  - `lowerItems` (`:184`): Help always.
  - Logo `NavigationLogo` `onClick={handleCreateChat}` (`:75-78, :219`): `chatsStore.startNewChat` then `router.push({name:'new-chat'})`.
- `FeatureGuard` (`src/components/FeatureGuard.tsx:46`): throws a 404-shaped error, caught by root `ErrorBoundary: ErrorPage` -> `NotFoundError` (`src/pages/error/ErrorPage.tsx:29`). Reads `configs` via `isConfigItemEnabled` (absent = off; does not look at `isConfigFetched`). Used in `src/router.tsx` for schedulers (`:351`), favorites (`:843`, both `favorites` + `favoritesPage`), data sources (`:305`), AWS, enterprise analytics dashboards (`:798,807`). Only 2 callers per codegraph (router.tsx).
- Routes with no guard (`src/router.tsx`): chats (`:119`, ids `new-chat`, `chats`, `chats-detail`; `shared-chat` is `/share/conversations/:token`), assistants (`:142`), skills (`:228`, no guard, nav-only flag), workflows (`:433`, `workflows` route is a `redirect('/workflows/my')` loader), help (`:824`, also `help/models`), integrations, katas, applications, analytics (`:788`).

**Purpose C: landing page / where the app opens**
- Root index route renders `Chat` (`router.tsx:815-818`, `otherRoutes`, `index: true`) - no redirect.
- Sign-in: `SignInPage.handleSignIn` (`src/authentication/local/SignInPage.tsx:45`): `navigate(returnUrl ?? '/')`; `returnUrl` from `?next=` or `consumePostLoginRedirect()` (`src/utils/postLoginRedirect.ts:40`, sessionStorage; saved by `src/utils/api.ts` on 401; stores any path except `/`). Keycloak/SSO path has no UI redirect code found here (theme at `src/authentication/keycloak-theme/login/Template.tsx`).
- `ErrorPage.handleGoHome` -> `navigate('/')` (`ErrorPage.tsx:26`); `NotFoundError` has the same "go home" (so not-found "home" lands on root).
- `MobileTopBar` logo button (`src/components/Navigation/MobileTopBar.tsx:140-147`, aria-label "New chat") -> `handleCreateChat` -> `new-chat`; its label from `SECTIONS[pathname.split('/')[1]]` (`:110`).
- Analytics page (`src/pages/analytics/AnalyticsPage.tsx:41`): default tab insights; own flag-gated tab validation (`:110-132`, redirects invalid tab to insights).

**Purpose D: app-shell controls that lead to core pages (AC2 list)**
- `NavigationPinnedSection` (`src/components/Navigation/NavigationPinnedSection/NavigationPinnedSection.tsx:52`): pinned + help assistants rows; click = `chatsStore.startNewChat` + `new-chat` (`:78-84`). Gated by `usePinnedAssistantsEnabled` only. Reads `assistantsStore.pinnedAssistants/helpAssistants`. `NavigationAssistants` (`src/components/Navigation/NavigationAssistants.tsx:39`) lists help assistants -> `start-assistant-chat`.
- `HelpPanel` (`src/components/HelpLauncher/HelpPanel.tsx:56`): mounted in `App.tsx:103` (desktop); shows only for routes in `ROUTE_ID_TO_PAGE_ID` (`HelpPageId`: chat, assistants, workflows, integrations, datasources, katas) - so it self-hides on Analytics.
- `AutoPopupManager` (`src/components/appLevel/AutoPopupManager.tsx:45`): effect 1 starts `NAVIGATION_INTRODUCTION_FLOW_ID` for non-completed SSO users (`:72-75`); effect 2 starts first-visit page tours by route id.
- Onboarding flows `src/configs/onboarding/*` (6 flows, index.ts): `navigationIntroduction.tsx` has steps for Chats (`:90`), Assistants (`:107`) etc. targeting nav links by text (`findNavLinkByText`) and `[data-onboarding="navigation-logo"]` (`:83`). Existing step gating mechanism: per-step `condition: () => isFeatureEnabled('skills')` (`assistantsOverview.ts:198,208`; `chatInterfaceBasics.ts:212`). Flows `chatInterfaceBasics`, `assistantsOverview` are pages of core features.
- `FloatingKataWindow` (App.tsx:99) navigates to `/katas/:id` (Katas is not in the disabled list).
- Other in-app links to core: `ErrorPage`/`SignUpPage` `/`; `useChatSidebarNavigation`, `ChatSidebar*` (inside chat pages only).

**Purpose E: app-load calls (spec constraint)**
- `useInitialDataFetch` (`src/hooks/appLevel/useInitialDataFetch.tsx:26`), run from `App` (`App.tsx:56`); `App` renders a Spinner until `user && isConfigFetched` (`App.tsx:78`). Order:
  1. `appInfoStore.fetchCustomerConfig()` (awaited)
  2. `userStore.loadUser()` (401 -> stop)
  3. `preferencesStore.fetchPreferences`, `profileSettingsStore.fetchProfileSettings` (awaited)
  4. `assistantsStore.fetchPinnedAssistants()` (catch -> console.error), `chatsStore.getFolders()`, `getAssistantFolders()`, `getChats()` (catch -> console.error)
  5. un-awaited, no catch in the hook: `appInfoStore.loadAppInfo/fetchToolConfigs/getLLMModels/getEmbeddingsModels`, `applicationsStore.fetchApplications`, `assistantsStore.loadShowNewAssistantAIPopup/getAssistantCategories/getDefaultAssistant/getHelpAssistants`, `skillsStore.getSkillCategories`.
- Whether each store method toasts on failure was not traced for the un-awaited group. Confirmed toaster use: `skillsStore.indexSkills` toasts "Failed to load skills" (`src/store/skills.ts:183`); `chatsStore`, `workflowExecutions`, `dataSources` stores import `toaster` (codegraph caller list of `toaster.info`). Whether `v1/llm_models` returns an error with no provider: unverified (backend).
- `AnalyticsPage` on mount: `analyticsStore.loadDashboards()` (`:88-90`), `userStore.getAnalyticsUsers` (only with URL users filter), plus tab components. `analyticsStore` keeps `error: Record<string, ErrorDetails|null>` per request type (`src/store/analytics.ts:94`); rendering of that error per tab not traced.

**Purpose F: selectors of assistants/workflows (AC6)**
- `useResourceOptions` (`src/pages/integrations/components/SettingsForm/hooks/useResourceOptions.ts:24`): `assistantsStore.getAssistantOptions` / `workflowsStore.getWorkflowOptions` (`workflows.ts:308`); on failure `catch { setOptions([]) }` with no toast (`:70-71`). Already yields an empty list on error.
- Other selectors: `AssistantSelector` (workflow editor) `src/pages/workflows/editor/configPanels/components/AssistantSelector.tsx` (workflow editor, core page); `AssistantSelector` `src/pages/assistants/components/AssistantSelector.tsx`; `WorkflowSelector` `src/pages/workflows/components/WorkflowSelector.tsx:53` used in `GuardrailAssignmentEntitySelector` (guardrails popup on settings/admin pages); `UserMapping` `IntegrationSelector` (assistant details).

**Other touched code**
- `src/hooks/useVueRouter.tsx:67` (`router.resolve({name})` used by Navigation); `src/routerInstance` (`getRouter`); `src/components/Navigation/NavigationSection/NavigationLink.tsx:54` (`NavigationLinkItem`).

### Decisions Already in the Code
- Convention for flags: constants in `FEATURE_FLAGS` + a named hook in `useFeatureFlags.ts`; route guards via `<FeatureGuard featureFlags=... match=...>` wrapping `<Outlet/>` in a pathless parent (favorites `router.tsx:841`, schedulers `:348`, aws `:709`). Not-found via thrown 404 (reason in comment: no built-in way to throw 404 in the lib, `FeatureGuard.tsx:61-62`).
- Default direction: absent flag = disabled (`useFeatureFlag`, `isConfigItemEnabled`), except Mermaid = enabled unless explicit `false` (`useFeatureFlags.ts:151-153`, comment "older backend"). AC7 needs the Mermaid direction; the data was stored as `enabled: true` = on.
- `FeatureGuard` ignores `isConfigFetched` but `App` does not render `<Outlet/>` until config is fetched (`App.tsx:78`), so guards never see an unfetched config in the shell routes. `login-success`, `sign-in`, `sign-up` are outside `App` (`router.tsx:896-910`).
- Config fetch failure leaves `configs = []` and `isConfigFetched = true` (`appInfo.ts:223-226`); a "present-and-false" rule keeps core visible on failure, an "enabled-only" rule does not.
- Landing page is implicit: index route = Chat, no redirect loader. `workflows` route already uses a `loader: () => redirect(...)` (`router.tsx:437`) - an existing precedent for redirects.
- Navigation flags are read independently per item; "Favorites" visibility needs two flags; Skills visibility uses the raw string `'skills'`, not a `FEATURE_FLAGS` constant (also `'features:interactiveElements'`, `'features:generatedAssistantIcons'` raw strings).
- Tests mock `appInfoStore`/feature-flag hooks (see section 4).

### Task Statements Checked Against the Code
- "Navigation items and routes for Chats, Assistants, and Workflows have no guard": holds (`Navigation.tsx:92-116`, `router.tsx:119,142,433`).
- "Some Skills, Favorites, Schedulers surfaces have flags": holds for nav (`skills` flag, Navigation.tsx:104) and Favorites/Schedulers routes (FeatureGuard); Skills routes (`router.tsx:228`) have no guard - contradicted for the routes part.
- "Skills ... hidden too" AC4 requires direct link to Skills to 404: keeps nothing; Skills routes unguarded today.
- "Help is hidden": Help nav item (`Navigation.tsx:184`) and `help`/`help-models` routes (`router.tsx:824-833`) have no guard; `HelpPanel` is a separate surface (self-hides off core pages). Whether `/help/models` counts as "Help page" is a task-reading question.
- "Analytics is the landing page": today index = Chat (`router.tsx:815`); sign-in -> `'/'` (`SignInPage.tsx:53`). Contradicted for current behaviour (expected, it is the change).
- "UI never sees the standalone setting, only availability result from backend": unverified (outside repo; EPMCDME-16884). What would settle it: the API child ticket/spec naming the config id and shape. Nothing in `src/` reads it.
- "If the backend sends no availability result, core stays visible": maps onto the `useMermaidEnabled` pattern (absent = enabled); the plain `useFeatureFlag` pattern is the opposite. Keeps no existing mechanism.
- "A selector of assistants or workflows (e.g. in Integrations) shows an empty list": holds for `useResourceOptions` (catch -> `[]`, no toast); not verified for the other selectors above.
- "No error message on any visible page": the app-load calls in Purpose E include stores that toast on failure (skills, chats); tracing per call is left to spec.
- "Hiding covers all app-shell controls (logo, mobile top bar, pinned shortcuts, onboarding tours)": all four exist as listed in Purpose D; additionally found: `NavigationAssistants`, `HelpPanel`, `AutoPopupManager` first-visit tours, `ErrorPage` go-home (-> `/`).
- "Skills, Help, Favorites, Schedulers hidden too" - keeps existing flag-based gating (`skills`, `favorites`+`favoritesPage`, `schedulersView`) in place; consumers listed under Consumers.

### Consumers of Changed Contracts
Contracts the task changes: nav item list, route table, root/post-login landing, Chat-as-index, logo/pinned/help/tour entries.
- `skills` flag (raw string): `Navigation.tsx:80`, `ChatPromptSkillsButton.tsx:31`, `ChatConfigSkillsSelector.tsx:33`, `VirtualAssistantForm.tsx:147`, `AssistantForm.tsx:248`, onboarding `assistantsOverview.ts:198,208`, `chatInterfaceBasics.ts:212`.
- `schedulersView` flag: `Navigation.tsx:84,152`, `router.tsx:351`, hook `useFeatureFlags.ts:132`.
- `favorites`/`favoritesPage`: `Navigation.tsx:81-82,172`, `router.tsx:844`, `WorkflowsNavigation.tsx:38` (favorites tab).
- `Navigation` item labels used by tour targeting `findNavLinkByText` (`src/utils/onboarding`): `navigationIntroduction.tsx:95,112,...`; a hidden item leaves a tour step with a missing target (step has no `condition` for Chats/Assistants).
- Route ids consumed by name: `ROUTE_ID_TO_PAGE_ID` (HelpPanel, AutoPopupManager), `ROUTE_ID_TO_TITLE` (MobileTopBar `:113`), `router.resolve({name:...})` in Navigation (resolve of a guarded route still works - guard fires at render, not at resolve).
- `router.push({name:'new-chat'})` call sites outside chat pages (non-exhaustive; 24 files match chat-route navigation by grep): `Navigation.tsx:77`, `MobileTopBar.tsx:124`, `NavigationPinnedSection.tsx:82`, `ErrorPage.tsx:26` (to `/`), `AssistantDetailsPage.tsx`, `AssistantCard.tsx`, `AssistantChatStartPage.tsx`, `FavoritesPage.tsx`, `RunChatButton.tsx`, `WorkflowsList.tsx`, `ViewWorkflowHeader.tsx`, `AwsAgentCoreRuntimeDetails.tsx`, `SignUpPage.tsx`.
- Landing consumers: `SignInPage.tsx:53`, `SignUpPage.tsx` (`navigate('/')`), `ErrorPage.tsx:26`, `NotFoundError` go-home, `postLoginRedirect.ts:35` (never stores `/`).
- Inside core pages (unreachable when hidden): `useChatSidebarNavigation`, `ChatSidebar*`, workflow editor selectors.
- `goBackWorkflows`, `navigateBack` (`src/pages/workflows/utils/goBackWorkflows.ts:56`) reference chat/workflow/favorites route names as fallbacks.

### Architecture and Layers Affected
- Store layer: `appInfoStore` (config), `useFeatureFlags.ts` (hooks), `utils/settings.ts` (non-React check), `constants/featureFlags.ts`.
- Routing: `src/router.tsx`, `FeatureGuard`, `ErrorPage`.
- App shell: `App.tsx`, `Navigation`, `NavigationLogo`, `MobileTopBar`, `NavigationPinnedSection`, `NavigationAssistants`, `HelpPanel`, `AutoPopupManager`.
- Auth: `SignInPage`.
- Data loading: `useInitialDataFetch` + stores (chats, assistants, skills, applications).
- Onboarding config: `src/configs/onboarding/*`.
- Page layer: AnalyticsPage, integrations `useResourceOptions`.

### Integration Points
- `GET v1/config` (appInfo) is the only existing UI-side capability channel; `v1/info` (`loadAppInfo`, `appInfo.ts:262`) is the other app-level endpoint (read for `version`, `description`, `fileDatasourceMaxUploadCount`).
- Backend contract from EPMCDME-16884 is not in the repo.

### Patterns and Conventions
- Valtio proxy stores + `useSnapshot`; hooks return `[enabled, isLoaded]`.
- Route guards: pathless parent route with `FeatureGuard` + `Outlet`.
- Navigation items as arrays in `Navigation.tsx`, conditional `push`.
- Vue-router-compatible wrapper `useVueRouter` (`push/resolve/replace` with `name`).
- Onboarding step `condition` function.
- Guide: `.ai-run/guides/architecture/routing-patterns.md`, `patterns/state-management.md`, `development/constants-usage.md` (not read in full; filenames matched from Glob).

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/architecture/routing-patterns.md` (routes and navigation), `.ai-run/guides/patterns/state-management.md` (Valtio stores/hooks), `.ai-run/guides/development/constants-usage.md`, `.ai-run/guides/testing/testing-patterns.md`, `.ai-run/guides/onboarding/flow-creation-guide.md` (tours). Not opened in this pass.

### Architectural Decisions
- Inline comment on Mermaid hook (`useFeatureFlags.ts:148-157`) records "absent = enabled for older backend". Comment on `FeatureGuard.tsx:61-62` records the 404 mechanism. No ADR found.

### Derived Conventions
- See Patterns and Conventions.

---

## 4. Testing Landscape

### Existing Coverage
- `src/components/Navigation/__tests__/Navigation.test.tsx`, `MobileTopBar.test.tsx`, `NavigationLogo.test.tsx`, `NavigationAssistants.test.tsx`; `NavigationPinnedSection/__tests__/NavigationPinnedSection.test.tsx`; `NavigationSection/__tests__/*`.
- `src/components/__tests__/FeatureGuard.test.tsx`; `src/hooks/__tests__/useFeatureFlags.test.ts`; `src/constants/__tests__/featureFlags.test.ts`; `src/utils/__tests__/settings.test.ts`; `src/store/__tests__/appInfo.test.ts`, `appInfo.mobileShell.test.ts`.
- `src/configs/onboarding/__tests__/navigationIntroductionConditions.test.ts` (tour conditions).
- `src/utils/__tests__/postLoginRedirect.test.ts`; `src/pages/analytics/__tests__/AnalyticsPage.test.tsx`.
- `src/pages/workflows/editor/configPanels/components/__tests__/AssistantSelector.test.tsx`.

### Testing Framework and Patterns
- Vitest + React Testing Library, projects `unit` and `integration` (`vite.config.ts` `test.projects`). Mocks of `appInfoStore`/feature-flag hooks used in Navigation and AnalyticsPage tests. Tests only when explicitly requested (AGENTS.md).

### Coverage Gaps
- No tests found for `NavigationPinnedSection` rows' click gating beyond existing file; `HelpPanel`, `AutoPopupManager`, `useInitialDataFetch` (codegraph: "no tests found within 3 caller hops"), `SignInPage` redirect; router table (no test of unguarded routes).

---

## 5. Configuration and Environment

### Environment Variables
- `import.meta.env.BASE_URL` (router basename, post-login redirect). `VITE_*` and `window._env_` are public (AGENTS.md); not relevant to a backend-sent flag.

### Configuration Files
- Runtime config is `GET v1/config` (store `appInfoStore.configs`). `.codemie/codemie-cli.config.json` modified in working tree (unrelated).

### Feature Flags and Deployment Concerns
- Existing flags listed in `FEATURE_FLAGS`. Related on-branch commits: googleOauth (1985a18d5), SharePoint reauth (db3e2953a, 4aae3aef7, f92cf3bb5), Mermaid (4fca84cb4).

---

## 6. Risk Indicators

- Backend contract unknown: config id/shape for core availability is not in this repo (depends on EPMCDME-16884).
- Speculative: AC7 default-on semantics differ from `useFeatureFlag`/`isConfigItemEnabled`/`FeatureGuard` (all absent = off); only `useMermaidEnabled` matches. A mix of rules across hooks, guard, and non-React callers can disagree.
- Task statement keeps existing mechanisms in place: `skills`, `schedulersView`, `favorites`+`favoritesPage` flags for the same hiding purpose (see Existing Implementations B, Consumers).
- Skills routes (`router.tsx:228`), Chats, Assistants, Workflows, Help routes have no guard; `workflows` route is a loader redirect that runs before any element guard would render (guard placement matters).
- Root index and sign-in both resolve to Chat via `'/'`; `ErrorPage`/not-found "go home" also goes to `/`; post-login stored path may point at a disabled page (`postLoginRedirect`). Keycloak SSO landing path not found in `src`.
- 13+ files navigate to chat/workflow routes outside the shell (AssistantCard, FavoritesPage, ...); most live on pages that become unreachable, but `AwsAgentCoreRuntimeDetails.tsx`, settings/admin guardrail selectors, `SignUpPage` are outside.
- App-load calls (chats, pinned assistants, skill categories, default/help assistants, applications, llm models) run for every user; error toasts not traced for un-awaited ones (AC6).
- Onboarding: `navigationIntroduction` targets Chats/Assistants/logo steps without `condition`; `AutoPopupManager` auto-starts it on first SSO login.
- Test gaps: `HelpPanel`, `AutoPopupManager`, `useInitialDataFetch`, `SignInPage` redirect.

---

## 7. Summary for Complexity Assessment

The change touches the routing layer (`router.tsx` - chats, assistants, skills, workflows, help routes have no guard, favorites/schedulers already use `FeatureGuard`), the app shell (`Navigation`, `NavigationLogo`, `MobileTopBar`, `NavigationPinnedSection`, `NavigationAssistants`, `HelpPanel`, `AutoPopupManager`, onboarding flows), auth landing (`SignInPage`, root index route, `ErrorPage` go-home) and app-load data fetching (`useInitialDataFetch`). A mature pattern exists to reuse: `appInfoStore.configs` + `useFeatureFlags.ts` hooks + `FeatureGuard` 404, and the Mermaid hook already encodes the "absent = on" direction that AC7 needs. Roughly 12-20 source files plus their tests are in play.

Technical novelty is low (no new library; guard and hook patterns exist) but the surface is wide: every entry point to Chat/Assistants/Workflows/Skills/Schedulers/Help/Favorites (nav, logo, mobile bar, pinned rows, help panel, tours, redirects) has to be enumerated, plus an implicit landing page (index route = Chat, no redirect) that has no existing redirect-by-condition precedent other than the `workflows` loader. The availability key and shape come from an unmerged backend ticket.

Test posture: Navigation, MobileTopBar, NavigationLogo, FeatureGuard, useFeatureFlags and AnalyticsPage have tests with established mocking; `HelpPanel`, `AutoPopupManager`, `useInitialDataFetch`, sign-in redirect have none. Key risks: unknown backend contract, inconsistent default rules across existing helpers, error toasts from app-load calls (AC5/AC6), tours with missing targets.

---

## 8. External References

None named by the task. (EPMCDME-16884 / `standalone-core-gating-api` is a ticket, not a path; not resolvable in this repository.)
