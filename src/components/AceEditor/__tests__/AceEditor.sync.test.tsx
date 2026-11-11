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

import { act, render } from '@testing-library/react'
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import AceEditor from '../AceEditor'
import { editorByName, fakeEditors } from './fakeAce'

vi.mock('ace-builds', async () => {
  const helper = await import('./fakeAce')
  return { default: { edit: helper.fakeAceEdit } }
})
vi.mock('ace-builds/src-noconflict/mode-yaml', () => ({}))
vi.mock('ace-builds/src-noconflict/mode-json', () => ({}))
vi.mock('ace-builds/src-noconflict/theme-tomorrow_night', () => ({}))
vi.mock('ace-builds/src-noconflict/theme-tomorrow', () => ({}))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false }) }))

const Pair = ({ initial }: { initial: string }) => {
  const [draft, setDraft] = useState(initial)
  return (
    <>
      <AceEditor name="A" value={draft} onChange={setDraft} />
      <AceEditor name="B" value={draft} onChange={setDraft} />
      <output data-testid="draft">{draft}</output>
    </>
  )
}

describe('AceEditor onChange only reports user edits', () => {
  beforeEach(() => {
    fakeEditors.length = 0
  })

  it('keeps typed text when two editors share one value', () => {
    const { getByTestId } = render(<Pair initial="" />)
    const a = editorByName('A')!
    const b = editorByName('B')!

    act(() => b.simulateUserInput('abc'))

    expect(getByTestId('draft').textContent).toBe('abc')
    expect(a.text).toBe('abc')
    expect(b.text).toBe('abc')
  })

  it('does not call onChange when only the value prop changes', () => {
    const onChange = vi.fn()
    const { rerender } = render(<AceEditor name="A" value="one" onChange={onChange} />)

    rerender(<AceEditor name="A" value="two" onChange={onChange} />)

    expect(editorByName('A')!.text).toBe('two')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('restores the prior cursor after an external value change', () => {
    const { rerender } = render(<AceEditor name="A" value="one" />)
    const a = editorByName('A')!
    a.cursor = { row: 2, column: 3 }

    rerender(<AceEditor name="A" value="two" />)

    expect(a.moveCursorToPosition).toHaveBeenCalledWith({ row: 2, column: 3 })
  })

  it('still reports user edits after setValue threw once', () => {
    const onChange = vi.fn()
    const { rerender } = render(<AceEditor name="A" value="one" onChange={onChange} />)
    const a = editorByName('A')!
    a.setValueImpl = () => {
      throw new Error('boom')
    }

    expect(() => rerender(<AceEditor name="A" value="two" onChange={onChange} />)).toThrow()
    a.setValueImpl = null
    act(() => a.simulateUserInput('typed'))

    expect(onChange).toHaveBeenCalledWith('typed')
  })

  it('does not let suppression in one instance suppress another', () => {
    const onChangeB = vi.fn()
    const Both = ({ v }: { v: string }) => (
      <>
        <AceEditor name="A" value={v} />
        <AceEditor name="B" value="b" onChange={onChangeB} />
      </>
    )
    const { rerender } = render(<Both v="x" />)
    const a = editorByName('A')!
    const b = editorByName('B')!
    // A's setValue triggers user-like input in B mid-apply
    a.setValueImpl = (v) => {
      a.text = v
      b.simulateUserInput('from-b')
    }

    rerender(<Both v="y" />)

    expect(onChangeB).toHaveBeenCalledWith('from-b')
  })
})
