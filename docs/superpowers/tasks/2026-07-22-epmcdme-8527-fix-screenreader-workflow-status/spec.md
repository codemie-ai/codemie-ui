# Spec: EPMCDME-8527 — Simplified screenreader workflow status

## Problem

The branch introduced a VoiceOver-specific singleton (`executionStatusAnnouncer.ts`) to announce workflow execution status changes to screen readers. The implementation appends a hidden off-screen `aria-live="assertive"` element to `document.body`, uses timers to delay announcements past PrimeReact's dialog focus-restore cycle, and blurs the active element to prevent VoiceOver from cancelling the announcement. This complexity exists solely to work around a VoiceOver quirk. NVDA and JAWS — the primary enterprise screen readers — announce live region changes reliably without any such machinery.

## Solution

Add `role="status"` (which implies `aria-live="polite"`) and `aria-label={text}` directly on the outer `<div>` of `StatusBadge`, following the same pattern already used in `SkillStatusLabel`. When the component re-renders with a new status string, NVDA and JAWS announce the change automatically. Remove all VoiceOver-specific code.

## Scope

### Add to `StatusBadge` (both implementations)

- `src/components/StatusBadge/StatusBadge.tsx` — add `role="status"` and `aria-label={text}` to the wrapper `<div>`. Unconditional; no prop or API change.
- `src/components/StatusBadge.tsx` — same change on the flat-file variant used by `ThoughtHeader`.

### Delete

- `src/pages/workflows/details/utils/executionStatusAnnouncer.ts`
- `src/pages/workflows/details/utils/__tests__/executionStatusAnnouncer.test.ts`

### Simplify `WorkflowExecutions.tsx`

Remove: `AnnouncedStatus` type, `announcedRef`, all announcer imports (`initWorkflowExecutionStatusAnnouncer`, `consumePendingExecutionStatusAnnouncement`, `announceWorkflowExecutionStatus`), the mount `useEffect` (announcer init + custom DOM event listener), and the executions `useEffect` that tracked status transitions and called `announceWorkflowExecutionStatus`. Polling, infinite scroll, and render logic are unchanged.

### Simplify `WorkflowStartExecutionPopup.tsx`

Remove: all announcer imports, `successCloseRef`, `cancelledRef`. `handleHide` simplifies to a direct `onHide()` call. `handleSubmit` removes the `cancelledRef` guard, `clearWorkflowExecutionStatusAnnouncement()`, `stabilizeFocusAfterExecutionCreate()`, and `announceWorkflowExecutionStatus(...)` calls. The `unblockTransition`/`blockTransition` navigation guards and the intentional omission of `setIsLoading(false)` on the success path are preserved.

## Tests

| File | Action | Coverage |
|---|---|---|
| `src/components/StatusBadge/__tests__/StatusBadge.test.tsx` | Create | `role="status"` present; `aria-label` matches `text`; `aria-label` absent when `text` is undefined; styling smoke test for one status variant |
| `WorkflowExecutions/__tests__/WorkflowExecutions.test.tsx` | Simplify | Remove 4 announcer tests; add 1 smoke-render test |
| `popups/__tests__/WorkflowStartExecutionPopup.test.tsx` | Simplify | Remove `announcement integration` block (9 tests) and all announcer mocks; keep 8 non-announcement tests |
| `utils/__tests__/executionStatusAnnouncer.test.ts` | Delete | — |

## Out of scope

- VoiceOver support. The simplified approach does not attempt to work around VoiceOver's live-region cancellation behaviour.
- Changes to any other `StatusBadge` call sites. `role="status"` is added unconditionally; consumers need no changes.
