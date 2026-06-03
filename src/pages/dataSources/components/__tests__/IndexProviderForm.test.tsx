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
import userEvent from '@testing-library/user-event'
import { useForm, FieldValues } from 'react-hook-form'
import { describe, it, expect, vi } from 'vitest'

import { DataProvider } from '@/types/entity/dataSource'

import { PROVIDER_FIELD_TYPES } from '../../constants'
import IndexProviderForm from '../IndexProviderForm'

// ─── Mocks for SVG imports ─────────────────────────────────────────────────────

vi.mock('@/assets/icons/cross.svg?react', () => ({ default: () => null }))

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface HarnessProps {
  dataProvider: DataProvider
  values?: { base_params?: Record<string, any>; create_params?: Record<string, any> }
  defaultValues?: FieldValues
}

// Wraps IndexProviderForm in a real react-hook-form context so the Controllers
// inside have a working control/errors/setValue, matching the runtime wiring
// done by DataSourceForm.
const Harness = ({ dataProvider, values, defaultValues }: HarnessProps) => {
  const { control, formState, setValue } = useForm({ defaultValues })
  return (
    <IndexProviderForm
      dataProvider={dataProvider}
      values={values ?? {}}
      projectName="test-project"
      control={control}
      errors={formState.errors as Record<string, any>}
      setValue={setValue}
    />
  )
}

const buildProvider = (
  fields: Array<{
    name: string
    parameter_type: (typeof PROVIDER_FIELD_TYPES)[keyof typeof PROVIDER_FIELD_TYPES]
    required?: boolean
    description?: string
    title?: string | null
    example?: string | null
  }>
): DataProvider =>
  ({
    id: 'p-1',
    toolkit_id: 't-1',
    provider_name: 'tester',
    name: 'tester',
    base_schema: {
      description: '',
      parameters: fields.map((f) => ({
        name: f.name,
        description: f.description ?? '',
        required: f.required ?? false,
        parameter_type: f.parameter_type,
        enum: null,
        multiselect_options: [],
        title: f.title ?? null,
        example: f.example ?? null,
      })),
    },
    create_schema: { description: '', parameters: [] },
  } as unknown as DataProvider)

// ─── AC2: render branch ───────────────────────────────────────────────────────

describe('IndexProviderForm — TEXT parameter type', () => {
  it('renders a multiline <textarea rows="4"> when parameter_type === "Text"', () => {
    render(
      <Harness
        dataProvider={buildProvider([
          {
            name: 'system_prompt',
            parameter_type: PROVIDER_FIELD_TYPES.TEXT,
            description: 'multiline system prompt',
            title: 'System Prompt',
          },
        ])}
      />
    )

    const textarea = document.getElementById('system_prompt') as HTMLTextAreaElement
    expect(textarea).not.toBeNull()
    expect(textarea.tagName).toBe('TEXTAREA')
    expect(textarea).toHaveAttribute('rows', '4')
  })

  // ── AC3: multiline value round-trip ─────────────────────────────────────────
  it('preserves embedded newlines round-tripped through the textarea', async () => {
    const user = userEvent.setup()
    const multilineSeed = 'line one\nline two\nline three'

    render(
      <Harness
        defaultValues={{ multi_line: multilineSeed }}
        values={{ base_params: { multi_line: multilineSeed } }}
        dataProvider={buildProvider([
          {
            name: 'multi_line',
            parameter_type: PROVIDER_FIELD_TYPES.TEXT,
            title: 'Multi Line',
          },
        ])}
      />
    )

    const textarea = document.getElementById('multi_line') as HTMLTextAreaElement
    expect(textarea).not.toBeNull()
    expect(textarea.tagName).toBe('TEXTAREA')
    expect(textarea.value).toBe(multilineSeed)
    expect(textarea.value.split('\n')).toHaveLength(3)

    // Append a 4th line and confirm newlines stay intact through onChange.
    await user.click(textarea)
    await user.keyboard('{End}{Enter}line four')

    expect(textarea.value).toBe(`${multilineSeed}\nline four`)
    expect(textarea.value.split('\n')).toHaveLength(4)
  })

  // ── AC4 regression guard ────────────────────────────────────────────────────
  // Input.tsx renders <input type="password"> for SECRET (sensitive) fields and
  // <input type="text"> for the other stringish types, because IndexProviderForm
  // passes `type={isSensitive ? 'password' : 'text'}`.
  it.each([
    ['STRING', PROVIDER_FIELD_TYPES.STRING, 'text'],
    ['SECRET', PROVIDER_FIELD_TYPES.SECRET, 'password'],
    ['URL', PROVIDER_FIELD_TYPES.URL, 'text'],
    ['NUMBER', PROVIDER_FIELD_TYPES.NUMBER, 'text'],
  ])(
    'still renders a single-line <input> (not <textarea>) when parameter_type === %s',
    (label, parameter_type, expectedInputType) => {
      const fieldName = `${String(label).toLowerCase()}_field`
      render(
        <Harness
          dataProvider={buildProvider([
            { name: fieldName, parameter_type, title: `${label} Field` },
          ])}
        />
      )

      const control = document.getElementById(fieldName) as HTMLElement
      expect(control).not.toBeNull()
      expect(control.tagName).toBe('INPUT')
      expect(control).toHaveAttribute('type', expectedInputType)
      // Sanity: ensure no textarea was rendered for these types.
      expect(document.querySelector(`textarea#${fieldName}`)).toBeNull()
    }
  )
})
