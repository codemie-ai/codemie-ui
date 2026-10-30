# Technical Research

**Task**: workflow yaml expand editor configuration dialog
**Generated**: 2026-10-14
**Research path**: codegraph

---

## 1. Original Context

Workflow editor: align expanded YAML configuration UI with workflow execution view

Summary
The expanded YAML configuration experience is inconsistent between the workflow editor and the workflow execution details view.

Description
In workflow execution details, expanding the YAML configuration opens a consistent read-only configuration view with a header and available Copy and Download actions. In the workflow editor, expanding the YAML configuration opens a differently styled popup and layout.

The workflow editor's expanded YAML configuration should reuse the same component and visual styling as the expanded YAML configuration in workflow execution details, while preserving editing capabilities and the existing Save/Cancel behavior.

This is a follow-up to EPMCDME-10659.

Preconditions
The user is authenticated and has access to the Workflows UI.
A workflow with YAML configuration is available.
The user can access both the workflow editor and workflow execution details.

Steps to Reproduce
1. Open an existing workflow in the workflow editor.
2. Open the YAML configuration and select the Expand action.
3. Observe the layout, header, editor container, and available controls in the expanded editor view.
4. Open the workflow execution details for a workflow.
5. Open Configuration and select the Expand action.
6. Compare the expanded YAML configuration view with the expanded editor view.

Expected Result
- The workflow editor's expanded YAML configuration uses the same shared component and visual styling as the expanded YAML configuration in workflow execution details.
- Header layout, editor container, spacing, sizing, and expand/collapse behavior are visually consistent.
- The edit-mode view retains editing functionality and the existing Save/Cancel behavior.
- The execution-details view remains read-only and continues to provide Copy and Download actions.

Actual Result
The expanded YAML configuration popup in the workflow editor uses a different layout and styling from the expanded YAML configuration view in workflow execution details.

Affected Areas
Workflows UI; Workflow editor YAML configuration; Workflow execution details configuration; Expanded YAML configuration component/dialog; Frontend shared component reuse and styling.

Acceptance Criteria
- The workflow editor and workflow execution details use the same shared component, or an equivalent shared presentation layer, for expanded YAML configuration.
- The expanded YAML configuration has a consistent header, layout, editor area, dimensions, spacing, and expand/collapse control placement in both contexts.
- The workflow editor's expanded configuration remains editable.
- Changes made in the expanded editor remain synchronized with the workflow editor and follow the existing Save/Cancel flow.
- The workflow execution details configuration remains read-only.
- The execution-details expanded view continues to offer Copy and Download actions.
- The change does not regress YAML display, syntax highlighting, scrolling, expand/collapse behavior, Copy, Download, or workflow saving.
- The UI is verified in supported light and dark themes.

---

## 2. Codebase Findings

### Existing Implementations

**Execution details (read-only, Copy/Download)**
- `src/pages/workflows/details/configuration/WorkflowExecutionConfiguration.tsx` — aside; renders `WorkflowExecutionConfigYaml` only when `execution` is set.
- `src/pages/workflows/details/configuration/WorkflowExecutionConfigYaml.tsx` — "Yaml configuration" heading, Edit button (if `canEdit`, navigates to edit route), and `<CodeBlock expandable expandTitle="Configuration" language="yaml" text={workflow.yaml_config ?? ''} />`.
- `src/components/CodeBlock/CodeBlock.tsx` — shared read-only block: header bar (title, Expand, Preview for HTML, Copy, Download) and `<pre><code>` body; `Prism.highlightAll()` on text change; renders `CodeBlockExpandPopup` when `expandable`.
- `src/components/CodeBlock/CodeBlockExpandPopup.tsx` — `Popup` with `hideFooter`, `isFullWidth`, `header={expandTitle}`, `className="h-full"`, `bodyClassName="!pt-2"`; body is `<CodeBlock isInExpandPopup />`, so the expanded view has its own header bar with Copy and Download.
- `src/components/CodeBlock/fileExtensions.ts` — `downloadCodeAsFile` used by Download.

**Workflow editor (editable)**
- `src/pages/workflows/editor/configPanels/YamlPanel.tsx` — owns `value`, `validationError`, `isExpanded`. Inline: heading "YAML Configuration", `WorkflowYamlHeaderActions` (`onExpand={() => setIsExpanded(true)}`), fixed `h-[500px]` container with `<AceEditor name="yaml_config" />`. Save/Cancel live in `TabFooter` (`handleSave`, `handleCancel`), not in the modal. Exposes `YamlPanelRef` (`isDirty`, `reset`, `save`, `jumpToLine`).
- `src/pages/workflows/editor/configPanels/components/YamlExpandedModal.tsx` — props `visible, value, validationError, onChange, onCollapse`. `Popup` with `hideFooter`, `hideClose`, `isFullWidth`, `onHide={onCollapse}`, `className="h-[90vh] pb-6"`, custom `headerContent` (label "YAML Configuration" and a secondary `Button` "Collapse"). Body: optional `YAML Error:` line, `h-[calc(90vh-8rem)]` container, `<AceEditor name="yaml_config_expanded" />`. Receives the same `value` and `handleYamlChange` as the inline editor.
- `src/pages/workflows/editor/ConfigPanel.tsx` — renders `YamlPanel` (`renderYamlTab` at line 472).
- `src/components/AceEditor/AceEditor.tsx` — editable editor; uses `useTheme` and `cn`.

**Shared primitives**
- `src/components/Popup/Popup.tsx` — both expanded views are `Popup`.
- `src/components/Button`, `@/constants` (`ButtonType`, `ButtonSize`), `src/utils/utils.ts` (`cn`, `copyToClipboard`).

### Architecture and Layers Affected
- **Workflow details pages**: `src/pages/workflows/details/configuration/` (`WorkflowExecutionConfiguration`, `WorkflowExecutionConfigYaml`).
- **Workflow editor pages**: `src/pages/workflows/editor/configPanels/` (`YamlPanel`, `components/YamlExpandedModal`) and `src/pages/workflows/editor/ConfigPanel.tsx`.
- **Shared components**: `src/components/CodeBlock/`, `src/components/Popup/`, `src/components/AceEditor/`, `src/components/Button/`.
- **Workflow header actions**: `src/pages/workflows/components/WorkflowYamlHeaderActions` (hosts the Expand trigger and Version History in the editor).

### Integration Points
- `YamlPanel` → `YamlExpandedModal` (shared `value` and `handleYamlChange`; collapse sets `isExpanded` false).
- `ConfigPanel` remounts `YamlPanel` on a committed YAML change, which also closes the modal (comment at `YamlPanel.tsx` line 53).
- `YamlPanel` → `useWorkflowContext().activeIssue` (jump-to-line via `configLine`); → `appInfoStore` configs (`workflowYamlDocumentation`).
- `WorkflowExecutionConfigYaml` → `useVueRouter` (Edit navigation) and `canEdit` from `@/utils/entity`.

### Patterns and Conventions
- Modals use `Popup` from `@/components/Popup`, not PrimeReact `Dialog` (`.ai-run/guides/patterns/modal-patterns.md`).
- Custom modal headers go through the `headerContent` prop (same guide).
- Editor components stay thin; logic lives in `src/utils/workflowEditor/` (`.ai-run/guides/development/workflow-editor-patterns.md`).
- `.ai-run/guides/components/reusable-components.md` lists `Popup` and `ConfirmationModal`; it does not list `CodeBlock` or a YAML viewer.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/patterns/modal-patterns.md` — Popup rules, `headerContent` / `footerContent`, ESC handled by Popup.
- `.ai-run/guides/development/workflow-editor-patterns.md` — editor component vs utils split.
- `.ai-run/guides/components/reusable-components.md` — catalogue of shared components.
- No guide names the YAML expand component or defines a shared YAML viewer/editor shell.

### Architectural Decisions
- No ADR or recorded decision found for the expanded YAML view. The `YamlPanel` comment at line 53 documents only the remount-closes-modal behaviour.

### Derived Conventions
- Both expanded views are `Popup` with `isFullWidth`, a 90vh or full-height container, and a header row with a label plus a control (Collapse, or Copy/Download inside the body).
- Edit surfaces use `AceEditor` with a unique `name` per instance; read surfaces use `CodeBlock` with Prism.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/workflows/details/configuration/__tests__/WorkflowExecutionConfigYaml.test.tsx` — 3 tests on the execution-details expand: dialog titled "Configuration" showing the same YAML in `<code>`; no textbox or editable element; Copy and Download buttons present.
- `src/pages/workflows/editor/configPanels/components/__tests__/YamlExpandedModal.test.tsx` — exists per codegraph; content not reviewed in this run.
- `src/pages/workflows/editor/configPanels/__tests__/YamlPanel.test.tsx` — `renderExpandablePanel` helper (line 179) and an `expand` test (line 191); content not reviewed in this run.
- `src/components/CodeBlock/` — no dedicated test file identified.

### Testing Framework and Patterns
- Vitest with React Testing Library (`render`, `screen`, `within`, `fireEvent`); `vi.mock` for `*.svg?react` icons and `useVueRouter`.
- Expand is queried via `getByRole('button', { name: 'Expand' })`; dialog via `getByRole('dialog')`.

### Coverage Gaps
- No test compares the editor expanded view with the execution view (header, dimensions, Collapse/close placement).
- No test asserts the editor expanded view has no Copy/Download, or that it stays editable after a shared-shell change.
- No test covers light or dark theme rendering of either expanded view.

---

## 5. Configuration and Environment

### Environment Variables
- None identified in the expand path. Editor reads run-time config `appInfoStore.configs`.

### Configuration Files
- None specific to the expand path identified.

### Feature Flags and Deployment Concerns
- `workflowYamlDocumentation` config item gates the documentation link in `YamlPanel` (`isConfigItemEnabled`).
- No deployment manifests or secrets relevant to this change were identified.

---

## 6. Risk Indicators

Current-state differences (fact):
- **Header**: execution view = `Popup header="Configuration"` plus the `CodeBlock` header bar (Copy, Download). Editor view = `headerContent` "YAML Configuration" with a Collapse button; no Copy or Download.
- **Close**: editor modal sets `hideClose` and wires `onHide` to Collapse (ESC handled by `Popup`, no close X). Execution popup shows the default close X.
- **Dimensions**: execution `className="h-full"`, `bodyClassName="!pt-2"`; editor `className="h-[90vh] pb-6"`, inner `h-[calc(90vh-8rem)]`; inline editor fixed `h-[500px]`.
- **Two Ace instances** (`yaml_config`, `yaml_config_expanded`) share one `value` state in `YamlPanel`.
- **Duplicated header markup**: `YamlExpandedModal` and `SystemPromptExpandedModal` (`src/pages/assistants/components/AssistantForm/components/SystemPrompt/`) use the same label classes and Collapse/Copy button pattern.
- **Read vs edit primitives**: `CodeBlock` (read-only Prism) and `AceEditor` (editable) are separate; no shared component wraps both.

Speculative: a shared expanded-YAML shell (header, sizing, Collapse placement) above both bodies would fit the acceptance criteria. Reusing `CodeBlockExpandPopup` as-is cannot serve as the editor body because it removes editing.
Speculative: Copy and Download in the editor would need to act on unsaved `value`, not `workflow.yaml_config`; which text they use is a spec decision.
Speculative: any shared shell must keep `handleYamlChange` and `validationError` wiring so sync with Save/Cancel is preserved.

Other:
- `YamlPanel` remounts on a committed YAML change, closing the modal; layout must not assume it stays open across saves.
- Theme rendering: `AceEditor` uses `useTheme`; `CodeBlock` depends on Prism CSS in `CodeBlock.scss`. Neither is covered by tests.
- Escape/close behaviour differs between the two popups; acceptance criteria require consistency.
- The modal and `YamlPanel` test contents were not reviewed; their current assertions on the editor header are unknown.

---

## 7. Summary for Complexity Assessment

The change spans two page areas (`workflows/details/configuration/`, `workflows/editor/configPanels/`) and two shared components (`CodeBlock`, `Popup`), with `AceEditor` on the edit side. Both expanded views already use `Popup`, so the gap is presentational: header markup, close behaviour, sizing, and Copy/Download presence. No shared component wraps both the read-only `CodeBlock` body and the editable `AceEditor` body; choosing and building that shell is a spec decision.

Novelty is low to moderate. The patterns (Popup with `headerContent`, `CodeBlock` expand, `AceEditor` with shared `value`) are established in the repo, and similar header duplication exists in `SystemPromptExpandedModal`. The non-trivial part is keeping editing, inline sync, and Save/Cancel working while the execution view stays read-only.

Test posture: the execution expand has three direct tests; editor expand tests exist but were not reviewed; nothing compares the two views or covers light and dark themes. Key risks: divergent close and sizing, two Ace instances on shared state, remount-on-save, and unverified theme rendering.

---

## 8. External References

None named by the task.
