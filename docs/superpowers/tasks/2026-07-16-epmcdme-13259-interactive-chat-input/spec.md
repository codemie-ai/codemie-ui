# EPMCDME-13259 — Interactive user input in CodeMie agent chat (Design Spec)

**Date**: 2026-07-16 (synced with implementation 2026-07-21) · **Status**: Implemented
**Repos**: `codemie` (backend) + `codemie-ui` (frontend), branch `feature/EPMCDME-13259-interactive-chat-input` in each
**Complexity**: XXL 32/36, split-required overridden by user — single run
**Architecture decision (user)**: extend the existing NDJSON protocol with A2UI-style fixed-schema payloads and own React components. No CopilotKit / AG-UI adoption. The element catalog is a **registry** (single source of truth) on both sides so new element types plug in through one entry.

## Problem

CodeMie agent chat is text-only. The agent cannot request explicit structured decisions (approve/reject), option selections, or validated form input; users can only reply free-text. The assistant configuration has no way to control which interactive capabilities an agent may use.

## Key decisions

1. **Pause/resume: turn-based.** The agent "pauses" by ending its turn after emitting an interactive request; the user's structured response arrives as a normal chat request and is delivered to the rebuilt agent as the tool result. No server-side suspended runs, no checkpointer in the chat path. Survives pod restarts by construction.
2. **Emission: dedicated tool `request_user_input`** with `return_direct=True`. The tool's dynamically-built args schema IS the catalog; disabled features are physically absent from the schema (removed, not hidden).
3. **State: derivation by `request_id`.** Messages are immutable; an element is "submitted" iff the history contains a response referencing its `request_id`.
4. **One surface = one response.** The whole surface is answered by a single combined `submit` response (`answers`-by-id), so a value valid for one block is never rejected because another block does not know it.
5. **Re-answer = edit the previous request.** An answered form is read-only; clicking **Edit** unlocks it, and re-submitting replaces that turn (like editing a prior user message).
6. **Response UX: compact chip.** The structured response is persisted and rendered as a compact user message (single ✓, `label: value · …`).
7. **Registry-driven catalog.** Element types, their feature gating, response-kind coverage and per-element validation derive from ONE registry per repo; catalog membership is additionally overridable via customer config without code.

## §1. Protocol (shared contract)

Backend module `src/codemie/core/interactive.py` (at `core/` to avoid a circular import), mirrored TS types in `src/types/entity/interactive.ts`.

```python
# Discriminated union by "type", derived from ELEMENT_REGISTRY
Element = Text | Column | Row | Button | MultipleChoice | Dropdown | DatePicker | TextField | CheckBox

class InteractiveRequest(BaseModel):
    request_id: str            # uuid, assigned by backend
    surface: list[Element]     # component tree

class InteractiveResponse(BaseModel):
    request_id: str
    kind: Literal["action", "choice", "form", "submit", "text_fallback"]
    payload: dict
    # submit (primary):  {"action": <button id|null>, "answers": {<id>: {"selected":[...]} | {"value": ...}}}
    # legacy kinds:      {"action": id} | {"selected": [...]} | {"values": {...}} | {"text": "..."}
```

Element definitions (fixed schema v1):
- Layout (always available when any feature enabled): `Column{children}`, `Row{children}`, `Text{content}`
- `Button{id, label, style?}` — available when `action_buttons` OR `short_forms` enabled
- `MultipleChoice{id, options[], maxAllowedSelections}` — `1` = single-select; feature `choice`
- `Dropdown{id, label, options[], placeholder?, required?}` — single-select drop-down, value-based answer `{value}`; feature `choice`
- `TextField{id, label, validation?: {required?, regex?, email?}}` — feature `short_forms`
- `CheckBox{id, label, validation?: {required?}}` — feature `short_forms`
- `DatePicker{id, label, min?, max?, required?}` — ISO `YYYY-MM-DD` value `{value}`, inclusive `min`/`max` range; feature `short_forms`

Wire changes:
- `StreamedGenerationResult` (`chains/base.py`): new **optional** field `interactive_request: InteractiveRequest | None`. Ordinary NDJSON chunk; old clients ignore it; text-only chat untouched.
- Chat request model: new **optional** field `interactive_response: InteractiveResponse | None`, plus the normal `text` carrying the chip display text.

## §2. Backend — registry, tool and catalog

- **`ELEMENT_REGISTRY`** — the single source of truth. Each element model carries catalog metadata (`FEATURES`, `IS_LAYOUT`, `ANSWERABLE_KINDS`) and a `validate_answer` method; the union, the type map, `enabled_element_types`, kind coverage and the validation dispatch all derive from it. Adding an element = one model + one registry line.
- Built-in tool `request_user_input` (`return_direct=True`), registered by the toolkit builder only when the assistant has ≥1 interactive feature enabled AND the platform flag is on.
- **Dynamic args schema** from `InteractiveFeaturesConfig`: disabled feature ⇒ its element types are absent from the tool's JSON schema. Dependency rule: `Button` present when `action_buttons OR short_forms`. Surface depth/element-count caps are enforced by a `BeforeValidator` **before** the recursive schema parse (no RecursionError on hostile input).
- Tool execution: validate surface against the enabled-elements catalog (invalid ⇒ tool error for retry), assign `request_id`, emit the `interactive_request` chunk via `ThreadedGenerator`, then **end the agent turn**.
- Catalog is also described in a system-prompt section listing only enabled element types.
- Config: pydantic `InteractiveFeaturesConfig {action_buttons, choice, short_forms}` → JSONB column `interactive_features` on `assistants` + alembic migration + field on `AssistantRequest` (precedent: `hedging_config`). All defaults **off**.
- **Config-gating:** `features:interactiveElements` component in `customer-config.yaml` gates the whole feature; an optional `catalog` setting on that component overrides which registered elements each feature exposes, without a code change (`enabled_element_types(config, catalog)`). The catalog is raw admin config, so a malformed shape degrades safely — non-dict → registry defaults, malformed parts → fail-closed — never a 500. Only registry-known types are honored (an unknown type can never be smuggled in).

## §3. Backend — response intake, validation and history

- The user's response arrives as a normal chat request carrying `interactive_response`. Ownership is checked (`READ`) before history is read.
- **Server-side re-validation** (client validation is not trusted): `request_id` exists and is not already answered; the response `kind` is re-validated against the surface — a narrow kind that cannot carry a required element is rejected, so a caller cannot skip validation by lying about `kind`. The combined `submit` validates every block by id (`answers`-by-id). Agent-authored regex runs under a hard match-time timeout (ReDoS-bounded via the `regex` module, guarded import); payload size and per-field caps apply.
- **Re-answer:** a submit that replaces a turn passes `replacing_history_index`; the "already answered" guard only skips the stored answer at that exact turn (strict `==`, never `>=`), so a client-supplied index cannot bypass the once-only rule.
- Persistence: `GeneratedMessage` gets optional `interactive_request` (assistant) / `interactive_response` (user chip). No mutation of stored messages; submitted state is derived and round-trips through the conversation GET.
- History materialization: `Conversation.to_chat_history()` replays only message text to the LLM, so the structured response is materialized as deterministic text inside the user message (display text + `[Structured response to interactive request <id>]` + JSON payload). Free-text replies pass through unchanged (`text_fallback`) — text-only behavior never regresses.

## §4. Frontend — chat rendering

- **`src/components/InteractiveElements/`** is registry-driven, mirroring the backend:
  - `registry.ts` — catalog metadata (type, feature, label, isInput) → drives the config catalog list.
  - `elementHandlers.tsx` — one handler per type: `render` (widget) + `validate` / `answer` / `summary` / `seed` for inputs (uses form `Select`, `DatePicker`, `Input`, `Checkbox`, `RadioButton`, `Button`).
  - `InteractiveSurface.tsx` — a **generic** surface: owns ONE opaque value-by-id state map + the single combined `submit`; every element plugs in through its handler via a minimal `getValue`/`setValue` context (no per-element accessor). Client validation is manual (required/regex/email + date format/range; regex guarded against catastrophic backtracking), invalid submit blocked.
- `ChatAiMessage` renders the block after the markdown body (wrapped in `InteractiveErrorBoundary`). Block state derives by `request_id`: **active** (unanswered, live edge, idle), **submitted** (read-only, selection marked), **stale** (unanswered, not last turn ⇒ disabled).
- **Re-answer:** Edit on a widget message unlocks its answered form (does not open the text editor); re-submitting replaces the answer turn (`submitInteractiveResponse(response, displayText, replaceHistoryIndex)`) and `ChatHistoryGroup` surfaces the newest variant. A rejected submit removes the optimistic chip (toast, no ghost message).
- `chatGeneration` store (valtio): `interactive_request` handled in `_handleChunk`; `submitInteractiveResponse` sends a normal chat turn; optimistic rollback on error.
- `ChatPrompt` free-text input is **not blocked** while an element is active (text fallback).
- Compact chip: a single ✓ with `label: value · …` (labels normalized so no `✓ ✓` / `::`).

## §5. Frontend — assistant form

Accordion section **"Interactive features"** in `AssistantForm`, placed **first after Assistant Setup**. A **single** "Enable interactive features" switch turns the whole catalog on (writes all feature flags true) or off (null); the InfoBox lists the available elements **derived from the registry**. Section visibility behind `useFeatureFlag('interactiveElements')`. Wiring: Yup schema, `compareFormData`, entity type in `assistant.ts`, mock-server flag. Default: off. (The config keeps its granular 3-flag shape for the API; the UI no longer exposes per-feature switches.)

## §6. Testing

- **Backend (pytest)**: registry-derived catalog + customer-config override gating (incl. unknown-type filtering and malformed-shape fail-safe); dynamic tool schema per config (incl. Button dependency + pre-parse depth cap); combined-submit validation (answers-by-id, kind-coverage, dropdown/date/required); re-answer intake (`replacing_history_index`, duplicate rejection, low-index bypass blocked); ReDoS timeout + payload caps; history materialization incl. `text_fallback`; migration; persistence round-trip.
- **Frontend (vitest)**: registry ↔ union sync; element render/validate/answer/summary via handlers; single-select select-then-submit; combined mixed-surface submit; re-answer via Edit-unlock + variant display + failed-submit rollback; chip formatting; client ReDoS guard; AssistantForm section (single toggle, catalog list, create-POST).

## Acceptance criteria mapping

| Ticket AC | Covered by |
|---|---|
| Chat UI displays interactive elements | §1, §4 |
| Actions (Approve/Reject/…) delivered structured, agent continues | §1–§4 (turn-based) |
| MultipleChoice single/multi via `maxAllowedSelections` | §1, §4 |
| Short form submit, structured return | §1, §3, §4 (combined submit) |
| Validation required/regex/email, invalid blocked | §4 (client) + §3 (server re-check, kind-coverage) |
| Agent pauses until explicit input, resumes after | §2–§3 (turn-based) |
| Element state updates without breaking chat context | §3–§4 (derivation by `request_id`, re-answer) |
| "Interactive features" block in assistant create/edit | §5 |
| Disabled features removed from agent-exposed catalog | §2 (dynamic tool schema + prompt + customer-config gating) |
| Text-only chat not regressed | §1 (optional fields), §3 (`text_fallback`), §4 (prompt not blocked) |

## Out of scope

- Review/closure of related stories EPMCDME-4287 / EPMCDME-7507 / EPMCDME-8169 (managerial AC, no code).
- True LangGraph `interrupt()`/checkpointer pause in the chat path.
- Element types beyond the v1 catalog defined in the registry; a runtime BE→FE served catalog (the FE registry mirrors the backend).
