# Technical Research

**Task**: workflow editor yaml expanded
**Generated**: 2026-11-04
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16708 Expanded YAML editor in workflow editor drops typed text, keeping only the last character
(Bug: in the workflow editor, the expanded (fullscreen/modal) YAML editor loses typed text, keeping only the last typed character. Find root-cause candidates: controlled value/remount/re-keying, state sync, debounce, etc.)

---

## 2. Codebase Findings

### Existing Implementations
Purpose: edit workflow YAML in an expanded modal inside the editor config panel.
- `src/pages/workflows/editor/configPanels/YamlPanel.tsx` — owns `value` state (`useState(yaml)`, l.~49), `handleYamlChange` (setValue + validateYaml), `isExpanded`. Renders the inline `AceEditor` (name `yaml_config`) AND `YamlExpandedModal` with the same `value`/`onChange`. `useEffect(() => { setValue(yaml); validateYaml(yaml) }, [yaml])` resets local value whenever the `yaml` prop changes.
- `src/pages/workflows/editor/configPanels/components/YamlExpandedModal.tsx` — thin pass-through to `ExpandedYamlView` (refactored in 79a6331c6, EPMCDME-15809, 2026-10-30; previously its own implementation).
- `src/components/ExpandedYaml/ExpandedYamlView.tsx` / `ExpandedYamlShell.tsx` (new in 79a6331c6) — Popup (PrimeReact Dialog) hosting a second `AceEditor` (name `yaml_config_expanded`, `wrap`, `showInvisibles`). Also used by `components/CodeBlock/CodeBlockExpandPopup.tsx` and `WorkflowExecutionConfigYaml`.
- `src/components/AceEditor/AceEditor.tsx` — uncontrolled-ish wrapper around `ace.edit`. Details:
  - editor created in `useEffect(..., [])`; `editor.on('change')` closes over the **mount-time `onChange`** (never refreshed).
  - `valueRef` updated in effect; change handler calls `onChange` only if `editor.getValue() !== valueRef.current`.
  - sync effect `[value]`: if `value !== editor.getValue()` -> `editor.setValue(value, -1)` then restore cursor. So any render where the prop lags the editor text overwrites the editor with the older prop value.
- `src/pages/workflows/editor/ConfigPanel.tsx:476-486` — `<YamlPanel key={yamlConfig} yaml={yamlConfig ?? ''} onUpdate={onUpdateYaml} .../>`. `yamlConfig` comes from `WorkflowEditor.tsx:728` `serialize(editor.config)`; recomputed every render. A change in the serialized string remounts YamlPanel (loses `isExpanded`, so would close the modal; comment at YamlPanel l.~52 states this).
- Other touched code: `components/Popup/Popup.tsx` (Dialog; `header`/`footer` render fns, `useFocusTrap`, `useTopmostDialog`).

### Decisions Already in the Code
- Local draft in YamlPanel; committed to editor config only on Save via `onUpdate` (`onConfigurationUpdate`), then `onClose(true)`.
- Two Ace instances are bound simultaneously to one `value` string when expanded (inline panel editor stays mounted behind the modal).
- AceEditor `onChange` captured once at mount (`[]` deps); no recorded reason.

### Task Statements Checked Against the Code
- "Keeps only the last typed character": consistent with an Ace editor being reset (`setValue`) to a stale/short prop value, or with the editor remounting with a short value. Unverified at runtime (not reproduced).

### Consumers of Changed Contracts
- `AceEditor` consumers: YamlPanel (x2 instances), YamlEditor (`components/form/YamlEditor`), CodeBlockExpandPopup, WorkflowExecutionConfigYaml, ScriptToolAccessEditor etc. Any AceEditor change affects all. `ExpandedYamlView` consumers: YamlExpandedModal, CodeBlockExpandPopup.

### Architecture and Layers Affected
UI components only: workflows editor config panel -> shared ExpandedYaml components -> shared AceEditor. No store/API involvement in typing path.

### Integration Points
`ace-builds`, PrimeReact `Dialog` (portal), `useFocusTrap`, `useTheme`.

### Patterns and Conventions
Valtio stores for shared state; local `useState` for the draft here. `key=`-driven remount in ConfigPanel is an existing pattern (also `key={selectedNode.id}`).

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (components, state-management, testing); not read in depth for this root-cause search. Prior analysis: `docs/superpowers/tasks/2026-10-14-epmcdme-15809/technical-analysis.md` (refactor that introduced the shared ExpandedYaml components).

### Architectural Decisions
None found for AceEditor controlled/uncontrolled sync.

### Derived Conventions
Controlled-by-prop value with imperative sync via effect.

---

## 4. Testing Landscape

### Existing Coverage
`components/AceEditor/__tests__/AceEditor.test.tsx` (ace fully mocked via `vi.mock('ace-builds')`), `configPanels/components/__tests__/YamlExpandedModal.test.tsx`, `components/ExpandedYaml/__tests__/*`, `editor/__tests__/WorkflowEditor.test.tsx`.

### Testing Framework and Patterns
Vitest + React Testing Library; ace mocked, so real editor/prop feedback loop is not exercised.

### Coverage Gaps
No test types multiple characters through the expanded modal with re-render of parent (mock ace cannot reproduce the setValue feedback loop). No test for YamlPanel remount while expanded.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.
### Configuration Files
None relevant (`workflowYamlDocumentation` config item only controls doc link).
### Feature Flags and Deployment Concerns
None.

---

## 6. Risk Indicators (root-cause candidates, unverified, ranked)

1. Speculative: Prop/editor lag in AceEditor sync effect (`AceEditor.tsx` sync `useEffect([value])`). If a render commits with an older `value` than the editor's current text (fast typing, slow parent re-render since every keystroke runs `validateYaml` + sets state + re-renders ConfigPanel subtree and two editors), `setValue(older)` clobbers typed text. Two Ace instances on the same value amplify it (each setValue on the hidden editor fires change events).
2. Speculative: Remount/re-key. `ConfigPanel` `key={yamlConfig}` with `serialize(editor.config)`; if anything updates `editor.config` during typing (e.g. a workflow-level effect, autosave, normalization), YamlPanel remounts, `value` resets to the serialized config and the modal state is lost. Check whether the modal now stays open while yaml prop changes (the in-code comment claims remount also closes the modal). Not found as occurring on keystroke in code read.
3. Speculative: `useEffect(() => { setValue(yaml) }, [yaml])` in YamlPanel resets the draft whenever the `yaml` prop identity/value changes (e.g. parent re-serializes with different formatting).
4. Speculative: Regression window is commit 79a6331c6 (2026-10-30), which moved the modal onto `ExpandedYamlView`/`ExpandedYamlShell`/Popup and added `wrap`, CSS; new `Popup` mounts `AceEditor` inside PrimeReact Dialog (portal, mount after transition). Compare pre-refactor `YamlExpandedModal` (`git show 79a6331c6^:src/pages/workflows/editor/configPanels/components/YamlExpandedModal.tsx`) for a differing onChange/value path.
5. Speculative: stale `onChange` closure (AceEditor mount-time) — harmless today for YamlPanel since handlers use stable setters, but any wrapper passing state-derived callbacks would misbehave.
6. Ace `wrap: 'free'` and `showInvisibles` options are new to this editor in the modal; focus-trap (`useFocusTrap`) / Dialog focus could interfere with input, less likely to cause text loss.
- Tests mock ace, so none would catch this.

---

## 7. Summary for Complexity Assessment

Typing path is frontend only: AceEditor -> ExpandedYamlView -> YamlExpandedModal -> YamlPanel (local state) with ConfigPanel re-keying by serialized YAML. Surface for a fix is likely 1-3 files (AceEditor sync logic and/or YamlPanel/ConfigPanel), no backend, store or config changes.

Novelty is low but the defect sits in a shared component (AceEditor) used by many screens, so regression risk is moderate. Existing tests mock ace and would not detect a controlled-value feedback loop; a reproduction needs a real/more faithful ace or a manual browser check.

Key risks: unreproduced; two competing hypotheses (value-sync clobber vs remount/re-key); regression likely introduced by EPMCDME-15809 refactor.

---

## 8. External References

None named by the task
