# EPMCDME-10583: Fix workflow assistant duplication on step edit

## Problem

When multiple workflow states (steps) reference the same virtual assistant via YAML and a user edits any of those states in the visual editor, a new duplicate assistant is created instead of updating the existing shared one. This breaks the sharing relationship and pollutes the workflow's assistant list.

Root cause: `shouldReuseActorId` in `idGenerators.ts` returns `false` whenever more than one state references the same actor ID. The tab components interpret this as "generate a new actor ID", producing a duplicate.

## Solution

Modify `shouldReuseActorId` to treat `ActorTypes.Assistant` differently from other actor types:

- **Assistant actors**: return `true` if the current state is among the states referencing the actor (regardless of how many states share it). This allows shared assistants to be updated in-place.
- **Tool / CustomNode actors**: retain the existing exclusive-ownership guard (`referencingStates.length === 1`). These actor types are not intended to be shared across states.

No changes are needed in `AssistantTab`, `ToolTab`, `CustomTab`, or `TransformTab` — they already pass the result of `shouldReuseActorId` through to the ID selection ternary unchanged.

The downstream `applyAssistantUpdates` in `updateState.ts` already upserts by ID, so passing the same assistant ID for a shared actor correctly updates the single actor entry in the config.

## Acceptance criteria

- A single virtual assistant can be assigned to multiple workflow steps in the visual editor without duplication.
- Editing any step referencing a shared assistant updates that assistant in-place; no duplicate is created.
- The assistant-to-state reference relationship is preserved after any UI modification.
- Workflows imported via YAML with shared assistants are handled correctly by the UI.
- Tool and custom-node actor sharing behavior is unchanged (new actor generated when a shared tool/custom-node step is edited).

## Scope

| File | Change |
|---|---|
| `src/utils/workflowEditor/helpers/states/idGenerators.ts` | Add `ActorTypes.Assistant` branch to `shouldReuseActorId` |
| `src/utils/workflowEditor/helpers/states/__tests__/idGenerators.test.ts` | Update multi-reference assistant test to expect `true`; add new shared-assistant test; verify Tool/CustomNode multi-reference still returns `false` |

## Out of scope

- UI warning when editing a shared assistant (silent save per requirements).
- Changes to Tool or CustomNode sharing behavior.
- Changes to any tab component (`AssistantTab`, `ToolTab`, `CustomTab`, `TransformTab`).
