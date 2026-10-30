# EPMCDME-15809 Expanded YAML Configuration Alignment Implementation Plan

> **For agentic workers:** Implement task-by-task using checkbox (`- [ ]`) tracking. Commit per task using the repository's existing convention.

**Goal:** Editor and execution-details expanded YAML configuration share one presentation shell (header, sizing, Collapse placement); the editor body stays editable, the execution body stays read-only with Copy and Download.

**Architecture:** One presentational shell `ExpandedYamlShell` wraps the `Popup` (label, Collapse button, `hideClose`, sizing) and takes children. The editor passes an `AceEditor` body; the execution view passes the existing `CodeBlock` body. No save, sync, or `YamlPanel` logic changes.

**Tech Stack:** React 18, TypeScript, `Popup`, `Button`, `AceEditor`, `CodeBlock`, Vitest + React Testing Library.

**Spec:** none (requirements inline; see Acceptance criteria below).

## Acceptance criteria

- Editor and execution details render expanded YAML through the same shared shell (same header label, Collapse placement, sizing).
- Expanded editor remains editable; edits sync to the inline editor via the shared `value` and follow Save/Cancel.
- Expanded editor shows no Copy or Download actions.
- Execution-details expanded view stays read-only and keeps Copy and Download.
- YAML display, syntax highlighting, scrolling, expand/collapse, Copy, Download and workflow saving do not regress.

## Global Constraints

- Shell lives in `src/components/ExpandedYaml/`; no new dependencies.
- Label is "YAML Configuration" in both contexts.
- Do not edit `YamlPanel.tsx`, `ConfigPanel.tsx`, `TabFooter` or any save/sync handler.

## Review Focus

- YAML validation error while expanded: the `YAML Error:` line and red border still render in the editor body (Task 2).
- Empty `yaml_config` in execution view: the shell renders with an empty body and no crash (Task 3).
- Long YAML: the body scrolls inside the fixed-height container, not the page (Task 3, manual check is out of plan scope).
- ESC in the expanded editor calls the collapse handler, not a silent close that drops the modal state (Task 1).
- Expanded editor typing reaches `onChange` so inline sync keeps working (Task 2).

---

### Task 1: Shared expanded-YAML shell

**Files:**
- Create: `src/components/ExpandedYaml/ExpandedYamlShell.tsx`
- Create: `src/components/ExpandedYaml/__tests__/ExpandedYamlShell.test.tsx`

**Interfaces:**
- Consumes: `Popup` (`src/components/Popup`), `Button` (`src/components/Button`), `ButtonType` (`@/constants`), `CollapseSvg` (`@/assets/icons/collapse.svg?react`).
- Produces: `ExpandedYamlShell` default export, props `{ visible: boolean; onCollapse: () => void; children: ReactNode }`. Used by Task 2 and Task 3.

Layout to copy from `src/pages/workflows/editor/configPanels/components/YamlExpandedModal.tsx:39-56`: `hideFooter`, `hideClose`, `isFullWidth`, `onHide={onCollapse}`, `className="h-[90vh] pb-6"`, `bodyClassName="!pt-2"`, `headerContent` with label span "YAML Configuration" and secondary Button "Collapse". Body is `children` inside a `flex flex-col h-[calc(90vh-8rem)]` wrapper. The shell has no action slot, so Copy and Download cannot be added to it.

- [ ] **Step 1: Write the failing test**

Test-first: yes — renders label "YAML Configuration", a "Collapse" button calling `onCollapse`, no close (X) button, Escape key calls `onCollapse`, and children are rendered.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/components/ExpandedYaml`
Expected: FAIL, module not found.

- [ ] **Step 3: Write minimal implementation**

Create `ExpandedYamlShell.tsx` with the layout above. No new props beyond the interface.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/components/ExpandedYaml`
Expected: PASS.

---

### Task 2: Editor expanded view uses the shell

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/components/YamlExpandedModal.tsx:31-78`
- Test: `src/pages/workflows/editor/configPanels/components/__tests__/YamlExpandedModal.test.tsx` (update any assertion on the old header or dimensions)

**Interfaces:**
- Consumes: `ExpandedYamlShell` from Task 1.
- Produces: unchanged `YamlExpandedModal` props `{ visible, value, validationError, onChange, onCollapse }`. `YamlPanel.tsx` is not touched.

Replace the `Popup` and `headerContent` block with `<ExpandedYamlShell visible onCollapse>`. Keep the `YAML Error:` line and the bordered container (`border-failed-secondary` when `validationError`) and the `AceEditor` (`name="yaml_config_expanded"`, `value`, `onChange`, `lang="yaml"`, `showInvisibles`) as the children. Drop the `Popup`, `Button`, `CollapseSvg`, `ButtonType` imports.

- [ ] **Step 1: Write the failing test**

Test-first: yes — the expanded editor has no "Copy" or "Download" button; a validation error prop renders "YAML Error:" text; the shell's "Collapse" button calls `onCollapse`. Existing editable-input test must still pass.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels/components/__tests__/YamlExpandedModal.test.tsx`
Expected: FAIL on the new no-Copy/Download assertion (current file does not use the shell, so the header assertion targets the old markup).

- [ ] **Step 3: Write minimal implementation**

Apply the replacement described above.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/workflows/editor/configPanels`
Expected: PASS, including `YamlPanel.test.tsx` expand test.

---

### Task 3: Execution expanded view uses the shell

**Files:**
- Modify: `src/components/CodeBlock/CodeBlockExpandPopup.tsx:40-58` (replace `Popup` with `ExpandedYamlShell`; drop `header` label use)
- Modify: `src/components/CodeBlock/CodeBlock.tsx:194` (stop passing `header` from `expandTitle`; drop `expandTitle` prop only if no other caller remains)
- Modify: `src/pages/workflows/details/configuration/WorkflowExecutionConfigYaml.tsx:53` (remove `expandTitle="Configuration"` if the prop is dropped)
- Test: `src/pages/workflows/details/configuration/__tests__/WorkflowExecutionConfigYaml.test.tsx` (update the dialog title assertion from "Configuration" to "YAML Configuration")
- Test: `src/components/CodeBlock/__tests__/CodeBlockExpandPopup.test.tsx` (update if it asserts the old header)

**Interfaces:**
- Consumes: `ExpandedYamlShell` from Task 1.
- Produces: `CodeBlockExpandPopup` props lose `header` (label is fixed by the shell). `isVisible`, `onHide`, `title`, `language`, `text`, `downloadFilename` are unchanged.

Wrap the existing `<CodeBlock ... isInExpandPopup />` as the shell's child, keeping its own Copy and Download header bar. The shell's `onCollapse` is `onHide`. Keep `WorkflowExecutionConfigYaml` read-only; do not add an editable element.

- [ ] **Step 1: Write the failing test**

Test-first: yes — expanded execution view shows label "YAML Configuration", a "Collapse" button, no close (X) button, still shows Copy and Download buttons, and contains no textbox or editable element.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/workflows/details/configuration src/components/CodeBlock`
Expected: FAIL on the label and Collapse assertions.

- [ ] **Step 3: Write minimal implementation**

Apply the wrap and prop cleanup described above. Do not change `CodeBlock`'s inline (non-expanded) rendering.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/workflows/details/configuration src/components/CodeBlock`
Expected: PASS.

---

## Negative-constraint pass

- "Editor expanded view does NOT show Copy/Download": the shell has no action slot (Task 1); Task 2 test asserts absence.
- "Execution details stays read-only": Task 3 changes only the popup chrome; the body stays `CodeBlock`; Task 3 test asserts no textbox.
- "Do not change save/sync logic": no task touches `YamlPanel.tsx`, `ConfigPanel.tsx`, `TabFooter`, or `handleYamlChange`; Task 2 keeps `value` and `onChange` as they are.
- Light and dark theme verification is owned by the calling flow's browser stage, so no task here.
- `SystemPromptExpandedModal` has a duplicate header; out of scope, left unchanged.
