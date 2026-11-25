# Technical Research

**Task**: workflow save warnings owner-integration toast
**Generated**: 2026-11-17
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16485 (Bug): Workflow save: script-step owner-integration warning bypasses dedicated handler due to warning-kind mismatch.

Saving a global workflow containing a script step with an author-owned integration displays the raw backend warning instead of the dedicated, formatted 8-second warning. The frontend warning-kind name does not match the backend's `tool_access_owner_integration`, so the warning falls through to the generic toast handler. The warning remains visible, but loses its "Saved." prefix, short tool-name list, and 8-second duration. Severity minor.

Repro: workflow with tools [{id: script_tool, tool: execute_workspace_script, tool_access: [{name: generic_jira_tool, integration_alias: jira-2026-10-28_13-45}]}], state run_script uses script_tool. Publish to marketplace (global), open /workflows/<id>/edit, click Save. PUT /api/v1/workflows/<id>?error_format=json returns HTTP 200 with warnings[0].kind = "tool_access_owner_integration".

Expected: one formatted owner-integration warning toast for 8 seconds: "Saved. Script steps run these tools under the workflow author's integration for everyone who runs the workflow: generic_jira_tool."
Actual: raw backend message "Step 'run_script': tool 'generic_jira_tool' runs under the workflow author's integration (jira-2026-10-28_13-45) for everyone who runs this workflow." shown 3s with no "Saved." prefix, plus the separate success toast.

Acceptance criteria:
1. Backend warnings with kind tool_access_owner_integration are routed to the dedicated owner-integration warning handler.
2. The repro displays the exact expected formatted warning, incl. "Saved." and generic_jira_tool, not the raw step/alias message.
3. The warning uses 8,000 ms display duration rather than the generic 3,000 ms default.
4. The warning is not additionally displayed through the generic fallback.
5. Workflow saving continues to succeed.

Related implementation: EPMCDME-15568 Script Step Scope: Tools and Integrations. Affected: codemie-ui workflow editor save-response handling, script-step owner-integration warning dispatch/formatting/toast duration.

---

## 2. Codebase Findings

### Existing Implementations
Purpose: show the author a formatted, 8 s owner-integration warning after save.
- `src/utils/workflowWarnings.ts:23-29` `ScriptStepOwnerIntegrationWarning` typed `kind: 'script_step_owner_integration'` (fields step_id, tool_name, integration_alias, message).
- `:63-67` `formatWarning` branches on the literal `'script_step_owner_integration'`; returns raw `message` and highlight {stepId, toolName}.
- `:80` `OWNER_INTEGRATION_TOAST_MS = 8000`; `:88-98` `notifyScriptOwnerIntegration` builds "[Saved. ]Script steps run these tools under the workflow author's integration for everyone who runs the workflow: <up to 3 tool names joined '; '>[ and N more]." and passes `{duration: 8000}`.
- `:109-125` `notifyAboutWarnings(body, {prefixSaved})` partitions by kind: `consumer_slot`, `'script_step_owner_integration'` (literal at `:117` and `:119`), everything else -> `notifyUnknown` (`:100-103`, `toaster.warning(messages.join('; '))`, default duration, no prefix). This is the fall-through the ticket describes: `tool_access_owner_integration` matches neither literal.
- `:52-61` `normalizeWarnings` only infers kind for consumer-slot-shaped entries without `kind`.
- Consumers of `notifyAboutWarnings`: `src/pages/workflows/EditWorkflowPage.tsx:130` (prefixSaved: true, after `toaster.info('Workflow has been updated successfully!')` at `:125`), `NewWorkflowPage.tsx:280` (prefixSaved: true), `useWorkflowHistoryRestore.ts:90` (no prefix).
- Other occurrences of the old kind literal: none found in `src` beyond `workflowWarnings.ts` (grep of `script_step`, `owner_integration`, `tool_access_owner`). The comment at `:106-107` mentions the publish modal showing full messages; no publish-modal code referencing warnings was found.

### Decisions Already in the Code
- Dispatch by exact string `kind` match, unknown kinds degrade to a generic toast (`:100-103`); no recorded reason.
- One toast per kind; toast shows tool names only, not the raw message (`:106-107` comment).
- Advisory only; saving never blocked (`:105`).
- Toast duration passed via `toaster.warning(msg, { duration })`.

### Task Statements Checked Against the Code
- "Frontend kind name does not match backend `tool_access_owner_integration`": holds (`workflowWarnings.ts:24,64,117,119` use `script_step_owner_integration`).
- "Falls through to generic handler, loses Saved. prefix, 8 s": holds (`notifyUnknown`, `:100-103`).
- "Separate success toast": holds, `EditWorkflowPage.tsx:125` info toast; unrelated to warning handler.
- Backend response shape (field names tool_name/step_id/integration_alias on the new kind): unverified; backend is outside this repo. Only `kind` and `message` are evidenced by the ticket. The formatter reads `w.tool_name`; the expected text needs `generic_jira_tool` from that field.
- Saving continues to succeed: `notifyAboutWarnings` is called after the PUT resolves, outside any blocking path (`EditWorkflowPage.tsx:130`).

### Consumers of Changed Contracts
- The `kind` literal / `ScriptStepOwnerIntegrationWarning` / `WorkflowWarning` union: referenced only within `src/utils/workflowWarnings.ts`; exported types have no importers elsewhere (grep of `WorkflowWarning`, `formatWarning`, `normalizeWarnings`).
- `notifyAboutWarnings`: three call sites above; all share the same dispatch.

### Architecture and Layers Affected
Utility layer (`src/utils/workflowWarnings.ts`) called from page components (workflows pages). Toast via `src/utils/toaster`.

### Integration Points
Backend PUT/POST `/api/v1/workflows` response body `warnings[]`; `toaster`.

### Patterns and Conventions
Interface per kind + union; kind-filtered partitions in `notifyAboutWarnings`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (per AGENTS.md); not needed for this utility-level finding. No doc in `docs/` references these warnings.

### Architectural Decisions
None found.

### Derived Conventions
Per-kind notify function with the 8000 ms constant; unit tests mock `@/utils/toaster`.

---

## 4. Testing Landscape

### Existing Coverage
`src/utils/__tests__/workflowWarnings.test.ts`: consumer_slot toast text (incl. kind-less normalization) and empty/undefined warnings.

### Testing Framework and Patterns
Vitest; `vi.mock('@/utils/toaster', ...)` with `warning`/`error` mocks; assertions via `toHaveBeenCalledWith`.

### Coverage Gaps
No test for the owner-integration kind (either spelling), the 8000 ms duration, the 3-tool cap/"and N more", or the unknown-kind fallback. No page-level test covers the save flow dispatch.

---

## 5. Configuration and Environment

### Environment Variables
None found relevant.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
`visualEditorEnabled` in `EditWorkflowPage.tsx:116` selects `error_format=json` on save (the repro path); no flag gates warnings.

---

## 6. Risk Indicators

- Speculative: the kind literal is hard-coded in three places (`workflowWarnings.ts:24,64,117,119`); a rename would touch the type, `formatWarning` and both filters, and missing one reproduces the fall-through.
- Backend payload field names for the new kind are unverified; if `tool_name` is absent the toast would list `undefined`.
- Speculative: if the old kind `script_step_owner_integration` is still emitted by any backend version, dropping it would route that to the generic toast. Nothing in the repo shows which names the backend emits.
- No existing tests on the owner-integration path.
- Low overall: single file, three callers.

---

## 7. Summary for Complexity Assessment

The defect sits in one utility, `src/utils/workflowWarnings.ts`, where the owner-integration kind string differs from the backend's `tool_access_owner_integration`. The dedicated handler, the "Saved." prefix, the tool-name list, and the 8000 ms duration already exist. Unmatched kinds go to `notifyUnknown`. The kind literal appears in the interface, `formatWarning` and two filters. Three page callers use `notifyAboutWarnings`.

There is no novelty: one layer, one file, and an existing pattern. Test coverage in this area is thin. Only consumer_slot and the empty case are tested, so the target path and the 8 s duration are untested. The main risks are that the backend payload's field names are unverified and that the old kind name may still be emitted by some backend.

---

## 8. External References

None named by the task (EPMCDME-15568 is mentioned as related work but gives no path or URL).
