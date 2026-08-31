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
import { describe, expect, it, vi } from 'vitest'

import SchemaForm from '@/components/SchemaForm'
import { FieldDeclaration } from '@/types/entity/customerConfiguration'

const field = (overrides: Partial<FieldDeclaration> & Pick<FieldDeclaration, 'name' | 'type' | 'label'>) => ({
  description: null,
  required: false,
  max_length: null,
  pattern: null,
  pattern_message: null,
  markup: 'plain' as const,
  ...overrides,
})

const FIELDS: FieldDeclaration[] = [
  field({ name: 'enabled', type: 'switch', label: 'Show disclaimer' }),
  field({ name: 'text', type: 'textarea', label: 'Disclaimer text', max_length: 20 }),
  field({ name: 'title', type: 'input', label: 'Title' }),
]

const renderForm = (props: Partial<React.ComponentProps<typeof SchemaForm>> = {}) =>
  render(
    <SchemaForm
      fields={FIELDS}
      value={{ enabled: false, text: '', title: '' }}
      onChange={vi.fn()}
      {...props}
    />
  )

describe('SchemaForm', () => {
  it('renders one control per declared field', () => {
    renderForm()

    expect(screen.getByLabelText('Show disclaimer')).toBeInTheDocument()
    expect(screen.getByLabelText('Disclaimer text')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })

  it('renders nothing for an unknown field type and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderForm({
      fields: [field({ name: 'colour', type: 'colorpicker' as never, label: 'Colour' })],
      value: { colour: 'red' },
    })

    expect(screen.queryByLabelText('Colour')).not.toBeInTheDocument()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('reports a text change with the full value object', () => {
    const onChange = vi.fn()
    renderForm({ onChange })

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Notice' } })

    expect(onChange).toHaveBeenCalledWith({ enabled: false, text: '', title: 'Notice' })
  })

  it('reports a switch change as a boolean', () => {
    const onChange = vi.fn()
    renderForm({ onChange })

    fireEvent.click(screen.getByLabelText('Show disclaimer'))

    expect(onChange).toHaveBeenCalledWith({ enabled: true, text: '', title: '' })
  })

  it('surfaces a validation error built from the declared max length', () => {
    renderForm({ value: { enabled: false, text: 'x'.repeat(21), title: '' } })

    expect(screen.getByText(/20 characters/i)).toBeInTheDocument()
  })

  it('surfaces a validation error for an empty required field', () => {
    renderForm({
      fields: [field({ name: 'text', type: 'input', label: 'Title', required: true })],
      value: { text: '   ' },
    })

    expect(screen.getByText(/required/i)).toBeInTheDocument()
  })

  it('reports validity to the caller', () => {
    const onValidityChange = vi.fn()

    renderForm({ value: { enabled: false, text: 'x'.repeat(21), title: '' }, onValidityChange })

    expect(onValidityChange).toHaveBeenCalledWith(false)
  })

  it('renders an empty form for an empty declaration list', () => {
    const { container } = renderForm({ fields: [], value: {} })

    expect(container.querySelectorAll('input, textarea')).toHaveLength(0)
  })
})

describe('SchemaForm declared pattern (CR-012)', () => {
  const patterned = field({
    name: 'url',
    type: 'input',
    label: 'URL',
    pattern: '^https://',
    pattern_message: 'URL must start with https://',
  })

  it('surfaces the declared pattern message for a non-matching value', () => {
    render(<SchemaForm fields={[patterned]} value={{ url: 'http://example.com' }} onChange={vi.fn()} />)

    expect(screen.getByText('URL must start with https://')).toBeInTheDocument()
  })

  it('accepts a matching value', () => {
    render(<SchemaForm fields={[patterned]} value={{ url: 'https://example.com' }} onChange={vi.fn()} />)

    expect(screen.queryByText('URL must start with https://')).not.toBeInTheDocument()
  })

  it('does not apply the pattern to an empty optional value', () => {
    render(<SchemaForm fields={[patterned]} value={{ url: '' }} onChange={vi.fn()} />)

    expect(screen.queryByText('URL must start with https://')).not.toBeInTheDocument()
  })
})
