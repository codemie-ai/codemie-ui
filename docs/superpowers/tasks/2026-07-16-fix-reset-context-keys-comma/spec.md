# EPMCDME-13189: Fix Reset Context Keys Comma Input

## Problem

The "Reset Context Keys" field in the workflow state configuration panel blocks comma input.
The `onChange` handler in `CommonStateFields.tsx` (lines 488-496) eagerly splits the typed
string on every keystroke and filters empty segments, so any trailing comma is immediately
parsed away and the controlled `value` re-renders without it. The field appears to block
commas, but they are actually accepted, parsed, and silently discarded.

Users cannot configure multiple reset keys through the UI and must fall back to editing YAML
directly.

## Scope

One file: `src/pages/workflows/editor/configPanels/CommonStateFields.tsx`.
No changes to `Input.tsx`, the Yup schema, type definitions, `formUtils.ts`, or any
serialization/duplicate-state logic — all of those are already correct.

## Solution

Extract a `ResetKeysInput` React component inside `CommonStateFields.tsx` that owns a raw
string buffer for the field's display value. The component defers array parsing to `onBlur`.

### `ResetKeysInput` component

**Props**
```
field:      ControllerRenderProps for "next.reset_keys_in_context_store"
fieldState: ControllerFieldState
```

**State**
```
raw: string  — initialized lazily from field.value.join(', ')
```

**Behaviour**
- `onChange(e)` → `setRaw(e.target.value)` — raw keystroke buffer, no parsing
- `onBlur()` → parse `raw` into `string[]`, call `field.onChange(keys)`, then `field.onBlur()`
- `useEffect` keyed on `field.value.join('\0')` → sync `raw` from external field value changes
  (form reset, node switch). The stable string key avoids firing on array reference changes
  where content is identical; the effect never runs during active typing because `field.value`
  only changes after `onBlur` calls `field.onChange`.

**Parse logic (same as existing, applied on blur only)**
```
raw.split(',').map(k => k.trim()).filter(k => k.length > 0)
```
Empty result → `field.onChange([])`.

### Integration

Replace the `FieldController` render callback for `"next.reset_keys_in_context_store"` with
a call to `<ResetKeysInput field={field} fieldState={fieldState} />`. The `FieldController`
itself, its `name`, and `control` props are unchanged.

### Data flow

```
User types "key1,"
  → setRaw("key1,")              [field.value stays ["key1"] — no change]
User tabs away
  → parse "key1," → ["key1"]
  → field.onChange(["key1"])     [form state updated]
  → useEffect fires, raw → "key1"
  → buildNextStateConfig reads string[] → YAML correct
```

```
External form reset (node switch)
  → field.value changes to new string[]
  → useEffect fires, raw syncs to new array joined as ", "-separated string
```

## Testing

New file: `src/pages/workflows/editor/configPanels/CommonStateFields.test.tsx`

Four required test cases:

1. **Comma preserved while focused** — simulate typing `"key1,"` via `onChange`, assert the
   input `value` still contains the comma before any `blur` fires.

2. **`onBlur` parse and trim** — after typing `"key1, key2 , key3"` and firing `blur`,
   assert `field.onChange` was called with `["key1", "key2", "key3"]`.

3. **Initial render from existing array** — render with `field.value = ["alpha", "beta"]`,
   assert the input displays `"alpha, beta"`.

4. **`useEffect` sync on external change** — change `field.value` from `["a"]` to `["b", "c"]`
   while the field is not focused, assert the input updates to `"b, c"`.

## Acceptance Criteria

| # | Criterion | How satisfied |
|---|---|---|
| 1 | Field accepts commas while typing | `onChange` buffers raw string, no parse per keystroke |
| 2 | UI supports `key1,key2,key3` entry | `onBlur` parses comma-separated raw string into array |
| 3 | Saved correctly in YAML/configuration | `field.onChange(string[])` → form state → `buildNextStateConfig` unchanged |
| 4 | Existing YAML-based configs work | No schema, type, or serialization changes |
| 5 | New test coverage | CommonStateFields.test.tsx with 4 specified cases |
