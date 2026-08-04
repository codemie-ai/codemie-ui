# Technical Research

**Task**: marketplace assistant-card clone-counter frontend
**Generated**: 2026-07-27
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-10889: implement frontend half of Marketplace clone counter (codemie-ui repo). Backend already shipped on a separate branch — contract is fixed. Response field clone_count: Optional[int] now present on AssistantListResponse/Assistant. Request field source_assistant_id: Optional[str] accepted (unvalidated, silently no-ops if bad) on POST /v1/assistants. Frontend scope: (1) Add clone_count to Assistant/AssistantListResponse types (src/types/entity/assistant.ts). (2) Send source_assistant_id in the clone submit payload in NewAssistantPage.tsx (isCloning branch, ~line 56). (3) Render clone count on AssistantCard.tsx near the existing like/dislike block (src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx:178-227) — same button+icon+span+divider pattern, defensive ?? 0. (4) Carry clone_count through store list mapping (src/store/assistants.ts:267-274), same as is_pinned/is_favorited. (5) Update AssistantCard.test.tsx for the new counter render. Out of scope: backend, marketplace ranking sort, removing the ?? 0 fallback.

---

## 2. Codebase Findings

### Existing Implementations

- `src/types/entity/assistant.ts:72-87` — `AssistantListResponse` interface. Needs `clone_count?: number` added.
- `src/types/entity/assistant.ts:89-158` (`is_pinned`/`is_favorited` at 153-154) — `Assistant` interface. Add `clone_count?: number` alongside these, matching the optional-boolean/optional-number precedent.
- `src/types/entity/assistant.ts:440-476` — `CreateAssistantDto`, the outbound POST/PUT payload shape. Needs `source_assistant_id?: string` added — this is the field that actually reaches the wire.
- `src/store/utils/assistants.ts:19-80` — `transformAssistantToCreateDTO(assistant)` builds `CreateAssistantDto`. Currently has no `source_assistant_id` param/field. This is the seam where the field should be threaded through (or added directly at the call site — see risk below).
- `src/store/assistants.ts:697-716` — `createAssistant(values, skipIntegrationValidation)` calls `transformAssistantToCreateDTO(values)` then `api.post('v1/assistants', assistantData)`. `source_assistant_id` must reach this call somehow.
- `src/store/assistants.ts:227-281`, specifically 267-274 — `indexAssistants` list-mapping block, currently derives `is_pinned`/`is_favorited` via lookup against a preferences set. `clone_count` differs: it is already present verbatim on the raw API response object, so the existing `.map()` spread (`...assistant`) already carries it through untouched — likely no code change needed here beyond typing, unless normalization narrows the type.
- `src/store/assistants.ts:185-195` — `normalizeAssistant()` (single-assistant fetch path) similarly spreads and needs no explicit clone_count handling.
- `src/pages/assistants/NewAssistantPage.tsx:55-56` (`isCloning = !!id`) and `handleSubmit` (~121-123) — currently calls `assistantsStore.createAssistant(values, skipValidation)` with no reference to the source id at all. `values` here is `AssistantFormSchema`, not raw `Assistant` — the route param `id` (not form state) is the actual source of the clone-from id. `source_assistant_id: isCloning ? id : undefined` must be merged in at this call site, since `AssistantFormSchema` has no such field.
- `src/pages/assistants/components/AssistantForm/AssistantForm.tsx:211,397` — confirms `onSubmit` signature is `(values: AssistantFormSchema, skipValidation?: boolean) => Promise<SubmitResponse>`; form itself carries no clone/source-id concept.
- `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx:178-227` — `renderActions()`, like/dislike block gated by `isGlobal &&`. Pattern per stat button: `Button type="tertiary"` + conditional icon svg + `<span className="text-sm-1" aria-hidden="true">{count}</span>`, with a `<div className="h-[12px] w-px bg-border-structural mx-1" aria-hidden="true">` divider between buttons. Clone-count button should follow the identical structure, inserted near this block.
- No existing "clone" icon; `src/assets/icons/copy.svg` is the closest existing convention if a dedicated icon is wanted. Icons import as raw SVG React components via the `?react` Vite suffix (see `ThumbUpSvg`/`ThumbDownSvg`/`PlusSvg`/`ChatSvg` imports at top of `AssistantCard.tsx`).

### Architecture and Layers Affected

- Types layer — `src/types/entity/assistant.ts` (`AssistantListResponse`, `Assistant`, `CreateAssistantDto`)
- Store/state layer — `src/store/assistants.ts` (`indexAssistants`, `normalizeAssistant`, `createAssistant`), `src/store/utils/assistants.ts` (`transformAssistantToCreateDTO`)
- API client — `src/utils/api` (thin wrapper, `api.post('v1/assistants', ...)`), no changes needed, just a new payload field
- UI component layer — `AssistantCard.tsx` (render), `AssistantForm.tsx` (form orchestration, no change needed)
- Page orchestration — `NewAssistantPage.tsx` (clone submit payload construction)
- Test layer — `AssistantCard.test.tsx` (needs new coverage), `NewAssistantPage.integration.test.tsx` (natural place for a `source_assistant_id` payload assertion)

### Integration Points

- `NewAssistantPage.tsx` → `assistantsStore.createAssistant` → `transformAssistantToCreateDTO` → `api.post('v1/assistants', ...)` — the outbound path for `source_assistant_id`.
- `assistantsStore.indexAssistants`/`normalizeAssistant` → `AssistantListResponse`/`Assistant` types → `AssistantCard.tsx` — the inbound path for `clone_count`.
- No external service or third-party SDK involvement; this is a self-contained internal API contract change already fixed by a shipped backend branch.

### Patterns and Conventions

- Optional fields on `Assistant`/`AssistantListResponse` are always `?:` — mirrors backend's `Optional[int]`/`Optional[str]`. Consumers must use `?? 0` defensively at render time, never assume presence.
- Repeating button+icon+span+divider group for stat/reaction counters — `Button type="tertiary"` with `data-pr-tooltip`, `aria-label` (e.g. `Like ${assistant.name}, ${count}`), icon component, `<span className="text-sm-1" aria-hidden="true">{count}</span>`.
- DTO transform seam (`transformAssistantToCreateDTO`) is the single boundary between UI `Assistant`/form values and the wire payload — new outbound-only fields should be threaded through this seam or added directly in `createAssistant` before `api.post`, consistent with existing usage.
- List-mapping `.map()` spreads `...assistant` plus derived fields — pure passthrough fields (like `clone_count`) need no derivation logic, unlike `is_pinned`/`is_favorited` which require a preferences lookup.
- `valtio` proxy-based reactive store; `primereact` `classNames` utility used in card styling.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md` — canonical pattern reference for button+icon+count widgets.
- `.ai-run/guides/patterns/state-management.md` — store passthrough conventions.
- `.ai-run/guides/development/api-integration.md` — defensive optional-field handling guidance.
- `.ai-run/guides/testing/testing-patterns.md` — relevant for updating `AssistantCard.test.tsx`.
- This repo's `.ai-run/guides/` are frontend-native (not backend-only), consistent with a UI-only ticket.

### Architectural Decisions

- Recorded in `notes/projects/epmcdme-10889-marketplace-clone-counter.md` (private project notes, not in-repo ADRs):
  - Contract-first / stub approach: FE and BE built in parallel against agreed contract; FE sends `source_assistant_id` immediately (pydantic drops unknown fields silently, per ticket's "unvalidated, silently no-ops if bad"); FE reads `clone_count` defensively (`?? 0`) until backend confirms the field is always present.
  - Explicit follow-up recorded: remove the `?? 0` fallback once backend confirms `clone_count` always populated (ticket explicitly marks this **out of scope** for this pass — do not do it now).
  - No client-side increment logic — server owns the count; frontend only passes it through, mirroring `is_pinned`/`is_favorited` precedent from EPMCDME-11041 (referenced in `notes/archive/epmcdme-10890-marketplace-favorites-filter.md`).
  - Backend infra confirmed ready for FE (2026-07-27 audit): `source_assistant_id` has no `extra="forbid"` restriction on the backend model; `clone_count` flows onto `AssistantListResponse` automatically. No backend blockers.

### Derived Conventions

- Store passthrough pattern for additive marketplace-card fields: type addition → store list-mapping (pass through, or explicit typing only) → component render with defensive fallback. Same shape as the `is_pinned`/`is_favorited` precedent.
- Clone flow entry point: `AssistantActions.tsx:109` → `/assistants/:id/clone` route → `NewAssistantPage.tsx` (`isCloning = !!id`) — confirms route param `id` is the correct source for `source_assistant_id`, not any form field.

---

## 4. Testing Landscape

### Existing Coverage

- `AssistantCard.test.tsx` — covers name/description rendering, custom overrides, navigation slot, `StatusLabel` show/hide via `isTemplate`. **Does not currently exercise the like/dislike block at all** — mock assistant has `is_global: false`, so that gated block is never rendered/tested. No existing pattern in this file for asserting count spans.
- `getAssistantCardInfo.test.tsx` — tests helper `getAssistantCardInfo.tsx`, not clone-related per grep; worth checking whether clone-count label/formatting logic belongs there.
- `StatusLabel.test.tsx` — unrelated, tests `StatusLabel.tsx` only.
- `NewAssistantPage.integration.test.tsx` — has clone-mode tests already: routes to `/assistants/assistant-1/clone`, pre-populates clone form (~line 161, 216), loads cloned assistant via GET (~line 710), mocks `POST v1/assistants` returning `{ id: 'cloned-id', assistantId: 'cloned-id' }` (~line 752-769). **No assertion on request body / `source_assistant_id` exists today** — this is the natural place to add one, using the existing `mockAPI('POST', 'v1/assistants', {...})` helper (need to confirm the helper supports request-body capture).

### Testing Framework and Patterns

- vitest 1.6.1, @testing-library/react 16.3.0, @testing-library/jest-dom 6.6.3, @testing-library/user-event 14.6.1.
- Config: `vitest-env-integration.ts`, `vitest.workspace.ts` at repo root.
- Mocking style: `vi.mock(...)` at top of file for helpers/assets/store; assistant store (`assistantsStore`) mocked wholesale with `vi.fn()` stubs (e.g. `removeReaction`/`reactToAssistant`), no assertions currently made on call args.
- No shared Assistant mock/fixture factory — each test file builds its own inline literal object cast `as Assistant`.
- Assertions rely on `screen.getByText`/`getByRole`/`queryByRole` and container class checks — no icon/testid-based assertions on like/dislike buttons exist yet to copy from directly; the clone-counter test will need to establish this pattern.

### Coverage Gaps

- No `clone_count` rendering test exists (confirmed greenfield — zero references to `clone_count` anywhere in `src/`).
- No `source_assistant_id` payload test exists (confirmed greenfield — zero references anywhere in `src/`).
- Like/dislike block itself has zero existing test coverage in `AssistantCard.test.tsx` — adding a clone-count test may require first exercising the `isGlobal` gate that the whole stat-button block sits behind, an incidental but necessary setup step.
- `mock-server/db.json` assistant fixtures lack a `clone_count` field — local dev server won't visually reflect the new counter unless fixtures are updated (dev-experience gap, not a hard blocker).

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — backend API base URL (resolved from `window._env_.VITE_API_URL` at runtime or `import.meta.env.VITE_API_URL` at build time). Governs all `/v1/...` calls including this one. No new/second env var needed.
- `VITE_SUFFIX`, `VITE_ENTRY` — unrelated build config, not relevant.

### Configuration Files

- `src/utils/api.ts` — central API client, `BASE_URL` resolution; no versioning logic beyond string path prefixes passed by callers.
- `src/constants/featureFlags.ts` + `src/hooks/useFeatureFlags.ts` — app's feature-flag mechanism (covers enterprise edition, user management, budget management, favorites, pinned assistants, MCP connect, show-all-projects, request hedging, Teams bot, workflow AI). **No marketplace/clone-related flag exists** — consistent with this being unflagged, always-on behavior.
- `deploy-templates/` (values.yaml, configmap.yaml, deployment.yaml) — Helm chart injecting `_env_` runtime config; no changes needed for this purely additive field.
- `mock-server/db.json` / `mock-server/routes.json` — local dev mock server; assistants collection lacks `clone_count` (see gap above).

### Feature Flags and Deployment Concerns

- No feature flag gates this work; it ships unconditionally once merged.
- No `.env.example` file exists in repo root.
- No CI/deployment config (`.github/`, `deploy-templates/`) references this feature area — nothing there needs modification.

---

## 6. Risk Indicators

- **Field-threading ambiguity for `source_assistant_id`**: `AssistantFormSchema` (the type passed into `NewAssistantPage.tsx`'s `handleSubmit`) has no concept of a source/clone id — the actual source is the route param `id`. Implementer must decide whether to inject `source_assistant_id` into `transformAssistantToCreateDTO`'s output directly at the `createAssistant` call site in `NewAssistantPage.tsx`, or add a parameter to `transformAssistantToCreateDTO` itself. Either works; pick one and keep it consistent with the DTO-seam convention.
- **Zero existing test coverage for the like/dislike block** in `AssistantCard.test.tsx` (mock assistant has `is_global: false`, so the whole gated stat-button region, including where clone-count will live, is never rendered under current tests). Adding a clone-count test requires first flipping `is_global: true` in the mock — incidental setup work, slightly larger test diff than "just add one assertion."
- **No shared Assistant mock/fixture factory** — test additions will extend the existing inline-literal-cast pattern per file rather than a shared builder; keep new fixtures consistent with existing style, don't introduce a new factory unprompted.
- **Explicit scope guard**: ticket instructs NOT to remove the `?? 0` defensive fallback even though project notes call it out as a known future follow-up — do not "clean this up" preemptively.
- **Dev-experience gap, non-blocking**: `mock-server/db.json` fixtures lack `clone_count`; local dev server won't show real-looking counts unless updated. Optional, not called out in ticket scope — flag but don't do unless asked.
- **Backend contract already confirmed safe** by a prior audit noted in project notes (no `extra="forbid"` on request model, `clone_count` auto-flows onto response) — low integration risk, contract is genuinely fixed.
- No security-sensitive surface (no auth, no user input validation change on FE side — backend already declared it "unvalidated, silently no-ops if bad").

---

## 7. Summary for Complexity Assessment

This is a small, well-scoped, additive frontend change touching five layers in a single vertical slice: types (`src/types/entity/assistant.ts`, 2-3 field additions), store passthrough (`src/store/assistants.ts` / `src/store/utils/assistants.ts`, likely no-op to minimal for the inbound `clone_count` since spread already carries it, but requires deliberate wiring for the outbound `source_assistant_id` through the DTO transform seam), one page-level submit-payload change (`NewAssistantPage.tsx`), one component render addition following an exact existing pattern (`AssistantCard.tsx` like/dislike block), and test updates in two files. Estimated file change surface: 4-6 files, all in `src/`, no new files strictly required (a clone icon asset is optional — `copy.svg` can be reused).

Technical novelty is low: every piece of this task has a direct precedent to copy from — `is_pinned`/`is_favorited` for the store/type passthrough pattern, and the like/dislike button block for the UI rendering pattern. The one point requiring a small design decision (not a novel pattern, just a choice) is where exactly `source_assistant_id` gets merged into the outbound payload, since `AssistantFormSchema` doesn't carry it and it must come from the route param instead.

Test coverage posture is mixed-to-thin: the specific behaviors under test are greenfield (confirmed zero existing references to `clone_count`/`source_assistant_id`), and the file that needs the new render test (`AssistantCard.test.tsx`) currently has zero coverage of the sibling like/dislike block it must extend, meaning the test diff is slightly bigger than "add one assertion" — it needs to first exercise the `isGlobal`-gated block. `NewAssistantPage.integration.test.tsx` already has clone-flow test scaffolding (mocked POST, route setup) making the payload assertion straightforward to bolt on. Overall risk is low; complexity should be scored as small/routine given the strength of existing precedent and the absence of any backend, security, or architectural unknowns.
