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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import LogoUploadPanel from '../LogoUploadPanel'

vi.mock('../ImageUploadField', () => ({ default: () => null }))

const encodeToken = (name: string) =>
  btoa(['image/png', 'u-1', name].map((word) => `${word.length}~${word}`).join(''))

const WORKFLOW_ICON_TOKEN = encodeToken('workflow-icons/0123456789abcdef0123456789abcdef.png')

const renderPanel = (value: string) => {
  const onChange = vi.fn()
  render(<LogoUploadPanel value={value} onChange={onChange} onBlur={vi.fn()} />)
  return { onChange, input: screen.getByRole('textbox') }
}

describe('LogoUploadPanel', () => {
  it('keeps a stored workflow icon token when its displayed name is edited', () => {
    const { onChange, input } = renderPanel(WORKFLOW_ICON_TOKEN)

    fireEvent.change(input, { target: { value: '0123456789abcdef0123456789abcdef.pngX' } })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('lets a stored workflow icon token be cleared or replaced with a pasted URL', () => {
    const { onChange, input } = renderPanel(WORKFLOW_ICON_TOKEN)

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.change(input, { target: { value: 'https://example.com/logo.png' } })

    expect(onChange).toHaveBeenNthCalledWith(1, '')
    expect(onChange).toHaveBeenNthCalledWith(2, 'https://example.com/logo.png')
  })

  it('passes typed text through when no workflow icon token is stored', () => {
    const { onChange, input } = renderPanel('')

    fireEvent.change(input, { target: { value: 'h' } })

    expect(onChange).toHaveBeenCalledWith('h')
  })
})
