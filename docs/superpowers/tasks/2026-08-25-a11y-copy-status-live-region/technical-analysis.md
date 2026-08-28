# Technical Research

**Task**: toast notifications copy-to-clipboard aria-live
**Generated**: 2026-08-25T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-8584 — Bug: "Status message about successful copied is not announced" (WCAG 4.1.3). Copy-to-clipboard success toasts (e.g. "User name copied to clipboard") are visually shown but not announced by screen readers. Affects many places per ticket: Profile (Copy User ID, Delete All Conversations), Chat (copy, export), Workflow/Database error messages, Data Sources ("View Details", "Copy ID", "Delete" statuses), Configuration sidebar Copy ID, Integration status messages, Workflow status messages. Family: same live-region announcement pattern as just-merged EPMCDME-8489. Look for shared toast/notification component and wire aria-live/role="status" once.

---

## 2. Codebase Findings

### Existing Implementations

All toast output is funneled through a single singleton:

- `src/utils/toaster.ts` — `Toaster` singleton wrapping `toastify-js`; exposes `info`, `success`, and `error` methods; every copy-to-clipboard and status message call site uses this object
- `src/components/appLevel/ToastContainer.tsx` — app-level mount point; renders `<div id="toast-container" role="region" aria-live="polite" />`; **this live region is not reliable** because `toastify-js` injects children via direct DOM manipulation, not React state
- `src/components/StandaloneLayout.tsx` — duplicates the `toast-container` div with identical aria attributes; covers Keycloak theme routes
- `src/utils/utils.ts` — `copyToClipboard` and `copyRichTextToClipboard`; called by `CodeBlock`, `InputCopy`, `ChatAiMessageActions`
- `src/utils/helpers.ts` — second `copyToClipboard` implementation (duplicate); called by `useMCPServerModal`
- `src/components/details/DetailsCopyField/DetailsCopyField.tsx` — "Copy ID" pattern used across Data Sources and Configuration sidebar
- `src/components/form/InputCopy/InputCopy.tsx` — copy-input widget; calls `copyToClipboard` from `utils.ts`
- `src/components/Announcement/Announcement.tsx` — `<output aria-live="polite" aria-atomic="true" className="sr-only">`; the working live-region primitive introduced in EPMCDME-8489
- `src/hooks/useAnnouncementQueue.ts` — serializes messages with a gap-and-clear cycle so repeated identical strings re-announce; the proven safe pattern

**Root cause**: `ToastContainer.tsx` and `StandaloneLayout.tsx` already carry `aria-live="polite"`, but `toastify-js` writes into those containers via direct DOM insertion (`Toastify().showToast()`). Screen readers do not reliably pick up content injected this way into a live region. The `Announcement` + `useAnnouncementQueue` mechanism owns its own React state write and is the safe path.

### Architecture and Layers Affected

- **Utility layer** — `src/utils/toaster.ts` (single funnel), `src/utils/utils.ts` (copyToClipboard), `src/utils/helpers.ts` (duplicate copyToClipboard)
- **Component layer** — `DetailsCopyField`, `InputCopy`, `CodeBlock`, `ChatAiMessageActions` (callers; no change required if toaster.ts is patched)
- **App-level infrastructure** — `ToastContainer.tsx`, `StandaloneLayout.tsx` (toast DOM mount; announcement element must be added here or alongside)
- **Shared accessibility primitives** — `Announcement`, `useAnnouncementQueue` (proven pattern; reuse or extend)

### Integration Points

- Internal: `toaster.ts` ← called by every feature area named in the ticket (Profile, Chat, Workflow, Data Sources, Configuration, Integrations)
- Internal: `Announcement` ↔ `useAnnouncementQueue` ← already integrated in `RecordInput` and `FilesDropzone`
- External: `toastify-js` — controls visual rendering and DOM insertion; cannot be made reliably accessible without a supplementary live region

### Patterns and Conventions

- Singleton service (`toaster.ts`) as the single point through which all status messages flow — one patch covers all callers
- `Announcement` + `useAnnouncementQueue` is the established codebase standard for accessible live-region announcements (EPMCDME-8489)
- `role="alert"` for errors, `aria-live="polite"` for status messages — documented in accessibility guide
- `sr-only` CSS class for visually hidden but screen-reader-visible elements

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/patterns/accessibility-patterns.md` — documents `aria-live="polite"` for status messages and `role="alert"` for errors; directly governs this fix
- `/Users/oleg_sotnichenko/codemie-dev/codemie-ui/.ai-run/guides/patterns/form-patterns.md` — notes `role="alert"` on error spans

### Architectural Decisions

- EPMCDME-8489 established the `Announcement` + `useAnnouncementQueue` pattern as the project standard for live-region announcements; this ticket is explicitly in the same family
- The accessibility guide prescribes `aria-live="polite"` for non-urgent status messages (copy confirmations fall into this category) and `role="alert"` for errors

### Derived Conventions

- A supplementary controlled live region (not relying on the library's DOM writes) is the required approach when `toastify-js` is in use
- The announcement element must be present in both `ToastContainer.tsx` and `StandaloneLayout.tsx` paths, or extracted to a shared singleton rendered once at the root

### External Documentation Findings

Not applicable — no new third-party library is introduced by this fix.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/form/RecordInput/__tests__/RecordInput.test.tsx` — tests `useAnnouncementQueue` via `getByRole('status')` and `waitFor`; reference model for new tests
- `src/components/form/FilesDropzone/__tests__/FilesDropzone.test.tsx` — covers `Announcement` component indirectly using the same pattern

### Testing Framework and Patterns

- Framework: Vitest + React Testing Library
- Workspace config: `vitest.workspace.ts` (two projects: `unit` and `integration`)
- Pattern: `getByRole('status')` to assert the hidden output element; `waitFor` for async queue drain; no snapshot testing for accessibility assertions

### Coverage Gaps

- `src/utils/toaster.ts` — no tests exist
- `src/utils/utils.ts` `copyToClipboard` — no tests exist
- `src/utils/helpers.ts` `copyToClipboard` — no tests exist
- `src/components/details/DetailsCopyField/DetailsCopyField.tsx` — no tests exist
- `src/components/form/InputCopy/InputCopy.tsx` — no tests exist
- New announcement wiring in `toaster.ts` must ship with unit tests asserting the live region receives the toast message text

---

## 5. Configuration and Environment

### Environment Variables

None identified as relevant to this fix.

### Configuration Files

- `src/assets/stylesheets/toastify.scss` — visual styles for `#toast-container`; the `sr-only` utility is separate and already defined

### Feature Flags and Deployment Concerns

None identified. This is a pure UI accessibility fix with no flag gate required.

---

## 6. Risk Indicators

- No existing tests for `toaster.ts`, `copyToClipboard` (either implementation), `DetailsCopyField`, or `InputCopy` — new tests must be written alongside the fix
- `copyToClipboard` is duplicated across `src/utils/utils.ts` and `src/utils/helpers.ts`; both copies emit toasts and both must be covered (or consolidated first to reduce surface)
- `StandaloneLayout.tsx` is a second render path with its own `toast-container` div; if the announcement element is added only inside `ToastContainer.tsx`, standalone-layout flows (Keycloak theme) will miss the fix
- `toastify-js` controls DOM insertion; relying on the existing `aria-live` attribute on the container is not safe — the supplementary hidden live region approach is mandatory, not optional
- If a global singleton announcement element is introduced at the app root, it must not conflict with the per-component `Announcement` instances already rendered by `RecordInput` and `FilesDropzone` (two live regions can coexist but should not duplicate announcements)

---

## 7. Summary for Complexity Assessment

The fix is structurally simple because the codebase already has a working solution pattern (`Announcement` + `useAnnouncementQueue` from EPMCDME-8489) and a single funnel point (`toaster.ts`) through which every affected status message flows. Wiring a global announcement callback into `toaster.ts` — and mounting the corresponding `<output aria-live="polite" aria-atomic="true" className="sr-only">` element in both `ToastContainer.tsx` and `StandaloneLayout.tsx` (or at the app root) — covers all named ticket locations (Profile, Chat, Workflow, Data Sources, Configuration, Integrations) without touching individual callers. The estimated file change surface is small: 2–4 source files modified, 1–2 new test files added.

The task follows a well-established pattern in the codebase. No new design decisions are required; the accessibility guide and the EPMCDME-8489 precedent fully specify the approach. The only architectural judgment call is where to mount the singleton announcement element to cover both the main and standalone layout paths without duplication. Technical novelty is low.

Test coverage posture for this area is weak. `toaster.ts`, both `copyToClipboard` implementations, `DetailsCopyField`, and `InputCopy` all lack tests. The fix must ship with Vitest + RTL tests asserting `getByRole('status')` receives the correct message after each toast call. The `RecordInput` and `FilesDropzone` test files serve as direct implementation templates. Complexity is low-to-medium: the logic change is minimal, but the coverage gap requires non-trivial test authoring.
