# Git Datasource Integration Not Pre-selected Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Git datasource creation starts with an empty integration field (placeholder "Integration for Git").

**Architecture:** Remove `INDEX_TYPES.GIT` from the single-setting auto-select list in `useEditPopup`. The placeholder and manual selection already exist in `IndexTypeGit.tsx` / `IntegrationSection`.

**Tech Stack:** React, react-hook-form, Vitest.

Commit per task using the repository's existing convention.

## Acceptance criteria

- Integration field is empty when the Git datasource creation flow starts, even with exactly one integration available.
- Placeholder "Integration for Git" is shown (already in `IndexTypeGit.tsx`, unchanged).
- Manually selecting an integration still works (`IntegrationSection` unchanged).
- Auto-select for Jira, Xray, Confluence, XWiki, SVN, Azure DevOps, SharePoint and Google is unchanged; clone, edit and GIT_FAQ are unchanged.

negative-constraints: do not change other types, clone/edit, or GIT_FAQ. Honored by Task 1, which only drops the GIT comparison.

### Task 1: Stop auto-selecting integration for Git

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceForm/hooks/useEditPopup.ts:132-143` (remove the `indexType === INDEX_TYPES.GIT ||` line from the condition)
- Test: `src/pages/dataSources/components/DataSourceForm/hooks/__tests__/useEditPopup.test.ts`

Test-first: yes — with `indexType` GIT, create mode and exactly one matching setting, `setValue` is not called with `'setting_id'`; it fails today because the hook calls `setValue('setting_id', 'only-id')`.

- [ ] **Step 1:** Next to the existing "still auto-selects on create" Jira case, add a case that reuses its harness with `INDEX_TYPES.GIT` and asserts `setValue` was not called with `'setting_id'` (use `not.toHaveBeenCalledWith('setting_id', expect.anything())`). Run the file with vitest and confirm it fails.
- [ ] **Step 2:** Make the one-line removal in `useEditPopup.ts`. Re-run the file and confirm the new case and the existing Jira case both pass.
