# EPMCDME-15915 Model List Consistency Implementation Plan

> **For agentic workers:** Implement task-by-task using executing-plans or subagent-driven-development; execution mode and approval belong to the parent flow.

**Goal:** Make sidebar New Chat configuration expose the same available model identities as the prompt, across memberships, once each, without changing selection behavior.
**Architecture:** Conditional UI-only correction at `ChatConfigLlmSelector`; the existing global catalog serves project-less chats and the existing project hook serves scoped chats. This approach is authorized only after actual demo responses establish global catalog sufficiency.
**Tech Stack:** React/TypeScript, Valtio, Vitest, React Testing Library.
**Requirements source:** Caller’s inline EPMCDME-15915 requirements; research: `technical-analysis.md` beside this plan. Commit per task using the repository's existing convention.

## Acceptance criteria

- Sidebar New Chat configuration and prompt dropdowns expose the same selectable model identities.
- Models available through all user memberships are represented in project-less New Chat.
- Each selectable model identity appears exactly once, including overlapping `gpt-4.1-mini`.
- Choosing a model retains existing behavior and persists across reopening, both selectors, and saved-chat reload.

## Global constraints

- Preserve user-modified `package-lock.json` and untracked `.envrc`; exclude both from commits.
- Do not modify EPMCDME-15906-owned `ChatPromptLlmSelector.tsx` or its tests, premium-router behavior, backend, global catalogs, or shared selector semantics.
- Reuse seeded data in `/Users/gokhan_ozdemir/codemie-dev/demo-data-for-15906-15915.md`; do not reseed or repeatedly authenticate. Current UI is `localhost:5175`, not neighboring 5173 or main 5174. Backend context is exclusively `/Users/gokhan_ozdemir/.herdr/worktrees/codemie/epmcdme-15915-model-list-inconsistency-api`.
- Follow `.ai-run/guides/testing/testing-patterns.md`, `testing/local-verification.md`, and `patterns/state-management.md`. Parent owns quality gates and post-change browser verification; none is a standalone implementation task.

## Review focus

Task 1 pins these behaviors: stale project options cannot constrain project-less New Chat; overlapping membership IDs appear once; explicit project scope never leaks unrelated global models even with an empty/loading list; valid selected values survive list loading and reopening; selection and Default retain their existing semantics.

## Task 1 — Correct New Chat model source with behavioral regressions

**Files:**
- Modify: `src/pages/chat/components/ChatConfiguration/ChatConfigLlmSelector.tsx:22-53` (filtered-model prop at line 47).
- Create: `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfigLlmSelector.integration.test.tsx`.
- Modify: `README.md:52-56` (existing “What the Platform Enables” section; concise chat model-scope behavior only).
- Reference unchanged: shared `LLMSelector.tsx:140-170`, project hook, existing configuration-selector unit tests.

**Test-first: yes —** With an empty-ID, project-less New Chat and stale alpha-only `filteredModels`, opening the real configuration dropdown incorrectly hides beta-only models that the real prompt exposes; selecting a beta model must remain visible after close/reopen.

**Interfaces:** Keep `chatsStore.updateChat(currentChat.id, { llmModel })`, `currentChat.projectId`, and existing `LLMSelector` props. Introduce no public API.

- [ ] **Prerequisite before edits:** At 5175 authenticate as existing `demo.multi`, reproduce sidebar New Chat mismatch, and capture bare `/v1/llm_models`, alpha/beta scoped responses, and returned New Chat project context. Compare stable selectable IDs (not labels): bare response must cover the union of alpha and beta, expose other applicable membership models, and contain no duplicate IDs. Record observed IDs and reproduction in the parent’s existing evidence location, with secrets removed. If catalog coverage/uniqueness fails, project context contradicts the proposed fix, or this boundary cannot satisfy dropdown parity, stop and return `needs_input` requesting substantive scope revision with actual responses; do not change backend or claim success. This is a solution prerequisite, not post-change verification.
- [ ] Add behavioral integration regressions using real selectors and Valtio, API-boundary fixtures, and the guide’s integration setup. Do not mock `LLMSelector`, the project hook, `useSnapshot`, option rendering, or selection callbacks. Open actual dropdowns with role queries/user events and assert rendered option identities/counts, not passed props or mock-call wiring. Cover project-less empty-ID New Chat with empty and stale filtered lists; alpha-to-New Chat transition revealing beta-only options; overlapping ID once and prompt/config parity; project scope with populated, loading/empty-cache, and resolved-empty results exposing no unrelated global models; chosen value surviving loading, close/reopen and both controls; existing Default behavior. Follow guide cleanup and async assertions. Navigation spy does not change routes: explicitly render the New Chat route after asserting sidebar navigation. Use actual update/save responses to assert selected labels after reactive rerender and saved-chat reload.
- [ ] Implement only the configuration prop boundary: supply a nonempty `filteredModels` override only when `currentChat.projectId` is present; otherwise supply `undefined`. Preserve the project/projectId props, value binding, callback and Default handling. With scoped empty lists retain the existing scoped hook fallback, never the global catalog. If behavioral tests show that cannot hold without a broader change, return `needs_input`, not a special-case or shared-selector rewrite.
- [ ] Update the existing README section with a brief description: project-less New Chat uses the user-accessible catalog consistently across both selectors; project-scoped chats retain project restrictions. Do not create a new guide/report or claim explicit backend membership aggregation. Parent runs focused tests and all gates; report the new integration file plus existing configuration-selector and project-hook tests as relevant checks.

## Parent-owned runtime acceptance matrix (not implementation tasks)

After gates, follow local-verification guidance at 5175, recording requests, console and before/after screenshots in ignored `local/`, never credentials. Use existing demo.multi and demo.single accounts from the mandatory demo notes.

- **demo.multi / all four AC:** Compare config/prompt selectable IDs, membership coverage against actual project responses, unique counts (especially `gpt-4.1-mini`), and choose a beta-only model. Reopen both dropdowns; save/send using existing flow and reload the saved chat to confirm persisted selection.
- **Stale list → New Chat:** Open an alpha-scoped chat until its restricted list loads, then sidebar New Chat. Both dropdowns must recover the full project-less catalog and allow beta-only selection. Repeat from beta to cover directionality.
- **demo.single / all four AC:** Repeat parity, membership coverage, uniqueness and selection/persistence against this user's actual catalog. Do not infer global restrictions solely from alpha membership; compare the authenticated API results.
- **Project-scoped nonregression:** Alpha and beta chats remain constrained to their scoped responses; loading/empty options never expose unrelated global models and valid selection remains intact. Preserve neighboring premium-router behavior without editing 15906 files.

## Negative-constraint pass

Task 1 honors every stated exclusion: no speculative backend work; no fabricated runtime pass; no 15906 edits; no mock-wiring-only regression; no global fallback for scoped empty lists; no reseeding; no unrelated dirty-file changes; existing relevant docs only. The runtime matrix is parent-owned, not a duplicate gate/browser/review/commit task. No task violates these constraints.
