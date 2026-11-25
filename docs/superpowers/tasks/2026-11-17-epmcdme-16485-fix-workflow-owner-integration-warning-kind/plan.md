# Owner-integration warning kind fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Route backend warnings of kind `tool_access_owner_integration` to the dedicated 8000 ms owner-integration toast, listing each tool once.

**Architecture:** One constant in `src/utils/workflowWarnings.ts` replaces the four `script_step_owner_integration` literals (type, `formatWarning`, two filters). The old kind is dropped: the backend never emits it (a grep of `codemie/src` finds only `tool_access_owner_integration`). The backend (`codemie/src/codemie/workflows/validation/tool_access.py:149-185`) emits one warning per tool, tool_access entry and step, with `kind`, `step_id`, `tool_name`, `integration_alias` and `message` verified. The toast therefore dedupes tool names.

**Tech Stack:** TypeScript, Vitest (`vi.mock('@/utils/toaster')`).

**Spec:** Inline requirements (EPMCDME-16485); research in `technical-analysis.md` beside this file.

Commit per task using the repository's existing convention (ticket key EPMCDME-16485).

## Acceptance criteria

- [ ] `tool_access_owner_integration` warnings go to the owner-integration handler.
- [ ] Repro text is "Saved. Script steps run these tools under the workflow author's integration for everyone who runs the workflow: generic_jira_tool."
- [ ] Toast duration is 8000 ms.
- [ ] No extra generic-fallback toast for these warnings.
- [ ] Saving still succeeds (warnings stay advisory; call sites untouched).

## Global Constraints

- Negative constraints: do not keep `script_step_owner_integration`; do not add a second toast path; do not block saving.
- Tests go in `src/utils/__tests__/workflowWarnings.test.ts`, extending its existing toaster mock.

## Review Focus

- One tool used by several steps or aliases: the name is listed once and the "and N more" count is not inflated.

---

### Task 1: Route the new kind to the owner-integration handler and dedupe tool names

**Files:**
- Modify: `src/utils/workflowWarnings.ts:23-29,63-67,88-98,116-120`
- Test: `src/utils/__tests__/workflowWarnings.test.ts`

**Interfaces:**
- Produces: `export const OWNER_INTEGRATION_KIND = 'tool_access_owner_integration' as const`; `ScriptStepOwnerIntegrationWarning.kind` typed as `typeof OWNER_INTEGRATION_KIND`.

Test-first: yes — `notifyAboutWarnings({warnings:[{kind:'tool_access_owner_integration', tool_name:'generic_jira_tool', step_id:'run_script', message:'raw'}]}, {prefixSaved:true})` currently calls `toaster.warning('raw')` with no options, so the expected formatted call fails.

- [ ] **Step 1:** Add tests, then run `npx vitest run src/utils/__tests__/workflowWarnings.test.ts` and confirm the new ones fail:
  - (a) the call above expects exactly one `toaster.warning` with `"Saved. Script steps run these tools under the workflow author's integration for everyone who runs the workflow: generic_jira_tool."` and `{ duration: 8000 }`, never `'raw'`.
  - (b) without `prefixSaved` the text has no "Saved. " prefix.
  - (c) two warnings with the same `tool_name` and different `step_id` give a single `toaster.warning` call that lists the name once, with `{ duration: 8000 }`.
  - (d) four warnings over two unique tools list both names and have no "and N more" suffix.
  - (e) four unique tools give `a; b; c and 1 more`.
  - (f) a consumer_slot warning plus an owner-integration warning yield two toasts.
- [ ] **Step 2:** Declare and export `OWNER_INTEGRATION_KIND` above the interfaces. Use it in the interface `kind`, in the `formatWarning` branch, and in the `script` and `unknown` filters. In `notifyScriptOwnerIntegration`, build `names` as `[...new Set(tool_names.filter(Boolean))]` before slicing to `MAX_LISTED_TOOLS`. Rerun the test file; all pass.
