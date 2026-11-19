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

import { render } from '@testing-library/react'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Editor from '../Editor'

const quill = vi.hoisted(() => ({
  root: document.createElement('div'),
  getLength: vi.fn(() => 12),
  setSelection: vi.fn(),
  focus: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
  setText: vi.fn(),
  getModule: vi.fn(),
}))

vi.mock('primereact/editor', () => ({
  Editor: forwardRef(({ onLoad }: any, ref) => {
    useImperativeHandle(ref, () => ({ getQuill: () => quill }))
    useEffect(() => {
      onLoad?.()
    }, [])
    return null
  }),
}))

vi.mock('../quillModules', () => ({
  getEditorModules: vi.fn(() => ({})),
  registerEditorHandlers: vi.fn(),
  unregisterEditorHandlers: vi.fn(),
}))

vi.mock('@/store', () => ({ assistantsStore: { getAllAssistantsOptions: vi.fn() } }))
vi.mock('@/store/chats', () => ({ chatsStore: { currentChat: null } }))
vi.mock('../Editor.scss', () => ({}))

const baseProps = { value: { messageRaw: '<p>hello</p>' }, onChange: vi.fn() } as any

describe('Editor autoFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('moves the caret to the end and focuses the editor on load by default', () => {
    render(<Editor {...baseProps} />)

    expect(quill.setSelection).toHaveBeenCalledWith(12, 0)
    expect(quill.focus).toHaveBeenCalledTimes(1)
  })

  it('focuses the editor on load when autoFocus is true', () => {
    render(<Editor {...baseProps} autoFocus />)

    expect(quill.focus).toHaveBeenCalledTimes(1)
  })

  it('does not focus or move the selection on load when autoFocus is false', () => {
    render(<Editor {...baseProps} autoFocus={false} />)

    expect(quill.setSelection).not.toHaveBeenCalled()
    expect(quill.focus).not.toHaveBeenCalled()
  })

  it('still applies aria attributes and calls onEditorLoad when autoFocus is false', () => {
    const onEditorLoad = vi.fn()
    render(
      <Editor
        {...baseProps}
        autoFocus={false}
        ariaLabelledBy="label-id"
        rootId="root-id"
        onEditorLoad={onEditorLoad}
      />
    )

    expect(quill.root.getAttribute('aria-labelledby')).toBe('label-id')
    expect(quill.root.getAttribute('id')).toBe('root-id')
    expect(onEditorLoad).toHaveBeenCalledWith(quill)
  })
})
