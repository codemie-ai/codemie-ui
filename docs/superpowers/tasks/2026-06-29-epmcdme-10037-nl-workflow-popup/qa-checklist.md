# QA Checklist — EPMCDME-10037 NL Workflow Generation Popup

**Run dir**: `docs/superpowers/tasks/2026-06-29-epmcdme-10037-nl-workflow-popup`
**Generated**: 2026-06-29
**Merge base**: `origin/main`

---

## Automated — this run

### S1 — Popup renders when visible, hidden when not
- **Surface**: `GenerateWorkflowPopup` component
- **Blocking**: yes
- **Risk**: low
- **Suggested test-first description**: `it('renders popup content when visible=true and renders nothing when visible=false', ...)`

### S2 — Generate button disabled when text is empty, enabled when non-empty
- **Surface**: `GenerateWorkflowPopup` — submit button state
- **Blocking**: yes
- **Risk**: low
- **Suggested test-first description**: `it('disables Generate button when text is empty and enables it when text has non-whitespace content', ...)`

### S3 — generateWorkflow store method called with correct args on submit
- **Surface**: `GenerateWorkflowPopup` → `workflowsStore.generateWorkflow`
- **Blocking**: yes
- **Risk**: medium — covers the 0% `src/store/workflows.ts` gap for the new method
- **Suggested test-first description**: `it('calls workflowsStore.generateWorkflow(text, includeTools) with the textarea value and switch state when Generate is clicked', ...)`

### S4 — onGenerated and onHide called on successful API response
- **Surface**: `GenerateWorkflowPopup` success path
- **Blocking**: yes
- **Risk**: medium
- **Suggested test-first description**: `it('calls onGenerated with the API response data and calls onHide after a successful generateWorkflow call', ...)`

### S5 — toaster.error shown and popup stays open on API failure
- **Surface**: `GenerateWorkflowPopup` error path
- **Blocking**: yes
- **Risk**: medium
- **Suggested test-first description**: `it('shows toaster.error and does not call onHide when generateWorkflow rejects', ...)`

### S6 — State resets on close
- **Surface**: `GenerateWorkflowPopup` — textarea and switch reset
- **Blocking**: yes
- **Risk**: low
- **Suggested test-first description**: `it('resets text to empty string and includeTools to false when onHide is called', ...)`

### S7 — generateWorkflow store method calls correct endpoint with correct body
- **Surface**: `workflowsStore.generateWorkflow` — 0% coverage gap (Risky Untested Area)
- **Blocking**: yes
- **Risk**: high — `src/store/workflows.ts` has 0% coverage; this is the sole new method on a high-risk untested store
- **Suggested test-first description**: `it('posts to v1/workflows/generate with body { text, include_tools } and returns the parsed JSON response', ...)`

---

## Automated — harness backlog

### H1 — Generate workflow via NL description (workflow domain)
- **Domain**: `src/pages/workflows/` → external harness `tests/workflows/`
- **Existing coverage**: gap — no existing harness test found for `generate` endpoint
- **Where to add**: `../codemie-sdk/test-harness/codemie_test_harness/tests/workflows/` — new test file `test_workflow_generate.py`
- **Scenario**: E2E: navigate to `/workflows/new`, enter NL text, click Generate, assert form pre-fills with name/description/yaml_config from the API

---
