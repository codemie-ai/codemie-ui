# Technical Research

**Task**: mermaid config features chat workflow-diagram
**Generated**: 2026-11-03
**Research path**: filesystem

---

## 1. Original Context

Ticket EPMCDME-16478 "UI Mermaid Availability" (status: In Progress, PO-approved).

Story: As a user of a CodeMie installation without a Mermaid renderer, I want diagrams shown as
source and the workflow preview clearly disabled so that I never wait on, or see errors from, a
rendering path that cannot work.

Background: Chat renders a Mermaid code block as a diagram by asking the backend for an image. On
any failure it falls back to showing the diagram source, but only after the attempt. The workflow
editor requests a graph preview from the backend; when the backend cannot render it, the request
fails and a generic error toast appears. The UI reads feature flags from application settings, but
no Mermaid flag consumer exists today. The backend (EPMCDME-16477, already merged) now publishes
Mermaid availability in application settings.

Acceptance Criteria (verbatim):
- Given Mermaid rendering is reported as available, when a chat message contains a Mermaid block,
  then it renders as a diagram as today.
- Given Mermaid rendering is reported as unavailable, when a chat message contains a Mermaid block,
  then the UI shows the diagram source as a code block with no render request, no loading state and
  no error.
- Given Mermaid rendering is reported as unavailable, when a user edits a workflow, then the graph
  preview is disabled or hidden with a short note that diagram rendering is not configured, no
  preview request is made and no error toast appears.
- Given Mermaid rendering is reported as available, when a user edits a workflow, then the graph
  preview works as today.
- Given application settings do not include Mermaid availability (an older backend), when the UI
  loads, then Mermaid rendering is treated as available and behavior is the same as today.
- Given Mermaid rendering is reported as unavailable, when a user saves a workflow, then the save
  succeeds as today.

Decisions already made (D1-D3):
- D1: when unavailable, chat shows the diagram source, with no render attempt.
- D2: workflow graph preview is disabled with a hint, no toast.
- D3: a missing availability setting is treated as available (UI/backend deploy independently;
  this covers an old backend that hasn't shipped the flag yet, not standalone-degradation).

Out of scope: backend availability logic/startup warning/error types (covered by EPMCDME-16477);
hiding Mermaid blocks entirely; conversation export.

Backend contract this UI change must consume (from EPMCDME-16477, merged into MR !4684):
- GET /v1/config returns a runtime "components" list; when Mermaid is available it includes an
  entry with id "features:mermaid" and settings.enabled = true. When Mermaid is unavailable, this
  component is OMITTED from the list entirely (never sent as settings.enabled = false) — so the UI
  must treat a missing "features:mermaid" component as available (per D3/AC above), and only treat
  it as unavailable when the component IS present with settings.enabled = false (if that ever
  happens) or is present but false.
- Error contract on POST /v1/files/diagram/mermaid and POST /v1/workflows/diagram:
  - 503 "Mermaid rendering is not configured" (not configured)
  - 503 "Mermaid renderer is unavailable" (renderer down or faulty)
  - 400 "Invalid Mermaid diagram" (genuine syntax error)
- Creating/updating a workflow still succeeds when Mermaid is unavailable; the stored diagram is
  null.

Related ticket for context (do not implement, just note overlap if found): EPMCDME-15693 "Mermaid
diagram requests fail in the OSS standalone environment" / "show diagram code if server not
configured" — check whether any existing code already partially implements this.

---

## 2. Codebase Findings

### Existing Implementations

**Purpose: render a Mermaid code block in chat as a diagram**
- `src/components/markdown/MarkdownTokens.tsx:100` — when a fenced code token has `lang === 'mermaid'`,
  renders `<MermaidDiagram code={token.text} />`; any other code language falls through to
  `<CodeBlock text={token.text} language={token.lang} stickyHeader />` (`MarkdownTokens.tsx:106`).
  This is the single dispatch point for chat Mermaid rendering — the only place that decides diagram
  vs. source for a Mermaid block in chat.
- `src/components/markdown/tokens/MermaidDiagram.tsx` — on mount/code-change, debounces 300ms then
  always calls `filesStore.getMermaidFile(cleanedCode)` (`MermaidDiagram.tsx:137`), unconditionally.
  States: `isLoading` (shows "Loading diagram...", `:246-254`), `hasError` (renders
  `<CodeBlock language="mermaid" text={cleanMermaidCode(code)} />`, `:238-244` — this is the exact
  fallback-to-source pattern AC2 wants, already proven, just currently reached only after a failed
  request, not proactively). No code path skips the request today.
- `src/store/files.ts:114-133` (`filesStore.getMermaidFile`) — POSTs `v1/files/diagram/mermaid` with
  `{ code, theme: 'dark' }` and `skipErrorHandling: true` (suppresses the global toaster for this
  call specifically — consistent with D1/AC2 "no error" once the request isn't made at all), then
  fetches the returned `file_url` for the SVG. Caches by content hash in `mermaidCache`
  (`files.ts:25-48`).
- Consumer: `MermaidCodePopup.tsx` reuses `CodeBlock` the same way to show source on demand
  (unrelated to availability — a manual "view source" action available even when rendering works).

**Purpose: render a workflow graph preview on demand**
- `src/pages/workflows/components/WorkflowFormFields.tsx:134-156` (`generateDiagram`) — triggered only
  by the user clicking the "Visualize" button (`:323-331`, disabled while `isLoadingSchema` or a yaml
  validation error exists). Calls `workflowsStore.getWorkflowDiagram(payload)` (`:144`), sets
  `schemaImage` from the JSON body on success; on failure only logs to console — the comment at
  `:151` ("Error is already handled by API interceptor via toaster") confirms the generic toast
  comes from the shared API error path, not from this component.
- `src/store/workflows.ts:103,381-383` (`getWorkflowDiagram`) — `api.post('v1/workflows/diagram', payload)`
  with no `skipErrorHandling`, so any non-2xx surfaces through the shared interceptor.
- `src/utils/api.ts` — the shared POST path (`:324` destructures `skipErrorHandling`; `:398` branches
  on it; `:450` calls `toaster.error(formatErrorMessage(body, includeHelp))`) is what produces "a
  generic error toast" today for both Mermaid endpoints whenever `skipErrorHandling` isn't set. No
  per-status (503 vs 400) branching exists anywhere in the codebase yet (`grep` for `503` found only
  unrelated handling in `usageAttribution.ts`).
- No separate graph-preview surface exists elsewhere: `WorkflowFormFields.tsx` is the only caller of
  `getWorkflowDiagram`/`schemaImage` in the repository; the visual workflow editor
  (`src/pages/workflows/editor/`, `@xyflow/react`-based) does not call this endpoint.

**Purpose: read a feature flag from application settings (the exact mechanism EPMCDME-16478 needs
for Mermaid)**
- `src/store/appInfo.ts:66-75,213-228` — `appInfoStore.configs: ConfigItem[]` and
  `isConfigFetched: boolean`. `fetchCustomerConfig()` calls `api.get('v1/config')`, assigns the JSON
  array directly to `configs` (no normalization), sets `isConfigFetched = true` in both success and
  catch branches. `refetchCustomerConfig()` forces a refetch. This is the store the backend's
  `/v1/config` "components" list lands in.
- `src/types/entity/configuration.ts:16-33` — `ConfigItem { id: string; settings: { enabled: boolean;
  ... } }` — matches the backend contract's `{id: "features:mermaid", settings: {enabled: true}}`
  shape exactly; no type change needed to represent it.
- `src/constants/featureFlags.ts` — `FEATURE_FLAGS` map of symbolic names to `"features:<id>"` config
  ids (e.g. `WORKFLOW_AI: 'features:workflowAI'`). No Mermaid entry exists yet.
- `src/utils/featureFlags.ts` — `isFeatureEnabled(featureName)` (non-reactive): returns `false` if
  `!appInfoStore.isConfigFetched || !appInfoStore.configs`, else
  `configs.find(c => c.id === featureName)?.settings?.enabled ?? false`. Per-flag wrappers
  (`isMcpEnabled`, `isTeamsEnabled`, etc.) call this. **Every existing wrapper defaults an absent flag
  to `false` (disabled)** — the opposite of D3's "missing → available" requirement for Mermaid.
- `src/hooks/useFeatureFlags.ts` — `useFeatureFlag(featureName)` (reactive, via
  `useSnapshot(appInfoStore)`), returns `[isEnabled, isLoaded]` tuple; same `?? false` default as the
  non-reactive utility, and the same per-flag wrapper pattern (`useWorkflowAIEnabled`, etc.).
- `src/components/FeatureGuard.tsx` + `src/utils/settings.ts:187-202`
  (`isConfigItemEnabled`/`getConfigItemSettings`) — a third, independent reader of the same `configs`
  array, used for route guarding; also defaults missing/false to disabled, and additionally hides a
  feature from external users via `settings.availableForExternal === false`. Not itself a consumer
  Mermaid needs, but confirms `configs` is read directly from at least three independent call sites
  (`featureFlags.ts`, `useFeatureFlags.ts`, `settings.ts`), each re-implementing the same lookup and
  the same "default to disabled" rule — there is no shared "default to enabled when absent" helper
  anywhere in this layer today.

**Purpose: Mermaid-specific workaround for an unconfigured backend (EPMCDME-15693 overlap check)**
- None found. Searched `mermaid`, `15693`, `not configured`, `standalone` (case-insensitive) across
  `src/`; no existing flag, early-return, or comment references Mermaid availability or a
  "render disabled" state. `MermaidDiagram.tsx`'s `hasError` fallback is the only adjacent behavior,
  and it is reached only after attempting and failing the render — it does not skip the request.

### Decisions Already in the Code

- The chat Mermaid-vs-source choice is made in exactly one place (`MarkdownTokens.tsx:100`), on
  `token.lang`, with no other input today. Adding an availability check means this call site gains a
  second condition, or `MermaidDiagram` itself gains an early branch before attempting the request —
  either keeps the existing `hasError`/`CodeBlock` fallback pattern intact.
- `filesStore.getMermaidFile` already passes `skipErrorHandling: true` to `api.post` for the mermaid
  render call — the codebase already distinguishes "we handle this error ourselves" from "let the
  toaster handle it" at the call-site level, which is the same mechanism D2 needs for the workflow
  diagram call (`workflowsStore.getWorkflowDiagram` currently has no such option set).
- Every existing feature-flag reader (`isFeatureEnabled`, `useFeatureFlag`, `isConfigItemEnabled`)
  defaults an absent/unfetched config to **disabled**. This is an established, repeated convention,
  and Mermaid's D3 ("missing → available") is a deliberate departure from it for this one flag.
- `FEATURE_FLAGS` constants and the paired `is<X>Enabled`/`use<X>Enabled` functions are the
  established per-flag wrapper pattern (one symbolic constant in `constants/featureFlags.ts`, one
  non-reactive utility in `utils/featureFlags.ts`, one reactive hook in `hooks/useFeatureFlags.ts`);
  every flag in the repo follows this triad.
- `appInfoStore.fetchCustomerConfig()` is called once (gated by `isConfigFetched`) and assumed loaded
  application-wide before flag reads matter; `isFeatureEnabled`/`useFeatureFlag` both already handle
  the "not yet fetched" state by returning `false`/`[false, false]`. Mermaid's "missing → available"
  default needs to interact correctly with this not-yet-fetched state too (AC asks for "same as
  today" behavior, i.e. available, while most other flags intentionally show disabled until loaded).

### Task Statements Checked Against the Code

- "Chat renders a Mermaid code block as a diagram by asking the backend for an image. On any failure
  it falls back to showing the diagram source, but only after the attempt." — **Holds.**
  `MermaidDiagram.tsx:117-144` always calls `getMermaidFile`; `hasError` (`:140`) renders
  `CodeBlock` only once the promise rejects (`:238-244`).
- "The workflow editor requests a graph preview from the backend; when the backend cannot render it,
  the request fails and a generic error toast appears." — **Holds.** `generateDiagram` has no
  `skipErrorHandling`, so a failed `getWorkflowDiagram` call surfaces through the shared
  `api.ts` toaster path (confirmed by the explicit code comment at `WorkflowFormFields.tsx:151`).
- "The UI reads feature flags from application settings, but no Mermaid flag consumer exists today."
  — **Holds.** `FEATURE_FLAGS`, `featureFlags.ts`, and `useFeatureFlags.ts` have no Mermaid entry;
  `grep` for `mermaid`/`features:mermaid` across `src/` returns only the diagram-rendering files
  listed above, none of which read `appInfoStore.configs`.
- "Check whether any existing code already partially implements [EPMCDME-15693]" — **Unverified as
  "no partial implementation exists"**: confirmed by search (see above) that no code currently
  distinguishes Mermaid-configured from Mermaid-unconfigured; this is a greenfield addition on the
  UI side, not a revival of dormant code.

### Consumers of Changed Contracts

- `appInfoStore.configs` (the array this task's flag lives in) is read directly, independently of any
  shared helper, by: `utils/featureFlags.ts` (`isFeatureEnabled` and ~10 named wrappers),
  `hooks/useFeatureFlags.ts` (`useFeatureFlag` and ~14 named wrappers), `utils/settings.ts`
  (`isConfigItemEnabled`/`getConfigItemSettings`, used by `FeatureGuard.tsx` and
  `types/entity/configuration.ts`'s `getCredentialUIMapping`/`getAvailableCredentialsTypes`). Adding
  a Mermaid entry to `configs` does not change the shape these consumers expect (`ConfigItem[]` is
  unchanged), so none of them break; a new `features:mermaid` item is simply invisible to all of them
  unless this task adds its own reader — consistent with "additive, no existing consumer affected."
- `filesStore.getMermaidFile` has one call site (`MermaidDiagram.tsx:137`); `workflowsStore.getWorkflowDiagram`
  has one call site (`WorkflowFormFields.tsx:144`). Neither function is reused elsewhere, so changing
  their call conditions (e.g., gating the call on a flag) has no other caller to account for.
- `MermaidDiagram` component itself is instantiated only from `MarkdownTokens.tsx:100`; no test or
  other component renders it directly except its own test files
  (`MermaidDiagram.accessibility.test.tsx`), so behavior changes are fully exercised by that one call
  site plus its tests.

### Architecture and Layers Affected

- **Store layer**: `src/store/appInfo.ts` (existing `configs`/`fetchCustomerConfig`, read not
  written by this task), `src/store/files.ts` (`getMermaidFile`), `src/store/workflows.ts`
  (`getWorkflowDiagram`).
- **Utility/hook layer**: `src/constants/featureFlags.ts` (flag id constant),
  `src/utils/featureFlags.ts` (non-reactive reader), `src/hooks/useFeatureFlags.ts` (reactive reader)
  — the natural place for a new `isMermaidEnabled`/`useMermaidEnabled` pair, following the existing
  triad pattern, but with an inverted absent-default per D3.
- **Component layer**: `src/components/markdown/tokens/MermaidDiagram.tsx` and
  `src/components/markdown/MarkdownTokens.tsx` (chat path);
  `src/pages/workflows/components/WorkflowFormFields.tsx` (workflow editor path).
- **API/HTTP layer**: `src/utils/api.ts` only insofar as `skipErrorHandling` is the existing lever for
  suppressing the generic toast — no change to `api.ts` itself is implied by anything found.

### Integration Points

- Internal: `appInfoStore.configs` → `utils/featureFlags.ts` / `hooks/useFeatureFlags.ts` →
  component layer (`MermaidDiagram`/`MarkdownTokens`, `WorkflowFormFields`). No workflow-save path
  reads or depends on Mermaid availability — `src/store/workflows.ts`'s create/update calls are
  separate from `getWorkflowDiagram` and are not touched by anything found, consistent with AC6
  ("save succeeds as today") requiring no change.
- External: `POST v1/files/diagram/mermaid` (chat) and `POST v1/workflows/diagram` (workflow editor)
  on the backend from EPMCDME-16477; `GET v1/config` for availability. All three are existing
  endpoints already wired through `src/utils/api.ts`; no new endpoint integration is implied.

### Patterns and Conventions

- Flag triad: `FEATURE_FLAGS` constant → `is<X>Enabled()` utility → `use<X>Enabled()` hook (see
  `WORKFLOW_AI` end-to-end as the clearest existing example:
  `constants/featureFlags.ts:30`, `utils/featureFlags.ts` has no `isWorkflowAIEnabled` but
  `hooks/useFeatureFlags.ts:116-118` has `useWorkflowAIEnabled`, showing the triad is applied
  per-need rather than rigidly for every flag — i.e., only the reader(s) actually used get written).
- `skipErrorHandling: true` on `api.post`/`api.get` calls is the established way to suppress the
  shared toaster for a call whose failure a component handles itself (used already by
  `getMermaidFile`).
- Source-on-no-render fallback via `<CodeBlock language="mermaid" text={...} />` is the
  established, already-tested visual pattern for "show Mermaid as text" (`MermaidDiagram.tsx:238-244`,
  reused by `MermaidCodePopup.tsx`).
- `InfoBox` (`src/components/form/InfoBox`) is used elsewhere in the same file
  (`WorkflowFormFields.tsx:201-206`, for the "Sharing is disabled because…" hint) as the established
  component for a short explanatory note next to a disabled control — a direct precedent for AC3's
  "short note that diagram rendering is not configured."

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — Valtio store conventions (not read in full for
  this research pass beyond what the code already demonstrates; the `appInfo.ts`/`featureFlags.ts`
  pattern found in code is the authoritative reference).
- `.ai-run/guides/development/api-integration.md` — governs backend-call conventions including error
  handling; relevant to how a new `skipErrorHandling`-style suppression on `getWorkflowDiagram`
  should be wired.
- `.ai-run/guides/architecture/architecture.md` — general component/store/page layering, consistent
  with what was found directly in code (store → hook/util → component).
- No guide specifically mentions Mermaid, feature flags, or `/v1/config`; conventions below are
  derived from code.

### Architectural Decisions

- No ADR or recorded decision document for feature-flag defaulting was found. The "missing flag →
  disabled" default is a pattern repeated across every existing flag reader but is not written down
  anywhere as a rule — it is implicit in each `?? false`.

### Derived Conventions

- New flags get a constant in `constants/featureFlags.ts`, a non-reactive reader in
  `utils/featureFlags.ts` (for use outside React, e.g. inside another store), and a reactive hook in
  `hooks/useFeatureFlags.ts` (for component rendering) — add only the ones actually consumed.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/featureFlags.test.ts` and `src/constants/__tests__/featureFlags.test.ts` —
  test the non-reactive `is<X>Enabled` functions by mocking `appInfoStore` directly
  (`vi.mock('@/store/appInfo', ...)`) and asserting both the enabled and the explicit
  `settings: { enabled: false }` cases; no existing test currently exercises the "flag entry absent
  from `configs`" case for any flag, since every existing flag intentionally defaults to disabled
  there.
- `src/components/markdown/tokens/__tests__/MermaidCodePopup.test.tsx`,
  `MermaidDiagram.accessibility.test.tsx` — cover rendering/export/accessibility of the diagram
  component, mocking `filesStore.getMermaidFile`; no test currently asserts "no call made when
  unavailable" since that branch doesn't exist yet.
- `src/pages/workflows/components/__tests__/WorkflowFormFields.test.tsx` — mocks
  `workflowsStore` (`getWorkflowDiagram: vi.fn()`) and `settingsStore`; existing tests presumably
  cover the "Visualize" button flow but not an availability-gated disabled state (not yet read in
  full — file runs ~80+ lines beyond what was inspected here).
- `src/store/__tests__/appInfo.test.ts` — tests `fetchCustomerConfig`/`configs` plumbing by mocking
  `api.get`; a Mermaid-shaped entry could be exercised the same way.

### Testing Framework and Patterns

- Vitest + React Testing Library, two projects (`unit`, `integration`) per `vite.config.ts`.
- Store/hook mocking via `vi.mock('@/store/...')` with a hoisted mock object, and `useSnapshot`
  mocked to return the raw store object directly — the pattern in both
  `featureFlags.test.ts` and `WorkflowFormFields.test.tsx`.
- `skipErrorHandling`/toaster suppression is not directly tested at the component level in anything
  found; `api.ts`'s error branch is presumably covered by its own test file (not opened in this
  pass).

### Coverage Gaps

- No test exists for a flag defaulting to **enabled** when absent — every existing flag test fixture
  is "present true" / "present false"; a Mermaid-specific test will need its own "absent → treated as
  available" case, which is new ground relative to existing fixtures.
- No test exists for "no network call made" as a behavior (current `MermaidDiagram` tests only verify
  what happens once `getMermaidFile` resolves/rejects, via a mocked implementation that is always
  called).
- No test exists for workflow diagram preview being disabled/hidden rather than erroring.

---

## 5. Configuration and Environment

### Environment Variables

- None specific to Mermaid or `/v1/config` found. Runtime config generally arrives via `window._env_`
  (`config.js`) or build-time `import.meta.env.VITE_*` per `AGENTS.md`'s architecture summary; the
  Mermaid flag instead arrives through the backend's `/v1/config` response body, not through either
  of these env layers.

### Configuration Files

- No dedicated config file for feature flags; they live entirely in the backend's `/v1/config`
  response, consumed into `appInfoStore.configs`.

### Feature Flags and Deployment Concerns

- `features:mermaid` (per the ticket's backend contract) will be the first flag in this codebase
  whose absence must mean "enabled" rather than "disabled" — every other flag in
  `constants/featureFlags.ts` means the opposite. This is a deliberate, ticket-specified exception
  (D3), not a bug to reconcile with the others.
- D3 explicitly frames the missing-flag case as an independent-deploy staleness window (old backend,
  new UI), not as a standalone/degraded-environment signal — distinguishing it from the related
  EPMCDME-15693 ticket's standalone-environment framing, even though the on-screen behavior (show
  source, no error) looks the same in both tickets' scope.

---

## 6. Risk Indicators

- Every existing feature-flag reader (`isFeatureEnabled`, `useFeatureFlag`, `isConfigItemEnabled`)
  defaults an absent or not-yet-fetched flag to **disabled**; Mermaid needs the opposite default
  (D3). A new Mermaid reader must not reuse `isFeatureEnabled`/`useFeatureFlag` as-is without
  inverting the default, or it will silently disable Mermaid for every installation until `/v1/config`
  has been fetched (see "Decisions Already in the Code" and "Existing Implementations — read a
  feature flag").
- `appInfoStore.fetchCustomerConfig()`'s `isConfigFetched` starts `false`; both chat and workflow
  consumers render before config may have loaded. The "treat as available" default must hold during
  this not-yet-fetched window too, otherwise a brief flash of "disabled" could appear even on
  Mermaid-available installations, which the AC does not describe.
- `workflowsStore.getWorkflowDiagram` currently has no `skipErrorHandling`, unlike
  `filesStore.getMermaidFile`; gating the call behind availability removes the error case entirely
  for the "unavailable" path, but any genuine-syntax-error (400) case when Mermaid *is* available
  still flows through the existing generic-toast path today — the ticket's three-way error contract
  (503/503/400) is not distinguished anywhere in the UI yet, and this task's AC does not ask for that
  distinction (only "no toast" in the unavailable case), so no per-status branching appears to be in
  scope, but it is worth flagging since the backend contract section lists all three.
- No existing test fixture covers an absent flag meaning "enabled," and no existing test covers "a
  network call is skipped" as the assertion — both are new test shapes for this codebase, not
  extensions of an existing pattern.
- `MermaidDiagram.tsx`'s `hasError` branch already renders the exact fallback UI AC2 wants
  (`CodeBlock language="mermaid"`); the risk is only in wiring the "don't even try" condition ahead of
  the `useEffect`/`renderDiagram` call without disturbing the existing loading/error states for the
  "available" path (AC1, AC4 require "as today").

---

## 7. Summary for Complexity Assessment

This task touches three layers: a new flag-reader in the utility/hook layer
(`constants/featureFlags.ts`, `utils/featureFlags.ts`, `hooks/useFeatureFlags.ts`), and two UI call
sites that must each gate an existing network call on that flag — `MermaidDiagram.tsx`/`MarkdownTokens.tsx`
for chat, and `WorkflowFormFields.tsx` for the workflow editor's "Visualize" preview. All the
underlying mechanics (the `configs` array and its `ConfigItem` shape, the `CodeBlock`-as-source
fallback UI, the `skipErrorHandling` lever for suppressing the shared toaster, the `InfoBox` hint
component) already exist and are exercised elsewhere in the codebase, so no new UI primitive or store
shape is needed — this is a wiring task, not a new-component task.

The one piece of real novelty is D3's "absent flag means enabled" rule, which inverts every existing
flag-default convention in this codebase (`isFeatureEnabled`, `useFeatureFlag`, and
`isConfigItemEnabled` all default missing/unloaded to `false`). A Mermaid-specific reader cannot
reuse those functions unmodified; it needs its own default-true semantics, including during the
not-yet-fetched window before `/v1/config` resolves, since both chat and the workflow form can render
before that fetch completes.

Test coverage for the target files is solid (`MermaidDiagram`, `MermaidCodePopup`, `WorkflowFormFields`,
`appInfo`, and both feature-flag test files all have existing suites using consistent Valtio-mocking
patterns), but every existing fixture in those suites tests "present true" / "present false" flags and
"call succeeds" / "call fails" diagram flows — none tests "flag absent → enabled" or "no call made at
all," so new test fixtures, not just new assertions, are needed. No related EPMCDME-15693 code exists
to build on or conflict with; this is a clean, additive change with no identified contract-consumer
regressions (see Section 2, "Consumers of Changed Contracts").

---

## 8. External References

None named by the task as a filesystem or URL path. The task cites ticket IDs (EPMCDME-16477,
EPMCDME-15693) and an MR number (!4684) in a sibling backend repository (`codemie/`), but gives no
path to that repository's checkout, and the full backend contract (components list shape, the three
error messages, and null-diagram-on-save behavior) is already reproduced verbatim in Section 1 from
the ticket text itself, so no external file was read to source it.
