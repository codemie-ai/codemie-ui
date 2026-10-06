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

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import YamlExpandedModal from '../YamlExpandedModal'

vi.mock('@/components/AceEditor/AceEditor', () => ({
  default: React.forwardRef(
    ({ value, onChange }: { value: string; onChange?: (v: string) => void }, ref: any) => {
      React.useImperativeHandle(ref, () => ({ editor: null, jumpToLine: vi.fn() }))
      return (
        <textarea
          data-testid="ace-editor"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )
    }
  ),
}))

vi.mock('@/assets/icons/collapse.svg?react', () => ({ default: () => null }))

afterEach(cleanup)

const renderModal = (props: Partial<React.ComponentProps<typeof YamlExpandedModal>> = {}) => {
  const defaults = {
    visible: true,
    value: 'states:\n  - id: a',
    validationError: null,
    onChange: vi.fn(),
    onCollapse: vi.fn(),
  }
  const merged = { ...defaults, ...props }
  render(<YamlExpandedModal {...merged} />)
  return merged
}

describe('YamlExpandedModal', () => {
  it('renders the title, the editor with the given value, and no Save/Cancel', () => {
    renderModal()

    expect(screen.getByText('YAML Configuration')).toBeInTheDocument()
    expect(screen.getByTestId('ace-editor')).toHaveValue('states:\n  - id: a')
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })

  it('calls onCollapse when the Collapse button is clicked', () => {
    const { onCollapse } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: /Collapse/ }))
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })

  it('forwards editor changes to onChange', () => {
    const { onChange } = renderModal()

    fireEvent.change(screen.getByTestId('ace-editor'), { target: { value: 'key: 1' } })
    expect(onChange).toHaveBeenCalledWith('key: 1')
  })

  it('shows the validation error when set', () => {
    renderModal({ validationError: 'bad indent' })

    expect(screen.getByText('YAML Error: bad indent')).toBeInTheDocument()
  })

  it('renders nothing when not visible', () => {
    renderModal({ visible: false })

    expect(screen.queryByText('YAML Configuration')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ace-editor')).not.toBeInTheDocument()
  })
})
