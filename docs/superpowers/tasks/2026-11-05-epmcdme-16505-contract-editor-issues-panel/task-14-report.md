DONE
commit: 81c3cdf51
paths:
src/pages/workflows/NewWorkflowPage.tsx
src/pages/workflows/__tests__/NewWorkflowPage.test.tsx
src/constants/formIds.ts
test_command: npx vitest run --project unit src/pages/workflows/__tests__/NewWorkflowPage.test.tsx
Results: NewWorkflowPage unit 29/29 (8 new failed RED first for the expected reasons); unit src/pages/workflows 858 pass; integration src/pages/workflows 185 pass; typecheck clean.

Rulings:
- Page uses its own useUnsavedChanges registration (new FormIDs.WORKFLOW_CREATE_PAGE) for unblock/block, like the run popup does.
- Warned create (only when errorFormat is JSON, so never in YAML-only mode): notifyAboutWarnings(otherWarnings), unblockTransition, applyOutcome(parsed,'created',createdId), router.replace(EDIT_WORKFLOW), returns 'navigated'. No toast on the new page (edit page shows the single warnings toast). No popup for a warned Save and Run.
- Lock: isCreated state + createdRef (guards handleSave/handleSaveAndRun) + isSaving via onSavingChange; Save and Save and Run disabled while checking, saving or after create.
- Clean Save and Run returns 'stayed'; popup onHide runs unblock -> router.replace(edit) -> block via queueMicrotask unless onStart set runStartedRef (onStart follows onHide in the same tick). The popup already replaces /workflows/new itself on run start (router.name === NEW_WORKFLOW), so run start is left to it.
- SR-002: mountedRef; a create (success or failure) answering after unmount returns 'navigated' and does nothing (no toast, navigate, store write); the server-side create is silently accepted. Tested.
- Rejection: contract_validation 400 with issues -> applyOutcome(...,'rejected','new') + setIssues + open panel, stay; other 400s via processBackendError; zero-issue/no-general-error -> toast "Validation returned no issue details". 'new' key cleared on unmount.
- YAML-only mode: request/rejection (API.handleError) and notifyAboutWarnings(workflow) unchanged.

Concerns:
- On clone / from-template routes the run popup does not replace the route on run start (it only does so for NEW_WORKFLOW), so the page behaves as before there.
- WorkflowForm mock in NewWorkflowPage.test.tsx; no real-form integration test for the new page exists.
