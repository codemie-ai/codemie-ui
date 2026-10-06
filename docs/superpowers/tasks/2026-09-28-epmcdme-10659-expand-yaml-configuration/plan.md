# EPMCDME-10659 Expand YAML Configuration Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add an Expand button to the visual editor's YAML panel. It opens the YAML in a full-width modal, and edits made there stay in the panel after Collapse. Also add tests that pin the Execution History expand behavior that already exists.

**Architecture:** `YamlPanel` stays the single owner of `value`, `validationError` and `isExpanded`. A new presentational `YamlExpandedModal` renders a second `AceEditor` bound to the same `value`/`handleYamlChange`, following the `SystemPromptExpandedModal` Popup pattern. The trigger is an optional `onExpand` prop on `WorkflowYamlHeaderActions`.

**Tech Stack:** React 18 + TS, PrimeReact `Popup`, `AceEditor`, Vitest + RTL.

**Spec:** inline requirements (no spec file). Research: `technical-analysis.md` in this folder.

Commit after each task, following the repository's existing convention. Every commit references EPMCDME-10659. Stage only the task's files; never stage `vite.config.ts` or `docs/superpowers/tasks/2026-09-24-epmcdme-14345-*`.

## Acceptance criteria

- [ ] The YAML section shows a visible Expand button on Edit Workflow (YamlPanel) and on Execution History -> Configuration, in both Dark and Light themes.
- [ ] Clicking Expand opens a modal that shows the same YAML content as the inline view.
- [ ] Edit Workflow: edits made in the modal remain after Collapse, and the existing YamlPanel Save/Cancel and the page Save commit or discard them.
- [ ] Execution History: the expanded YAML is read-only, and Copy and Download are available.

## Global Constraints

- The Apache licence header goes on every new source file. No `console.*` in new production code. `npm run lint` must pass.
- No theme-specific code: use semantic Tailwind tokens only. AceEditor already follows `useTheme`.
- The Expand trigger's accessible name is exactly `Expand YAML editor`. The modal title is `YAML Configuration`, and the collapse button is labelled `Collapse`.
- The modal has no Save/Cancel footer and no Version History button.

## Review Focus

- Invalid YAML typed in the modal: the error text `YAML Error: …` shows inside the modal, and the inline TabFooter Save stays disabled after Collapse (Task 3 test).
- Escape/backdrop close behaves exactly like Collapse and keeps the edits (Popup `onHide` = collapse handler; Task 3 test uses the Collapse button, and `onHide` shares the same handler).
- Cancel after an expanded edit restores the committed `yaml` (Task 3 test).
- `ConfigPanel` remounts `<YamlPanel key={yamlConfig}>`, so a committed YAML change closes the modal. This is accepted; add a one-line code comment in `YamlPanel` next to `isExpanded`.
- Modal editor height: without an explicit height Ace renders at 0px. The container must use a fixed height such as `h-[calc(90vh-8rem)]`.

---

### Task 1: `onExpand` on WorkflowYamlHeaderActions

**Files:** Modify `src/pages/workflows/components/WorkflowYamlHeaderActions.tsx:21-63`. Test: create `src/pages/workflows/components/__tests__/WorkflowYamlHeaderActions.test.tsx`.

**Interfaces:** Produces `onExpand?: () => void` and `expandAriaLabel?: string` (default `'Expand YAML editor'`) on `WorkflowYamlHeaderActionsProps`.

Test-first: yes — with no `onExpand`, no button named `Expand YAML editor` renders. With `onExpand`, the button renders after Version History, and clicking it calls `onExpand` once. The existing Documentation and Version History buttons still render.

- [ ] Write the tests. Mock `expand.svg?react`, `history.svg?react` and `external.svg?react` as in `YamlPanel.test.tsx`. Run `npx vitest run src/pages/workflows/components/__tests__/WorkflowYamlHeaderActions.test.tsx` and expect FAIL.
- [ ] After the Version History button, render a secondary medium `Button` with `<ExpandSvg />` and text `Expand`. Use `aria-label={expandAriaLabel}` and `onClick={onExpand}`, and render it only when `onExpand` is set. Re-run the tests and expect PASS.

### Task 2: `YamlExpandedModal` component

**Files:** Create `src/pages/workflows/editor/configPanels/components/YamlExpandedModal.tsx`. Test: `src/pages/workflows/editor/configPanels/components/__tests__/YamlExpandedModal.test.tsx`.

**Interfaces:** Produces the following.
```ts
interface YamlExpandedModalProps {
  visible: boolean
  value: string
  validationError: string | null
  onChange: (value: string) => void
  onCollapse: () => void
}
export default YamlExpandedModal
```

Test-first: yes — when `visible` is true it renders the header `YAML Configuration`, an editor whose value equals `value`, and a `Collapse` button that calls `onCollapse`. It shows `YAML Error: <msg>` when `validationError` is set. There is no `Save` or `Cancel` button. It renders nothing when `visible` is false.

- [ ] Write the tests. Mock AceEditor as a textarea (copy the mock from `YamlPanel.test.tsx`) and mock `collapse.svg?react`. Run the tests and expect FAIL.
- [ ] Implement it with `Popup hideFooter hideClose isFullWidth visible onHide={onCollapse} className="h-[90vh] pb-6"`. `headerContent` holds the title plus a secondary `Collapse` button with `CollapseSvg`, as in `SystemPromptExpandedModal.tsx:72-98`. The body mirrors `YamlPanel.tsx:170-189`: the error line, then a bordered container `h-[calc(90vh-8rem)]` with a red border on error, containing `AceEditor value onChange lang="yaml" name="yaml_config_expanded" showInvisibles`. Re-run the tests and expect PASS.

### Task 3: Wire the expand modal into YamlPanel

**Files:** Modify `src/pages/workflows/editor/configPanels/YamlPanel.tsx:50,161-193`. Test: `src/pages/workflows/editor/configPanels/__tests__/YamlPanel.test.tsx`.

**Interfaces:** Consumes `onExpand` (Task 1) and `YamlExpandedModal` (Task 2). `YamlPanelRef` is unchanged.

Test-first: yes — these tests go in a new `describe('expand')`:
- Clicking `Expand YAML editor` shows the `YAML Configuration` dialog, and its editor holds the same YAML as the inline editor.
- Editing in the modal, then clicking `Collapse`, closes the dialog and leaves the inline editor with the new value. After that, `ref.isDirty()` is true and `ref.save()` calls `onUpdate` with the new value.
- Typing a leading-tab line in the modal shows the tab error in the modal. After Collapse, the TabFooter Save is disabled.
- After an expanded edit and Collapse, clicking TabFooter `Cancel` restores the original `yaml` and calls `onClose(true)`.

- [ ] Add the tests. Add mocks for `expand.svg?react` and `collapse.svg?react`, and select editors with `getAllByTestId('ace-editor')`. Run `npx vitest run src/pages/workflows/editor/configPanels/__tests__/YamlPanel.test.tsx` and expect FAIL.
- [ ] Add `const [isExpanded, setIsExpanded] = useState(false)` with the remount comment from Review Focus. Pass `onExpand={() => setIsExpanded(true)}` to `WorkflowYamlHeaderActions`. Render `<YamlExpandedModal visible={isExpanded} value={value} validationError={validationError} onChange={handleYamlChange} onCollapse={() => setIsExpanded(false)} />` next to `TabFooter`. Re-run the tests and expect PASS, with the existing YamlPanel and ConfigPanel tests still green.

### Task 4: Pin Execution History expand behaviour (tests only)

**Files:** Create `src/pages/workflows/details/configuration/__tests__/WorkflowExecutionConfigYaml.test.tsx`.

Test-first: no — this task only adds tests for behavior already shipped by EPMCDME-10855, so the tests pass immediately. Production code does not change.

- [ ] Render `WorkflowExecutionConfigYaml` with a workflow whose `yaml_config` is a known string, using the real `CodeBlock` and mocking only svgs, router and stores. Assert:
  - An `Expand` button is present, and clicking it opens a dialog titled `Configuration` that contains the same YAML text.
  - The dialog has no textbox or editable element.
  - Copy and Download buttons are present inside the dialog.

  Run the file and expect PASS.
