# Technical Research

**Task**: hosted applications app card preview details open-in-new-tab standalone-link
**Generated**: 2026-11-12
**Research path**: codegraph

---

## 1. Original Context

(resolved requirements, verbatim from docs/superpowers/tasks/2026-11-12-epmcdme-17135/requirements.local.md)

## Additional requirement from the user (trusted)
The standalone link field, where this direct link can be copied, must also be removed.

Also (added mid-research, coordinator relay of user scope; requirements.local.md line 8): find every other place in the UI that links to / opens a hosted app in a separate (new) tab or exposes its direct standalone URL, and remove all of them from the interface. Covers links, buttons, menu items, copy-link fields, target="_blank" and window.open; list them all with file:line.

## External ticket content (untrusted)
EPMCDME-17135 (Sub-Bug). Summary: Button 'Open in new tab' leads to a broken page with the message 'Service Unavailable'; hosted apps can be opened only inside CodeMie, so the button should be removed from the app card, app preview and Application details page.
Expected Result: The "Open in new tab" button is removed from the app card, the app preview and the Application details page.
Acceptance Criteria:
1. The "Open in new tab" button is removed from the app card of a hosted application.
2. The "Open in new tab" button is removed from the app preview and the Application details page of a hosted application.
3. When a user views the app card, preview or Application details page inside CodeMie, no control leads to a "Service Unavailable" page.
4. The application can still be opened and viewed inside CodeMie (for example, via the "Preview" button on the app card).

---

## 2. Codebase Findings

All paths below are under `src/pages/applications/hosted/` unless stated.

### Existing Implementations

**Purpose A: open a hosted app outside CodeMie (separate tab / standalone URL).** Complete inventory of UI surfaces (searched `_blank`, `window.open`, `openHostedLaunchWindow`, `hostedRoutes.standalone`, `standalone`, `new tab`, `href`, `target=`, `<Link` across `src/`):

1. **App card, "Open in new tab" icon button** — `HostedApplicationCard.tsx:99-110` (inside `OpenButtons`, `:69-112`); renders only when `openable`; `aria-label="Open <name> in a new tab"`, tooltip "Open in new tab", `window.open(standalone, '_blank', 'noopener')` at `:106`. URL from `useHref(hostedRoutes.standalone(app.id))` at `:116`, passed as prop `standalone` (`:72`, `:78`, `:185`). Doc comment `:65-68` describes "View and Open in new tab". Card rendered by `HostedCatalogResults.tsx`.
2. **Application details header, "Open in new tab" button** — `HostedDetailsActions.tsx:64-73`; same `window.open(standalone,'_blank','noopener')` at `:68`; URL from `useHref` at `:53`; imports `useHref` (`:15`), `OpenSvg` (`:19`), `hostedRoutes` (`:26`, used only for standalone). Comment `:38` names it. Rendered by `HostedApplicationDetails.tsx:125-136`.
3. **Viewer / preview header, "Open in new tab" button** — `HostedViewerActions.tsx:46-54`, prop `onOpenSeparately` (`:33-35`, `:42`), `previewing` prop (`:34-35`, `:43`) used only by this button's `disabled`. `OpenSvg` import `:16` used only here. Handler `openSeparately` in `HostedApplicationViewer.tsx:199-222` reserves a tab via `openHostedLaunchWindow()` (`src/utils/hostedApplicationLaunch.ts:73-80`, `window.open('about:blank', name)`) and posts a launch ticket into it with `submitHostedLaunch` (fallback `_self` when blocked). Wired at `HostedApplicationViewer.tsx:260-261`. Viewer serves both `/apps/:id/view` and `/apps/:id/preview/:versionId` (`src/router.tsx:573-587`), so this one button is the "app preview" occurrence.
4. **Details sidebar, "Standalone link (own tab, without CodeMie)" copy field** — `HostedApplicationOverview.tsx:136-140` (`DetailsCopyField`, notification "Standalone link copied to clipboard"); URL from `useHref(hostedRoutes.standalone(app.id))` at `:82`. Sibling field "Application link" `:131-135` copies `/apps/:id/view` (in-CodeMie viewer, not standalone).
5. **Error copy suggesting a new tab** — `BUSY_MESSAGE` `HostedApplicationViewer.tsx:42-44`: "…Retry in a few seconds, or open it in a new tab." Set at `:136` and `:168`. Text, not a control.

Underlying route and helpers (not visible controls):
- `hostedRoutes.standalone` — `hostedRoutes.ts:30-31`; consumers: items 1, 2, 4 only.
- Route `HOSTED_APPLICATION_STANDALONE` → `HostedStandaloneLaunch` — `src/router.tsx:35,58,578-582`; id `src/constants/routes.ts:58`; title `src/constants/pageTitles.ts:104`. `HostedStandaloneLaunch.tsx:30-68` issues a launch and `submitHostedLaunch(…, '_self')` — hands the whole tab to the content origin.
- `openHostedLaunchWindow` — `src/utils/hostedApplicationLaunch.ts:73`; sole production caller `HostedApplicationViewer.tsx:203`.

Searched and found **not** to open a hosted app in a new tab: `useHostedCardActions.tsx:115-116` ('open' → in-app `navigate(hostedRoutes.view)`; its icon `ICONS.open` `:53` is `OpenSvg` but the action is in-app); `HostedSharePopup.tsx:41` (share link `/apps/share/:token`, resolves in-app via `HostedSharePage.tsx:58-62` → `hostedRoutes.view`); `HostedViewerActions.tsx:72` (href to details page); `HostedNotAvailable.tsx:33`, `HostedApplicationDetails.tsx:102`, `HostedApplicationViewer.tsx:307`, `EditHostedApplicationPage.tsx:118` (react-router `Link`s to in-app routes); `src/components/Navigation/Navigation.tsx:95-96` (feature gate only). Platform apps `src/pages/applications/usePlatformApplications.ts:46` and `src/pages/applications/components/ApplicationCard.tsx:61` open platform (non-hosted) app entries in a new tab — different provider.

**Purpose B: open the app inside CodeMie (must keep working, AC4).**
- Card "View" eye button — `HostedApplicationCard.tsx:87-98` → `onOpen` → `useHostedApplicationCatalog.ts:100` `navigate(hostedRoutes.view)`.
- Details "View" — `HostedDetailsActions.tsx:58-63` → `useHostedApplicationDetails.ts:225-230`.
- Version list "Preview" → `hostedRoutes.preview` (`HostedApplicationDetails.tsx:168`).
- Overflow menu "View" — `hostedAccess.ts:54`, `useHostedCardActions.tsx:115-116`.
- Embedded viewer iframe — `HostedApplicationViewer.tsx:275-285`, launch via `store.issueLaunch` (`src/store/hostedApplications.ts:254`).

### Decisions Already in the Code
- Standalone launch was a deliberate feature: comment `HostedStandaloneLaunch.tsx:25-29` ("Its address can be copied and shared; access is checked on every launch"); `hostedRoutes.ts:30`. Reason for removal recorded only in the ticket.
- Card uses icon-only buttons with tooltips to save row space (`HostedApplicationCard.tsx:65-68`); `OpenButtons` wrapper span carries the disabled tooltip.
- Viewer new-tab path uses reserve-tab-then-POST ticket (`hostedApplicationLaunch.ts:68-72`) because the content origin sends COOP: same-origin.
- `HostedViewerActions`'s `previewing` prop exists solely to enable the new-tab button without an active version (`HostedViewerActions.tsx:34-35,49`); `HostedApplicationViewer.tsx:261` passes it.
- `BUTTON_KEYS = ['open','edit']` (`HostedDetailsActions.tsx:40`) keeps `open` out of the overflow menu; unrelated to the new-tab button itself.

### Task Statements Checked Against the Code
- "button appears on the app card, app preview and Application details page" — **holds** (items 1, 3, 2 above).
- "standalone link field where this direct link can be copied" — **holds**: `HostedApplicationOverview.tsx:136-140`.
- "find every other place … separate tab / direct standalone URL" — inventory above; the only additional user-visible reference is the `BUSY_MESSAGE` text (item 5). The standalone route itself stays reachable by typed URL unless removed from `src/router.tsx:578-582` — **keeps a mechanism in place** if only controls are removed (consumers: none in UI after removal; `HostedStandaloneLaunch`, route id, page title).
- "next to the 'Preview' (eye) button" / AC4 "via the 'Preview' button on the app card" — **contradicted** in wording: the card eye button is labelled "View" (`HostedApplicationCard.tsx:91,94`); "Preview" is the version-list action on the details page.
- "leads to … 'Service Unavailable'" / "hosted apps can be opened only inside CodeMie" — **unverified**: server/content-origin behaviour outside this repo; nothing in the UI produces that text (searched `Service Unavailable`).

### Consumers of Changed Contracts
- `OpenButtons` props (`standalone`) — only `HostedApplicationCard.tsx:182-188`.
- `HostedViewerActions` props `onOpenSeparately`, `previewing` — only `HostedApplicationViewer.tsx:255-262`.
- `openSeparately` / `openHostedLaunchWindow` import — `HostedApplicationViewer.tsx:31,199-222`; tests: `__tests__/embedded-viewer.integration.test.tsx:27,62,121-193`, `__tests__/HostedApplicationViewer.test.tsx:80` (mock), `src/utils/__tests__/hostedApplicationLaunch.test.ts:18,91-107`.
- `hostedRoutes.standalone` — `HostedApplicationCard.tsx:116`, `HostedDetailsActions.tsx:53`, `HostedApplicationOverview.tsx:82`; tests assert the path: `__tests__/HostedApplicationCard.test.tsx:170`, `__tests__/HostedApplicationDetails.integration.test.tsx:294`.
- `BUSY_MESSAGE` text — asserted verbatim in `__tests__/embedded-viewer.integration.test.tsx:215-217`.
- Router standalone route — `src/router.tsx:578-582`; route/page-title constants `src/constants/routes.ts:58`, `src/constants/pageTitles.ts:104`; no router test references `/standalone` (searched).

### Architecture and Layers Affected
- Presentation (pages): `HostedApplicationCard`, `HostedDetailsActions`, `HostedViewerActions`, `HostedApplicationViewer`, `HostedApplicationOverview` (all `src/pages/applications/hosted/`).
- Routing: `hostedRoutes.ts`, `src/router.tsx`, `src/constants/routes.ts`, `src/constants/pageTitles.ts` (only if the route is in scope).
- Utils: `src/utils/hostedApplicationLaunch.ts` (`openHostedLaunchWindow`).
- No store or API changes found to be involved; `issueLaunch` is shared with the embedded viewer.

### Integration Points
- `store.issueLaunch` (`src/store/hostedApplications.ts:254`) used by the embedded viewer (`HostedApplicationViewer.tsx:159`), `openSeparately` (`:205`) and `HostedStandaloneLaunch.tsx:47`.
- `submitHostedLaunch` (`hostedApplicationLaunch.ts:82`) used by viewer iframe (`:197`), `openSeparately` (`:211`), standalone page (`:47`).
- `DetailsCopyField` (`src/components/details/DetailsCopyField/DetailsCopyField.tsx`) shared by 8 detail pages; only its usage, not the component, is affected.

### Patterns and Conventions
- Hosted action list via `hostedActions` (`hostedAccess.ts:53-81`) + `useHostedCardActions.menuItems`; the new-tab buttons are not part of this registry — they are hard-coded in three components.
- `useHref` for building root-relative URLs; react-router `Link` for in-app links.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (architecture, routing-patterns, component-patterns, testing-patterns, local-verification). No guide mentions hosted applications or the standalone route (searched `standalone` — only an unrelated "Local auth … standalone deployments" row in `architecture/architecture.md:102`).

### Architectural Decisions
None recorded beyond inline comments listed in Section 2.

### Derived Conventions
Hosted feature code is self-contained under `src/pages/applications/hosted/` with tests in `__tests__/` alongside.

---

## 4. Testing Landscape

### Existing Coverage
- `__tests__/HostedApplicationCard.test.tsx:163-172` — card new-tab button and `/standalone` URL; `:152-161`, `:174-180` cover View button.
- `__tests__/HostedApplicationDetails.integration.test.tsx:289-299` — details new-tab button; `:283-287` Preview; `:301-306` View.
- `__tests__/embedded-viewer.integration.test.tsx:121-193` — four viewer new-tab tests (unmount, reserved tab, blocked tab, previewed version); `:205-218` BUSY_MESSAGE text.
- `__tests__/HostedApplicationViewer.test.tsx:80` — mocks `openHostedLaunchWindow`.
- `src/utils/__tests__/hostedApplicationLaunch.test.ts:91-107` — `openHostedLaunchWindow` unit tests.

### Testing Framework and Patterns
Vitest + React Testing Library, `unit` and `integration` projects (`vite.config.ts`). Boundary mocks via `vi.mock` of store and launch utils; `vi.spyOn(window, 'open')`.

### Coverage Gaps
- No test covers `HostedApplicationOverview`'s "Standalone link" field or the ACCESS LINK section (searched `Standalone link`, `Application link` in tests).
- No test covers `HostedStandaloneLaunch` or the `/apps/:id/standalone` route directly.

---

## 5. Configuration and Environment

### Environment Variables
None specific to this behaviour found.

### Configuration Files
`src/router.tsx` (route table), `src/constants/routes.ts`, `src/constants/pageTitles.ts`.

### Feature Flags and Deployment Concerns
`FEATURE_FLAGS.HOSTED_APPLICATIONS` gates the area (`src/components/Navigation/Navigation.tsx:95`); capabilities `view` redirect via `useHostedFeatureRedirect.ts`. No flag targets the new-tab controls.

---

## 6. Risk Indicators

- Three separate hard-coded new-tab controls plus one copy field (Section 2, Purpose A items 1-4); missing one leaves AC3 unmet.
- `BUSY_MESSAGE` (`HostedApplicationViewer.tsx:43-44`) still tells users to "open it in a new tab"; asserted verbatim in `embedded-viewer.integration.test.tsx:216`.
- Standalone route `src/router.tsx:578-582` / `HostedStandaloneLaunch.tsx` stays reachable by typed or previously copied URL if only controls are removed — see Task Statements.
- Speculative: removing `openSeparately` would leave `openHostedLaunchWindow` with no production caller (`hostedApplicationLaunch.ts:73`) and leave the `previewing` prop of `HostedViewerActions` unused.
- Seven existing tests assert the removed behaviour (Section 4) and will fail until updated.
- Ticket wording "Preview (eye) button" differs from the code label "View" (`HostedApplicationCard.tsx:91,94`).
- No test covers the Overview copy field being removed (coverage gap).

---

## 7. Summary for Complexity Assessment

The change is confined to the presentation layer of `src/pages/applications/hosted/`: the card's `OpenButtons` (`HostedApplicationCard.tsx`), the details header (`HostedDetailsActions.tsx`), the viewer/preview header (`HostedViewerActions.tsx` with `openSeparately` in `HostedApplicationViewer.tsx`), and the "Standalone link" copy field in `HostedApplicationOverview.tsx`. A full search for `_blank`, `window.open`, `openHostedLaunchWindow`, `hostedRoutes.standalone` and new-tab wording found no other hosted UI surface; the only extra reference is the `BUSY_MESSAGE` text suggesting a new tab. The standalone route, `HostedStandaloneLaunch` page, and `openHostedLaunchWindow` util sit behind these controls.

No novel patterns: all edits remove JSX and props whose only consumers are listed in Section 2. In-CodeMie opening (View buttons, version Preview, embedded iframe) is separate code and shares only `issueLaunch`/`submitHostedLaunch` with the removed paths.

Test posture: seven existing tests (card, details integration, four viewer integration tests, BUSY_MESSAGE assertion) plus util tests encode the behaviour being removed; the Overview copy field has no test. Key risks: one surface missed, the busy message text, and whether the standalone route remains reachable by URL.

---

## 8. External References

None named by the task (`requirements.local.md` in run_dir was read; it holds the same content as Section 1).

## Facts Added by Review

Researched for the names the spec relies on, after the analysis above was written. Read like the facts layer; where a line here contradicts one above, this one was read later.

- Route object — `src/router.tsx:562-567`, inside `applicationRoutes` (`src/router.tsx:546-610`):
- Route id constant — `HOSTED_APPLICATION_MANAGE = 'hosted-application-manage'`, `src/constants/routes.ts:60-61`, with comment "The former details path `/apps/:id/manage`; it redirects to `/apps/:id`." Imported in `src/router.tsx:32`.
- Page title entry — `'hosted-application-manage': 'Application Details'`, `src/constants/pageTitles.ts:102` (kept although the route never renders).
- Sibling of the same shape — `APPLICATIONS` route, `src/router.tsx:594-599`: `loader: () => redirect(APPS_ROOT)` ("The Applications list moved to `/apps`; keep old links and bookmarks working."). The two are the only loaders in `applicationRoutes`.
- Validation of the id is left to the target page; the redirect itself does not validate (`src/router.tsx:566`). Alternative (validate in loader) — not used; reason none found.
- `applicationRoutes` is spread directly under the root `App` route, outside the `CoreGuard` wrapper (`src/router.tsx:971-1003`, spread at `:997`).
- Router uses `createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })` (`src/router.tsx:1021`); the `/manage` loader returns an absolute `/apps/...` path.
- "/apps/:id/standalone becomes a redirect ... copying the existing /manage redirect" — the `/manage` redirect exists as described (`src/router.tsx:562-567`): **holds**. Note: it targets the details page (`hostedRoutes.details`); the spec targets `hostedRoutes.view` (spec.md item 6), so the copy changes the target helper.
- Spec item 6 "Remove ... `HOSTED_APPLICATION_STANDALONE` (`routes.ts:58`) and its page title (`pageTitles.ts:104`)" — the `/manage` precedent **keeps** both its id constant and title entry for the redirect route. Line numbers cited by the spec match the current files: **holds**.
- `src/router.tsx:32,564` — route definition.
- `src/constants/pageTitles.ts:102` — title, read via `ROUTE_ID_TO_TITLE` by `usePageTitle` (`src/hooks/appLevel/usePageTitle.ts:31`) and `MobileTopBar` (`src/components/Navigation/MobileTopBar.tsx:115-118`).
- `src/__tests__/router.applications.test.tsx:25,53,70-81` — asserts route id match and the loader's 302 to `/apps/${appId}` with `Component` undefined.
- `src/hooks/appLevel/__tests__/usePageTitle.test.tsx:134-141` — "titles exactly the Applications routes that exist": the set of `hosted-*` keys in `ROUTE_ID_TO_TITLE` must equal the set of `hosted-*` values exported from `src/constants/routes.ts`. Applies equally to `hosted-application-standalone`.
