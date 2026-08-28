# Plan — EPMCDME-8584 · a11y copy-status live-region

## Context

`src/utils/toaster.ts` wraps `toastify-js` and is the single funnel every status/copy toast flows through (Profile, Chat, Workflow, Data Sources, Configuration, Integrations). Toastify injects content via direct DOM writes into `<div id="toast-container" aria-live="polite">` — screen readers do not reliably pick those up. The established codebase pattern from EPMCDME-8489 is `src/components/Announcement/Announcement.tsx` + `src/hooks/useAnnouncementQueue.ts` (a React-controlled `<output aria-live="polite" aria-atomic="true" class="sr-only">` that owns its own state writes).

## Approach

One singleton bridge between `toaster.ts` (imperative, non-React) and one React-mounted `<Announcement>` element:

1. `toaster.ts` gets a module-level announcer callback slot: `let announce: ((msg: string) => void) | null = null` and an exported `setToasterAnnouncer(fn)`. Every `info`/`success`/`error` call invokes `announce?.(text)` in addition to `Toastify().showToast()`.
2. A tiny React component `ToasterAnnouncer` mounts `<Announcement>` via `useAnnouncementQueue`, and on mount calls `setToasterAnnouncer(queue.enqueue)`; on unmount clears it.
3. Mount `<ToasterAnnouncer />` at the app root (renders exactly once, covers both `ToastContainer` and `StandaloneLayout` paths without duplication).

`role="alert"` for errors is not needed here — copy confirmations are status messages (polite). Errors already have their own visual channel; upgrading to assertive is out of scope (a follow-up ticket if wanted).

## Tasks

### T1 — Add announcer callback to `toaster.ts`

- Add `let announce: ((msg: string) => void) | null = null` module-level slot.
- Export `setToasterAnnouncer(fn: ((msg: string) => void) | null): void`.
- In each of `info`, `success`, `error` methods, call `announce?.(message)` before/after `.showToast()`.
- Test-first: **yes** — new `src/utils/__tests__/toaster.test.ts`: register a spy via `setToasterAnnouncer`, call `Toaster.getInstance().success('copied')`, assert the spy was called with `'copied'`; call `setToasterAnnouncer(null)` and verify no throw and no invocation on next call.

### T2 — Create `ToasterAnnouncer` component

- New file `src/components/appLevel/ToasterAnnouncer/ToasterAnnouncer.tsx`.
- Uses `useAnnouncementQueue()` → `{ message, enqueue }`.
- Renders `<Announcement message={message} />`.
- `useEffect(() => { setToasterAnnouncer(enqueue); return () => setToasterAnnouncer(null); }, [enqueue])`.
- Test-first: **yes** — `src/components/appLevel/ToasterAnnouncer/__tests__/ToasterAnnouncer.test.tsx`: render `<ToasterAnnouncer />`, call `Toaster.getInstance().success('User name copied to clipboard')`, `await waitFor(() => expect(getByRole('status')).toHaveTextContent('User name copied to clipboard'))`. Reference: `src/components/form/RecordInput/__tests__/RecordInput.test.tsx`.

### T3 — Mount `<ToasterAnnouncer />` once at app root

- Add `<ToasterAnnouncer />` alongside/above the existing `<ToastContainer />` mount at the app root (find current mount site — likely `src/App.tsx` or `src/main.tsx` where the current `<ToastContainer />` lives).
- Do NOT add a second `<ToasterAnnouncer />` in `StandaloneLayout` — the app-root mount covers standalone routes too (both share the same React tree). If routing splits the tree such that `StandaloneLayout` does not descend from the root mount, mount an additional instance inside `StandaloneLayout` **or** hoist the mount site higher. Verify by inspecting the render tree before deciding.
- Test-first: **no** (integration wiring; unit tests for T1/T2 cover the mechanism, and Playwright/manual sr smoke covers the mount).

## Non-goals

- Consolidating the duplicate `copyToClipboard` in `src/utils/utils.ts` and `src/utils/helpers.ts` — cleanup opportunity but not required to fix the bug; both funnel through `toaster.ts` anyway.
- Upgrading error toasts from `aria-live="polite"` to `role="alert"`/`assertive` — separate WCAG concern, follow-up ticket if wanted.
- Visual/CSS changes — none. This is pure ARIA plumbing.

## Verification

- Unit tests (T1, T2) — Vitest + RTL, `getByRole('status')` + `waitFor`.
- Manual: local compose stack, browser DevTools → confirm `<output role="status" aria-live="polite" aria-atomic="true" class="sr-only">` element exists at app root; trigger a copy action; DOM inspection shows the message text lands in that element.
- No CSS diff (visual state unchanged — same toast visuals as before).

## Risks / edge cases

- Rapid identical toasts: `useAnnouncementQueue` already handles this via gap-and-clear cycle (proven from EPMCDME-8489).
- Coexistence with per-instance `<Announcement>` from `RecordInput`/`FilesDropzone`: two live regions may both announce, but neither duplicates the other (different write sources). Acceptable.
- `Toaster.getInstance()` singleton persists across tests — call `setToasterAnnouncer(null)` in `afterEach` to avoid cross-test leakage.
