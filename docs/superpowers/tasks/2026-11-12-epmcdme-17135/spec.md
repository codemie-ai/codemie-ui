# EPMCDME-17135: Hosted apps open only inside CodeMie

## Problem

Hosted Applications offer several ways to open an app outside CodeMie: an "Open in new tab" button in three places, and a copyable standalone link. According to the ticket, the new tab ends in "Service Unavailable" (unverified in this repo). Hosted apps are meant to be used inside CodeMie only. Every UI path that opens a hosted app outside CodeMie, or exposes its standalone URL, is removed. Opening the app inside CodeMie keeps working.

## Scope

Surfaces to remove. The inventory is in `technical-analysis.md` §2, Purpose A. All paths below are under `src/pages/applications/hosted/` unless stated.

1. App card: the "Open in new tab" icon button (`HostedApplicationCard.tsx:99-110`), its `standalone` prop and the `useHref` that feeds it (`:72`, `:78`, `:116`, `:185`). Update the doc comment at `:65-68`.
2. Application details header: the "Open in new tab" button (`HostedDetailsActions.tsx:64-73`), plus the `useHref`, `OpenSvg` and `hostedRoutes` imports and the `standalone` value it used (`:15`, `:19`, `:26`, `:53`, comment `:38`).
3. Viewer / version preview header: the "Open in new tab" button (`HostedViewerActions.tsx:46-54`) and the props `onOpenSeparately` and `previewing` (`:33-35`, `:42-43`). Also the `openSeparately` handler and its wiring in `HostedApplicationViewer.tsx:199-222` and `:260-261`. One component serves both `/view` and `/preview/:versionId` (`src/router.tsx:573-587`).
4. Details sidebar: the "Standalone link (own tab, without CodeMie)" copy field (`HostedApplicationOverview.tsx:136-140`) and the `useHref` behind it (`:82`).
5. Viewer busy text: `BUSY_MESSAGE` (`HostedApplicationViewer.tsx:42-44`) drops "or open it in a new tab". It keeps the retry hint.
6. Standalone route: `/apps/:id/standalone` (`src/router.tsx:578-582`) becomes a loader-only redirect to `hostedRoutes.view(id)`. It follows the existing `/manage` redirect pattern at `src/router.tsx:562-567`. Remove `HostedStandaloneLaunch.tsx`, `hostedRoutes.standalone` (`hostedRoutes.ts:30-31`), `HOSTED_APPLICATION_STANDALONE` (`src/constants/routes.ts:58`) and its page title (`src/constants/pageTitles.ts:104`).
7. Remove the now-unused `openHostedLaunchWindow` from `src/utils/hostedApplicationLaunch.ts:73-80`, together with its unit tests.

Unchanged: the card and details "View" buttons, the version-list "Preview", the overflow-menu "View", the embedded viewer iframe, `issueLaunch`, `submitHostedLaunch`, and the "Application link" copy field (it copies the in-CodeMie `/apps/:id/view` URL).

Existing tests that assert the removed behaviour get updated or deleted (`technical-analysis.md` §4). Tests that assert removal are added where coverage is missing.

## Acceptance criteria

- AC1: A hosted app card shows no "Open in new tab" control. Its "View" button still opens the app inside CodeMie.
- AC2: The Application details header shows no "Open in new tab" control. "View" and the version "Preview" still open the app inside CodeMie.
- AC3: The viewer header on `/apps/:id/view` and on `/apps/:id/preview/:versionId` shows no "Open in new tab" control. The embedded app still loads.
- AC4: The details sidebar has no "Standalone link" copy field. The "Application link" field remains.
- AC5: The viewer busy message no longer mentions opening the app in a new tab.
- AC6: Navigating to `/apps/<id>/standalone` ends at `/apps/<id>/view`, with the usual access checks and feature-flag redirect applied there.
- AC7: No hosted-app UI code calls `window.open` or uses `target="_blank"` for a hosted app, and no code references `hostedRoutes.standalone`, `HOSTED_APPLICATION_STANDALONE`, `HostedStandaloneLaunch` or the `openHostedLaunchWindow` helper; the only remaining `/standalone` path is the AC6 redirect.

## Non-goals

- Platform (non-hosted) application cards that open in a new tab (`src/pages/applications/components/ApplicationCard.tsx:61`, `usePlatformApplications.ts:46`).
- Share links (`/apps/share/:token`). They already resolve inside CodeMie (`HostedSharePage.tsx:58-62`).
- Any backend or content-origin change, including whatever produces "Service Unavailable".
- Changes to `DetailsCopyField`, `issueLaunch` or `submitHostedLaunch`.
- Renaming the card's "View" button to "Preview" to match the ticket's wording.

## Decisions

- Redirect `/apps/:id/standalone` to the in-CodeMie viewer over removing the route or keeping it, so old links keep working but stay inside CodeMie — user
- Remove `HostedStandaloneLaunch`, its route id and its page title over keeping them behind the redirect — user
- Reword `BUSY_MESSAGE` to keep only the retry hint over leaving the new-tab suggestion, since that capability is gone
- Delete `openHostedLaunchWindow` and its tests over keeping an unused export
- Drop the `previewing` prop from `HostedViewerActions` over keeping it, since its only use was the removed button
- Keep the "Application link" copy field over removing it, since it targets the in-CodeMie viewer
- Read the ticket's "Preview (eye) button" as the card's existing "View" button over renaming it
