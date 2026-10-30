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

import ExpandedYamlView from '../ExpandedYamlView'

vi.mock('@/components/AceEditor/AceEditor', () => ({
  default: React.forwardRef(
    (
      {
        value,
        onChange,
        readonly,
        wrap,
      }: { value: string; onChange?: (v: string) => void; readonly?: boolean; wrap?: boolean },
      ref: any
    ) => {
      React.useImperativeHandle(ref, () => ({ editor: null, jumpToLine: vi.fn() }))
      return (
        <textarea
          data-testid="ace-editor"
          data-readonly={String(Boolean(readonly))}
          data-wrap={String(Boolean(wrap))}
          readOnly={readonly}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )
    }
  ),
}))

vi.mock('@/assets/icons/collapse.svg?react', () => ({ default: () => null }))

afterEach(cleanup)

const baseProps = {
  visible: true,
  onCollapse: vi.fn(),
  value: 'states:\n  - id: a',
}

describe('ExpandedYamlView', () => {
  it('renders the frame title, the actions and the editor value', () => {
    render(
      <ExpandedYamlView
        {...baseProps}
        title="config.yaml"
        actions={<button>Download</button>}
        readonly
      />
    )

    expect(screen.getByText('config.yaml')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
    expect(screen.getByTestId('ace-editor')).toHaveValue('states:\n  - id: a')
  })

  it('passes readonly and wrap through to the editor', () => {
    render(<ExpandedYamlView {...baseProps} readonly wrap />)

    expect(screen.getByTestId('ace-editor')).toHaveAttribute('data-readonly', 'true')
    expect(screen.getByTestId('ace-editor')).toHaveAttribute('data-wrap', 'true')
  })

  it('keeps the editor editable and forwards changes to onChange by default', () => {
    const onChange = vi.fn()
    render(<ExpandedYamlView {...baseProps} onChange={onChange} />)

    expect(screen.getByTestId('ace-editor')).toHaveAttribute('data-readonly', 'false')
    fireEvent.change(screen.getByTestId('ace-editor'), { target: { value: 'key: 1' } })
    expect(onChange).toHaveBeenCalledWith('key: 1')
  })

  it('shows the validation error above the frame', () => {
    render(<ExpandedYamlView {...baseProps} validationError="bad indent" />)

    expect(screen.getByText('YAML Error: bad indent')).toBeInTheDocument()
  })

  it('calls onCollapse when the Collapse button is clicked', () => {
    const onCollapse = vi.fn()
    render(<ExpandedYamlView {...baseProps} onCollapse={onCollapse} />)

    fireEvent.click(screen.getByRole('button', { name: /Collapse/ }))
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })
})
