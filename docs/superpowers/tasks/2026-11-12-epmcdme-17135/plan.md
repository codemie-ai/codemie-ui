# EPMCDME-17135 Hosted apps open only inside CodeMie: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every hosted-app UI path that opens the app outside CodeMie or exposes its standalone URL. In-CodeMie viewing keeps working.

**Architecture:** This change only removes code, in the presentation layer under `src/pages/applications/hosted/` plus routing constants. `/apps/:id/standalone` becomes a loader-only redirect to `/apps/:id/view`, built like the `/manage` redirect. Spec: `spec.md`. Facts: `technical-analysis.md` §2.

**Tech Stack:** React 18, TypeScript, react-router 7, Vitest + RTL (`unit`/`integration` projects).

Paths are relative to `src/pages/applications/hosted/` unless they start with `src/`. Commit per task using the repository's existing convention. Run one test file with `npx vitest run <path>`.

Order matters. Tasks 1, 2 and 4 remove the last consumers of `hostedRoutes.standalone`, and Task 5 deletes it. Task 3 removes the last caller of `openHostedLaunchWindow`, and Task 6 deletes it.

---

### Task 1: App card has no "Open in new tab" button
**Files:** Modify `HostedApplicationCard.tsx:19,65-68,69-112,116,182-188`. Test `__tests__/HostedApplicationCard.test.tsx:163-172`.
Test-first: yes — the card renders no button named /new tab/, and the "View" button still calls `onOpen`.
- [ ] Replace the test at `:163-172` (new-tab button + `/standalone` URL) with: `queryByRole('button', { name: /new tab/i })` is null and `window.open` is not called. Keep `:152-161` and `:174-180`. Run it and confirm it FAILS.
- [ ] Delete the button at `:99-110`. Delete the `standalone` prop (`:72`, `:78`), the `useHref(hostedRoutes.standalone…)` at `:116`, the prop pass at `:185`, and the `OpenSvg` import `:19`. Remove `useHref`/`hostedRoutes` imports only if nothing else uses them. Change the doc comment `:65-68` to describe only "View". Run the test and confirm it PASSES.

### Task 2: Details header has no "Open in new tab" button
**Files:** Modify `HostedDetailsActions.tsx:15,19,26,38,53,64-73`. Test `__tests__/HostedApplicationDetails.integration.test.tsx:289-299`.
Test-first: yes — the details header has no button named /new tab/, and "View" (`:301-306`) and version "Preview" (`:283-287`) still navigate in-app.
- [ ] Replace the test at `:289-299` with the absence assertion. Run it and confirm it FAILS.
- [ ] Delete the button at `:64-73` and the `standalone` value at `:53`. Delete the imports `useHref` `:15`, `OpenSvg` `:19` and `hostedRoutes` `:26`. Remove the new-tab mention from the comment at `:38`. Run the test and confirm it PASSES.

### Task 3: Viewer/preview header has no new-tab button; busy text drops the new-tab hint
**Files:** Modify `HostedViewerActions.tsx:16,24,33-35,42-43,46-54` and `HostedApplicationViewer.tsx:31,42-44,105-106,110,153,159,199-222,260-261`. Tests: `__tests__/embedded-viewer.integration.test.tsx:27,62,121-193,215-217` and `__tests__/HostedApplicationViewer.test.tsx:80`.
Test-first: yes — on `/apps/:id/view` and `/apps/:id/preview/:versionId` the header has no button named /new tab/, the iframe still mounts, and the busy error reads exactly the new `BUSY_MESSAGE`.
- [ ] In `embedded-viewer.integration.test.tsx`, replace the four new-tab tests at `:121-193` with one parameterised absence test covering both routes. It also asserts that the embedded iframe renders and `window.open` is not called. Change the expected text at `:215-217` to `'The application is busy or unavailable right now. Retry in a few seconds.'`. Remove the `openHostedLaunchWindow` mock and import (`:27`, `:62`) and the mock in `HostedApplicationViewer.test.tsx:80`. Run both files and confirm they FAIL.
- [ ] In `HostedViewerActions.tsx`: delete the button at `:46-54`, the props `onOpenSeparately` and `previewing` (`:33-35`, `:42-43`), and the imports `OpenSvg` `:16` and `canOpen` `:24`.
- [ ] In `HostedApplicationViewer.tsx`: set `BUSY_MESSAGE` (`:43-44`) to the text above. Delete `openSeparately` (`:199-222`), the props passed at `:260-261`, and the `openHostedLaunchWindow` import (`:31`). Delete the `visit` ref (`:105`, `:110`), which only `openSeparately` read. Replace the `selected` ref (`:106`, `:153`) with `versionId` directly in `issueLaunch` at `:159`. Keep `active`, which the effect cleanup, `handleContainerLoad` and the card actions still use. Run both files and confirm they PASS.

### Task 4: Details sidebar has no "Standalone link" field
**Files:** Modify `HostedApplicationOverview.tsx:82,136-140`. Test `__tests__/HostedApplicationDetails.integration.test.tsx`.
Test-first: yes — the details page shows the "Application link" copy field and has no "Standalone link" text.
- [ ] Add a test in the details integration file that renders the details page: `queryByText(/Standalone link/i)` is null and `getByText('Application link')` is present. This closes the coverage gap in analysis §4. Run it and confirm it FAILS.
- [ ] Delete the `DetailsCopyField` at `:136-140` and the `useHref(hostedRoutes.standalone…)` at `:82`. Keep the "Application link" field at `:131-135`. Run the test and confirm it PASSES.

### Task 5: `/apps/:id/standalone` redirects to the viewer; the standalone page is removed
**Files:** Modify `src/router.tsx:35,58,578-582`, `hostedRoutes.ts:30-31`, `src/constants/routes.ts:58`, `src/constants/pageTitles.ts:104`. Delete `HostedStandaloneLaunch.tsx`. Test `src/__tests__/router.applications.test.tsx`.
Test-first: yes — the loader for `/apps/<id>/standalone` returns a 302 with `Location: /apps/<id>/view` and the route has no `Component`.
- [ ] Add a test next to the `/manage` test (`:70-81`) with the same shape: `matchRoutes`, call `route.loader`, assert 302 and `/apps/${appId}/view`, and `Component` undefined. The route has no id, so it does not go into the id table at `:43-60`. Run it and confirm it FAILS (the route has a Component and no loader).
- [ ] Replace the route object at `src/router.tsx:578-582` with:
```tsx
  {
    // The standalone launch page is gone; hosted apps open only inside CodeMie.
    path: `${APPS_PATH}/:id/standalone`,
    loader: ({ params }) => redirect(hostedRoutes.view(encodeURIComponent(params.id ?? ''))),
  },
```
- [ ] Delete the `HostedStandaloneLaunch` import (`src/router.tsx:58`) and the file. Delete the `HOSTED_APPLICATION_STANDALONE` import (`:35`) and constant (`routes.ts:58`), its `pageTitles.ts:104` entry, and `hostedRoutes.standalone` (`hostedRoutes.ts:30-31`). Remove the constant and the title in the same task, because `src/hooks/appLevel/__tests__/usePageTitle.test.tsx:134-141` requires the hosted route ids and the title keys to match. Run the router and page-title tests and confirm they PASS.

### Task 6: Remove `openHostedLaunchWindow`
**Files:** Modify `src/utils/hostedApplicationLaunch.ts:73-80` and `src/utils/__tests__/hostedApplicationLaunch.test.ts:18,91-107`.
Test-first: no — this deletes a function with no remaining callers. Delete the function, its unit tests and its import, then run the util test file. Leave `submitHostedLaunch` unchanged (spec Non-goal). Its `'_self'` default and guard branch (`:82-83`) have no production caller left, and only `hostedApplicationLaunch.test.ts:147` still reaches them. That risk is recorded here and not changed.

---

## Negative-constraint pass
- Platform (non-hosted) cards (`ApplicationCard.tsx:61`, `usePlatformApplications.ts:46`): no task touches them.
- Share links `/apps/share/:token`: no task touches them.
- No backend or content-origin change: every task is UI or routing only.
- `DetailsCopyField`, `issueLaunch`, `submitHostedLaunch` are not changed. Task 3 only changes what `issueLaunch` receives (`versionId` instead of `selected.current`, same value). Task 6 explicitly keeps `submitHostedLaunch`.
- The card's "View" is not renamed to "Preview": Task 1 keeps the label.
- "Application link" copy field is kept (Task 4).
