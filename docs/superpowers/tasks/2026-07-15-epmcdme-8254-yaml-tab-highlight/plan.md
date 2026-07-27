# YAML Editor Tab Highlighting — Implementation Plan
<!-- AI-Generated, AI/Run -->

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render tab characters as visible red `→` glyphs in every YAML editor and replace the generic js-yaml parse error with a specific "Tab character found at line N" message.

**Architecture:** Add a `showInvisibles` prop to `AceEditor` that sets Ace's native option and suppresses space/EOL glyphs via Tailwind arbitrary-variant selectors. Both YAML editor consumers (`YamlEditor`, `YamlPanel`) pass `showInvisibles` and gain an explicit `/\t/` guard before delegating to `js-yaml`.

**Tech Stack:** ace-builds 1.39.1 (native `showInvisibles` option), Tailwind CSS arbitrary variants, js-yaml, Vitest 1.6.1 + React Testing Library.

## Global Constraints

- All modified or created `.tsx`/`.ts` files must carry the Apache 2.0 license header block (lines 1–14 matching the existing files).
- All new changes must include `<!-- AI-Generated, AI/Run -->` as a comment on the first non-header line of any new file.
- Tailwind only — no `<style>` blocks, no `style={{}}`, no `.css`/`.scss` files.
- Color values must use semantic tokens (e.g. `text-failed-secondary`), not raw palette values (e.g. `text-red-400`).
- Commit messages: `EPMCDME-8254: Capital sentence` (enforced by Tekton CI regex).
- Run `npm run lint` and `npm run typecheck` before each commit.
- Run `npm run test:unit -- src/path/to/affected.test.tsx` to verify individual test files.

---

### Task 1: AceEditor — `showInvisibles` prop

**Files:**
- Modify: `src/components/AceEditor/AceEditor.tsx`
- Modify: `src/components/AceEditor/__tests__/AceEditor.test.tsx`

**Interfaces:**
- Produces: `AceEditorProps.showInvisibles?: boolean` — consumed by Tasks 2 and 3.

---

- [ ] **Step 1: Write the failing test**

Add one new `it` block inside the existing `describe('AceEditor keyboard focus trap fix', ...)` in `src/components/AceEditor/__tests__/AceEditor.test.tsx`, after the last existing test:

```tsx
it('initializes Ace with showInvisibles: true when the showInvisibles prop is set', () => {
  render(<AceEditor value="" showInvisibles />)

  expect(mockAceEdit).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ showInvisibles: true })
  )
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm run test:unit -- src/components/AceEditor/__tests__/AceEditor.test.tsx
```

Expected: FAIL — `showInvisibles` not yet in the init options.

- [ ] **Step 3: Implement the `showInvisibles` prop in `AceEditor.tsx`**

Make the following changes to `src/components/AceEditor/AceEditor.tsx`:

**3a.** Add `showInvisibles?: boolean` to the `AceEditorProps` interface (after `placeholder`):

```tsx
interface AceEditorProps {
  value: string
  onChange?: (value: string) => void
  lang?: string
  readonly?: boolean
  name?: string
  className?: string
  placeholder?: string
  showInvisibles?: boolean
}
```

**3b.** Destructure `showInvisibles` in the component signature (after `placeholder`):

```tsx
const AceEditor = forwardRef<AceEditorRef, AceEditorProps>(
  (
    {
      value,
      onChange,
      lang = 'yaml',
      readonly = false,
      name = 'ace_editor',
      className,
      placeholder,
      showInvisibles = false,
    },
    ref
  ) => {
```

**3c.** Add `showInvisibles` to the `ace.edit()` options block (after `enableKeyboardAccessibility`):

```tsx
const editor = ace.edit(containerRef.current, {
  mode: `ace/mode/${lang}`,
  theme: `ace/theme/${isDark ? 'tomorrow_night' : 'tomorrow'}`,
  value,
  readOnly: readonly,
  fontSize: 14,
  fontFamily: 'Geist',
  showPrintMargin: false,
  highlightActiveLine: !readonly,
  highlightGutterLine: !readonly,
  useWorker: false,
  placeholder: placeholder || '',
  enableKeyboardAccessibility: true,
  showInvisibles,
})
```

**3d.** Update the container `className` in the `return` statement:

```tsx
return (
  <div
    ref={containerRef}
    className={cn(
      'text-sm rounded-xl w-full h-full [&_div]:!font-geist-mono',
      showInvisibles &&
        '[&_.ace_invisible_space]:!hidden [&_.ace_invisible_eol]:!hidden [&_.ace_invisible_tab]:!text-failed-secondary',
      className
    )}
    data-name={name}
  />
)
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm run test:unit -- src/components/AceEditor/__tests__/AceEditor.test.tsx
```

Expected: all 5 tests PASS (4 existing + 1 new).

- [ ] **Step 5: Lint and typecheck**

```bash
npm run lint
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/AceEditor/AceEditor.tsx src/components/AceEditor/__tests__/AceEditor.test.tsx
git commit -m "EPMCDME-8254: Add showInvisibles prop to AceEditor to render tab glyphs"
```

---

### Task 2: YamlEditor — tab check + new test file

**Files:**
- Modify: `src/components/form/YamlEditor/YamlEditor.tsx`
- Create: `src/components/form/YamlEditor/__tests__/YamlEditor.test.tsx`

**Interfaces:**
- Consumes: `AceEditorProps.showInvisibles?: boolean` from Task 1.
- Produces: nothing new for consumers — `YamlEditorProps` interface is unchanged.

---

- [ ] **Step 1: Create the test file with three failing tests**

Create `src/components/form/YamlEditor/__tests__/YamlEditor.test.tsx`:

```tsx
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// AI-Generated, AI/Run

import { render, screen, fireEvent } from '@testing-library/react'
import { cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import YamlEditor from '../YamlEditor'

vi.mock('@/components/AceEditor/AceEditor', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string
    onChange?: (v: string) => void
  }) => (
    <textarea
      data-testid="ace-editor"
      defaultValue={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

afterEach(cleanup)

describe('YamlEditor tab detection', () => {
  it('shows a tab-specific error message with line number when a tab is present', () => {
    render(<YamlEditor onChange={vi.fn()} />)

    fireEvent.change(screen.getByTestId('ace-editor'), {
      target: { value: 'key:\n\tvalue: 1' },
    })

    expect(
      screen.getByText(/Tab character found at line 2 — YAML requires spaces for indentation/)
    ).toBeInTheDocument()
  })

  it('calls onValidationChange(false) for valid YAML without tabs', () => {
    const onValidationChange = vi.fn()
    render(<YamlEditor onChange={vi.fn()} onValidationChange={onValidationChange} />)

    fireEvent.change(screen.getByTestId('ace-editor'), {
      target: { value: 'key: value' },
    })

    expect(onValidationChange).toHaveBeenCalledWith(false)
  })

  it('calls onValidationChange(true) when a tab character is present', () => {
    const onValidationChange = vi.fn()
    render(<YamlEditor onChange={vi.fn()} onValidationChange={onValidationChange} />)

    fireEvent.change(screen.getByTestId('ace-editor'), {
      target: { value: '\tkey: value' },
    })

    expect(onValidationChange).toHaveBeenCalledWith(true)
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npm run test:unit -- src/components/form/YamlEditor/__tests__/YamlEditor.test.tsx
```

Expected: all 3 tests FAIL — no tab check exists yet, the error message won't match.

- [ ] **Step 3: Add tab check and `showInvisibles` to `YamlEditor.tsx`**

Replace the `handleYamlChange` function in `src/components/form/YamlEditor/YamlEditor.tsx` with:

```tsx
const handleYamlChange = (newYaml: string) => {
  setYamlText(newYaml)

  try {
    if (!newYaml.trim()) {
      // Empty is valid
      onChange({})
      setInternalError(null)
      onValidationChange?.(false)
      return
    }

    if (/\t/.test(newYaml)) {
      const tabLine = newYaml.split('\n').findIndex((line) => /\t/.test(line)) + 1
      setInternalError(
        `Tab character found at line ${tabLine} — YAML requires spaces for indentation`
      )
      onValidationChange?.(true)
      return
    }

    const parsed = yaml.load(newYaml) as any

    // Ensure it's an object
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      setInternalError('Must be a YAML object (key-value pairs)')
      onValidationChange?.(true)
      return
    }

    onChange(parsed)
    setInternalError(null)
    onValidationChange?.(false)
  } catch (err: any) {
    setInternalError(`YAML Error: ${err.message}`)
    onValidationChange?.(true)
  }
}
```

Also update the `<AceEditor>` JSX in the `return` to add `showInvisibles`:

```tsx
<AceEditor
  name="yaml_editor"
  value={yamlText}
  onChange={handleYamlChange}
  lang="yaml"
  placeholder={placeholder}
  showInvisibles
/>
```

- [ ] **Step 4: Run the tests to confirm they pass**

```bash
npm run test:unit -- src/components/form/YamlEditor/__tests__/YamlEditor.test.tsx
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Lint and typecheck**

```bash
npm run lint
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/form/YamlEditor/YamlEditor.tsx \
        src/components/form/YamlEditor/__tests__/YamlEditor.test.tsx
git commit -m "EPMCDME-8254: Add tab detection and showInvisibles to YamlEditor"
```

---

### Task 3: YamlPanel — tab check + `showInvisibles`

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/YamlPanel.tsx`

**Interfaces:**
- Consumes: `AceEditorProps.showInvisibles?: boolean` from Task 1.

---

- [ ] **Step 1: Add the tab check to `validateYaml`**

In `src/pages/workflows/editor/configPanels/YamlPanel.tsx`, replace the `validateYaml` function with:

```tsx
const validateYaml = (yamlText: string) => {
  if (!yamlText.trim()) {
    setValidationError(null)
    return true
  }

  if (/\t/.test(yamlText)) {
    const tabLine = yamlText.split('\n').findIndex((line) => /\t/.test(line)) + 1
    setValidationError(
      `Tab character found at line ${tabLine} — YAML requires spaces for indentation`
    )
    return false
  }

  try {
    const parsed = jsYaml.load(yamlText) as any

    const stateArrays: any[][] = [parsed?.states, parsed?.orphaned_states].filter(Boolean)
    for (const stateArray of stateArrays) {
      const hasMissingId = stateArray.some((s: any) => s != null && !s.id)
      if (hasMissingId) {
        setValidationError('Each state must have an "id" field')
        return false
      }
    }

    setValidationError(null)
    return true
  } catch (error: any) {
    setValidationError(error.message)
    return false
  }
}
```

- [ ] **Step 2: Add `showInvisibles` to the edit-mode `<AceEditor>` (line ~202)**

Replace:
```tsx
<AceEditor
  ref={aceEditorRef}
  value={value}
  onChange={handleYamlChange}
  lang="yaml"
  name="yaml_config"
/>
```

With:
```tsx
<AceEditor
  ref={aceEditorRef}
  value={value}
  onChange={handleYamlChange}
  lang="yaml"
  name="yaml_config"
  showInvisibles
/>
```

- [ ] **Step 3: Add `showInvisibles` to the history `<AceEditor>` (line ~231)**

Replace:
```tsx
<AceEditor
  value={selectedHistoryOption}
  onChange={() => {}}
  lang="yaml"
  readonly
  name="yaml_config_history"
/>
```

With:
```tsx
<AceEditor
  value={selectedHistoryOption}
  onChange={() => {}}
  lang="yaml"
  readonly
  name="yaml_config_history"
  showInvisibles
/>
```

- [ ] **Step 4: Run full unit test suite to confirm no regressions**

```bash
npm run test:unit
```

Expected: all tests PASS.

- [ ] **Step 5: Lint and typecheck**

```bash
npm run lint
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/workflows/editor/configPanels/YamlPanel.tsx
git commit -m "EPMCDME-8254: Add tab detection and showInvisibles to YamlPanel"
```
