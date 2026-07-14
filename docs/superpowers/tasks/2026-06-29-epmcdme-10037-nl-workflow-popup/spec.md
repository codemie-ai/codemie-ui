# Spec: NL Workflow Generation Popup (EPMCDME-10037)

## Problem

Users creating a new workflow must manually fill in name, description, and YAML config. There is no way to generate a workflow from a natural-language description.

## Solution

Add a `GenerateWorkflowPopup` to `NewWorkflowPage` that opens automatically on mount (plain new workflow only). The user enters a natural-language description, optionally toggles `include_tools`, and confirms. The popup calls `POST v1/workflows/generate`, receives `{name, description, yaml_config}`, and pre-fills the `WorkflowForm` on the page. The user can then review and save as a new workflow.

## Acceptance Criteria

1. Popup opens automatically when navigating to `/workflows/new` (not on clone or from-template flows).
2. Popup contains:
   - Multi-line textarea for the workflow description (required, non-empty to enable confirm)
   - `include_tools` toggle switch (default: `false`)
   - "Generate" confirm button (disabled while loading or text is empty)
   - "Cancel" button that closes the popup without side effects
3. On confirm:
   - Shows loading spinner in place of form content
   - Calls `workflowsStore.generateWorkflow(text, includeTools)`
   - Store posts `POST v1/workflows/generate` with body `{text: string, include_tools: boolean}`
4. On success:
   - Popup closes
   - `NewWorkflowPage` form pre-fills with `{name, description, yaml_config}` from the response
   - User can review and save normally
5. On error:
   - Loading state clears
   - `toaster.error(...)` shown
   - Popup stays open so user can retry or cancel
6. State resets (textarea cleared, switch back to false) when popup closes

## Out of Scope

- Navigating to `EditWorkflowPage` (no `id` in generate response; pre-fill stays on `NewWorkflowPage`)
- Saving/persisting the generated workflow automatically
- Feature flag gating

## Components Affected

| File | Change |
|---|---|
| `src/types/entity/workflow.ts` | Add `GenerateWorkflowRequest` and `GenerateWorkflowResponse` interfaces |
| `src/store/workflows.ts` | Add `generateWorkflow(text, includeTools)` method |
| `src/pages/workflows/components/GenerateWorkflowPopup.tsx` | New component |
| `src/pages/workflows/NewWorkflowPage.tsx` | Add `showGeneratePopup` state + `template` update callback |

## Design Notes

- Use existing `Popup` wrapper (never PrimeReact `Dialog`)
- `dismissableMask={false}` — standard for form popups
- `isMagic` prop on `Popup` for AI-themed gradient styling
- Loading state pattern: `{isLoading ? <Spinner inline /> : <form content />}` — matches `WorkflowStartExecutionPopup`
- `showGeneratePopup` initial value: `!isCloning && !isFromTemplate`
- Popup receives `onGenerated(data: GenerateWorkflowResponse) => void` callback from page
