# EPMCDME-8827 Workflow Version History Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development` inline (sdlc-standard Stage 5). Do **not** use subagent-per-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Workflow YAML version history match Assistant System Instructions history: YAML-header entry, selector + inline side-by-side diff, backend rollback, shared primitives, legacy tabs removed.

**Architecture:** Approach A — extract shared `VersionHistoryDiffView`, reuse `VersionedFieldHistoryTab` (WRITE-gated Restore), one page-owned `WorkflowVersionHistoryPopup` on `EditWorkflowPage`, shared YAML header actions beside Documentation. New types/store for versions list/detail/rollback against `docs/handoff-contract.md`. After rollback: refetch workflow, reinitialize editors, reset unsaved baseline.

**Tech Stack:** React, Valtio, Vitest, existing `Popup`/`ConfirmationModal`/`TextDiffView`/`Autocomplete`, `api` via stores only.

## Global Constraints

- Implementation branch: `EPMCDME-8827_workflow-version-history-fe` from latest `origin/main`; leave `EPMCDME-8827_workflow-versioning` tip alone.
- Consume `docs/handoff-contract.md` exactly (no PATCH/tags/descriptions; `limit` max `1000`; rollback `200` returns new current `WorkflowVersionDetail`).
- Preserve uncommitted `vite.config.ts` (never commit it).
- Commit messages: `EPMCDME-8827: Capital sentence` (no trailing period).
- Apache 2.0 license headers on new `.ts`/`.tsx`.
- Components call stores only — no direct `api` in UI.
- Do not use projected `workflow.yaml_config_history` for the new history UX.
- On `main` base, obsolete FE-1 table/tag/compare components do **not** exist — create the Assistant-style UI greenfield; skip “delete Row/Compare” unless those files appear.

---

## File map

| File | Responsibility |
|---|---|
| `src/types/entity/workflowVersion.ts` | `WorkflowVersionSummary` / `WorkflowVersionDetail` types (create) |
| `src/store/workflowVersions.ts` | list / detail / rollback / clear (create) |
| `src/store/__tests__/workflowVersions.test.ts` | store unit tests (create) |
| `src/components/form/VersionedField/VersionHistoryDiffView.tsx` | shared Current/Previous + `TextDiffView` (create; move logic from Assistant) |
| `src/components/form/VersionedField/VersionedFieldHistoryTab.tsx` | add optional `canRestore` (default `true` for Assistant) |
| `src/pages/assistants/.../SystemPromptVersionHistoryView.tsx` | thin re-export/wrapper of shared view |
| `src/components/form/VersionedField/__tests__/VersionHistoryDiffView.test.tsx` | shared diff tests |
| `src/hooks/useUnsavedChangesWarning.tsx` | expose `resetBaseline` / re-seed API |
| `src/pages/workflows/components/WorkflowYamlHeaderActions.tsx` | Documentation + Version History buttons (create) |
| `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx` | Assistant-style popup (create) |
| `src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.integration.test.tsx` | popup + rollback flows |
| `src/pages/workflows/EditWorkflowPage.tsx` | mount popup; rollback orchestration |
| `src/pages/workflows/components/WorkflowForm.tsx` | pass `onShowVersionHistory`; reinit after workflow prop change; clear dirty |
| `src/pages/workflows/editor/configPanels/YamlPanel.tsx` | remove history tab; header VH button |
| `src/pages/workflows/components/WorkflowConfigField.tsx` | remove VersionedField history tab; header VH button |
| `src/pages/workflows/editor/ConfigPanel.tsx` / `WorkflowFormFields.tsx` | drop `history` prop plumbing |

---

### Task 0: Feature branch from latest main

**Files:**
- Preserve: `vite.config.ts` (dirty), `docs/handoff-contract.md`, task dir under `docs/superpowers/tasks/...`

**Test-first: no** — branch bootstrap only.

- [ ] **Step 1: Stash/preserve local work**

```bash
# Keep vite.config.ts + docs outside the branch switch wipe
cp vite.config.ts /tmp/vite.config.ts.epmcdme-8827
# Ensure task dir + handoff are not lost (copy if needed)
```

- [ ] **Step 2: Fetch and create branch**

```bash
git fetch origin main
git checkout -B EPMCDME-8827_workflow-version-history-fe origin/main
# Restore vite.config.ts as unstaged local change
cp /tmp/vite.config.ts.epmcdme-8827 vite.config.ts
# Restore/copy handoff + task artifacts onto the new branch working tree if missing
```

- [ ] **Step 3: Verify**

```bash
git branch --show-current   # EPMCDME-8827_workflow-version-history-fe
git status --porcelain      # vite.config.ts modified; docs present; no accidental WIP from old tip
```

- [ ] **Step 4: Commit** — skip (no product code yet). Planning artifacts commit in Stage 8.

---

### Task 1: Workflow version types + store (list/detail/rollback)

**Files:**
- Create: `src/types/entity/workflowVersion.ts`
- Create: `src/store/workflowVersions.ts`
- Create: `src/store/__tests__/workflowVersions.test.ts`

**Interfaces:**
- Consumes: `api.get` / `api.post`, `PaginatedListResponse` pattern from existing stores
- Produces:
  - `WorkflowVersionSummary`: `{ version_id, version_number, is_current, created_at, created_by }`
  - `WorkflowVersionDetail`: summary + `yaml_config`
  - `workflowVersionsStore.fetchVersions(workflowId, { limit?: number; offset?: number })`
  - `workflowVersionsStore.fetchVersionDetail(workflowId, versionId)`
  - `workflowVersionsStore.rollbackVersion(workflowId, versionId): Promise<WorkflowVersionDetail>`
  - `workflowVersionsStore.clearVersions()`

**Test-first: yes** — failing store tests for GET list/detail and POST rollback before implementation.

- [ ] **Step 1: Write failing tests** (`src/store/__tests__/workflowVersions.test.ts`)

Cover: list maps `data` + pagination; detail returns `yaml_config`; rollback POSTs `v1/workflows/{id}/versions/{versionId}/rollback` and returns detail; errors surface; `clearVersions` resets state. Use existing `mockAPI` / store test patterns.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm run test:unit -- src/store/__tests__/workflowVersions.test.ts
```

Expected: module/store missing or assertions fail.

- [ ] **Step 3: Implement types + store**

- Types match handoff (no `version_tag` / `description` / patch types).
- `fetchVersions` default `limit=1000`, `offset=0`.
- Parse dates with existing offset-aware helpers where store exposes formatted fields (prefer leave formatting to UI).
- No PATCH / metadata actions.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm run test:unit -- src/store/__tests__/workflowVersions.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/types/entity/workflowVersion.ts src/store/workflowVersions.ts src/store/__tests__/workflowVersions.test.ts
git commit -m "$(cat <<'EOF'
EPMCDME-8827: Add workflow versions store and rollback API

EOF
)"
```

---

### Task 2: Shared VersionHistoryDiffView + WRITE gate on history tab

**Files:**
- Create: `src/components/form/VersionedField/VersionHistoryDiffView.tsx`
- Modify: `src/components/form/VersionedField/VersionedFieldHistoryTab.tsx`
- Modify: `src/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPromptVersionHistoryView.tsx`
- Create: `src/components/form/VersionedField/__tests__/VersionHistoryDiffView.test.tsx`
- Create/Modify: tests for `VersionedFieldHistoryTab` Restore visibility if missing

**Interfaces:**
- Consumes: `TextDiffView`
- Produces:
  - `VersionHistoryDiffView({ historyText, currentText, previousHistoryText?, title })` — same behavior/styling as today’s Assistant view
  - `VersionedFieldHistoryTab` gains optional `canRestore?: boolean` (default `true`); when `false`, hide Restore button (READ users)

**Test-first: yes** — failing tests for baseline tabs, disabled Previous, content mapping, and hidden Restore when `canRestore={false}`.

- [ ] **Step 1: Write failing shared-component tests**
- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test:unit -- src/components/form/VersionedField/__tests__/VersionHistoryDiffView.test.tsx
```

- [ ] **Step 3: Extract shared view; thin Assistant wrapper; add `canRestore`**
- [ ] **Step 4: Run shared + any Assistant-related unit tests — expect PASS**
- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
EPMCDME-8827: Extract shared version history diff view

EOF
)"
```

---

### Task 3: Dirty baseline reset + WorkflowForm reinit after server reload

**Files:**
- Modify: `src/hooks/useUnsavedChangesWarning.tsx`
- Modify: `src/pages/workflows/components/WorkflowForm.tsx` (and visual ConfigPanel path as needed)
- Test: hook unit test and/or form-focused test

**Interfaces:**
- Consumes: existing `useUnsavedChanges` / `blockTransition` / `unblockTransition`
- Produces: `resetBaseline(nextValues?: T)` (or equivalent) so after rollback the restored server workflow is the clean baseline; WorkflowForm adopts updated `workflow` prop / imperative reinit after `fetchWorkflow`

**Test-first: yes** — failing test that after `resetBaseline`, dirty flag is false for matching values; form accepts new yaml from parent after “rollback reload”.

- [ ] **Step 1: Write failing tests**
- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement resetBaseline + WorkflowForm reinit API used by EditWorkflowPage**
- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
EPMCDME-8827: Reset unsaved baseline after workflow reload

EOF
)"
```

---

### Task 4: WorkflowVersionHistoryPopup + EditWorkflowPage orchestration

**Files:**
- Create: `src/pages/workflows/components/WorkflowVersionHistoryPopup.tsx`
- Create: `src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.integration.test.tsx`
- Modify: `src/pages/workflows/EditWorkflowPage.tsx`

**Interfaces:**
- Consumes: `workflowVersionsStore`, `VersionedFieldHistoryTab`, `VersionHistoryDiffView`, `ConfirmationModal`, `canEdit(workflow)`, Task 3 reinit/reset APIs, `workflowsStore.fetchWorkflow`
- Produces: popup props e.g. `{ open, onClose, workflowId, canWrite, currentEditorYaml, onRollbackSuccess }`
  - On open: `fetchVersions(id, { limit: 1000 })`; exclude `is_current`; sort by `version_number` desc; select newest historical
  - Option label: `` `[${NN}] - ${formatDateTime(created_at,'short')} - ${createdBy}` ``; value = `version_id`
  - Lazy detail fetch + session cache; Current baseline = captured editor YAML; Previous = next older detail
  - Restore: confirm → `rollbackVersion` → close → refetch workflow → reinit editors → reset baseline → success toast
  - Failure: keep popup open; preserve editor; show error; allow retry
  - Close: clear selection/cache/loading/errors

**Test-first: yes** — integration tests for list/empty/retry/default selection/diff/READ vs WRITE/confirm/rollback success & failure (mock store/API).

- [ ] **Step 1: Write failing integration tests**
- [ ] **Step 2: Run — expect FAIL**

```bash
npm run test:unit -- src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.integration.test.tsx
# or test:integration if co-located project requires it
```

- [ ] **Step 3: Implement popup + page wiring (no page-header Version History button)**
- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
EPMCDME-8827: Add Assistant-style workflow version history popup

EOF
)"
```

---

### Task 5: YAML header entry points; remove legacy history tabs

**Files:**
- Create: `src/pages/workflows/components/WorkflowYamlHeaderActions.tsx` (or equivalent shared helper)
- Modify: `YamlPanel.tsx`, `WorkflowConfigField.tsx`, `ConfigPanel.tsx`, `WorkflowFormFields.tsx`, `WorkflowForm.tsx`
- Modify/extend: `YamlPanel.test.tsx`, WorkflowConfigField tests, entry-point coverage in popup/page tests

**Interfaces:**
- Consumes: `onShowVersionHistory?: () => void`, config Documentation helpers
- Produces: same header order — Documentation (conditional) then Version History (existing workflow edit only; hidden on create); accessible name unique per path; no `history` / `yaml_config_history` tab UI

**Test-first: yes** — failing tests: no Version History tab; VH button beside Documentation; docs-hidden still shows VH; create mode hides VH; callback opens popup path.

- [ ] **Step 1: Write failing entry-point tests**
- [ ] **Step 2: Run — expect FAIL**
- [ ] **Step 3: Implement shared header actions; strip tabs/props; plumb callback from EditWorkflowPage → Form → editors**
- [ ] **Step 4: Run YamlPanel + related tests — expect PASS**
- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
EPMCDME-8827: Move version history into YAML editor headers

EOF
)"
```

---

### Task 6: Regression sweep + polish

**Files:** any stragglers from Tasks 1–5; ensure no leftover `history` props; Assistant imports still work.

**Test-first: no** — verification sweep (run existing suites touched by extraction).

- [ ] **Step 1: Run targeted unit suites for touched areas**

```bash
npm run test:unit -- src/components/form/VersionedField src/store/__tests__/workflowVersions.test.ts src/pages/workflows/editor/configPanels/__tests__/YamlPanel.test.tsx src/pages/workflows/components/__tests__/WorkflowVersionHistoryPopup.integration.test.tsx
```

- [ ] **Step 2: Fix any regressions**
- [ ] **Step 3: `npm run lint` and `npm run typecheck` on changed scope if quick; full qa-gates in Stage 7**
- [ ] **Step 4: Commit only if fixes landed**

```bash
git commit -m "$(cat <<'EOF'
EPMCDME-8827: Fix version history regression sweep

EOF
)"
```

---

## Execution notes for Stage 5

- Follow TDD per task: RED → GREEN → refactor → commit.
- Ignore finishing-a-development-branch menu; after Task 6 continue to Stage 6 code review.
- Never stage `vite.config.ts`.
