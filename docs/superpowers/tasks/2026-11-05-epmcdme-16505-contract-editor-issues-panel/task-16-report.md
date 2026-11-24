DONE
commit: 4cae9f54b
paths:
src/utils/workflowWarnings.ts
src/pages/workflows/EditWorkflowPage.tsx
src/pages/workflows/NewWorkflowPage.tsx
src/utils/__tests__/workflowWarnings.test.ts
src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx
src/pages/workflows/__tests__/NewWorkflowPage.test.tsx
test_command: npx vitest run --project unit src/utils/__tests__/workflowWarnings.test.ts src/pages/workflows/__tests__/NewWorkflowPage.test.tsx ; npx vitest run --project integration src/pages/workflows/__tests__/EditWorkflowPage
concerns:
- Ruling: the summary counts every contract_validation entry in warnings[] (WARNING and UNVERIFIED), per the dispatch guidance; the visual path still counts only WARNING.
- Ruling: YAML-only 2xx keeps the existing success toast and adds the summary toast; non-contract warnings still go through notifyAboutWarnings (new page now passes parsed.otherWarnings in both modes, so contract warnings no longer reach notifyUnknown).
- isVisualEditorEnabled always returns true in src, so the page tests mock @/utils/workflows to reach YAML-only.
- Fixed a leaked spy (updateWorkflow, unmount test) in EditWorkflowPage.integration.test.tsx that broke later tests; also hoisted renderBlankPage/mockCreate in NewWorkflowPage.test.tsx (sonarjs duplicate rule).
