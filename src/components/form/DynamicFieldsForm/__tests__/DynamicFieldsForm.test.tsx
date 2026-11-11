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

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DynamicFormFieldSchema } from '@/types/dynamicForm'

import DynamicFieldsForm from '../DynamicFieldsForm'

describe('DynamicFieldsForm — free-entry list required state', () => {
  it('forwards required to InputArray for a required free-entry list field', () => {
    const schema = { to: { type: 'list', required: true } as DynamicFormFieldSchema }
    render(<DynamicFieldsForm schema={schema} value={{ to: [] }} onChange={vi.fn()} />)
    expect(screen.getByText('To').parentElement).toHaveTextContent('*')
  })

  it('does not forward required for an optional free-entry list field', () => {
    const optionalSchema = { to: { type: 'list', required: false } as DynamicFormFieldSchema }
    render(<DynamicFieldsForm schema={optionalSchema} value={{ to: [] }} onChange={vi.fn()} />)
    expect(screen.getByText('To').parentElement).not.toHaveTextContent('*')
  })
})
