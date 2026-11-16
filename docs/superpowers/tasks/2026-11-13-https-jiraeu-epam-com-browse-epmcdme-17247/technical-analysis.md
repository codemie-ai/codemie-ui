# Technical Research

**Task**: hosted applications card click open launch viewer eye icon edit details
**Generated**: 2026-11-13
**Research path**: filesystem

Workspace root: `/Users/yanaasadchaya/Projects/epam/airun`. Repositories:
- `codemie-ui` (`codemie-ui`, researched at `origin/main` = `c30bd6125`, read-only via `git show`/`git grep`): **affected**. The card click handler and View button live here.
- `codemie` (`codemie/.claude/worktrees/infallible-margulis-51ff71`, `4a6a085160`): **not_affected**. The list payload already has `has_active_version` (`codemie:src/codemie/service/hosted_applications/projections.py:59`), and the card reads it today.

---

## 1. Original Context

"клик на апп должен открыть апп, а не на эдит идти — глазок очень не однозначно" — In CodeMie UI hosted applications (EPMCDME-15659, epic EPMCDME-15817), clicking a hosted app (its card or row in the list) should open (launch/view) the app instead of going to the edit page; the current eye icon for viewing is ambiguous. Card, header and viewer share one More options menu (useHostedCardActions, NavigationMore); details page shows View and Edit as buttons. Determine: current click target of card/row (all places an app is listed: my apps, shared, marketplace, any other list), where the eye icon is and what it does, what view/launch does (viewer route, separate origin), behavior for apps with no live version (no active version, failed/pending upload), view-only users vs owners/managers, routes (details/edit/view), existing icons used elsewhere in CodeMie for "open/launch" (e.g. assistants/workflows card click behavior, for consistency), and any tests (unit/e2e) that assert the current click behavior. codemie backend only if a backend need appears (e.g. the list payload lacks a field needed to know if an app can be launched).

---

## 2. Codebase Findings

### Existing Implementations

**Purpose A: what a click on the card body does.**
- `codemie-ui:src/pages/applications/hosted/HostedApplicationCard.tsx:180-184`: the `Card.onClick` handler ignores clicks inside `a,button,[role="menu"]`. Every other click runs `navigate(hostedRoutes.details(app.id))` and goes to `/apps/:id`, the **details page, not edit**. The inline comment there reads: "As for assistants: the card opens the details page; only Open launches the app."
- `codemie-ui:src/components/Card/Card.tsx:74-86`: the shared `Card` is a `div role="button" tabIndex=0`. Enter or Space on the card itself calls the same `onClick`, so keyboard activation follows whatever the click does.
- Only one component renders the card: `HostedCatalogResults.tsx:89-96`. One page uses that: `HostedApplicationsPage.tsx:87-101`. All four hosted tabs (`mine`, `project`, `marketplace`, `shared`, see `hostedCollections.ts:84-119`) go through this one path, routed in `router.tsx:545-548`. The hosted list has no table or row view. The sidebar (`ApplicationsSidebar`) and `Navigation.tsx:95-137` only check `capabilities.view`; neither lists apps.
- The Platform tab uses a different component, `codemie-ui:src/pages/applications/components/ApplicationCard.tsx:55-63`. On that card, clicking the body **launches** the app (`onClick={handleOpenClick}`), and an `Open` button (`open.svg` + text "Open") does the same.

**Purpose B: launching or viewing the app.**
- `useHostedApplicationCatalog.ts:100`: `open = app => navigate(hostedRoutes.view(app.id))`. It is passed as `onOpen` to the card.
- The card's View button, `HostedApplicationCard.tsx:90-119` (`OpenButtons`), is icon-only: `eye.svg`, `aria-label="View <name>"`, tooltip "View". It is disabled when `!canOpen(app)`, and a wrapper tooltip then says "No active version yet".
- `HostedApplicationCard.tsx:186-196`: when `!openable && isManager(app)`, the View button is **replaced** by a text button from `nextStepLabel` (`:55-59`): "Upload version" if there is no `selected_version_id`, "Activate version" if `artifact_kind` is set and activate is not refused, otherwise "Manage". All three navigate to details.
- The cover badge (`:139-147`) shows "Suspended" when suspended, otherwise "No active version yet" when not openable.
- `hostedAccess.ts:25`: `canOpen = !!app.has_active_version`. Suspension does not affect it, because `SuspensionRefused` is only `'activate'|'move'|'publish'|'share_on'` (`types/entity/hostedApplication.ts:29`).
- `hostedAccess.ts:53-54`: `hostedActions` always starts with `{key:'open', label:'View', disabled:!canOpen}`. In `useHostedCardActions.tsx:52-53,115-116`, `open` uses the `open.svg` icon and navigates to the view route.
- Viewer: `HostedApplicationViewer.tsx` at `/apps/:id/view` (and `/apps/:id/preview/:versionId`). It calls `store.issueLaunch` and renders an iframe through `utils/hostedApplicationFrame.ts`. Content must come from a different origin than CodeMie (`:48-54`, "Uploaded content must never share the CodeMie host"). If the app can't be shown, `unavailableCopy` (`:53-84`) gives managers "Upload a version and activate it…" and everyone else "Its publisher has not activated a version yet". It handles stale or replaced versions and `VERSION_NOT_ACCEPTED`.
- Details page: `HostedDetailsActions.tsx:22,39-50` shows a `View` button (eye.svg + text, disabled if `open.disabled`) and an `Edit` button (managers only). `HostedApplicationDetails.tsx:125-134` wires `onOpen` to `details.open()` and sends Edit to the edit route.
- The `HostedApplicationOverview.tsx:81` sidebar builds `useHref(hostedRoutes.view(app.id))` as a link.

**Purpose C: role-based actions.**
- `hostedAccess.ts:21`: `isManager = canEdit(app)`, which checks `user_abilities` for write.
- In `hostedActions`, view-only users get only `open`, plus `share`, `delete` and moderation if the server grants them. Managers also get `edit`, `upload` and publish/unpublish.
- `HostedApplicationsPage.tsx:99-100` skips `'open'` in the card menu ("View has its own button on the card"). The details header skips `open` and `edit`. The viewer menu (`HostedViewerActions.tsx:27-40`) skips `open` and `share` and adds "Manage application" (managers) or "Application details" (everyone else) with `edit.svg`, linking to details.

### Decisions Already in the Code
- A card click goes to details and only the explicit button launches. This is recorded at `HostedApplicationCard.tsx:182`, with assistants given as the reason. Assistants and workflows do behave that way: `WorkflowCard.tsx:129-137` opens the workflow view on card click, and `AssistantCard.tsx:208-214` uses a separate "Start chat" icon button (`chat-new-filled.svg`). The Platform `ApplicationCard` (the alternative) launches on card click.
- Hosted apps open only inside CodeMie. `router.tsx:577-580` redirects `/apps/:id/standalone` to view. `HostedApplicationCard.test.tsx` asserts "offers no way to open the app outside CodeMie from the card".
- The details page moved from `/apps/:id/manage` to `/apps/:id` (`router.tsx:561-565`).
- Icons for the same "View/Open" action differ: `eye.svg` on the card and the details button, `open.svg` in the overflow menu, `view.svg` on the version list Preview (`HostedVersionList.tsx:16,178`), and `open.svg` with the text "Open" on the Platform app card. Other `open.svg` "open" uses: `DataSourceActions.tsx:230`, `AwsDataSourcesList.tsx:111`. `eye.svg` also means password reveal (`PasswordToggleButton.tsx`) and analytics preview elsewhere.
- Test names and comments still say "Open" (for example "launches only from Open" and "offers a manager %s instead of Open"), while the UI label is "View".

### Task Statements Checked Against the Code
- "clicking a hosted app … going to the edit page": **contradicted**. A card click goes to the details page `/apps/:id` (`HostedApplicationCard.tsx:183`), not `/apps/:id/edit`. Managers do see an Edit button first on the details page.
- "row in the list": **contradicted**. There is no row or table view for hosted apps, only cards in a grid (`HostedCatalogResults.tsx:84-97`).
- "Card, header and viewer share one More options menu (useHostedCardActions, NavigationMore)": **holds**. Each one skips different keys (see Purpose C).
- "details page shows View and Edit as buttons": **holds** (`HostedDetailsActions.tsx:22`).
- "eye icon for viewing is ambiguous": **holds** as a fact about the icon. `eye.svg` appears on the card (icon-only) and on the details View button. The menu uses `open.svg` for the same action.
- "backend only if the list payload lacks a field": **holds, no gap**. `has_active_version` is sent to every user, and `selected_version_id` and `active_version_id` go to managers only (`projections.py:59,63-66`).
- Making a card click launch the app **keeps in place** the code-recorded decision "card opens details, as for assistants" (`HostedApplicationCard.tsx:182`). It also affects these consumers: the card test at `:152`, keyboard activation through `Card`, and the manager next-step buttons, which stay as the route to details.

### Consumers of Changed Contracts
- Card body click: `HostedApplicationCard.test.tsx` "opens the details page on a card click and launches only from Open" (test file line ~152) asserts `navigate('/apps/'+id)` and that `onOpen` is not called.
- The `onOpen` prop: `HostedCatalogResults.tsx:34,93` and `HostedApplicationsPage.tsx:97` (`catalog.open`). `hosted-filter-defaults.integration.test.tsx:209-215` asserts that `open` goes to `/apps/app-1/view` ("launches … in its viewer, not on its details page").
- The `'open'` skip in the menu: `HostedApplicationsPage.tsx:100`, `HostedDetailsActions.tsx:22`, `HostedViewerActions.tsx:34`.
- The card's View button and disabled tooltip: `HostedApplicationCard.test.tsx` "card without an active version" and "explains the disabled Open…" (by `name: /^View/`). `card-actions-settle.integration.test.tsx` and `catalog-covers.integration.test.tsx` render the card too.
- `hostedActions` labels: `HostedApplicationCard.test.tsx` "card menu" compares menu titles to `hostedActions(app)` labels. The `HostedApplicationDetails.integration.test.tsx:292-308,411` tests use `name: 'View'` and expect `hostedRoutes.view(...)`.
- No e2e or Playwright tests reference hosted apps (`git ls-tree` search on origin/main).

### Architecture and Layers Affected
The change is UI only: the presentation components `HostedApplicationCard` and `Card`, the page and hook (`HostedApplicationsPage` and `useHostedApplicationCatalog`), the access helper `hostedAccess`, and possibly `HostedDetailsActions` and `useHostedCardActions` for icons and labels. Router and backend are not touched.

### Integration Points
The viewer route calls `hostedApplicationsStore.issueLaunch`, which returns a content-origin launch in an iframe. The list data comes from `hostedApplicationsStore.loadApplications` (backend `catalog.py` and `projections.py`).

### Patterns and Conventions
- One action list (`hostedActions`) feeds every surface through `useHostedCardActions.menuItems(app, skip)`.
- Access fields are read only in `hostedAccess.ts`, which says so in its header comment.
- Inner controls avoid the card click with `closest('a,button,[role="menu"]')`, and `NavigationMore` also stops propagation.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`codemie-ui:.ai-run/guides/components/{component-patterns,component-organization,reusable-components}.md` exist. None of them is specific to hosted apps or describes card click behavior.

### Architectural Decisions
- Inline decision: `HostedApplicationCard.tsx:182` (card goes to details, as assistants do).
- `HostedApplicationCard.tsx:86-89`: View is icon-only so the card row keeps room for the status, and the details page labels it.
- `HostedApplicationsPage.tsx:99`: "View has its own button on the card."
- Earlier review: `codemie-ui:docs/superpowers/reviews/2026-11-07-epmcdme-15659-hosted-apps-ui/code-review-final.json`.

### Derived Conventions
In other entity cards (assistant, workflow), a card click opens details or the view page, and the primary run action is a distinct icon button with a tooltip, such as `chat-new-filled.svg` or `run.svg`. The Platform app card is the one place where a card click launches.

---

## 4. Testing Landscape

### Existing Coverage
- `HostedApplicationCard.test.tsx`: card click, the View button, disabled state and tooltip, manager next-step labels, menu parity, and menu actions.
- `hosted-filter-defaults.integration.test.tsx`: `catalog.open` goes to the view route.
- `HostedApplicationDetails.integration.test.tsx`: the details View button navigates to view, and it is disabled without an active version.
- `HostedApplicationViewer.test.tsx` and `embedded-viewer.integration.test.tsx`: viewer routes and launch.
- `platform-launch-routing.integration.test.tsx`: Platform card launch.

### Testing Framework and Patterns
Vitest with React Testing Library (`fireEvent`, `renderHook`, `MemoryRouter`). The tests mock `navigate` and use the `reviewRegressionSetup.tsx` boundary for store mocks. Queries are by role and name (`/^View/`).

### Coverage Gaps
- No test sends keyboard Enter or Space to the hosted card.
- No test covers a card click on a suspended app or on a non-openable card for a view-only user.
- There are no e2e tests.

---

## 5. Configuration and Environment

### Environment Variables
None specific.

### Configuration Files
`codemie-ui:src/constants/routes.ts:49-62` and `pageTitles.ts:95-106` hold the route ids and titles.

### Feature Flags and Deployment Concerns
`FEATURE_FLAGS.HOSTED_APPLICATIONS` (`features:hostedApplications`) gates the whole area. The viewer redirects away when it is off (`useHostedFeatureRedirect`).

---

## 6. Risk Indicators
- The task's premise ("goes to edit") is contradicted: a card click goes to details. The spec should confirm the target is "launch instead of details" (see Task Statements).
- This reverses a decision recorded at `HostedApplicationCard.tsx:182`, which cites assistant parity. The Platform `ApplicationCard` already launches on card click, so the two kinds of card in one Applications area behave differently today.
- Non-openable apps (`has_active_version` false) have no launch target. The card's behavior for them, for managers and for view-only users, is not decided by the code. The viewer does handle them with an "No active version yet" page.
- Speculative: if a card click launches, the details page needs another entry point from the card for view-only users. Today their only routes there are the card body or the viewer menu's "Application details". Managers' menus have no "Details" item; `hostedActions` has no `details` key.
- Several tests assert the current behavior and wording (`HostedApplicationCard.test.tsx` card-click test, `/^View/` queries, the menu-parity test).
- The View/Open action uses three icons (`eye.svg`, `open.svg`, `view.svg`) and two labels ("View" in hosted, "Open" on Platform).

---

## 7. Summary for Complexity Assessment

The change is confined to the codemie-ui presentation layer under `src/pages/applications/hosted/`. The card click is one handler (`HostedApplicationCard.tsx:180-184`), and every hosted tab (mine, project, marketplace, shared) renders the same card through `HostedCatalogResults`, so there is one place to change. Nearby code that may be touched: the `OpenButtons` eye button, the `hostedActions` labels and icons in `hostedAccess.ts` and `useHostedCardActions.tsx`, and the details `View` button. The backend is not affected: `has_active_version` is already in the list payload for all users.

Nothing about this is technically new. The launch path (`catalog.open` → `/apps/:id/view`) already exists and is tested, and the Platform app card already launches on body click. What remains is product behavior. The task's premise is inaccurate: the click goes to details, not edit. The code also records the opposite decision (assistant parity). Behavior for apps that can't be opened is open: manager next-step buttons, a disabled View with a tooltip for view-only users, and suspension does not block launch. So is how users reach the details page once a card click launches.

Test coverage is good at the unit and integration level (Vitest + RTL). At least one test asserts that a card click goes to details, and several query by "View". There are no e2e tests, and no hosted-card test covers keyboard activation.

---

## 8. External References

None named by the task.
