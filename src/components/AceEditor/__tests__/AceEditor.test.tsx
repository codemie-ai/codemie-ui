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

import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import AceEditor from '../AceEditor'

const mockEditor = vi.hoisted(() => ({
  commands: { addCommand: vi.fn() },
  blur: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
  getValue: vi.fn(() => ''),
  setValue: vi.fn(),
  setTheme: vi.fn(),
  setReadOnly: vi.fn(),
  getCursorPosition: vi.fn(() => ({ row: 0, column: 0 })),
  moveCursorToPosition: vi.fn(),
  getSelectedText: vi.fn(() => ''),
  focus: vi.fn(),
  gotoLine: vi.fn(),
  scrollToLine: vi.fn(),
  renderer: { scroller: { setAttribute: vi.fn() } },
}))

const mockAceEdit = vi.hoisted(() => vi.fn(() => mockEditor))

vi.mock('ace-builds', () => ({
  default: { edit: mockAceEdit },
}))

vi.mock('ace-builds/src-noconflict/mode-yaml', () => ({}))
vi.mock('ace-builds/src-noconflict/mode-json', () => ({}))
vi.mock('ace-builds/src-noconflict/theme-tomorrow_night', () => ({}))
vi.mock('ace-builds/src-noconflict/theme-tomorrow', () => ({}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false }),
}))

describe('AceEditor keyboard focus trap fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes Ace with enableKeyboardAccessibility so the textarea leaves the tab order', () => {
    render(<AceEditor value="" />)

    expect(mockAceEdit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enableKeyboardAccessibility: true })
    )
  })

  it('does not hand-roll an Escape or Tab command — relies on Ace built-in a11y mode', () => {
    render(<AceEditor value="" />)

    const names = mockEditor.commands.addCommand.mock.calls.map(
      ([cmd]: [{ name: string }]) => cmd.name
    )

    expect(names).not.toContain('escapeEditor')
    expect(names.some((name: string) => name.toLowerCase().includes('tab'))).toBe(false)
  })

  it('sets a read-only aria-label on the scroller so screen readers are not misled', () => {
    render(<AceEditor value="" readonly />)

    const { calls } = mockEditor.renderer.scroller.setAttribute.mock
    const ariaLabelCall = calls.find(([attr]: [string]) => attr === 'aria-label')

    expect(ariaLabelCall).toBeDefined()
    expect(ariaLabelCall![1]).not.toContain('start editing')
    expect(ariaLabelCall![1]).toBe('Read-only editor content, press Enter to navigate')
  })

  it('sets the editing aria-label on the scroller for editable editors', () => {
    render(<AceEditor value="" />)

    const { calls } = mockEditor.renderer.scroller.setAttribute.mock
    const ariaLabelCall = calls.find(([attr]: [string]) => attr === 'aria-label')

    expect(ariaLabelCall).toBeDefined()
    expect(ariaLabelCall![1]).toBe('Editor content, press Enter to start editing')
  })
})
