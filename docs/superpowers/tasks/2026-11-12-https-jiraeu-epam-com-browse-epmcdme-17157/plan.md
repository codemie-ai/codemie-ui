# EPMCDME-17157 Let hosted apps use their own Full and Focus controls: Implementation Plan

**Goal:** A hosted deck's own Full (Fullscreen API) and Focus (popup window) controls work inside the CodeMie viewer, and the withdrawn viewer-level controls are gone.

**Architecture:** Grant exactly two capabilities down the two-layer frame chain. Fullscreen: the outer srcdoc iframe gets `allow="fullscreen"` (its own origin only), and the inner content frame's `allow` list grants `fullscreen` to the content origin alone. Popups: both sandboxes gain `allow-popups`, never `allow-popups-to-escape-sandbox`. Everything else (CSP, launch ticket, message checks, standalone path) is unchanged.

**Tech Stack:** React + TypeScript, Vitest + React Testing Library (jsdom).

**Start state:** base `4266f47c0` plus four withdrawn commits. Commit per task using the repository's existing convention; every subject starts with `EPMCDME-17157: `. Line numbers below are for the tree **after Task 1**. Locate code by the quoted text if they have drifted.

---

### Task 1: Withdraw the viewer-level Full screen / Focus mode controls

**Files:** everything touched by `3792b09a7`, `97941a20b`, `296f26942`, `3a3599c57` (`useHostedPresentation` and its tests, `HostedViewerActions.tsx`, `HostedApplicationViewer.tsx`, `HostedApplicationViewer.test.tsx`, `embedded-viewer.integration.test.tsx`).

Test-first: no — this removes code. Its check is that the diff against the base is empty.

- [ ] Run `git revert --no-commit 3a3599c57 296f26942 97941a20b 3792b09a7` (newest first) and commit the result as one commit. Then `git diff 4266f47c0 -- src` must print nothing, and the untracked task directory must still be there. If the revert conflicts, stop and report. Do not resolve it by hand-editing toward a guessed base.

### Task 2: Inner content frame grants fullscreen to the content origin only

**Files:** Modify `src/utils/hostedApplicationFrame.ts:59` (inner `<iframe ... allow="...">`). Test `src/utils/__tests__/hostedApplicationFrame.test.ts:36`.

Test-first: yes — the test at :36 expects `allow` to contain `fullscreen ${origin}`, keeps the other features at `'none'`, and rejects `fullscreen 'none'`, `fullscreen *` and a bare `fullscreen;`. It fails while the frame still sets `fullscreen 'none'`.

- [ ] Replace the assertion at :36 with:

```ts
const allow = parsed.querySelector('iframe')?.getAttribute('allow') ?? ''
expect(allow.split(';').map((s) => s.trim())).toEqual([
  "camera 'none'", "microphone 'none'", "geolocation 'none'", "payment 'none'", "usb 'none'",
  'fullscreen ' + origin,
])
```
- [ ] Run `npx vitest run src/utils/__tests__/hostedApplicationFrame.test.ts`. Expect FAIL.
- [ ] At :59, change `fullscreen 'none'` to `fullscreen ${content.origin}`. `content.origin` has already passed `SAFE_ORIGIN` and the URL round-trip check at :34-46, so interpolating it is safe. Update the comment above `createHostedFrame` if it claims fullscreen is denied. Re-run and expect PASS.

### Task 3: Outer viewer iframe delegates fullscreen

**Files:** Modify `src/pages/applications/hosted/HostedApplicationViewer.tsx` (the `<iframe srcDoc={frame.document} sandbox=... referrerPolicy="no-referrer">`, about :276-284). Tests: `src/pages/applications/hosted/__tests__/HostedApplicationViewer.test.tsx` (`describe('viewer launch')`) and `src/pages/applications/hosted/__tests__/embedded-viewer.integration.test.tsx` (the test "submits one ticket only to the generated inner frame…", about :97).

Test-first: yes — a new viewer test expects the outer iframe to have `allow="fullscreen"` and no `allowfullscreen` attribute. It fails because the iframe has no `allow`.

- [ ] In `describe('viewer launch')`, add an `it('lets the frame delegate full screen to its content and nothing else')`. It renders the viewer the same way the sibling tests do, waits for the `iframe`, and asserts `toHaveAttribute('allow', 'fullscreen')` and `not.toHaveAttribute('allowfullscreen')`. In the integration test at :97, add the same two assertions on the outer frame returned by `frame()`.
- [ ] Run both files. Expect FAIL.
- [ ] Add `allow="fullscreen"` to the outer iframe. Do **not** use `allowFullScreen`: it means `fullscreen *`, which is wider than needed. Re-run and expect PASS.

### Task 4: Allow sandboxed popups on both frames

**Files:** `src/utils/hostedApplicationFrame.ts:59` (inner `sandbox`), `src/pages/applications/hosted/HostedApplicationViewer.tsx` (outer `sandbox`). Tests: `hostedApplicationFrame.test.ts:31-33`, plus the two tests added in Task 3.

Test-first: yes — the sandbox pins expect exactly `allow-scripts allow-same-origin allow-popups` on both frames, and the token list must not contain `allow-popups-to-escape-sandbox`. They fail while both frames have the two-token sandbox.

- [ ] Change the expected value at `hostedApplicationFrame.test.ts:31-33` to `'allow-scripts allow-same-origin allow-popups'`. Add `expect(sandbox).not.toContain('escape-sandbox')`. Add the same exact-value sandbox assertion and the `escape-sandbox` absence check to both Task 3 tests.
- [ ] Run the three files. Expect FAIL.
- [ ] Append ` allow-popups` to both sandbox attributes. Re-run and expect PASS.

---

## Negative-constraint pass

| Spec constraint | Honored by |
|---|---|
| No CodeMie-level presentation controls, focus layer or inert handling (Non-goals, AC6) | Task 1 removes them. No later task adds any UI. |
| No `allow-popups-to-escape-sandbox`, `allow-top-navigation`, `allow-modals`, `allow-forms` or other flag | Task 4 adds only `allow-popups` and pins both exact sandbox strings. |
| No other powerful feature granted | Task 2 pins the full `allow` list, with camera, microphone, geolocation, payment and usb still `'none'`. |
| Fullscreen only for the content origin on the inner frame | Task 2 uses `fullscreen <content.origin>`, not `*`. Task 3 uses `allow="fullscreen"`, not `allowFullScreen`. |
| CSP, launch ticket and postMessage protocol unchanged | No task touches `csp`, `script`, the message listener or `hostedApplicationLaunch.ts`. |
| Standalone / "Open in new tab" path unchanged | No task touches `HostedStandaloneLaunch.tsx` or `openHostedLaunchWindow`. |
| No server `Permissions-Policy`, no deck-specific features | No task touches `nginx.conf` or deck content. |
