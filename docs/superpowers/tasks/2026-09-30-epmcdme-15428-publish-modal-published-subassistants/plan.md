# EPMCDME-15428 Publish modal: skip already-published sub-assistants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** The assistant Publish to Marketplace modal offers only unpublished sub-assistants for publishing.

**Architecture:** Filter once in the modal, right after the validate response. Every downstream handler (`handlePublish` category check, `performPublish` auto-fill and payload, `SubAssistantSettings` select-all) already iterates `subAssistantsSettings` / the `subAssistants` prop, so they need no change.

**Tech Stack:** React 18, TypeScript. Commit per task using the repository's existing convention.

## Assumption (not user-confirmed)

The backend contract is not in this repo. `SubAssistantInfo.is_global` in the validate response is taken to mean "already available on Marketplace". If the backend uses another field, only the filter in Task 1 changes.

## Acceptance criteria

- Published sub-assistants (`is_global` true) are not listed as items to publish.
- No category prompt or auto-populate confirmation is triggered for them, and they are not sent in `sub_assistants_settings`.
- With mixed sub-assistants, only unpublished ones are listed, and they are selected by default.
- If all are published, the selectable list and Select All are not rendered.
- Copy states which sub-assistants still need publishing.
- Parents with no sub-assistants, or only unpublished ones, behave as before.

## Negative constraints

- Do not add `nosonar` markers.
- Do not write tests unless the user asks.

Pass: no `nosonar` is added by either task, and no tests are added.

### Task 1: Split published and unpublished sub-assistants in the modal

**Files:**
- Modify: `src/pages/assistants/AssistantActions/components/PublishToMarketplaceModal.tsx:113-127` (seeding in `handleValidate`), `:277-278` and `:316-322` (render)
- Modify: `src/types/entity/assistant.ts` (~349-360), a one-line comment on `SubAssistantInfo.is_global` recording the assumption

**Interfaces:** Produces `unpublishedSubAssistants: SubAssistantInfo[]`, computed in the component body as `validationData?.sub_assistants?.filter((sa) => !sa.is_global) ?? []`. Task 2 receives it as the `subAssistants` prop.

Test-first: no — user has not requested tests.

- [ ] Seed `initialSettings` only from `sa.is_global === false` entries, as `{assistant_id: sa.id, is_global: true}`. Unpublished ones are selected by default and published ones get no setting.
- [ ] Set `hasSubAssistants` from `unpublishedSubAssistants.length > 0`. Pass `unpublishedSubAssistants` to `<SubAssistantSettings>`. The `handlePublish` and `performPublish` logic is unchanged.
- [ ] Below the parent `CategorySelector`, when published sub-assistants exist, render a short `<p className="text-sm text-text-quaternary">` reading "Already on Marketplace, no action needed: {names}". When all are published, this line is the only sub-assistant content.

### Task 2: Clarify Sub-Assistants copy

**Files:**
- Modify: `src/pages/assistants/AssistantActions/components/SubAssistantSettings/SubAssistantSettings.tsx:171` (InfoWarning message), `:131` and `:44` (fallback default)

**Interfaces:** Consumes `subAssistants` containing only unpublished items (Task 1).

Test-first: no — user has not requested tests.

- [ ] Change the InfoWarning message to "These sub-assistants are not on Marketplace yet. Select the ones to publish together with this assistant."
- [ ] Change the `getIsGlobal` fallback (`?? true` after `subAssistant?.is_global`) and the initial-expanded fallback so they no longer read `sa.is_global`, which is now always false here. Fall back to `true` when no setting exists, keeping the "selected by default" behavior.
