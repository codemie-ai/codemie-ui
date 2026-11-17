# Technical Research (sliced from parent: component `codemie-ui`)

**Task**: UI: show, pre-select and deselect datasource default tools in the assistant form
**Generated**: 2026-10-16
**Research path**: codegraph (sliced from ../../technical-analysis.md; no re-analysis)

---

## Codebase Findings

- UI surfaces named in the parent analysis: AssistantForm, the Toolkits panel (`Toolkit.tsx`), ContextSelector (datasource attach), and VirtualAssistantForm (assistants defined inside workflows).
- The tools list comes from the backend tool listing via `assistantsStore.availableToolkits`. The backend currently omits the standard "Get Repo Tree" and "Search Code" and the whole Knowledge Base group from the UI listing, so the form cannot show them until the backend story lands.
- Selection model in the form: a tool is selected when its name is in the assistant's selected tools. Default datasource tools will be shown as selected unless the assistant's deselected-default-tools list contains them; the form must read and write that list.
- Datasource surface is gated by feature flags `FEATURE_FLAGS.KNOWLEDGE_BASES`, `DATASOURCES` and `CODE_INDEXING`; `TOOL_PERMISSIONS` also applies.
- Existing mutual-exclusion and auto-select behaviour for tools: none found; the form never auto-selects tools on datasource attach today.

## Testing Landscape

Only `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx` was found. No tests were found near `Toolkit.tsx` or `MCPToolsSelectionStep.tsx`. Runner and versions not confirmed.

## Dependencies

Depends on the backend story for the listing contents, the stored field and the server-side validation errors the form must display.

## Risk Indicators

- New auto-select and exclusivity behaviour in a component with no automated coverage.
- "Previously deselected is not re-selected" requires the form to distinguish first attach from later attaches, including the case where all datasources of a type are removed and re-added (undecided).
- Two forms (assistant and virtual assistant) must stay consistent.
- Showing legacy assistants correctly depends on the absence of the new list meaning "all selected".

## Summary for Complexity Assessment

Single-repo UI slice: add default tools to two tool groups, derive checked state from the deselected list, auto-select on datasource attach, enforce variant exclusivity, persist through two forms, show backend validation errors. Modest logic, but no existing test coverage in the touched component.
