DONE
commit: 0773b6ac1
paths:
src/pages/workflows/EditWorkflowPage.tsx
src/pages/workflows/EditWorkflowHeaderActions.tsx
src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx
test_command: npx vitest run --project integration src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx
Results: integration EditWorkflowPage 22/22 (10 new failed RED first); integration src/pages/workflows 185 pass; unit src/pages/workflows 848 pass; typecheck clean.

Rulings:
- Warnings toast uses toaster.info: "Workflow saved with N warning(s)" (N = WARNING count; singular for 1).
- Edit page now gets Save/Save and Run disabled while a save is in flight (onSavingChange -> isSaving), per spec "locked from click".
- Header "saved" state = page flag savedWithWarnings && !dirty (onDirtyChange). Flag is set by a warned save or a consumed saved/created hand-off, reset on id change. Header: Done, disabled "✓ Saved", Run anyway (opens popup without saving).
- Late response (SR-002): activeIdRef (set on mount/id effect, nulled on cleanup); a response/failure that arrives when it is not the active id returns 'navigated' and does nothing (no toast, no navigate, no store write). A create-success after unmount is therefore silently accepted (no UI).
- Clean/UNVERIFIED-only Save and Run now returns 'stayed' (saved; popup open) so the form rebaselines and re-blocks.
- Warned save refreshes only yaml_config_history of workflowsStore.currentWorkflow via getWorkflow(id, true) (no loading flag, no remount).
- Contract-type 400 (error_type contract_validation) with issues -> applyOutcome(..., 'rejected', id) + setIssues + open panel; other 400s keep applyWorkflowBackendValidationError. YAML-only mode (errorFormat undefined) unchanged (API.handleError); but its 2xx body is still parsed, so a 2xx with contract warnings there also takes the warned path (Task 16 owns the YAML-only summary toast).
- Mount: matching key -> setIssues(outcome.issues), open panel after form mounts (pendingOpenPanelRef + effect), and for context created/saved set saved header + one toast; non-matching key -> slot set to null; load error clears own key.
- Other (non-contract) warnings: notifyAboutWarnings({warnings: parsed.otherWarnings}) in both clean and warned paths.

Concerns:
- Tests for the dirty toggle use an AI refine with a semantic YAML change (compareWorkflowData ignores comments).
- In YAML-only mode (visual editor off) a warned 2xx now stays on the page, which Task 16 is expected to adjust.
