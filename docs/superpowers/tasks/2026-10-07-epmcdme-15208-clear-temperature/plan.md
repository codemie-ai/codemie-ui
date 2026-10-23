# Plan: EPMCDME-15208 frontend - send null for cleared temperature/top_p

## Acceptance criteria
- Clearing Temperature / Top P in the assistant form and saving sends explicit `null` in PUT /v1/assistants/{id}.
- Set/updated values still sent as numbers; top_p 0 preserved.
- Reopen refetches from server (edit page and chat config both refetch) - no stale form state.

## Research summary
- Root cause: AssistantForm.prepareFormData `delete`d temperature/top_p when empty, and transformAssistantToCreateDTO used `top_p || undefined`, so keys never reached the PUT body.

## Task 1
Test-first: yes - failing unit test for transformAssistantToCreateDTO (null/0 preserved) and Edit page integration test (PUT body has temperature:null, top_p:null).
Change AssistantForm.tsx (toNumberOrNull, nullable schema), store/utils/assistants.ts, types.
