# Spec — EPMCDME-15971: Sync default model for existing assistants

Ticket: EPMCDME-15971 (Sub-Bug). Research: `technical-analysis.md`. Plan: `plan.md`.

## Goal

After a project administrator updates the project's default models, the chat with an *existing*
assistant shows the updated default model — matching what a newly created assistant in the same
project shows — without recreating the assistant. A model explicitly chosen on a chat or an
assistant's configuration, while still available in the project, is never overridden by this change.

## Background

Backend already resolves the correct default per assistant via `Assistant.effective_llm_model` /
`effective_llm_model_source: 'assistant' | 'project_default' | null`. Before this fix, neither
frontend surface read that resolution:

- `ChatPromptLlmSelector` already fetched the live project default (`projectDefaultModelId`) on
  mount and on dropdown-open, but only used it to decide whether to toast "default changed" — the
  dropdown's own "Default" row still came from the stale `isDefault` flag on the cached
  per-project model list.
- `AssistantForm` seeded its model-type field from the assistant's raw, persisted `llm_model_type`,
  which cannot distinguish a baked-in old default from a genuinely explicit per-assistant choice —
  both are stored as the same concrete model-id string.

## Behavior

- **`ChatPromptLlmSelector.tsx`** — `defaultModel` resolves `projectDefaultModelId` (when set)
  against `modelsToDisplay` first, falling back to the existing `isDefault`/`modelsToDisplay[0]`
  logic only when no project default id is available. The router-first guard
  (`defaultRouter` truthy → `null`) still runs before this. `selectedModel`, which reflects an
  explicit `currentChat.llmModel`, is untouched.
- **Project-default-fetch effect (same file)** — clears `projectDefaultModelId` when
  `currentChat.projectId` becomes falsy (leaving project context); guards against a stale response
  arriving after the user has switched projects again (`cancelled` flag set on cleanup); clears
  `projectDefaultModelId` on fetch failure instead of leaving a stale value in state.
- **`resolveInitialLlmModelType.ts` (new) + `AssistantForm.tsx`** — the form seeds
  `llm_model_type` via `resolveInitialLlmModelType(assistant)`: returns `''` when
  `effective_llm_model_source === 'project_default'` (so `LLMSelector` resolves the live default
  itself through `useProjectLLMModels`), otherwise returns the assistant's stored `llm_model_type`
  (covers both genuine explicit picks and the unsaved/legacy case where the source field is absent).

## Acceptance criteria

1. After the project's default models are updated, the model list in the chat with an existing
   assistant shows the updated default model.
2. The default model displayed for existing assistants matches what is shown for newly created
   assistants in the same project.
3. The update applies without the need to recreate the assistant.
4. A model explicitly selected on a chat or an assistant's configuration, while still available in
   the project, is never changed by a project-default update.
5. Newly created assistants continue to display the updated default correctly (no regression).

## Non-goals

- No new fetch or new Valtio store state in the chat selector — it reuses the
  `projectDefaultModelId` state/fetch it already had.
- No new client-side default-resolution mechanism in the assistant form — it reuses the
  backend-resolved `effective_llm_model` / `effective_llm_model_source` fields only.
- `VirtualAssistantForm.tsx` and `CustomNodeForm.tsx` are out of scope; not modified.
- The two independent "refetch project default on dropdown-open" implementations
  (`ChatPromptLlmSelector`, `VirtualAssistantForm`) are not consolidated.

## Testing

- `ChatPromptLlmSelector.liveDefault.test.tsx` — the trigger label and the "Default"/recommended
  row reflect `projectDefaultModelId` once fetched, even though the stale `isDefault` flag still
  points elsewhere; an explicit `currentChat.llmModel` keeps showing as selected regardless (AC4).
- `ChatPromptLlmSelector.projectDefaultReset.test.tsx` — `projectDefaultModelId` resets when
  leaving project context, is not overwritten by a stale response on a rapid project switch, and
  is cleared on fetch failure.
- `resolveInitialLlmModelType.test.ts` — `effective_llm_model_source: 'project_default'` → `''`;
  `'assistant'` with a stored model → that model; absent source with a stored model → that model
  (today's unsaved/legacy behavior); no assistant → `''`.
