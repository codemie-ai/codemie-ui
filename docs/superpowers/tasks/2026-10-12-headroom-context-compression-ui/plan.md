# Headroom Context Compression UI (EPMCDME-15645) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Flag-gated UI to configure Headroom for assistants (form) and workflows (YAML validation, workflow/node tri-state panels).

**Architecture:** Mirror `hedging_config` for the assistant side (types, flag triple, Controller-wrapped field, payload transform). For workflows add a pure hand-written `headroom` YAML helper (validate, read/write block, effective value) reused by YamlPanel validation, an Ace completer, and tri-state panels.

**Tech Stack:** React 18, TS, react-hook-form + Yup, Valtio, PrimeReact, Ace, js-yaml (existing), Vitest + RTL.

Commit per task using the repository's existing convention (ticket key EPMCDME-15645 per `.ai-run/guides/standards/git-workflow.md`). Apache license header on new files. Follow `.ai-run/guides/` form-patterns, testing-patterns, styling, state-management.

## Global Constraints

- No new dependency. UI repo only; no backend changes.
- All Headroom UI hidden unless `features:headroom` is enabled.
- Allowed YAML keys: `enabled`, `compress_user_messages`, `compress_tool_outputs`, `strategy` (lossless|balanced|aggressive); all optional; unknown keys / bad types rejected.
- Defaults when object exists: enabled=false, compress_user_messages=true, compress_tool_outputs=true, strategy=balanced.
- Update semantics: absent = unchanged; to turn off send object with `enabled:false`, never rely on null.

## Assumptions (record, unverified)

- Backend OpenAPI and `execution_config_schema.yaml` are not in this repo; block shape follows the task text.
- 422 body shape unverified (api.ts exposes `{error:{message, details?, help?}}`); field mapping is best-effort.
- Workflow detail field name `headroom_config` unverified (Workflow type has `[key: string]: any`).
- The workflow-level value is read from the YAML itself in the editor; `headroom_config` from detail is typed only.

## Task 1: Types, feature flag, assistant payload and 422 mapping

**Files:**
- Modify: `src/types/entity/assistant.ts` (near `HedgingConfig` l.38, Assistant l.135, DTO l.482); `src/types/entity/workflow.ts:32`
- Modify: `src/constants/featureFlags.ts`, `src/hooks/useFeatureFlags.ts`, `src/utils/featureFlags.ts` (follow `REQUEST_HEDGING` triple)
- Modify: `src/store/utils/assistants.ts` (~l.97 `transformAssistantToCreateDTO`); `src/store/assistants.ts` (`createAssistant` l.763, `updateAssistant` l.859)
- Test: `src/store/utils/__tests__/assistants.test.ts`

**Interfaces:**
- Produces: `HeadroomStrategy`, `HeadroomConfig` (4 required), `HeadroomOverride` (4 optional) exported from `types/entity/assistant.ts`; `FEATURE_FLAGS.HEADROOM = 'features:headroom'`; `useHeadroomEnabled(): boolean`; `isHeadroomEnabled(): boolean`; `headroom_config?: HeadroomConfig | null` on assistant request/response; `headroom_config?: HeadroomOverride | null` on `Workflow`.

Test-first: yes — transform test: object present is sent whole; `undefined` yields no `headroom_config` key (not null); `{enabled:false,...}` is sent unchanged.

- [ ] Write failing tests in `assistants.test.ts` for the three cases above.
- [ ] Add types and flag triple; in the transform, pass `headroom_config` only when not `undefined` (do NOT copy hedging's `?? null`). Same for the update DTO.
- [ ] In `createAssistant`/`updateAssistant` catch path, when the error body is a 422 with a detail locating `headroom_config.strategy` (FastAPI-style `loc` array or `details` string containing it), also return `fieldErrors: { 'headroom_config.strategy': message }`; otherwise keep current `error` string behavior. Add a test for both shapes.

## Task 2: Assistant form "Context compression (Headroom)" section

**Files:**
- Create: `src/pages/assistants/components/AssistantForm/components/HeadroomConfig.tsx`
- Modify: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` (Yup ~l.160, defaults ~l.308, flag hook l.224, accordion after hedging ~l.893-918)
- Test: `src/pages/assistants/components/AssistantForm/components/__tests__/HeadroomConfig.test.tsx`

**Interfaces:**
- Consumes: Task 1 types and `useHeadroomEnabled`.
- Produces: `<HeadroomConfigField value={HeadroomConfig | null} onChange={(v: HeadroomConfig) => void} error?: string />` (mirror `HedgingConfig.tsx` props).

Test-first: yes — rendering with `value=null` shows defaults (off, user on, tools on, balanced); sub-controls and strategy select are disabled while enabled is off; toggling enabled calls `onChange` with the full 4-field object; each strategy shows its help text; `error` renders next to Strategy.

- [ ] Write failing component tests above.
- [ ] Implement with `@/components/form/` Switch, checkbox, Select, InfoBox. Labels: "Enable context compression", "Compress user input", "Compress tool outputs", "Strategy". Help texts per requirements (lossless: deterministic and prompt-cache-safe; balanced: lossy, can lower provider prompt-cache hit rates; aggressive: like balanced with lower keep fraction, may behave like balanced in some deployments). Add a general note listing not-compressed paths.
- [ ] In `AssistantForm.tsx`: default `headroom_config: assistant?.headroom_config ?? undefined`; Accordion gated by flag; Controller writes the full object on first interaction (so untouched + none stored stays absent); map `fieldErrors['headroom_config.strategy']` from the save result to the field via `setError`/prop. Add a flag-hidden test (mock the hook false, section absent) in the same test file or a small wrapper test.

## Task 3: Headroom YAML helper, validation, Ace completion

**Files:**
- Create: `src/utils/workflowEditor/headroom/headroomYaml.ts`, `src/utils/workflowEditor/headroom/headroomCompleter.ts`
- Modify: `src/pages/workflows/editor/configPanels/YamlPanel.tsx` (existing jsYaml validation), `src/components/AceEditor/AceEditor.tsx` (optional `completers` prop), plus `src/components/form/YamlEditor/YamlEditor.tsx` if it validates separately
- Test: `src/utils/workflowEditor/headroom/__tests__/headroomYaml.test.ts`

**Interfaces:**
- Produces: `validateHeadroomBlock(value: unknown, path: string): HeadroomIssue[]`; `validateWorkflowHeadroom(doc: unknown): HeadroomIssue[]` (workflow level and each `assistants[i]`); `HeadroomIssue = { path: string; message: string; line?: number }`; `getHeadroomOverride(block): HeadroomOverride`; `setHeadroomField(block, key, value | undefined): HeadroomOverride | undefined` (undefined removes the key; empty block returns undefined so the block is dropped); `resolveEffective(field, node, workflow, assistant): { value, source: 'node'|'workflow'|'assistant'|'default' }`.

Test-first: yes — validator accepts `{}` and partial blocks; rejects unknown key, non-boolean `enabled`, `strategy: fast`, non-object block, with path `assistants[1].headroom.strategy`; `setHeadroomField` unsets cleanly; `resolveEffective` gives node>workflow>assistant>default and node `enabled:false` beats workflow true.

- [ ] Write failing helper tests.
- [ ] Implement pure helpers (hand-written, no dependency).
- [ ] YamlPanel: run `validateWorkflowHeadroom` after a successful parse only when the flag is on; render issues next to the existing error area and set Ace annotations on the matching line if the wrapper supports it (best-effort line lookup by key search).
- [ ] Ace completion: add optional `completers` prop to the AceEditor wrapper; completer offers `headroom:` at top level / under assistants entries and the four keys and strategy values inside the block. If the wrapper cannot take a completer without invasive change, skip and record it in the unclear-contract list.

## Task 4: Workflow-level and per-node tri-state panels

**Files:**
- Create: `src/pages/workflows/editor/configPanels/HeadroomPanel.tsx` (shared tri-state UI with `scope: 'workflow' | 'node'`)
- Modify: workflow-level settings panel in `src/pages/workflows/editor/` (locate via `ConfigPanel.tsx`), `AssistantTab.tsx` (per-node), `src/hooks/useWorkflowEditor.ts` and `src/utils/workflowEditor/actions/config/` (new `updateHeadroom.ts` action modeled on `updateAdvancedConfig.ts`)
- Test: `src/pages/workflows/editor/configPanels/__tests__/HeadroomPanel.test.tsx`

**Interfaces:**
- Consumes: Task 3 helpers, Task 1 flag hook.
- Produces: `<HeadroomPanel scope value={HeadroomOverride|undefined} inherited?={HeadroomOverride} onChange={(v: HeadroomOverride|undefined) => void} />`.

Test-first: yes — booleans render Inherit/On/Off, strategy renders Inherit/value; selecting Inherit removes the key (onChange payload lacks it); setting only one field leaves other fields unset; node scope shows effective-value hint "Inherits workflow: on" vs "Overrides workflow"; help text about sub-assistants not inheriting and not-compressed paths is present; panel absent when flag off.

- [ ] Write failing tests.
- [ ] Implement panel and actions writing the `headroom` block into editor state (workflow level into the config root, node level into the matching `assistants[]` entry), dropping empty blocks.
- [ ] Wire both mounting points, gated by flag.

## Task 5: Serializer round-trip

**Files:**
- Modify (only if the test fails): `src/utils/workflowEditor/serialization/types.ts` (`AssistantConfiguration` ~l.51, `assistants?` l.84), `serializer.ts:123`, `deserializer/deserializer.ts:~308`
- Test: `src/utils/workflowEditor/serialization/__tests__/` (new `headroomRoundTrip.test.ts`)

Test-first: yes — YAML with top-level `headroom` and `assistants[0].headroom` deserialized then serialized still contains both blocks with identical values; unset fields stay absent. Analysis shows top-level survives via `...rest`; per-assistant is unverified.

- [ ] Write the failing round-trip test (it may already pass for top-level; the assistant case decides).
- [ ] If the assistant block is dropped, add `headroom?: HeadroomOverride` to `AssistantConfiguration` and pass it through in the deserializer/serializer mapping. Also confirm the node-panel action from Task 4 survives a canvas save.

## Task 6: Contract-gaps record and final verification

**Files:** none new in source; report in the final response (no summary document file).

Test-first: no — collapses to one step.

- [ ] Run each gate individually after `npm ci` (lint, type-check, the new test files via `npx vitest run --project unit <paths>`), quote the `Test Files` line, and report in the response the list of places the contract was unclear: backend OpenAPI / `execution_config_schema.yaml` absent; 422 body shape; workflow detail `headroom_config` name; effective-value for assistant-level fallback requires assistant data not loaded in editor (hint shows node/workflow/default only unless cheap); Ace completer feasibility; line-level YAML error positions.

## Negative-constraint pass

- "no new dependency": Task 3 hand-written helpers; completer only if wrapper allows (honored).
- "no backend changes": none touched.
- "do not rely on null; absent on update = unchanged": Task 1 omits instead of `?? null`; Task 2 off = `enabled:false` object.
- "omit only when untouched AND none stored": Task 2 Controller writes on first touch.
- "sub-assistants do NOT inherit": help text in Task 4, no inheritance logic.
- "unset fields stay unset": Tasks 3-5.
