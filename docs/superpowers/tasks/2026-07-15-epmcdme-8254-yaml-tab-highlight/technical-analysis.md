# Technical Research

**Task**: yaml editor ace-builds tab whitespace validation
**Generated**: 2026-07-15T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8254 — [YAML Editor] Show Tab character visually inside editor to help users find invalid YAML formatting. Description: Currently, when editing YAML in the CodeMie platform, the YAML editor does not distinguish or show tab (\t) characters. If a tab is present in the YAML text, saving is prevented due to YAML syntax restrictions. However, users are unable to visually identify where tabs exist and thus cannot easily correct the formatting issue. Enhancing the editor to visually mark or highlight all tab characters (e.g., with a symbol, colored background, or clear notification in-line) will greatly improve usability, troubleshooting, and speed of correction—especially in large or complex YAML files. Acceptance criteria: (1) When a tab character is present in the YAML editor, it is visually marked/highlighted so users can locate it instantly. (2) Visual indication is non-intrusive but clearly distinct from valid space characters. (3) Tab highlight is active at all times, not only on save attempt. (4) Saving a YAML file containing tabs is blocked, but the user is guided visually to the problem location(s). (5) No regression for regular YAML editing, saving, or syntax enforcement. (6) All new changes are labeled: AI/Run, AI-Generated.

---

## 2. Codebase Findings

### Existing Implementations

**Core Ace wrapper — single file, no aceOptions passthrough:**
- `src/components/AceEditor/AceEditor.tsx` (163 lines)
  - Calls `ace.edit(containerRef.current, { ... })` at lines 68–81 inside a mount-only `useEffect(fn, [])`.
  - Current option set: `mode`, `theme`, `value`, `readOnly`, `fontSize`, `fontFamily`, `showPrintMargin: false`, `highlightActiveLine`, `highlightGutterLine`, `useWorker: false`, `placeholder`, `enableKeyboardAccessibility: true`.
  - `showInvisibles` is **absent**.
  - `AceEditorProps` interface (lines 26–34): `value`, `onChange`, `lang`, `readonly`, `name`, `className`, `placeholder`. No `aceOptions` or equivalent escape-hatch prop exists.
  - `AceEditorRef` (lines 36–39) exposes `editor: ace.Ace.Editor | null` and `jumpToLine(line, column?)`.
  - Theme switching lives in a separate `useEffect([isDark])` at lines 108–112 via `editor.setTheme(...)`. This is the pattern to follow for any option that must react to a prop change.
  - Imported themes: `ace-builds/src-noconflict/theme-tomorrow_night` (dark) and `ace-builds/src-noconflict/theme-tomorrow` (light).

**Reusable YAML form control:**
- `src/components/form/YamlEditor/YamlEditor.tsx` (128 lines)
  - `handleYamlChange` (lines 63–92): calls `yaml.load(newYaml)` inside a try/catch. Tab-induced parse failure surfaces only as a generic `YamlException` message from js-yaml (e.g., "bad indentation of a mapping entry at line 2…"), not as a targeted "tab found" message.
  - Does **not** use `forwardRef`; no `AceEditorRef` / `jumpToLine` wiring.
  - Passes `<AceEditor name="yaml_editor" value lang="yaml" placeholder>` with no custom ace options (lines 99–105).
  - Error display: red box below the editor (lines 108–113), no inline annotation.

**Workflow YAML full-page panel:**
- `src/pages/workflows/editor/configPanels/YamlPanel.tsx` (274 lines)
  - `validateYaml` (lines 69–93): same js-yaml throw pattern. No explicit `\t` check.
  - `<AceEditor ref={aceEditorRef} ...>` at lines 202–209 — uses `AceEditorRef` and calls `jumpToLine` for `activeIssue.configLine` (lines 129–132). The `jumpToLine` plumbing is **already present** and functional.
  - Save blocked at line 265: `saveDisabled={!!validationError}`.
  - Error shown at lines 192–194 as `text-failed-secondary` text above the editor.

**YamlEditor consumer — ToolForm:**
- `src/pages/workflows/editor/configPanels/components/ToolForm.tsx`
  - Line 25: `import YamlEditor`; line ~420: `<YamlEditor value onChange={handleToolArgsChange} onValidationChange={handleYamlError} ...>` inside an `argsMode === TOOL_ARGS_MODE.YAML` branch.

**YamlEditor consumer — CustomNodeForm:**
- `src/pages/workflows/editor/configPanels/components/CustomNodeForm.tsx`
  - Line 23: `import YamlEditor`; line ~276: `<YamlEditor value onChange={handleConfigChange} onValidationChange={handleYamlError} ...>` inside a `CONFIG_ARGS_MODE.YAML` branch.

### Architecture and Layers Affected

| Layer | Component | Role in this task |
|-------|-----------|------------------|
| Shared UI Component | `AceEditor.tsx` | Must gain `showInvisibles: true` in init options; optionally gain an `aceOptions` prop for future extensibility |
| Form Component | `YamlEditor.tsx` | Must gain an explicit `\t` detection pass before/alongside `yaml.load()` to emit a specific, actionable error message |
| Workflow Panel | `YamlPanel.tsx` | Must gain an explicit `\t` detection pass; can leverage existing `jumpToLine` to navigate to the first tab-containing line |
| Tests | `AceEditor.test.tsx` | Must be updated to assert `showInvisibles: true` in init options; existing tab-command guard (line 73–76) must continue to pass |
| Tests (new) | `YamlEditor/__tests__/YamlEditor.test.tsx` | New file — no existing tests |

### Integration Points

- **ace-builds v1.39.1** — `showInvisibles: true` is a native Ace option. No additional npm package required. Ace renders tab characters using the `.ace_invisible` and `.ace_invisible_tab` CSS classes within the editor's DOM. These classes are controlled by the active Ace theme.
- **js-yaml** — used in both `YamlEditor.handleYamlChange` and `YamlPanel.validateYaml`. Tab characters inside YAML indentation cause a `YamlException`; tabs inside quoted string values may not. An explicit `/\t/.test(yamlText)` pre-check is needed to give a precise message regardless of where the tab appears.
- **useTheme / isDark** — determines which Ace theme is loaded (`tomorrow_night` dark, `tomorrow` light). The `.ace_invisible` glyph color differs between themes; see Risk Indicators.
- **`AceEditorRef.jumpToLine`** — already wired in `YamlPanel`; not wired in `YamlEditor`. AC #4 ("guided visually to the problem location") can be partially satisfied in YamlPanel via `jumpToLine` to the first tab line; YamlEditor would need a forwardRef addition to achieve the same.

### Patterns and Conventions

- **Init-time Ace options**: set inside the single mount `useEffect(fn, [])` at lines 63–106 of `AceEditor.tsx`. Adding `showInvisibles: true` follows the existing pattern.
- **Dynamic Ace option changes**: done via a separate `useEffect([dep])` calling `editorRef.current.setOption(...)`. The `isDark` theme switch at lines 108–112 is the canonical example. If `showInvisibles` ever needs to be prop-driven, the same pattern applies.
- **Styling rule (hard constraint)**: `.ai-run/guides/styling/styling-guide.md` mandates "Tailwind CSS only — no `<style>` blocks, no `style={{}}`, no `.css`/`.scss` files". Ace's invisible-character glyphs are styled by Ace's own theme CSS (loaded as ESM imports). The existing `[&_div]:!font-geist-mono` class on the container div (line 154) shows that Tailwind arbitrary variant selectors (`[&_.ace_invisible_tab]:...`) are the only permitted CSS override path inside the project styling system. This must be verified against `tailwind.config.ts` tokens before use.
- **Validation error pattern**: errors displayed in `text-failed-secondary` / `bg-failed-secondary/10` with `border-failed-secondary` (YamlEditor line 109; YamlPanel line 193). Any new tab-specific error message follows this same token-based styling.
- **License / AI label**: every new or modified source file must carry the Apache 2.0 header block; the task acceptance criteria additionally require `AI/Run, AI-Generated` comments on all new changes.
- **Test file location**: co-located `__tests__/` subdirectory next to the source file (testing-patterns.md §File Location). New YamlEditor tests go in `src/components/form/YamlEditor/__tests__/YamlEditor.test.tsx`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

Relevant guides found in `.ai-run/guides/`:

| Guide | Relevance |
|-------|-----------|
| `.ai-run/guides/styling/styling-guide.md` | Hard constraint: Tailwind only, semantic tokens, no arbitrary values or CSS files. Directly governs how tab-highlight styling must be applied. |
| `.ai-run/guides/styling/theme-management.md` | Two themes (`codemieDark`, `codemieLight`); `useTheme` hook; `isDark` boolean. All visual changes must work in both themes. Token format: `[darkColor, lightColor]` arrays in `tailwind.config.ts`. |
| `.ai-run/guides/testing/testing-patterns.md` | Vitest 1.6.1 + React Testing Library; AAA pattern; `vi.mock()` at module top level; `afterEach(cleanup)`; `vi.hoisted()` for mock factories. |
| `.ai-run/guides/patterns/form-patterns.md` | Form components pass explicit `value`/`onChange`/`error` props to leaf components; Controller pattern for React Hook Form integration. YamlEditor is a leaf form component — its interface should stay stable. |
| `.ai-run/guides/development/workflow-editor-patterns.md` | YamlPanel is in the workflow editor layer; keep components thin, logic in utils; `jumpToLine` is already an established pattern via `aceEditorRef`. |
| `.ai-run/guides/quality-gates.md` | Pre-MR: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`. Pre-commit hook: lint-staged, license headers, secrets check, Sonar local scan. |

### Architectural Decisions

- The Ace editor wrapper was deliberately kept thin and unopinionated (no escape-hatch `aceOptions` prop). Any behavioral change to Ace must be added to `AceEditor.tsx` itself, either as a hard-coded option or as a new typed prop.
- The `enableKeyboardAccessibility: true` option (lines 80, 59–76 of the test) was a deliberate a11y decision; the test at line 68–76 guards that no custom tab-key command is registered. Adding `showInvisibles: true` does NOT register a tab command and will not conflict with this guard.
- YamlPanel exposes `isDirty()`, `reset()`, `save()`, and `jumpToLine()` via its own `YamlPanelRef` forwardRef. This is the approved pattern for exposing editor operations to parent components.

### Derived Conventions

- Tab-character detection should use a plain `/\t/` regex test before `yaml.load()`. This ensures the error message is always "Tab characters found at line X — YAML requires spaces for indentation" rather than a js-yaml-specific parse message that varies by where the tab appears.
- When a specific line number can be determined for the first tab occurrence, `jumpToLine` should be called to position the cursor there. This is already the model used by `activeIssue.configLine` in `YamlPanel`.
- No feature flags or config items govern the YAML editor behavior currently (`isConfigItemEnabled` / `getConfigItemSettings` usage in `YamlPanel` is only for the documentation URL button). The tab-highlight feature should be unconditionally active.

---

## 4. Testing Landscape

### Existing Coverage

| Test file | What it covers |
|-----------|---------------|
| `src/components/AceEditor/__tests__/AceEditor.test.tsx` | 4 unit tests: (1) `enableKeyboardAccessibility: true` in init options, (2) no custom Escape/Tab command registered, (3) read-only aria-label, (4) editable aria-label. Uses `vi.hoisted` mock for `ace-builds`. |
| No test for `YamlEditor.tsx` | No `__tests__` directory under `src/components/form/YamlEditor/`. |
| No test for `YamlPanel.tsx` | No `YamlPanel.test.*` in `src/pages/workflows/editor/configPanels/` or its `__tests__/` subdirectory. |
| `src/pages/workflows/editor/__tests__/ConfigPanel.test.tsx` | Covers the outer ConfigPanel wrapper, not YamlPanel internals. |

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1, React Testing Library.
- **Mock pattern for AceEditor**: `vi.hoisted()` factory creates `mockEditor` object with all Ace methods stubbed (`commands.addCommand`, `on`, `destroy`, `getValue`, `setValue`, `setTheme`, `setReadOnly`, `getCursorPosition`, `moveCursorToPosition`, `gotoLine`, `scrollToLine`, `focus`, `renderer.scroller.setAttribute`). The mock does NOT currently stub `setOption` — adding `showInvisibles` test assertions will require adding `setOption: vi.fn()` if it is called dynamically.
- **Module mocks**: `ace-builds`, `ace-builds/src-noconflict/mode-yaml`, `mode-json`, `theme-tomorrow_night`, `theme-tomorrow` are all mocked at module level.
- **`useTheme` mock**: `vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false }) }))` — already present in `AceEditor.test.tsx`.
- **Cleanup**: `beforeEach(() => { vi.clearAllMocks() })` is used (no `afterEach(cleanup)` — this follows the AceEditor test's existing pattern; new YamlEditor tests should add `afterEach(cleanup)` per the testing guide).

### Coverage Gaps

- **`YamlEditor.tsx`**: entirely untested. New tests needed for: (a) tab detection triggering specific error, (b) valid YAML still parses correctly, (c) `onValidationChange` callback invoked with `true` when tabs present.
- **`YamlPanel.tsx` tab behavior**: no test for the explicit tab-check branch, tab-specific error message, or `jumpToLine` called with the first-tab line number.
- **`AceEditor.tsx` `showInvisibles`**: the existing test asserting init options will need a new `it` block verifying `showInvisibles: true` is passed to `mockAceEdit`.
- **`YamlEditor` within ToolForm / CustomNodeForm**: these forms use `onValidationChange` to propagate errors; no tests currently verify that a tab-caused error propagates through `onValidationChange(true)`.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables govern the YAML editor, `showInvisibles`, or tab validation behavior. The feature can be implemented unconditionally without any new env vars.

### Configuration Files

- **`tailwind.config.ts`**: defines semantic color tokens; if a Tailwind arbitrary variant class is used to style Ace's `.ace_invisible_tab` selector, the color value must come from a token in this file, not a raw palette value.
- **`vitest.workspace.ts`**: two workspace projects (`unit`, `integration`); new `YamlEditor.test.tsx` is a unit test and will be picked up automatically by the `unit` project.
- **`ace-builds` version 1.39.1**: `showInvisibles` has been a stable Ace option since v1.x. No upgrade needed.

### Feature Flags and Deployment Concerns

- No feature flags. No deployment manifests or Docker files are affected by a UI-only change.
- No secrets management concerns.
- The pre-commit license-header check requires Apache 2.0 headers on all new `.tsx`/`.ts` files; the task AC also requires `AI/Run, AI-Generated` inline comments.

---

## 6. Risk Indicators

- **`showInvisibles` glyph visibility in dark theme**: Ace's `tomorrow_night` theme renders `.ace_invisible` characters in `#404040` — nearly invisible against the dark editor background. Without an explicit color override (via Tailwind arbitrary variant selector on the container `className`), the tab glyphs may not be "clearly distinct" as required by AC #2. Any override must use a semantic token (e.g., `text-text-quaternary`, `text-in-progress-primary`) rather than a raw color, per the styling guide hard constraint.
- **`showInvisibles` affects all invisible characters, not just tabs**: Ace's standard `showInvisibles` also renders space markers and newline markers. In a YAML editor with significant whitespace, showing all space characters as visible glyphs would be very noisy and intrusive, violating AC #2. The implementation will need to either (a) use Ace's `showInvisibles: true` but CSS-suppress space/newline glyphs and only show tab glyphs, or (b) use Ace's built-in gutter annotations / custom line widgets to mark only tab-containing lines, or (c) rely solely on the error message and `jumpToLine` for AC #1/#4 and skip `showInvisibles`. This is the highest design-decision risk.
- **No `aceOptions` prop escape hatch**: `AceEditorProps` has no way to pass arbitrary Ace options from consumers. Adding `showInvisibles` as a hard-coded always-on init option means it applies to all editor instances (`yaml_editor`, `yaml_config`, `yaml_config_history`, any JSON editor). If this is undesired for the JSON mode or history (read-only) editor, a prop like `showInvisibles?: boolean` must be added and threaded through callers.
- **`YamlEditor` lacks `forwardRef` / `jumpToLine`**: AC #4 requires users to be "guided visually to the problem location(s)". `YamlPanel` can satisfy this today via its existing `jumpToLine` plumbing. `YamlEditor` (used in ToolForm and CustomNodeForm) cannot — it has no ref API. Satisfying AC #4 fully for YamlEditor requires adding `forwardRef` and exposing `jumpToLine`, which is a non-trivial interface change that also requires updating all consumers (ToolForm, CustomNodeForm).
- **No tests for `YamlEditor` or `YamlPanel` validation logic**: Both files are completely untested. Any new logic added has no safety net from existing tests. New tests must be written as part of the task.
- **`AceEditor.test.tsx` tab-command guard**: Line 73–76 asserts that no `addCommand` call includes the word "tab" in the command name. Adding `showInvisibles: true` as an init option does not register any command and will not trip this guard. However, implementors must not add a custom Ace command to handle tab visualization, as it would break this test and the a11y contract.
- **Mount-only `useEffect` for Ace init**: The init `useEffect` at line 63 runs once with empty deps `[]`. `showInvisibles` set there is permanent for the editor instance's lifetime. If a future requirement wants to toggle it (e.g., "show invisibles only when validation fails"), a separate `useEffect` with the appropriate dep would be needed — consistent with the `isDark` pattern but not currently present.
- **js-yaml error messages are not always tab-specific**: When a tab is used for indentation, js-yaml throws a `YamlException` with a message about "bad indentation", not about tabs. When a tab is in a different position, it may or may not throw. An explicit `/\t/.test(yamlText)` check is necessary to guarantee the user always sees a clear, actionable "tab character found" message and to identify the line number.
- **`YamlPanel` history tab (read-only editor)**: The history view renders `<AceEditor readonly>` for the selected historical YAML. If `showInvisibles: true` is unconditional, tab characters in historical versions will also be highlighted. This is likely desirable but worth noting — the read-only editor has `onChange={() => {}}` and cannot be edited, so no "save" interaction is affected.

---

## 7. Summary for Complexity Assessment

This task touches three layers: the shared Ace wrapper component (`AceEditor.tsx`), the reusable form control (`YamlEditor.tsx`), and the workflow editor panel (`YamlPanel.tsx`). The total file change surface is 4–6 files: the three source files above, one updated test file (`AceEditor.test.tsx`), and one new test file for `YamlEditor`. Optionally, `ToolForm.tsx` and `CustomNodeForm.tsx` may require minor updates if `YamlEditor` gains a ref API for `jumpToLine`.

The task is technically modest in scope but carries meaningful design risk at one decision point: Ace's `showInvisibles: true` renders ALL whitespace glyphs (spaces, newlines, tabs), which would be visually noisy in a YAML editor where spaces carry semantic meaning. The implementation must either (a) apply a narrow CSS override via Tailwind arbitrary variant to suppress space/newline glyphs while retaining the tab glyph, (b) use a different Ace API (annotations, markers, or a custom session highlight rule) to highlight only tab characters, or (c) satisfy the "visual indication" acceptance criterion entirely through validation messaging and `jumpToLine` navigation. Each approach has a different complexity profile. This design decision should be resolved before implementation begins.

Test coverage posture is weak for the affected area: `AceEditor` has 4 unit tests, but `YamlEditor` and `YamlPanel` are completely untested at the component level. New tests for tab detection logic in `YamlEditor` and the tab-specific error path in `YamlPanel` are required by the task's acceptance criteria (AC #5, no regression). The testing framework (`Vitest` + RTL) is well-established and the `AceEditor` mock pattern is reusable as a template for new tests.

Key risk factors for complexity scoring: (1) the "show only tabs, not all invisibles" requirement adds CSS/Ace API investigation work; (2) `YamlEditor` lacks a `forwardRef`/`jumpToLine` API needed for full AC #4 compliance; (3) both `YamlEditor` and `YamlPanel` need new tests written from scratch; (4) the styling guide hard constraint (no custom CSS) tightens the implementation options for the visual highlight.
