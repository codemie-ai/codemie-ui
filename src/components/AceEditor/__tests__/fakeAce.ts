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

import { vi } from 'vitest'

/**
 * Faithful-enough ace editor: setValue emits a "remove" change (document empty)
 * followed by an "insert" change, like the real ace Document does.
 */
export class FakeEditor {
  text = ''

  cursor = { row: 0, column: 0 }

  listeners: Array<() => void> = []

  setValueImpl: ((v: string) => void) | null = null

  commands = { addCommand: vi.fn() }

  renderer = { scroller: { setAttribute: vi.fn() } }

  moveCursorToPosition = vi.fn()

  constructor(public container: HTMLElement, options: { value?: string }) {
    this.text = options.value ?? ''
  }

  on = (event: string, cb: () => void) => {
    if (event === 'change') this.listeners.push(cb)
  }

  emit() {
    this.listeners.forEach((cb) => cb())
  }

  getValue = () => this.text

  setValue = (v: string) => {
    if (this.setValueImpl) {
      this.setValueImpl(v)
      return
    }
    this.text = ''
    this.emit()
    this.text = v
    this.emit()
  }

  simulateUserInput(text: string) {
    this.text = text
    this.emit()
  }

  getCursorPosition = () => this.cursor

  destroy = vi.fn()

  setTheme = vi.fn()

  setReadOnly = vi.fn()

  getSelectedText = () => ''

  focus = vi.fn()

  gotoLine = vi.fn()

  scrollToLine = vi.fn()
}

export const fakeEditors: FakeEditor[] = []

export const fakeAceEdit = (container: HTMLElement, options: { value?: string }) => {
  const editor = new FakeEditor(container, options)
  fakeEditors.push(editor)
  return editor
}

export const editorByName = (name: string) =>
  [...fakeEditors].reverse().find((e) => e.container.getAttribute('data-name') === name)
