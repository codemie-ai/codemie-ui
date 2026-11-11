# Technical Research

**Task**: katas feature-flag navigation leaderboard
**Generated**: 2026-11-04
**Research path**: codegraph

---

## 1. Original Context

Jira EPMCDME-16851, Sub-task "Turn Katas Off by Default (Frontend)" (full text: /tmp/jira-16851.txt).

Story: As a platform administrator installing CodeMie, I want katas hidden from the application when the katas setting is off so that users of a default installation are not offered a learning feature I have not chosen to offer.
Context: every kata surface is unconditional: navigation item, mobile label, kata pages, floating window (restored from local storage), onboarding tour step; leaderboard shows Kata Completion score part and Katas Completed metric. Established toggle pattern exists (Schedulers): flag read from backend configuration, navigation condition and route guard; a missing flag reads as off. Backend child (EPMCDME-16850) introduces the katas setting.
Acceptance criteria:
- Katas setting off: nav item (desktop+mobile), floating window, onboarding tour step do not appear.
- Off + floating kata window previously open: window does not restore.
- Off + direct katas page URL: kata content does not render; same result as other disabled features.
- Off + leaderboard: Kata Completion score part and Katas Completed metric hidden; other score parts unchanged.
- On: everything works as today.
- Config has no katas entry: katas read as off, no error.
Out of scope: backend changes; changing leaderboard scores; admin-settings switch.
Depends on EPMCDME-16850 (backend). Decisions: D1 leaderboard hides both items, scores unchanged; D2 direct URL gives same result as other disabled features. Open questions: none.

---

## 2. Codebase Findings

### Existing Implementations

Purpose A: hide a feature when its backend config flag is off (the Schedulers pattern).
- Flag constants: `src/constants/featureFlags.ts:19` `FEATURE_FLAGS` (e.g. `SCHEDULERS_VIEW: 'features:schedulersView'` :42). No katas entry.
- Reader: `src/hooks/useFeatureFlags.ts:62` `useFeatureFlag(name)` finds `configs` item by id in `appInfoStore`, returns `[config?.settings?.enabled ?? false, isConfigFetched]`; missing entry reads off, no error. Named wrappers e.g. `useSchedulersViewEnabled` :132.
- Nav condition: `src/components/Navigation/Navigation.tsx:84` reads the flag; `:152` `if (isSchedulersViewEnabled) items.splice(...)` inside `upperSecondaryItems` useMemo (deps :168).
- Route guard: `src/router.tsx:348-392` `schedulerRoutes` wraps children in a pathless route with `<FeatureGuard featureFlags={FEATURE_FLAGS.SCHEDULERS_VIEW}><Outlet/></FeatureGuard>`. `src/components/FeatureGuard.tsx:46` uses `isConfigItemEnabled` (`src/utils/settings.ts:187`; also false for external users when `availableForExternal === false`) and throws a 404 Error routed to ErrorBoundary. Same guard used at ~20 other routes.
- Integration tests bypass FeatureGuard: `src/setupTests.integration.ts:24`.

Purpose B: the kata surfaces (all unconditional today).
- Nav item: `Navigation.tsx:146-150` pushes 'AI Katas' (`IconType.KATA`, route name `katas`) unconditionally. Mobile menu shares this `Navigation` component (`isMobileLayout`, `mobileNavigationOpen`).
- Mobile label: `src/components/Navigation/MobileTopBar.tsx:46` static map `katas: { label: 'AI Katas', icon: IconType.KATA }` keyed by route; only shown for the current route.
- Routes: `src/router.tsx:395-431` `katasRoutes` (7 routes: katas, katas/new, katas/:kataId/edit, katas/in-progress, katas/completed, katas/leaderboard, katas/:kataId), spread into the router at `:887`. No guard.
- Floating window: `src/App.tsx:64` `floatingKataStore.loadFromLocalStorage()` (when `user` loaded), `:99` renders `<FloatingKataWindow/>` for any user. `src/store/floatingKata.ts:113` restores `isVisible`, `kataId` etc. from per-user storage (key `codemie-floating-kata-state`); `FloatingKataWindow.tsx:50` renders from store snapshot and calls `katasStore.completeKata`, navigates to `/katas/:id`.
- Onboarding tour step: `src/configs/onboarding/navigationIntroduction.tsx:228-251` step `ai-katas`, `target: findNavLinkByText('AI Katas')`, `condition: () => !!findNavLinkByText('AI Katas')` (already DOM-conditional on the nav link).
- Leaderboard (two different leaderboards):
  - Analytics leaderboard `src/pages/analytics/components/leaderboard/`: Katas Completed metric = `constants.ts:103` `METRIC_LABELS.kata_completed`, rendered by `LeaderboardSummaryMetrics.tsx:75-101`, which iterates every key of the API `summary_metrics` map (label fallback = key). Kata Completion score part: no "kata" literal in `src/pages/analytics`; score parts render from API data via `LeaderboardDimensionCard.tsx:75-122` (`dim.components`, label from `component.label`, key `component.key`) and `DimensionDetailModal.tsx:32` (`Object.entries(dimension.components)`), shown in `LeaderboardUserDetailModal.tsx:82-95`. The component key/label of the Kata Completion part is not visible in the frontend code or tests.
  - Katas page leaderboard `src/pages/katas/components/LeaderboardContent.tsx:68` (`/katas/leaderboard`, `KatasCategory.LEADERBOARD`), a separate kata-specific table; it is a katas page.
- Other kata references (not named by the task): `src/constants/pageTitles.ts:67-74`, `src/constants/helpLinks.ts:22,56-71` (route-id keyed, inert when routes are guarded), `src/utils/filters.ts:37` `KATAS = 'katas'`, `src/constants/metrics.ts:21-27`, `src/configs/releaseNotes.json`. Test-only: assistants/workflow card tests mention katas incidentally.

Other touched code: `src/store/appInfo.ts` (`configs`, `isConfigFetched`).

### Decisions Already in the Code
- Convention: flag id string in `FEATURE_FLAGS` + optional `useXEnabled` wrapper + inline condition in Navigation + `FeatureGuard` at the route (`router.tsx:351`). Ids follow `features:<camelName>`; some older ones are bare (`mcpConnect`, `aiChampionsLeaderboard`, `skills` is inlined in Navigation.tsx:80 as a string literal).
- Missing flag reads off (`useFeatureFlags.ts:67`, `FeatureGuard` -> 404 via `isConfigItemEnabled`). Disabled-feature result = 404 page via ErrorBoundary (`FeatureGuard.tsx:59-70`).
- While config is not fetched, `useFeatureFlag` returns `[false, false]`; `FeatureGuard` does not check `isConfigFetched` (reads off). Alternative not used; no recorded reason found.
- Floating window state is stored in per-user local storage and restored unconditionally in `App.tsx:64`; no flag read there. Data needed (flag) lives in `appInfoStore.configs`, a different store than `floatingKataStore`.
- Analytics leaderboard score parts / metrics are API-driven generic maps with a static label table; no per-key exclusion mechanism exists (the only filter is `isSpendAnnotationKey`, `LeaderboardSummaryMetrics.tsx:49`).

### Task Statements Checked Against the Code
- "navigation item, mobile label, kata pages, floating window, onboarding tour step are unconditional": holds (Navigation.tsx:146, MobileTopBar.tsx:46, router.tsx:395, App.tsx:99, navigationIntroduction.tsx:228). The tour step's `condition` already depends on the nav link existing.
- "Schedulers toggle: flag from backend config, navigation condition, route guard": holds (see above).
- "A missing flag reads as off": holds (`useFeatureFlags.ts:67`, `settings.ts:189`).
- "Leaderboard shows Kata Completion score part and Katas Completed metric": metric holds (`constants.ts:103`, API-driven); score part unverified in this repo (comes from API `dimensions[].components`; exact key/label not in repo; backend/sample response would settle it).
- "Katas setting introduced by backend child EPMCDME-16850": unverified (outside repository); the config item id/name and whether it uses `settings.enabled` is not in the frontend; a sample `/configs` response or the backend ticket would settle it.
- D2 "same result as other disabled features": holds; that result is `FeatureGuard` 404.
- "Out of scope: admin-settings switch": no katas entry in `src/utils/settingsUIConfig.ts` found (that file mentions scheduler).

### Consumers of Changed Contracts
- `FEATURE_FLAGS` (29 callers incl. Navigation.tsx, constants/index.ts, integration.ts, useFeatureFlags.ts); `src/constants/__tests__/featureFlags.test.ts` asserts individual values.
- `katasRoutes` consumed only at `router.tsx:887`; route ids `katas*`/`kata-detail`/`new-kata`/`edit-kata` consumed by pageTitles, helpLinks, MobileTopBar, `router.resolve({name:'katas'})` (Navigation.tsx:149). Other links into `/katas`: `navigate('/katas/:id')` in AIKatasContent.tsx:79, FloatingKataWindow.tsx:101; EditKataPage -> `/katas`.
- `floatingKataStore` consumers: `App.tsx:43,64`, `FloatingKataWindow`, `KataDetailView` (minimize flow), `src/__tests__/App.test.tsx:51` (mocks store with only `loadFromLocalStorage`; mocks `FloatingKataWindow` :89).
- `METRIC_LABELS` consumed by `LeaderboardSummaryMetrics.tsx:25`; test `__tests__/LeaderboardSummaryMetrics.test.tsx`.
- Navigation tests mock `useSchedulersViewEnabled`-style hooks; `Navigation.test.tsx:131,257` expect 'AI Katas' present by default.

### Architecture and Layers Affected
Constants (featureFlags), hooks (useFeatureFlags), app shell (App.tsx, Navigation, MobileTopBar), routing (router.tsx), stores (floatingKata, appInfo), onboarding config, analytics leaderboard components.

### Integration Points
`appInfoStore.configs` loaded from backend config; `FeatureGuard` and `useFeatureFlag` both read it.

### Patterns and Conventions
See Decisions. `FeatureGuard` accepts a single flag or array with `match`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/architecture/routing-patterns.md` and `.ai-run/guides/onboarding/flow-creation-guide.md` mention katas/schedulers (not read in detail). Per AGENTS.md: patterns/state-management, testing-patterns guides apply.

### Architectural Decisions
None found beyond inline code.

### Derived Conventions
As above.

---

## 4. Testing Landscape

### Existing Coverage
- `src/components/Navigation/__tests__/Navigation.test.tsx` (kata link present, no NEW badge).
- `src/components/__tests__/FeatureGuard.test.tsx`, `src/constants/__tests__/featureFlags.test.ts`.
- `src/__tests__/App.test.tsx` (floatingKataStore mocked).
- `src/components/FloatingKataWindow/__tests__/FloatingKataWindow.test.tsx`.
- `src/pages/katas/__tests__/*.integration.test.tsx` (pagination; FeatureGuard bypassed globally in integration).
- Leaderboard: `LeaderboardSummaryMetrics.test.tsx`, `LeaderboardTab.test.tsx`.
- Schedulers analogue: `src/utils/__tests__/settingsUIConfig.scheduler.test.ts`, SchedulersPage tests.

### Testing Framework and Patterns
Vitest + React Testing Library, projects `unit` and `integration`; hooks mocked via `vi.mock`.

### Coverage Gaps
No tests for tour step `ai-katas` condition, MobileTopBar kata label, floatingKata restore under a flag, or route guard on `katasRoutes`.

---

## 5. Configuration and Environment

### Environment Variables
None related.

### Configuration Files
Backend config items (`appInfoStore.configs`, `{id, settings: {enabled, availableForExternal}}`); no katas id in repo yet. `src/configs/releaseNotes.json` mentions katas.

### Feature Flags and Deployment Concerns
Flags are runtime backend config. Katas id unknown until EPMCDME-16850.

---

## 6. Risk Indicators

- Katas flag id is defined by backend EPMCDME-16850, not present in this repo; mismatch with the id used here would leave katas hidden everywhere (unverified, see Section 2).
- Speculative: floating window restore happens in `App.tsx:64` before/independent of config fetch; `useFeatureFlag` reads off while `isConfigFetched` is false, so ordering of flag and restore needs attention.
- Speculative: `/katas/*` has seven routes in `katasRoutes` with no wrapper; `router.tsx:887` spreads them; Schedulers wraps children via pathless guard route (Existing Implementations).
- Kata Completion score part is API-driven in `dim.components` with unknown key; no existing per-key exclusion mechanism (Decisions). Katas Completed metric key `kata_completed` is known.
- Katas-page leaderboard (`LeaderboardContent`) is distinct from the analytics leaderboard; task wording "leaderboard" is ambiguous between them.
- Onboarding step already condition-gated on nav link presence (navigationIntroduction.tsx:248), keeps an existing mechanism in place (Existing Implementations, Purpose B).
- Existing tests assume katas visible by default (Navigation.test.tsx:257); integration tests bypass FeatureGuard globally, so route-guard behaviour is only unit-testable.
- Two inert-when-guarded consumers remain keyed on route ids (pageTitles, helpLinks, MobileTopBar:46).

---

## 7. Summary for Complexity Assessment

The change touches the app shell (Navigation desktop/mobile list, App.tsx floating window and local-storage restore), the router (`katasRoutes`, 7 routes), the onboarding tour config and the analytics leaderboard display. A complete, small precedent exists: Schedulers (flag constant, `useFeatureFlag` hook, nav condition, `FeatureGuard` route wrapper), where missing flags already read off and disabled routes already 404. Roughly 6-9 source files are involved plus their tests; no new patterns are needed for nav, routes, and tour (the tour step already depends on the nav link).

Less standard parts: the floating window state restore lives in a store separate from config, and the leaderboard score part and metric are API-driven generic maps with no existing per-key exclusion; the Kata Completion part's key/label is not discoverable in this repo. The backend flag id is unverified until EPMCDME-16850.

Test posture: nav, FeatureGuard, flag constants and leaderboard metrics have unit tests that will need updates for the default-off assumption; tour step, mobile label, and floating restore have no coverage; integration tests bypass FeatureGuard.

---

## 8. External References

None named by the task (Jira text read from /tmp/jira-16851.txt, reproduced in Section 1).

## Facts Added by Review

Researched for the names the spec relies on, after the analysis above was written. Read like the facts layer; where a line here contradicts one above, this one was read later.

- chatViewSettings keeps user id in a module variable to avoid a circular import (`chatViewSettings.ts:55-58`).
- Per-user localStorage state is loaded in `App.tsx:62-68` after `user` is set.
- "analytics leaderboard hides Kata Completion part and Katas Completed metric": the Katas Completed label exists at `constants.ts:103`; the "Kata Completion" text exists nowhere in `src`, so it originates in backend payload (framework dimensions/components, top-performer dimensions). Unverified how `LeaderboardSummaryMetrics`/`LeaderboardTab` iterate keys (not read in full).
