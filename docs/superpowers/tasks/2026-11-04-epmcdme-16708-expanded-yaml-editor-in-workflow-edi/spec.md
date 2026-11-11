# EPMCDME-16708: Expanded YAML editor drops typed text

## Problem

In the workflow editor YAML tab, typing in the expanded (modal) YAML editor loses the text typed so far.
Only the last typed character survives.

## Root cause (confirmed by code reading, not reproduced at runtime)

The analysis candidates (re-key remount, `yaml` prop reset, stale closure) do not fit. Typing never changes
`yamlConfig` (only Save calls `onUpdate`), so `ConfigPanel.tsx:476-486` does not remount `YamlPanel`.
The cause is a feedback loop inside `src/components/AceEditor/AceEditor.tsx`:

1. `YamlPanel.tsx:189-203` keeps two `AceEditor` instances mounted on one `value`: the inline one, hidden behind
   the modal, and the expanded one.
2. A keystroke in the expanded editor calls `handleYamlChange`, which sets `value`.
3. The inline editor's sync effect (`AceEditor.tsx:122-128`) sees `value !== editor.getValue()` and calls
   `editor.setValue(value)`.
4. Ace's `Document.setValue` (`node_modules/ace-builds/src-noconflict/ace.js:7761-7765`) is a `remove` of the
   whole range followed by an `insert`. Each step emits its own `change` event.
5. After the `remove` step the document is empty. The change handler (`AceEditor.tsx:104-109`) compares `''` to
   `valueRef.current`, finds a difference, and calls `onChange('')`.
6. `YamlPanel` sets `value` to `''`. Both editors are then cleared by the sync effect.
7. The next keystroke starts from an empty document, so only that character remains.

The inline editor alone is not affected, because its text already equals the prop and the sync effect does
nothing. The loop needs a second editor whose text differs from the prop. The expanded modal supplies that.
Programmatic `setValue` calls must not be reported as user edits.

## Goal

Typing, pasting and deleting in the expanded YAML editor keep all text. The inline editor and the
`YamlPanel` draft stay in sync with it.

## Acceptance criteria

1. AC1: Typing several characters in a row in the expanded YAML editor keeps all of them; the draft equals the
   full typed text.
2. AC2: Text typed in the expanded editor appears in the inline editor after collapse, and the reverse.
3. AC3: `AceEditor` calls `onChange` only for edits made in that editor, never for updates applied from its
   `value` prop.
4. AC4: An external `value` change still updates the editor text and restores the cursor as before.
5. AC5: A regression test fails on the old code. It uses an `ace` mock whose `setValue` emits the `remove`
   change and then the `insert` change, with two `AceEditor`s bound to one value. The existing tests mock
   `ace-builds` completely, so they cannot show this bug.
6. AC6: Existing `AceEditor`, `YamlPanel`, `YamlExpandedModal` and `ExpandedYaml` tests still pass.

## Non-goals

- No refactor of the `ExpandedYaml*` components or of `Popup`.
- No change to the `ConfigPanel` `key={yamlConfig}` remount behavior.
- No change to the `YamlPanel` Save, Cancel or validation behavior.
- No removal of the hidden inline editor while the modal is open.
- No change to the `AceEditor` public props.
- No fix for the mount-time `onChange` closure in `AceEditor` unless the fix needs it. It is harmless for the
  current consumers.

## Decisions

- Fix in `AceEditor` (suppress change reporting while applying a prop-driven `setValue`) over unmounting the
  inline editor while expanded. This fixes the cause for every consumer, while unmounting only hides it here.
- Suppress with a re-entrancy flag around the sync `setValue` over comparing against the prop. The
  intermediate empty state equals neither the prop nor the final text, so a comparison cannot tell the cases
  apart.
- Regression test with a faithful `ace` mock over a real-browser-only check. A mock that emits the
  remove-then-insert sequence reproduces the loop in Vitest.

## Risks

- `AceEditor` is shared by many screens. The flag only affects prop-driven updates, so user edits are unchanged.
- Not reproduced in a browser. The implementer should confirm manually in the workflow editor, expanded mode,
  by typing quickly.
