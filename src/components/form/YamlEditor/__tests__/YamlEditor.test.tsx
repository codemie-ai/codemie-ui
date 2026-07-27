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

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import YamlEditor from '../YamlEditor'

vi.mock('@/components/AceEditor/AceEditor', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea
      data-testid="ace-editor"
      defaultValue={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

afterEach(cleanup)

describe('YamlEditor tab detection', () => {
  it('does not show a tab error for valid YAML with a tab character inside a quoted string value', () => {
    render(<YamlEditor onChange={vi.fn()} />)

    fireEvent.change(screen.getByTestId('ace-editor'), {
      target: { value: 'key: "foo\tbar"' },
    })

    expect(screen.queryByText(/Tab character found/)).not.toBeInTheDocument()
  })

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
