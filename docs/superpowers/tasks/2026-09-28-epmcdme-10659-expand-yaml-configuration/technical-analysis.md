# Technical Research

**Task**: workflows yaml editor expand modal
**Generated**: 2026-09-28
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-10659 in codemie-ui (repo root C:\Users\AttilaBognar1\_Projects\codemie\codemie-ui). Story: Add Expand capability for YAML configuration in Workflows UI.
As a user of the Workflows UI, I want the ability to access and edit the YAML configuration for a workflow in an Expanded window, so that I can comfortably review and modify complex configurations without space or visibility constraints.
Scenario 1: User navigates to Edit Workflow page (existing or newly created workflow), sees the YAML configuration section, selects "expand"; YAML editor opens in a modal view; user can review, edit, validate; user exits and changes are synced with the workflow.
Scenario 2: User navigates to Workflow Execution History page, clicks Configuration button in top right corner, sees YAML configuration section, selects "expand"; YAML opens in modal; user can review and validate; exits.
Acceptance criteria:
- YAML section has a visible Expand button on Edit Workflow and Execution History -> Configuration pages (both Dark and Light theme).
- Clicking Expand opens the YAML configuration in a modal window and shows the same YAML content as the inline view.
- Edit Workflow: changes made in Expanded window are kept after Collapse window and are saved/discarded via the existing workflow Save/Cancel actions.
- Execution History: expanded YAML is read-only; copy and download are allowed.
Findings so far (verify): Execution History (src/pages/workflows/details/configuration/WorkflowExecutionConfigYaml.tsx) already uses <CodeBlock expandable expandTitle="Configuration" language="yaml"> -> src/components/CodeBlock/CodeBlockExpandPopup.tsx (verify copy+download present in the expanded view and that the expand button is visible). Edit side has two YAML editors: visual editor src/pages/workflows/editor/configPanels/YamlPanel.tsx (Ace editor, validation, own TabFooter Save/Cancel, rendered from ConfigPanel.tsx) and legacy form src/pages/workflows/components/WorkflowConfigField.tsx (used by WorkflowFormFields.tsx); both use shared header src/pages/workflows/components/WorkflowYamlHeaderActions.tsx. Determine which editor(s) the Edit Workflow page actually shows (EditWorkflowPage.tsx / feature flags). Existing expand-modal pattern to reuse: src/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPromptExpandedModal.tsx (Popup isFullWidth, hideFooter, Collapse button with collapse.svg) and how its Expand button is rendered; also MarkdownEditor expand. Check AceEditor component API (height/resize inside modal), existing expand/collapse svg icons, Popup component props, test patterns (vitest + RTL) for these components, and theming (dark/light).

---

## 2. Codebase Findings

### Existing Implementations

**Execution History side (Scenario 2) - already implemented by commit `8023f4edc` "EPMCDME-10855: Add Expand button to open YAML configuration in modal"** (Jun 2026; touched CodeBlock.scss, CodeBlock.tsx, CodeBlockExpandPopup.tsx, WorkflowExecutionConfigYaml.tsx, WorkflowExecutionConfiguration.tsx and its test).
- `src/pages/workflows/details/configuration/WorkflowExecutionConfigYaml.tsx` - renders "Yaml configuration" heading, an Edit button (navigates to `edit-workflow`, gated by `canEdit`) and `<CodeBlock expandable expandTitle="Configuration" language="yaml" text={workflow.yaml_config ?? ''} />`.
- `src/pages/workflows/details/configuration/WorkflowExecutionConfiguration.tsx` - `w-96` right `<aside>`, renders the YAML block only when `execution` is non-null.
- `src/components/CodeBlock/CodeBlock.tsx` - when `expandable`, header shows Expand button (`expand.svg`, `aria-label="Expand"`, tooltip) before Copy and Download; opens `CodeBlockExpandPopup`. Read-only Prism `<pre><code>`, no editing.
- `src/components/CodeBlock/CodeBlockExpandPopup.tsx` - `Popup hideFooter isFullWidth className="h-full" bodyClassName="!pt-0"`, header = `expandTitle`; body is a nested non-expandable `CodeBlock` -> **Copy and Download are present in the expanded view**; it is read-only. Close is Popup's default X (no "Collapse" button).
- `src/components/CodeBlock/CodeBlock.scss` - `.code-block-header--has-expand` hides button text labels via container query `@container (max-width: 22.5rem)`; buttons stay visible icon-only in the narrow `w-96` aside.

**Edit Workflow side (Scenario 1) - no expand exists.**
- `src/utils/workflows.ts:170` - `isVisualEditorEnabled()` **unconditionally returns `true`**.
- `src/pages/workflows/components/WorkflowForm.tsx` - `showVisualEditor = !hideConfiguration && visualEditorEnabled` -> Edit and New Workflow pages always render `WorkflowNodeEditor` (visual editor). `WorkflowFormFields` only renders in the `hideConfiguration` path (`WorkflowExecutionConfigForm.tsx`), where the YAML field is also suppressed. **So `WorkflowConfigField.tsx` is effectively unreachable in production; the live Edit Workflow YAML editor is `YamlPanel`.**
- `src/pages/workflows/editor/configPanels/YamlPanel.tsx` - forwardRef (`YamlPanelRef`: `isDirty/reset/save/jumpToLine`). Local `value` state seeded from `yaml` prop; `validateYaml` (tab-character check via `findLeadingTabLine`, `js-yaml` parse, states require `id`); error text above editor + red border; Ace editor in `h-[500px]` box with `showInvisibles`; `TabFooter` Save (commits via `onUpdate`, toasts, closes panel) / Cancel (resets, closes). Jumps to `activeIssue.configLine` from `useWorkflowContext`.
- `src/pages/workflows/editor/ConfigPanel.tsx` - floating `<aside>` (`absolute top-[60px] right-4`, `w-[500px]` when YAML tab active, `max-h-[calc(100%-120px)]`); `renderYamlTab` mounts `<YamlPanel key={yamlConfig} ... />`. Has its own panel collapse chevron (`aria-label` "Expand panel"/"Collapse panel") - naming clash risk.
- `src/pages/workflows/components/WorkflowYamlHeaderActions.tsx` - shared header actions (Documentation link, Version History); used by both YamlPanel and WorkflowConfigField. Natural host for an Expand button.
- `src/pages/workflows/components/WorkflowConfigField.tsx` - legacy Ace field (`h-96` / `h-[500px]`), no validation.

**Reusable expand patterns**
- `src/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPromptExpandedModal.tsx` - `Popup hideFooter hideClose isFullWidth className="h-[90vh] pb-6"` with custom `headerContent` (title + Copy + Collapse button using `collapse.svg`). Expand trigger in `SystemPromptCurrentTab.tsx:112` - `<Button type="secondary" onClick={onExpand}><ExpandSvg /> Expand</Button>`, hidden when `isExpanded`. The same `SystemPromptCurrentTab` component is rendered inline and inside the modal (`isExpanded={true}`), sharing parent state.
- `src/components/form/MarkdownEditor/MarkdownEditor.tsx:400` - icon-only expand button (`title/aria-label="Expand to fullscreen"`) + `Popup` at line 478.
- Icons in `src/assets/icons/`: `expand.svg`, `collapse.svg`, `copy.svg`, `download.svg`.

### Architecture and Layers Affected
- Shared components: `CodeBlock`, `Popup`, `AceEditor` (read only for reuse).
- Page components - workflow visual editor config panel: `YamlPanel`, `ConfigPanel`, `WorkflowYamlHeaderActions`.
- Execution details: `WorkflowExecutionConfigYaml` (already done).
- No store, API, routing or backend layer involvement found.

### Integration Points
- YAML commit chain: `YamlPanel.onUpdate` -> `ConfigPanel.onUpdateYaml` -> `WorkflowEditor` -> `WorkflowForm.handleNodeEditorConfigurationUpdate` -> `setYamlConfig`. Page Save (`EditWorkflowPage.saveWorkflow` -> `WorkflowForm.save`) calls `editorRef.current.saveCurrentTab()` -> `configPanelRef.current.save()` -> `YamlPanel.save()` (validates; aborts page save on invalid), then serializes `editor.config`. So uncommitted YamlPanel `value` is committed by the page Save button.
- Canvas keyboard shortcuts are already blocked while the YAML tab is visible (`WorkflowEditor.tsx:89 isCanvasShortcutBlocked(isYamlTabVisible, ...)`).
- `AceEditor` (`src/components/AceEditor/AceEditor.tsx`): props `value, onChange, lang, readonly, name, className, placeholder, showInvisibles`; ref `{ editor, jumpToLine }`. Fills parent (`w-full h-full`); theme follows `useTheme().isDark` (`tomorrow_night` / `tomorrow`) with a live effect; external `value` changes are pushed into the editor with cursor preserved. No explicit `editor.resize()` call anywhere.
- `Popup` (`src/components/Popup/Popup.tsx`) wraps PrimeReact `Dialog`: props include `isFullWidth, hideFooter, hideClose, headerContent, footerContent, className, bodyClassName, dismissableMask (default true)`; focus trap, topmost-only Escape handling for `hideClose`.

### Patterns and Conventions
- Expanded view = `Popup` + `hideFooter` + `isFullWidth`, trigger is secondary `Button` with `ExpandSvg` + "Expand" label, close via "Collapse" with `CollapseSvg` (SystemPrompt) or default X (CodeBlock).
- SVGs imported as `@/assets/icons/<name>.svg?react`; `Button` from `@/components/Button` with `variant/type="secondary"`.
- Apache licence header required on every source file.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/patterns/modal-patterns.md` - documents Popup props (`isFullWidth`, `hideFooter`, `footerContent`, `dismissableMask`, etc.) and modal patterns.
- `.ai-run/guides/styling/theme-management.md`, `styling-guide.md` - theming via Tailwind semantic tokens; `useTheme` hook.
- `.ai-run/guides/testing/testing-patterns.md` - Vitest + RTL, `unit`/`integration` projects.

### Architectural Decisions
- EPMCDME-10855 chose to put expand into the shared `CodeBlock` (`expandable` prop) rather than a workflow-specific modal.
- Visual editor is hard-enabled (`isVisualEditorEnabled` returns true), legacy form path retained in code.

### Derived Conventions
- Inline and expanded views share one state owner (SystemPrompt: parent holds value; modal re-renders the same sub-component).

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/workflows/editor/configPanels/__tests__/YamlPanel.test.tsx` - mocks `AceEditor` as a `<textarea data-testid="ace-editor">`, mocks `valtio.useSnapshot`, `appInfoStore`, `utils/settings`, `toaster`, svg icons (`history.svg`, `external.svg`); wraps in `WorkflowContext.Provider`. Covers validation (tab detection etc.).
- `src/pages/workflows/components/__tests__/WorkflowConfigField.test.tsx`, `WorkflowFormFields.test.tsx`.
- `src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx`.
- `src/pages/workflows/details/configuration/__tests__/WorkflowExecutionConfiguration.test.tsx` (touched by 10855; no assertions on Expand).
- `src/components/CodeBlock/__tests__/CodeBlock.integration.test.tsx` - no Expand assertions.
- `src/components/Popup/__tests__/Popup.test.tsx`, `src/components/AceEditor/__tests__/AceEditor.test.tsx`.

### Testing Framework and Patterns
Vitest + React Testing Library; heavy `vi.mock` of svg `?react` imports and stores; `fireEvent`; `afterEach(cleanup)`.

### Coverage Gaps
- `CodeBlock` `expandable` / `CodeBlockExpandPopup` have no tests.
- No `SystemPromptExpandedModal` test (only `SystemPromptGenAIPopup.test.tsx` in that folder).
- `WorkflowYamlHeaderActions` has no dedicated test file.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
- `workflowYamlDocumentation` config item (via `appInfoStore.configs`, `isConfigItemEnabled`/`getConfigItemSettings`) drives the Documentation button in `WorkflowYamlHeaderActions`.

### Feature Flags and Deployment Concerns
- `isVisualEditorEnabled` is a stub returning `true` (not a real flag). No deployment concerns.
- Working tree: branch `EPMCDME-10659_expand-yaml-configuration`; unrelated local modification to `vite.config.ts`.

---

## 6. Risk Indicators

- Scenario 2 is largely delivered by EPMCDME-10855; remaining work there is verification only (Expand visible icon-only in `w-96` aside via container query; Copy/Download in popup; read-only). Speculative: the popup lacks an explicit "Collapse" button and uses default close X - may or may not satisfy UX parity with Scenario 1.
- Scenario 2 YAML block only renders when `execution` is non-null (`WorkflowExecutionConfiguration.tsx`).
- `YamlPanel` is remounted via `key={yamlConfig}` in `ConfigPanel.tsx`; Speculative: any expand-modal state held inside YamlPanel resets when committed YAML changes (e.g. version-history restore, AI refine) - modal open/close state and the edited value must live in one owner shared by inline and modal editors.
- Speculative: two Ace instances (inline + modal) bound to the same `value`; AceEditor's value-sync effect preserves cursor, but Ace has no `resize()` call - a modal mounting into an animated PrimeReact Dialog may need a sized container (`h-full`/`vh`) to render correctly.
- Speculative: Validation error display, `showInvisibles`, `jumpToLine`/`activeIssue` behavior should be mirrored in the modal for "review, edit, validate".
- AC says "saved/discarded via existing workflow Save/Cancel", but YamlPanel also has its own TabFooter Save/Cancel; page Save already commits uncommitted YamlPanel value via `saveCurrentTab`. Speculative: spec must decide whether the modal footer exposes TabFooter or only Collapse.
- Naming clash: `ConfigPanel` already has "Expand panel"/"Collapse panel" aria-labels for its chevron; tests/selectors by label may collide.
- `WorkflowConfigField` (legacy) is unreachable in production; adding expand there is optional scope.
- Stacked dialogs: Version History popup opened from inside a modal - `useTopmostDialog` handles Escape, but z-order untested.

---

## 7. Summary for Complexity Assessment

The task touches the presentation layer only: shared components (`Popup`, `AceEditor`, possibly `CodeBlock`) and workflow page components (`YamlPanel`, `WorkflowYamlHeaderActions`, possibly `ConfigPanel`). No store, API, routing, schema or config changes were found to be implicated. Scenario 2 (Execution History -> Configuration) was already implemented by commit `8023f4edc` (EPMCDME-10855): `CodeBlock expandable` opens `CodeBlockExpandPopup`, a full-width read-only popup that retains Copy and Download; remaining work is verification and optional tests.

Scenario 1 is the real change. Because `isVisualEditorEnabled()` always returns true, the Edit Workflow page renders the visual editor, whose YAML editor is `YamlPanel` inside the floating `ConfigPanel` (500px wide, 500px-tall Ace). An expand modal must reuse the SystemPrompt pattern (`Popup isFullWidth hideFooter`, Expand/Collapse buttons with `expand.svg`/`collapse.svg`) and share YamlPanel's local `value`/validation so edits survive collapse and are committed by the existing page Save (already wired through `saveCurrentTab` -> `YamlPanel.save`). Novelty is low: all building blocks exist; theming is automatic via `AceEditor`'s `useTheme` binding and semantic Tailwind tokens.

Test posture is moderate: `YamlPanel.test.tsx` has a ready mock harness (Ace mocked as textarea), but `CodeBlock` expand, `CodeBlockExpandPopup`, and `WorkflowYamlHeaderActions` have no tests. Key risks are YamlPanel's `key={yamlConfig}` remount, two synchronized Ace instances with modal sizing, and ambiguity over TabFooter Save/Cancel vs page Save/Cancel inside the modal. Expected size: small (roughly 2-4 source files plus tests).

---

## 8. External References

None named by the task.
