```json
[
  {"kind": "spec", "item": "WorkflowFormValues / baseWorkflowSchema: add categories?: string[] with .default([])", "status": "pass", "notes": "workflowSchema.ts adds Yup array field (.max(3), .optional(), .default([])) and WorkflowFormValues interface; workflowSchema.test.ts covers defaults and max-3 enforcement"},
  {"kind": "spec", "item": "Workflow type: add explicit categories?: string[]", "status": "pass", "notes": "src/types/entity/workflow.ts line 394 adds categories?: string[]"},
  {"kind": "spec", "item": "WorkflowFormFields.tsx: Controller-wrapped MarketplaceCategories after icon_url", "status": "pass", "notes": "WorkflowFormFields.tsx lines 293-301 confirm categories field immediately follows icon_url block; defaultValues includes categories: workflow?.categories ?? []"},
  {"kind": "spec", "item": "WorkflowForm.tsx: categories in initial state and getFormValues snapshot", "status": "pass", "notes": "diff adds categories: workflow?.categories ?? [] to reset, categories: formValues?.categories ?? [] to getFormValues, and categories: [] to new-workflow branch"},
  {"kind": "spec", "item": "GeneralConfigTab: render MarketplaceCategories after icon_url", "status": "pass", "notes": "GeneralConfigTab.tsx lines 221-229 confirm placement; defaultValues includes categories: defaultValues.categories ?? []; ConfigPanel.getWorkflowFields() reads via generalConfigTabRef.current?.getValues()"},
  {"kind": "spec", "item": "WorkflowsFilters.tsx: remove my/all guard for categories filter", "status": "pass", "notes": "Guard changed to scope === WORKFLOW_LIST_SCOPE.FAVORITES only; categories visible for my and all scopes; WorkflowsFilters.test.tsx asserts both scopes"},
  {"kind": "spec", "item": "WorkflowsFilters.tsx: call getAssistantCategories() for my and all scopes", "status": "pass", "notes": "Added if-block calls assistantsStore.getAssistantCategories() for MY and ALL scopes; tests assert both calls"},
  {"kind": "story-ac", "item": "AC1: Categories multi-select field in create/edit form, immediately below Icon URL", "status": "pass", "notes": "Confirmed in both WorkflowFormFields.tsx (line 293) and GeneralConfigTab.tsx (line 221) — categories div follows icon_url div directly"},
  {"kind": "story-ac", "item": "AC2: Field is optional, enforces max 3 categories", "status": "pass", "notes": "Yup schema .optional().default([]) permits zero; .max(3) rejects 4+; workflowSchema.test.ts verifies both bounds"},
  {"kind": "story-ac", "item": "AC3: On edit, field pre-populated with saved categories", "status": "pass", "notes": "All three entry points (WorkflowFormFields, WorkflowForm, GeneralConfigTab) initialise with workflow?.categories ?? []"},
  {"kind": "story-ac", "item": "AC4: Submit includes categories in payload (empty array when none selected)", "status": "pass", "notes": "WorkflowForm getFormValues returns categories: formValues?.categories ?? []; new-workflow branch sets categories: []; store passes payload verbatim"},
  {"kind": "story-ac", "item": "AC5: My Workflows sidebar shows Categories filter with same options as Marketplace", "status": "pass", "notes": "Filter guard narrowed to favorites-only; getAssistantCategories() called for MY scope to populate options"},
  {"kind": "story-ac", "item": "AC6: All Workflows sidebar shows same Categories filter", "status": "pass", "notes": "Same guard change and getAssistantCategories() call covers ALL scope; test asserts both"},
  {"kind": "story-ac", "item": "AC7: Selecting category values narrows workflow list to matching workflows", "status": "pending-stage-7", "notes": "Frontend wiring confirmed: workflowsFilters.categories (from INITIAL_WORKFLOWS_FILTERS) is serialised into indexWorkflows API call; actual list narrowing requires runtime/E2E verification"},
  {"kind": "story-ac", "item": "AC8: Clearing filter restores unfiltered list", "status": "pending-stage-7", "notes": "Relies on same serialisation path as AC7 and existing clearWorkflowsFilters(); runtime verification needed"},
  {"kind": "story-ac", "item": "AC9: Visual editor Config Panel persists categories on save identically to text-editor path", "status": "pass", "notes": "GeneralConfigTab renders field and initialises from defaultValues.categories; ConfigPanel.getWorkflowFields() reads via generalConfigTabRef.current.getValues() which now includes categories; GeneralConfigTab.test.tsx asserts getValues returns categories"}
]
```

```markdown
```
