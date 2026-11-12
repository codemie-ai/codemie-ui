# Technical Research

**Task**: hosted-applications viewer fullscreen focus-mode iframe
**Generated**: 2026-11-12
**Research path**: filesystem

---

## 1. Original Context

Sub-Bug EPMCDME-17157 — Hosted Applications: Full screen and focus mode do not work, which makes it inconvenient to present decks.

In the Hosted Applications feature, the full screen mode and the focus mode do not work when a user views a hosted application (for example, an HTML deck/presentation). Because of this, it is inconvenient to present decks inside CodeMie.

Preconditions: the Hosted Applications feature is available; the user has access to a hosted application that is a deck/presentation (own or shared).

Steps to Reproduce: 1. Open the Hosted Applications section in CodeMie. 2. Open a hosted application that is a deck/presentation in the viewer. 3. Try to switch the application to full screen mode. 4. Try to switch the application to focus mode.

Expected Result: The user can switch the hosted application to full screen mode and to focus mode. This lets the user present the deck conveniently.

Actual Result: Full screen mode and focus mode do not work. The application cannot be switched to either of them, so presenting decks is inconvenient.

Affected Areas: Hosted Applications: application viewer; Full screen mode; Focus mode.

Acceptance Criteria:
1. The user can switch a hosted application to full screen mode in the viewer.
2. The user can switch a hosted application to focus mode in the viewer.
3. A deck/presentation can be shown to an audience in full screen or focus mode without extra page elements.
4. The user can exit full screen and focus mode and return to the regular viewer.
5. Access control of hosted applications is not weakened.

(Full text: `requirements.local.md` in this run directory.)

---

## 2. Codebase Findings

### Existing Implementations

**Purpose A — the hosted content entering browser full screen (Fullscreen API).** Blocked at two nested iframe layers today:
- `src/pages/applications/hosted/HostedApplicationViewer.tsx:276-284` — outer `<iframe srcDoc={frame.document} sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer">`. **No `allow` attribute and no `allowFullScreen`**, so the default `fullscreen` permissions policy (`self`) applies to this srcdoc frame; descendants are cross-origin and get nothing.
- `src/utils/hostedApplicationFrame.ts:59` — `createHostedFrame` builds the trusted container document; its inner `<iframe name=target sandbox="allow-scripts allow-same-origin" allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; fullscreen 'none'" tabindex="0">` **explicitly denies fullscreen** to the uploaded content (served from a separate content origin, `frame-src ${content.origin}` CSP at :51). A deck calling `element.requestFullscreen()` therefore fails.
- Consumers: `createHostedFrame` is called only by `HostedApplicationViewer.tsx:161`. Pinned by `src/utils/__tests__/hostedApplicationFrame.test.ts:36` (`allow` contains `fullscreen 'none'`).
- The container script (`hostedApplicationFrame.ts:52-58`) relays only `codemie-hosted-ready` / `codemie-hosted-unavailable` from the child (source + origin checked) to the UI origin; no other message types exist. Viewer listener `HostedApplicationViewer.tsx:121-138` checks `event.source` = outer iframe and `event.origin === window.location.origin`.
- Nothing in `src/` calls `requestFullscreen`, `exitFullscreen` or reads `document.fullscreenElement` (grep across `src/**/*.ts(x)`).

**Purpose B — a viewer "focus mode" (deck shown without page chrome).** None found. Searched `focus.?mode|focusMode|zen|distraction|hideSidebar` in `src/`. The viewer always renders inside `PageLayout` (`src/components/Layouts/Layout/PageLayout.tsx`, props: title, subtitle, showBack/onBack, rightContent, childrenClassName, limitWidth, centerTitle, isLoading — no "hide header" prop) with title/subtitle header and `HostedViewerActions` on the right. In-app expand precedents (not browser fullscreen): `MarkdownEditor.tsx:203-406` (`isFullscreen` → Popup modal, `aria-label="Expand to fullscreen"`), `WorkflowEditor.tsx:112,400` (`isFullscreen` viewport prop), `ExpandableTextarea`, analytics `WidgetModal`. Icons `src/assets/icons/expand.svg`, `collapse.svg` exist.

**Purpose C — presenting outside the embedded viewer.** `HostedViewerActions.tsx:46-54` "Open in new tab" → `openSeparately` (`HostedApplicationViewer.tsx:199-222`) posts the launch ticket into a reserved top-level tab (`openHostedLaunchWindow`, `submitHostedLaunch` in `src/utils/hostedApplicationLaunch.ts:73,82`); `HostedStandaloneLaunch.tsx` (route `apps/:id/standalone`) submits to `_self`. Content loaded top-level is not subject to the iframe policies above.

**Other touched code:** `src/pages/applications/hosted/HostedViewerActions.tsx` — header actions (Open in new tab, Share, overflow: Reload, card menu items, Manage/Details). Routes `HOSTED_APPLICATION_VIEW` (`apps/:id/view`) and `HOSTED_APPLICATION_PREVIEW` (`apps/:id/preview/:versionId`) both render `HostedApplicationViewer` (`src/router.tsx:574-588`).

### Decisions Already in the Code
- `fullscreen 'none'` on the inner frame was introduced in the original feature commit `bba9bc7f7` (EPMCDME-15659) alongside other denied powerful features; reason: none recorded beyond the file comment "Fixed trusted container only" — no ADR or design doc for 15659 found under `docs/`.
- Uploaded content must never share the CodeMie host because the frame allows scripts + same-origin (`hostedApplicationFrame.ts:38-46`); isolation is by origin, not by sandbox.
- Origins interpolated into the container are restricted by `SAFE_ORIGIN` (`:20`); container CSP uses a per-render nonce.
- Missing/forbidden apps render the same "not available" copy (`HostedApplicationViewer.tsx:174-177`) — access is decided by `store.getApplication` / `store.issueLaunch` (backend), and `canOpen`/`isManager` in `hostedAccess.ts`.

### Task Statements Checked Against the Code
- "Full screen mode … do not work" — holds: both iframe layers deny fullscreen (see Purpose A).
- "focus mode … do not work" — unverified: no focus mode exists in the CodeMie UI; the term may mean a deck's own focus/presenter mode (inside uploaded content) or a missing viewer feature. Nothing in reach confirms which. Note: the inner frame has `tabindex="0"` but nothing moves keyboard focus into it on load.
- AC5 "Access control not weakened" — the access path (launch ticket, origin checks, message source/origin checks) is independent of the `allow` attribute; holds for the current code.

### Consumers of Changed Contracts
- `createHostedFrame` document: consumed by `HostedApplicationViewer.tsx:161,195` (looks up inner `iframe` by `name`) and asserted by `hostedApplicationFrame.test.ts:28-41`.
- `HostedViewerActions` props: single consumer `HostedApplicationViewer.tsx:255`; tested via `HostedApplicationViewer.test.tsx` "viewer actions".
- Container `postMessage` protocol (`codemie-hosted-ready|unavailable`): producer is the content host (outside this repo); consumer the viewer listener.

### Architecture and Layers Affected
Page layer (`src/pages/applications/hosted/HostedApplicationViewer.tsx`, `HostedViewerActions.tsx`), utility layer (`src/utils/hostedApplicationFrame.ts`), shared layout (`PageLayout`) only if chrome hiding goes through it.

### Integration Points
External content origin (per-version host, e.g. `v-<id>.codemie-content.net`) receives the launch ticket via form POST into the named inner frame. `nginx.conf` sets no `Permissions-Policy` header (grep found none), so no server-level fullscreen restriction in this repo.

### Patterns and Conventions
Valtio store `hostedApplicationsStore`; generation guard `hostedAuthenticationGeneration()` on every async step; actions in header via `Button variant="secondary" size="small"` + SVG icon; `NavigationMore` overflow menu.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/development/security-patterns.md` § Cross-window messages (applies to any new postMessage type). `.ai-run/guides/architecture/architecture.md:124` mentions only the platform iframe fallback. No guide covers hosted applications or fullscreen.

### Architectural Decisions
None recorded for the fullscreen denial. `docs/superpowers/reviews/2026-11-07-epmcdme-15659-hosted-apps-ui/code-review-final.json` does not mention fullscreen.

### Derived Conventions
Security-relevant attributes of the container are pinned by unit tests; viewer behaviour by `embedded-viewer.integration.test.tsx`.

---

## 4. Testing Landscape

### Existing Coverage
- `src/utils/__tests__/hostedApplicationFrame.test.ts` — sandbox, `allow` (asserts `fullscreen 'none'`), tabindex, CSP order, origin rejection.
- `src/pages/applications/hosted/__tests__/HostedApplicationViewer.test.tsx` — launch, unavailable states, old addresses, header actions.
- `src/pages/applications/hosted/__tests__/embedded-viewer.integration.test.tsx` — ticket submission to inner frame, message filtering, new-tab launch, busy host.

### Testing Framework and Patterns
Vitest + React Testing Library (jsdom); `reviewRegressionSetup.tsx` shared setup; store calls mocked.

### Coverage Gaps
No tests for any fullscreen/focus toggle (none exists). jsdom does not implement the Fullscreen API (`requestFullscreen`), so such tests need stubs; real behaviour requires browser verification (`.ai-run/guides/testing/local-verification.md`).

---

## 5. Configuration and Environment

### Environment Variables
None specific to the viewer.

### Configuration Files
`nginx.conf` — no `Permissions-Policy` / `X-Frame-Options` lines found.

### Feature Flags and Deployment Concerns
Feature gate: `hostedApplicationsOff()` / `useHostedFeatureRedirect` (custom applications toggle). Content-host response headers (outside repo) may also carry a Permissions-Policy — unverified.

---

## 6. Risk Indicators

- `fullscreen 'none'` is an explicit security-flavoured denial pinned by `hostedApplicationFrame.test.ts:36`; any change touches AC5 and needs a recorded rationale (no ADR for the original choice).
- Speculative: content-initiated fullscreen needs permission on both nested frames (outer viewer iframe and inner `allow`); fixing one layer alone leaves it broken.
- "Focus mode" meaning is undefined in the codebase (no existing mechanism) — see Task Statements Checked.
- Browser fullscreen cannot be verified in jsdom; acceptance needs manual browser checks, including Esc exit (AC4).
- Content host (outside repo) may send its own Permissions-Policy header — unverified.

---

## 7. Summary for Complexity Assessment

The bug is localized to the hosted application viewer: `HostedApplicationViewer.tsx` (outer srcdoc iframe without any `allow`/`allowFullScreen`), `hostedApplicationFrame.ts` (trusted container whose inner iframe explicitly sets `fullscreen 'none'`), and `HostedViewerActions.tsx` (header actions, where any viewer-level toggle would sit). No code in the app uses the browser Fullscreen API, and no "focus mode" exists anywhere; in-app expand precedents (MarkdownEditor, WorkflowEditor, WidgetModal) are modal/viewport toggles, not page-chrome hiding.

Novelty is low-to-moderate: attribute changes are small, but a viewer-level toggle and chrome hiding would be new patterns for this page, and `PageLayout` has no prop to hide its header. The security posture (origin isolation, launch tickets, message source/origin checks) is independent of the fullscreen permission, but the denial was deliberate in EPMCDME-15659 and is pinned by a unit test.

Test coverage of the viewer and frame builder is good (unit + integration), but nothing covers fullscreen and jsdom cannot exercise it; browser verification is required. Key risks: two-layer permission chain, ambiguous "focus mode", and AC5 sign-off on relaxing `fullscreen 'none'`.

---

## 8. External References

None named by the task.
