# Reset Context Keys Comma-Input Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Reset Context Keys input to accept comma characters by buffering raw text in a `useState` and deferring the array parse to `onBlur`.

**Architecture:** Export a `ResetKeysInput` component from `CommonStateFields.tsx`. It owns a `raw: string` state; `onChange` updates `raw` without parsing; `onBlur` splits, trims, and calls `field.onChange`. A `useEffect` keyed on a stable string derived from `field.value` syncs `raw` from external resets without firing during active typing.

**Tech Stack:** React 18, react-hook-form v7, vitest 1.6, @testing-library/react 16, @testing-library/user-event 14

---

## File Structure

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/pages/workflows/editor/configPanels/CommonStateFields.tsx` | Extract hint constant, add `ResetKeysInput` named export, replace 9-line field block with `<ResetKeysInput />` |
| Create | `src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx` | Four tests covering comma input, onBlur parse, initial render, and external sync |

---

### Task 1: Write failing tests for Reset Context Keys input behaviour

**Test-first: N/A — this task IS writing the tests**

**Files:**
- Create: `src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx`

- [ ] **Step 1: Write the test file**

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
import React, { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Controller, useForm } from 'react-hook-form'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import CommonStateFields, { ResetKeysInput } from '../CommonStateFields'
import type { CommonStateFieldsRef } from '../CommonStateFields'

// Suppress module-level registerFields side-effect
vi.mock('../../utils/visualEditorFieldRegistry', () => ({ registerFields: vi.fn() }))

// Supply the minimum context values that CommonStateFields reads
vi.mock('../../hooks/useWorkflowContext', () => ({
  useWorkflowContext: vi.fn().mockReturnValue({
    setActiveIssue: vi.fn(),
    activeIssue: null,
  }),
  WorkflowContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}))

// Always render accordion children so the Transition Settings fields are visible
vi.mock('../components/ConfigAccordion', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const PLACEHOLDER = 'e.g.: user_data,analysis_result'

function renderWithResetKeys(resetKeys: string[] = []) {
  const ref = createRef<CommonStateFieldsRef>()
  render(
    <CommonStateFields
      ref={ref}
      state={{ id: 'test-state', next: { reset_keys_in_context_store: resetKeys } }}
    />
  )
  return { ref, input: screen.getByPlaceholderText(PLACEHOLDER) }
}

describe('CommonStateFields — Reset Context Keys input', () => {
  beforeEach(() => vi.clearAllMocks())
  const user = userEvent.setup()

  it('preserves a trailing comma while the field is focused', async () => {
    const { input } = renderWithResetKeys()
    await user.click(input)
    await user.type(input, 'key1,')
    expect(input).toHaveValue('key1,')
  })

  it('does not update the form array during typing — only after onBlur trims and parses', async () => {
    const { ref, input } = renderWithResetKeys()
    await user.click(input)
    await user.type(input, ' key1 , key2 , key3 ')
    // Form value must NOT be updated while the user is still typing
    expect(ref.current!.getValues().next?.reset_keys_in_context_store).toEqual([])
    await user.tab() // fires blur
    expect(ref.current!.getValues().next?.reset_keys_in_context_store).toEqual([
      'key1',
      'key2',
      'key3',
    ])
  })

  it('displays an existing string[] as a comma-joined string on initial render', () => {
    const { input } = renderWithResetKeys(['alpha', 'beta'])
    expect(input).toHaveValue('alpha, beta')
  })
})

describe('ResetKeysInput — external field.value sync', () => {
  it('updates the raw buffer when field.value changes externally while unfocused', async () => {
    function ExternalSyncHarness() {
      const { control, reset } = useForm<{ keys: string[] }>({
        defaultValues: { keys: ['initial'] },
      })
      return (
        <>
          <Controller
            name="keys"
            control={control}
            render={({ field, fieldState }) => (
              <ResetKeysInput field={field} fieldState={fieldState} />
            )}
          />
          <button onClick={() => reset({ keys: ['b', 'c'] })}>external-reset</button>
        </>
      )
    }

    const user = userEvent.setup()
    render(<ExternalSyncHarness />)

    const input = screen.getByPlaceholderText(PLACEHOLDER)
    expect(input).toHaveValue('initial')

    await user.click(screen.getByRole('button', { name: 'external-reset' }))
    expect(input).toHaveValue('b, c')
  })
})
```

- [ ] **Step 2: Run the tests — confirm RED**

```bash
npx vitest run src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx
```

Expected failures:
- `preserves a trailing comma` — FAILS: current onChange strips the comma
- `does not update the form array during typing` — FAILS: current onChange updates form on every keystroke
- `updates the raw buffer when field.value changes externally` — FAILS: `ResetKeysInput` not yet exported

`displays an existing string[] as a comma-joined string` may already PASS — that is expected and acceptable.

---

### Task 2: Implement ResetKeysInput and wire it into CommonStateFields

**Test-first: yes — `preserves a trailing comma`, `does not update the form array during typing`, and `updates the raw buffer when field.value changes externally` all fail until this task completes**

**Files:**
- Modify: `src/pages/workflows/editor/configPanels/CommonStateFields.tsx`

- [ ] **Step 1: Add `Ref` to the react import**

In `CommonStateFields.tsx`, update line 17 from:

```tsx
import { forwardRef, useEffect, useImperativeHandle, useState, useMemo } from 'react'
```

to:

```tsx
import { forwardRef, useEffect, useImperativeHandle, useState, useMemo, type Ref } from 'react'
```

- [ ] **Step 2: Add the hint constant and ResetKeysInput export**

After the last import line (line 34, after `import FieldController from './components/FieldController'`) and before `const CONTEXT_STORE_KEEP_CURRENT`, insert:

```tsx
const RESET_KEYS_HINT = `Comma-separated list of specific keys to remove from the context store during state transition.

When specified, only the listed keys will be removed from the context store, while all other keys remain preserved. This provides granular control over context cleanup without clearing the entire store.

Keys that don't exist in the context store are silently ignored. If a reset key is also present in the current state's output, it will be re-added with the new value.

Example:
    user_data,analysis_result

    # Only removes 'user_data' and 'analysis_result', keeps all other keys`

export interface ResetKeysInputProps {
  field: {
    value: string[] | undefined
    onChange: (...event: any[]) => void
    onBlur: () => void
    name: string
    ref: Ref<HTMLInputElement>
  }
  fieldState: { error?: { message?: string } }
}

export function ResetKeysInput({ field, fieldState }: ResetKeysInputProps) {
  const [raw, setRaw] = useState<string>(() =>
    Array.isArray(field.value) ? field.value.join(', ') : ''
  )

  const fieldValueKey = Array.isArray(field.value) ? field.value.join('\0') : ''
  useEffect(() => {
    setRaw(Array.isArray(field.value) ? field.value.join(', ') : '')
  }, [fieldValueKey])

  return (
    <Input
      label="Reset Context Keys"
      placeholder="e.g.: user_data,analysis_result"
      error={fieldState.error?.message}
      hint={RESET_KEYS_HINT}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const keys = raw
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0)
        field.onChange(keys.length > 0 ? keys : [])
        field.onBlur()
      }}
      name={field.name}
      ref={field.ref}
    />
  )
}
```

- [ ] **Step 3: Replace the FieldController render block for reset_keys_in_context_store**

In the JSX (around line 469), replace the entire `FieldController` block for `"next.reset_keys_in_context_store"`:

```tsx
                <FieldController
                  name="next.reset_keys_in_context_store"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      label="Reset Context Keys"
                      placeholder="e.g.: user_data,analysis_result"
                      error={fieldState.error?.message}
                      hint="Comma-separated list of specific keys to remove from the context store during state transition.

                            When specified, only the listed keys will be removed from the context store, while all other keys remain preserved. This provides granular control over context cleanup without clearing the entire store.

                            Keys that don't exist in the context store are silently ignored. If a reset key is also present in the current state's output, it will be re-added with the new value.

                            Example:
                                user_data,analysis_result

                                # Only removes 'user_data' and 'analysis_result', keeps all other keys"
                      value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                      onChange={(e) => {
                        const { value } = e.target
                        const keys = value
                          .split(',')
                          .map((key) => key.trim())
                          .filter((key) => key.length > 0)
                        field.onChange(keys.length > 0 ? keys : [])
                      }}
                    />
                  )}
                />
```

with:

```tsx
                <FieldController
                  name="next.reset_keys_in_context_store"
                  control={control}
                  render={({ field, fieldState }) => (
                    <ResetKeysInput field={field} fieldState={fieldState} />
                  )}
                />
```

- [ ] **Step 4: Run the tests — confirm GREEN**

```bash
npx vitest run src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx
```

Expected: 4/4 PASS

- [ ] **Step 5: Run the full unit suite to confirm no regressions**

```bash
npm run test:unit
```

Expected: all pre-existing tests continue to pass

- [ ] **Step 6: Commit**

```bash
git add src/pages/workflows/editor/configPanels/CommonStateFields.tsx \
        src/pages/workflows/editor/configPanels/__tests__/CommonStateFields.test.tsx
git commit -m "EPMCDME-13189: Fix Reset Context Keys field to accept comma input"
```
