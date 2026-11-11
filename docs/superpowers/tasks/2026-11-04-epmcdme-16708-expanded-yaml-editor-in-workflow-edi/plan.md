# EPMCDME-16708 Expanded YAML editor drops typed text - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** `AceEditor` reports only user edits, so the expanded YAML editor keeps all typed text.

**Architecture:** A per-instance re-entrancy ref in `AceEditor` suppresses `onChange` while the prop-sync effect calls `setValue`. Public props are unchanged.

**Tech Stack:** React 18, ace-builds, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-11-04-epmcdme-16708-expanded-yaml-editor-in-workflow-edi/spec.md`

Commit per task using the repository's existing convention.

## Global Constraints

- Flag lives in a `useRef` inside the component (per instance), never module-level.
- Flag is reset in `try/finally` so a throwing `setValue` cannot leave it set.
- No change to `AceEditor` public props, `ExpandedYaml*`, `Popup`, `ConfigPanel` key, or `YamlPanel` Save/Cancel/validation.

## Review Focus

- `setValue` throws: flag must reset and later user edits still report (Task 1 test).
- Two instances: suppression of one must not suppress the other (Task 1 test).
- External value change still updates text and restores cursor (Task 1 test).

---

### Task 1: Suppress onChange during prop-driven setValue in AceEditor

**Files:**
- Modify: `src/components/AceEditor/AceEditor.tsx:63,104-109,122-128`
- Test: `src/components/AceEditor/__tests__/AceEditor.test.tsx` (add a describe block with a faithful ace mock)

**Interfaces:**
- Produces: no API change. Internal `const isApplyingValueRef = useRef(false)`.

Test-first: yes — with an ace mock whose `setValue` emits a `remove` change (document empty) then an `insert` change, two `AceEditor`s bound to one parent state value: typing "abc" in editor B on the old code calls `onChange('')` and the draft ends as one character; the test asserts the draft is "abc" and fails on old code.

- [ ] **Step 1: Write failing tests** in a separate describe using a local mock (do not disturb the existing full mock; use `vi.doMock`/a separate test file `AceEditor.sync.test.tsx` if the existing `vi.mock` is file-wide). The mock editor keeps a `text` string, `on('change', cb)` registry, `getValue`, `setValue(v)` that sets text `''`, fires change, sets `v`, fires change, plus a `simulateUserInput(text)` helper that sets text and fires change. Cases:
  - two editors on one value: user input in B yields draft equal to full text and A's text equals it (AC1, AC2, AC5);
  - `onChange` is not called when only the `value` prop changes (AC3);
  - external `value` change updates text and calls `moveCursorToPosition` with the prior cursor (AC4);
  - `setValue` throwing once does not block later user-edit `onChange` calls (try/finally);
  - suppression in instance A does not suppress `onChange` in instance B (per-instance).
- [ ] **Step 2: Run** `npx vitest run --project unit src/components/AceEditor` and confirm the new cases fail on old code.
- [ ] **Step 3: Implement** in `AceEditor.tsx`: add `isApplyingValueRef`; in the change handler (l.104-109) return early when it is true; in the sync effect (l.122-128) set it true before `setValue(value, -1)` and reset to false in `finally`, keeping the cursor restore after (outside suppression is fine).
- [ ] **Step 4: Run** the same command; all AceEditor tests pass, including existing ones (AC6).

### Task 2: YamlPanel regression through the expanded modal

**Files:**
- Test: `src/pages/workflows/editor/configPanels/__tests__/YamlPanel.test.tsx` (extend, or create beside existing tests)

Test-first: no — the fix is complete after Task 1; this task only adds a regression test that passes with it. Using the faithful ace mock from Task 1 (share it via a helper in the `AceEditor/__tests__` folder), render `YamlPanel`, open the expanded modal, simulate typing several characters in `yaml_config_expanded`, and assert the draft keeps all of them, then run the existing `YamlPanel`, `YamlExpandedModal` and `ExpandedYaml` test files (`npx vitest run --project unit <paths>`) and confirm they pass (AC6).
