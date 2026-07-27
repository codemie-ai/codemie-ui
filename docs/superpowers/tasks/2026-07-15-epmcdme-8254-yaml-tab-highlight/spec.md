# Spec: YAML Editor Tab Character Visual Highlighting
<!-- AI-Generated, AI/Run -->

**Ticket**: EPMCDME-8254  
**Branch**: EPMCDME-8254_yaml-editor-show-tabs  
**Date**: 2026-07-15

---

## Problem

When a tab character (`\t`) exists in the YAML editor, saving is blocked — but users cannot visually locate the tab in the text. The js-yaml parse error message is generic ("bad indentation of a mapping entry") and does not identify the line or cause. Users waste time hunting for invisible characters.

---

## Solution

Two complementary changes:

1. **Visual glyph**: Render tab characters as a visible `→` symbol inside the editor at all times, using Ace Editor's native `showInvisibles` option. Space and newline glyphs are suppressed (they would be noisy in YAML where spaces carry semantic meaning). Tab glyphs are styled in `text-failed-secondary` (red) to match the validation error color and immediately connect the inline glyph to the error message.

2. **Actionable error message**: Before delegating to `js-yaml`, run an explicit `/\t/` regex check. When a tab is found, set a specific error message: `"Tab character found at line N — YAML requires spaces for indentation"`. This replaces the cryptic js-yaml parse message for this case.

---

## Acceptance Criteria Coverage

| AC | How satisfied |
|----|--------------|
| #1 Tab is visually marked | `→` glyph visible via `showInvisibles: true` |
| #2 Non-intrusive, distinct from spaces | Space/EOL glyphs suppressed; only tab glyphs shown, in red |
| #3 Active at all times, not only on save | `showInvisibles` is always-on at editor mount; tab check fires on every keystroke |
| #4 User guided to problem location | Error message includes line number |
| #5 No regression | Tab check returns before `yaml.load()`; no existing paths modified |
| #6 AI labels | Apache 2.0 header + `<!-- AI-Generated, AI/Run -->` on all new/modified files |

---

## Files Changed

### `src/components/AceEditor/AceEditor.tsx`

**New prop** added to `AceEditorProps`:
```ts
showInvisibles?: boolean  // default: false
```

**Ace init options** (inside mount-only `useEffect(fn, [])`):
```ts
showInvisibles: showInvisibles ?? false,
```

**Container `className`** — when `showInvisibles` is true, append Tailwind arbitrary-variant classes:
```ts
cn(
  'text-sm rounded-xl w-full h-full [&_div]:!font-geist-mono',
  showInvisibles && '[&_.ace_invisible_space]:!hidden [&_.ace_invisible_eol]:!hidden [&_.ace_invisible_tab]:!text-failed-secondary',
  className
)
```

Ace renders tabs using CSS class `.ace_invisible_tab`, spaces via `.ace_invisible_space`, and newlines via `.ace_invisible_eol`. This suppresses all but the tab glyph.

---

### `src/components/form/YamlEditor/YamlEditor.tsx`

**Tab check** added at the top of `handleYamlChange`, before `yaml.load()`:
```ts
if (/\t/.test(newYaml)) {
  const tabLine = newYaml.split('\n').findIndex(line => /\t/.test(line)) + 1
  setInternalError(`Tab character found at line ${tabLine} — YAML requires spaces for indentation`)
  onValidationChange?.(true)
  return
}
```

**`<AceEditor>`** receives `showInvisibles` prop:
```tsx
<AceEditor name="yaml_editor" value={yamlText} onChange={handleYamlChange} lang="yaml" placeholder={placeholder} showInvisibles />
```

---

### `src/pages/workflows/editor/configPanels/YamlPanel.tsx`

**Tab check** added at the top of `validateYaml`, before `jsYaml.load()`:
```ts
if (/\t/.test(yamlText)) {
  const tabLine = yamlText.split('\n').findIndex(line => /\t/.test(line)) + 1
  setValidationError(`Tab character found at line ${tabLine} — YAML requires spaces for indentation`)
  return false
}
```

**Both `<AceEditor>` instances** receive `showInvisibles`:
- Edit mode editor (`name="yaml_config"`)
- History viewer (`name="yaml_config_history"`, readonly)

---

## Files Added

### `src/components/form/YamlEditor/__tests__/YamlEditor.test.tsx` (new)

Three unit tests:
1. Tab character in YAML triggers specific "Tab character found at line N" error message
2. Valid YAML (no tabs) parses without error and calls `onValidationChange(false)`
3. `onValidationChange(true)` is called when tabs are present

### `src/components/AceEditor/__tests__/AceEditor.test.tsx` (updated)

One new `it` block added to existing `describe`:
- Asserts that rendering `<AceEditor showInvisibles />` passes `showInvisibles: true` to `mockAceEdit`

---

## What Does NOT Change

- `ToolForm.tsx` and `CustomNodeForm.tsx` — no changes needed; `YamlEditor`'s interface is backward-compatible (`showInvisibles` is internal to `AceEditor`)
- `YamlPanelRef` interface — unchanged
- Save-gate logic in `YamlPanel` — unchanged (`saveDisabled={!!validationError}` remains)
- The `AceEditor.test.tsx` tab-command guard — `showInvisibles` registers no Ace commands

---

## Design Decisions

**Why `showInvisibles` as a prop rather than hard-coded?**  
`AceEditor` is also used for JSON editing and readonly history views. Making `showInvisibles` opt-in prevents unexpected glyph rendering in non-YAML contexts. The YAML consumers (`YamlEditor`, `YamlPanel`) always pass `showInvisibles={true}`.

**Why `text-failed-secondary` for tab color?**  
Semantic token — visible in both light and dark themes, matches the existing validation error color, and communicates "this character is invalid" without introducing a new visual language.

**Why suppress space/EOL glyphs?**  
YAML uses spaces for indentation and structure. Showing all whitespace glyphs would be extremely noisy and confusing, violating AC #2 ("non-intrusive"). Only the invalid character (tab) needs to be visible.

**Why tab check before `yaml.load()`?**  
`js-yaml` reports tab-induced failures as generic "bad indentation" messages. An explicit pre-check guarantees the user always sees "Tab character found at line N" regardless of where in the document the tab appears.
