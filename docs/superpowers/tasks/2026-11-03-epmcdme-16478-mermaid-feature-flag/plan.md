# UI Mermaid Availability (EPMCDME-16478) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate chat Mermaid rendering and the workflow "Visualize" preview behind the backend's
`features:mermaid` runtime flag, degrading to source/disabled-with-hint instead of a doomed render
request, while an absent flag (old backend) keeps today's behavior.

**Architecture:** New Mermaid-specific flag reader pair (`isMermaidEnabled` / `useMermaidEnabled`),
same triad as existing flags (`constants/featureFlags.ts` → `utils/featureFlags.ts` →
`hooks/useFeatureFlags.ts`) but defaulting to `true` when absent/not-yet-fetched (D3 — cannot reuse
`isFeatureEnabled`/`useFeatureFlag`). Wire it into the two existing request call sites
(`MermaidDiagram.tsx`, `WorkflowFormFields.tsx`) ahead of their existing request logic, reusing
each component's proven fallback UI (`CodeBlock`/`InfoBox`).

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + RTL.

**Requirements source:** inline ticket text (EPMCDME-16478), no spec.md.
**Technical analysis:** `docs/superpowers/tasks/2026-11-03-epmcdme-16478-mermaid-feature-flag/technical-analysis.md`.

Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] AC1: available → chat Mermaid block renders as a diagram, as today.
- [ ] AC2: unavailable → chat shows source as a code block; no render request, no loading, no error.
- [ ] AC3: unavailable → workflow preview disabled/hidden with a "not configured" note; no request, no toast.
- [ ] AC4: available → workflow preview works, as today.
- [ ] AC5: flag absent (old backend) → treated as available, unchanged, even pre-fetch.
- [ ] AC6: unavailable → workflow save still succeeds (no task touches save — holds by construction).

## Global Constraints

- Absent/not-yet-fetched `features:mermaid` → **enabled** (D3), opposite of every other flag here.
- UI-only: no backend changes, no new endpoints, no 503/400 branching.
- `src/store/workflows.ts` create/update untouched.
- No toast for unavailable-preview; no loading state for unavailable-chat.
- Mermaid blocks still show source, never hidden entirely.

## Review Focus

- Default-true must hold pre-fetch, not just post-fetch (Task 1).
- `settings.enabled: false` (present-but-false) must disable — not just "absent" (Task 1).
- Flag flipping while `MermaidDiagram` is mounted must not strand a stale `hasError`/loading state (Task 2).
- AC6 needs no task: confirmed by no task's Files list touching `workflows.ts` save code.
- Existing `hasError` fallback (available but failed) must still render after Task 2's new branch.

---

### Task 1: Mermaid feature flag reader

**Files:**
- Modify: `src/constants/featureFlags.ts:19-52` — add `MERMAID: 'features:mermaid'`.
- Modify: `src/utils/featureFlags.ts` — new function, independent of `isFeatureEnabled`.
- Modify: `src/hooks/useFeatureFlags.ts` — new hook, independent of `useFeatureFlag`.
- Test: `src/utils/__tests__/featureFlags.test.ts`
- Test: `src/hooks/__tests__/useFeatureFlags.test.ts` (new — none exists today)

**Interfaces:**
- Produces: `isMermaidEnabled(): boolean` — `false` only if `appInfoStore.configs` has an entry
  `id === FEATURE_FLAGS.MERMAID` with `settings.enabled === false`; `true` otherwise (absent,
  not fetched, or explicitly `true`).
- Produces: `useMermaidEnabled(): [isEnabled: boolean, isLoaded: boolean]` — same semantics,
  reactive via `useSnapshot(appInfoStore)`; `isLoaded` mirrors `isConfigFetched` (Tasks 2-3 use
  `isEnabled` only — loading UI must not depend on flag-fetch state).

Test-first: yes — write the cases below against the not-yet-existing functions, confirm they fail
on "not defined", then implement.

- [ ] **Step 1: Write failing tests.** `featureFlags.test.ts` (mirror the `isTeamsEnabled`
  describe-block, `vi.mock('@/store/appInfo', ...)`): `isMermaidEnabled` → `true` for
  `configs: [], isConfigFetched: false`; `true` for `configs: [], isConfigFetched: true`; `true`
  for `configs: [{id:'features:mermaid', settings:{enabled:true}}]`; `false` for
  `settings:{enabled:false}`. New `useFeatureFlags.test.ts`, same mock: `useMermaidEnabled()` →
  `[true, ...]` absent, `[false, true]` explicit-false.
- [ ] **Step 2: Run** `npx vitest run --project unit src/utils/__tests__/featureFlags.test.ts src/hooks/__tests__/useFeatureFlags.test.ts` — expect FAIL (not defined).
- [ ] **Step 3: Implement** both functions per the signatures above, reading `appInfoStore`
  directly (no call through the default-false readers), plus the `FEATURE_FLAGS.MERMAID` constant.
- [ ] **Step 4: Run** the same command — expect PASS.
- [ ] **Step 5: Commit.**

---

### Task 2: Gate chat Mermaid rendering on availability

**Files:**
- Modify: `src/components/markdown/tokens/MermaidDiagram.tsx:109-155,238-254` — early
  "unavailable" branch ahead of the request effect.
- Test: `src/components/markdown/tokens/__tests__/MermaidDiagram.test.tsx` (new — the existing
  `.accessibility.test.tsx` only covers the available/export path).

**Interfaces:**
- Consumes: `useMermaidEnabled()` from Task 1 (`@/hooks/useFeatureFlags`).

Test-first: yes — assert `filesStore.getMermaidFile` is never called and no "Loading diagram..."
appears when disabled, confirm it fails today, then implement.

- [ ] **Step 1: Write failing tests.** Mirror `.accessibility.test.tsx`'s mocks (`@/store/files`,
  `CodeBlock`, icons, `dompurify`); add `vi.mock('@/hooks/useFeatureFlags', () => ({
  useMermaidEnabled: vi.fn() }))`. Case A, `[false, true]`: render, assert `getMermaidFile` never
  called, no "Loading diagram..." text, `CodeBlock` (mocked) renders. Case B, `[true, true]`:
  assert `getMermaidFile` is still called (regression on today's path).
- [ ] **Step 2: Run** `npx vitest run --project unit src/components/markdown/tokens/__tests__/MermaidDiagram.test.tsx` — expect Case A FAIL.
- [ ] **Step 3: Implement.** Call `useMermaidEnabled()`; when disabled, skip scheduling
  `renderDiagram` entirely (guard before the `:147-155` effect body) and render the existing
  `CodeBlock` fallback markup from `:238-244` without ever setting `isLoading`. Leave the
  `hasError`/`isLoading`/available branches (`:238-299`) unchanged for the enabled path.
- [ ] **Step 4: Run** the same command — expect PASS, both cases.
- [ ] **Step 5: Commit.**

---

### Task 3: Gate workflow graph preview on availability

**Files:**
- Modify: `src/pages/workflows/components/WorkflowFormFields.tsx:134-156,320-356` — skip the
  request and disable/hide the preview UI when unavailable.
- Test: `src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx`

**Interfaces:**
- Consumes: `useMermaidEnabled()` from Task 1; `InfoBox` from `@/components/form/InfoBox`
  (already imported here).

Test-first: yes — assert the "Visualize" button is disabled, an `InfoBox` hint shows, and
`workflowsStore.getWorkflowDiagram` is never called when disabled; confirm it fails, then
implement.

- [ ] **Step 1: Write failing tests.** Add `vi.mock('@/hooks/useFeatureFlags', () => ({
  useMermaidEnabled: vi.fn() }))` (note: this file's global `useSnapshot` mock at `:31-40` only
  special-cases `mockSettingsStore`, so `useMermaidEnabled` needs its own mock). Case A,
  `[false, true]`: render, assert the Visualize button is `disabled`, a "not configured" hint
  renders, and `getWorkflowDiagram` is never called after any interaction. Case B, `[true, true]`:
  button enabled, click still calls `getWorkflowDiagram` (regression).
- [ ] **Step 2: Run** `npx vitest run --project unit src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` — expect Case A FAIL (button today is gated only by `isLoadingSchema`/yaml error).
- [ ] **Step 3: Implement.** `const [isMermaidAvailable] = useMermaidEnabled()` near the other
  hooks (~`:100-108`); `generateDiagram` (`:134-156`) returns early when `!isMermaidAvailable`,
  before calling `workflowsStore.getWorkflowDiagram`; add `!isMermaidAvailable` to the Visualize
  button's `disabled` expression (`:324`); render an `<InfoBox>` "Diagram rendering is not
  configured" note near the preview panel (`:320-356`) when `!isMermaidAvailable`, following the
  `isUserIntegration` InfoBox usage at `:201-206`.
- [ ] **Step 4: Run** the same command — expect PASS, including Case B and all pre-existing tests
  (they exercise the available path, matching Task 1's absent→enabled default).
- [ ] **Step 5: Commit.**

---

## Negative-constraints pass

- No render/preview request when unavailable (AC2/AC3) → guarded/early-returned in Task 2/3 Step 3; asserted by each Case A.
- No loading state when unavailable (AC2) → Task 2 Step 3 never sets `isLoading` on that path.
- No error toast when unavailable (AC3) → Task 3's early return precedes any `api.post` call, so `src/utils/api.ts`'s toaster path is never reached.
- Mermaid blocks never hidden entirely → Task 2 always renders diagram or `CodeBlock` source.
- Workflow save untouched (AC6) → no task's Files list includes `src/store/workflows.ts` create/update code.
- `isFeatureEnabled`/`useFeatureFlag` not reused unmodified (D3) → Task 1's functions read `appInfoStore` directly, independent of the default-false readers.
- No backend/status-code changes → no task touches any file outside the `src/` paths listed above.
