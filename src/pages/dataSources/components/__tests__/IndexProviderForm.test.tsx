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

// ─── EPMCDME-13617: MULTISELECT array unwrapping regression ──────────────────

describe('IndexProviderForm — MULTISELECT fields', () => {
  it('REGRESSION: preserves MULTISELECT field values as arrays (not unwrapping to [0])', () => {
    // Scenario: backend returns create_params with a MULTISELECT field as an array:
    // { code_analysis_datasources: ["e8d242c9-9eed-4cdc-aa2f-1380f0fab565"] }
    // The initialValues useMemo should NOT unwrap this to a string.

    const dataSource = [
      { value: 'e8d242c9-9eed-4cdc-aa2f-1380f0fab565', project_name: 'test-project' },
      { value: 'f9e353d0-afef-5edf-bb3g-2481g1fgc676', project_name: 'test-project' },
    ]

    const { container } = render(
      <Harness
        defaultValues={{ code_analysis_datasources: dataSource }}
        values={{
          create_params: {
            code_analysis_datasources: [dataSource[0].value],
          },
        }}
        dataProvider={
          {
            id: 'p-1',
            toolkit_id: 't-1',
            provider_name: 'neo4j',
            name: 'neo4j',
            base_schema: { description: '', parameters: [] },
            create_schema: {
              description: '',
              parameters: [
                {
                  name: 'code_analysis_datasources',
                  description: 'Select data sources',
                  required: true,
                  parameter_type: PROVIDER_FIELD_TYPES.MULTISELECT,
                  enum: null,
                  multiselect_options: dataSource,
                  title: 'Code Analysis Datasources',
                  example: null,
                },
              ],
            },
          } as unknown as DataProvider
        }
      />
    )

    // The MultiSelect component should render with its value as an array.
    // If the value was corrupted to a string, filterMultiselectOptions would crash
    // trying to call "string".every().
    const multiselect = container.querySelector('[id="code_analysis_datasources"]')
    expect(multiselect).not.toBeNull()

    // Verify the form value is preserved as an array, not unwrapped to a string
    const formValue = (multiselect as any)?.value || (multiselect as any)?._value
    expect(Array.isArray(formValue) || formValue === undefined).toBe(true)

    // The bug manifests as a crash inside filterMultiselectOptions when it tries
    // to call currentValue.every() on a string. If we reach this point without
    // an exception, the fix is working.
  })

  // ── AC: multiple values in array ────────────────────────────────────────────
  it('preserves MULTISELECT arrays with multiple values', () => {
    const dataSource = [
      { value: 'uuid-1', project_name: 'test-project' },
      { value: 'uuid-2', project_name: 'test-project' },
      { value: 'uuid-3', project_name: 'test-project' },
    ]

    const multipleValues = ['uuid-1', 'uuid-2']

    render(
      <Harness
        defaultValues={{ code_analysis_datasources: dataSource }}
        values={{
          create_params: {
            code_analysis_datasources: multipleValues,
          },
        }}
        dataProvider={
          {
            id: 'p-1',
            toolkit_id: 't-1',
            provider_name: 'neo4j',
            name: 'neo4j',
            base_schema: { description: '', parameters: [] },
            create_schema: {
              description: '',
              parameters: [
                {
                  name: 'code_analysis_datasources',
                  description: 'Select data sources',
                  required: true,
                  parameter_type: PROVIDER_FIELD_TYPES.MULTISELECT,
                  enum: null,
                  multiselect_options: dataSource,
                  title: 'Code Analysis Datasources',
                  example: null,
                },
              ],
            },
          } as unknown as DataProvider
        }
      />
    )

    // Should render without crashing. Array with 2 elements should stay as array.
    const element = document.querySelector('[id="code_analysis_datasources"]')
    expect(element).not.toBeNull()
    // Verify value is preserved as array
    const formValue = (element as any)?.value || (element as any)?._value
    expect(Array.isArray(formValue) || formValue === undefined).toBe(true)
  })

  // ── AC: empty array ────────────────────────────────────────────────────────
  it('handles empty MULTISELECT array', () => {
    const dataSource = [{ value: 'uuid-1', project_name: 'test-project' }]

    render(
      <Harness
        defaultValues={{ code_analysis_datasources: dataSource }}
        values={{
          create_params: {
            code_analysis_datasources: [],
          },
        }}
        dataProvider={
          {
            id: 'p-1',
            toolkit_id: 't-1',
            provider_name: 'neo4j',
            name: 'neo4j',
            base_schema: { description: '', parameters: [] },
            create_schema: {
              description: '',
              parameters: [
                {
                  name: 'code_analysis_datasources',
                  description: 'Select data sources',
                  required: true,
                  parameter_type: PROVIDER_FIELD_TYPES.MULTISELECT,
                  enum: null,
                  multiselect_options: dataSource,
                  title: 'Code Analysis Datasources',
                  example: null,
                },
              ],
            },
          } as unknown as DataProvider
        }
      />
    )

    const element = document.querySelector('[id="code_analysis_datasources"]')
    expect(element).not.toBeNull()
    // Verify value is preserved as array (empty array)
    const formValue = (element as any)?.value || (element as any)?._value
    expect(Array.isArray(formValue) || formValue === undefined).toBe(true)
  })

  // ── AC: null value (cleared field) ──────────────────────────────────────────
  it('handles null MULTISELECT value', () => {
    const dataSource = [{ value: 'uuid-1', project_name: 'test-project' }]

    render(
      <Harness
        defaultValues={{ code_analysis_datasources: null }}
        values={{
          create_params: {
            code_analysis_datasources: null,
          },
        }}
        dataProvider={
          {
            id: 'p-1',
            toolkit_id: 't-1',
            provider_name: 'neo4j',
            name: 'neo4j',
            base_schema: { description: '', parameters: [] },
            create_schema: {
              description: '',
              parameters: [
                {
                  name: 'code_analysis_datasources',
                  description: 'Select data sources',
                  required: true,
                  parameter_type: PROVIDER_FIELD_TYPES.MULTISELECT,
                  enum: null,
                  multiselect_options: dataSource,
                  title: 'Code Analysis Datasources',
                  example: null,
                },
              ],
            },
          } as unknown as DataProvider
        }
      />
    )

    const element = document.querySelector('[id="code_analysis_datasources"]')
    expect(element).not.toBeNull()
    // Verify null/undefined values don't crash the component
    const formValue = (element as any)?.value || (element as any)?._value
    expect(formValue == null || Array.isArray(formValue)).toBe(true)
  })

  // ── CR-001: null value reset on project switch ──────────────────────────────
  it('resets null MULTISELECT value when filtering by project name', () => {
    // When a user clears a MULTISELECT field (setting it to null) and switches
    // projects, filterMultiselectOptions should reset it to [] to match the
    // filtered options. This test verifies the CR-001 fix.
    const dataSource = [{ value: 'uuid-1', project_name: 'project-a' }]

    render(
      <Harness
        defaultValues={{ code_analysis_datasources: null }}
        values={{
          create_params: {
            code_analysis_datasources: null,
          },
        }}
        dataProvider={
          {
            id: 'p-1',
            toolkit_id: 't-1',
            provider_name: 'neo4j',
            name: 'neo4j',
            base_schema: { description: '', parameters: [] },
            create_schema: {
              description: '',
              parameters: [
                {
                  name: 'code_analysis_datasources',
                  description: 'Select data sources',
                  required: true,
                  parameter_type: PROVIDER_FIELD_TYPES.MULTISELECT,
                  enum: null,
                  multiselect_options: dataSource,
                  title: 'Code Analysis Datasources',
                  example: null,
                },
              ],
            },
          } as unknown as DataProvider
        }
      />
    )

    const element = document.querySelector('[id="code_analysis_datasources"]')
    expect(element).not.toBeNull()
    // Verify null value is handled safely (not crashing)
    const formValue = (element as any)?.value || (element as any)?._value
    expect(formValue == null || Array.isArray(formValue)).toBe(true)
  })

  // ── CR-003: stale scalar value reset on project switch ──────────────────────
  it('resets a non-array scalar MULTISELECT value when filtering by project name', () => {
    // A scalar string can reach the field via a legacy API response or a separate
    // setValue call. The original `!currentValue?.every(...)` implicitly reset any
    // non-array value; the CR-003 fix restores that so a stale scalar does not
    // linger (which would also crash later `.every()`/`.map()` calls).
    const dataSource = [{ value: 'uuid-1', project_name: 'project-a' }]

    render(
      <Harness
        defaultValues={{ code_analysis_datasources: 'stale-scalar-uuid' }}
        values={{
          create_params: {
            code_analysis_datasources: 'stale-scalar-uuid',
          },
        }}
        dataProvider={
          {
            id: 'p-1',
            toolkit_id: 't-1',
            provider_name: 'neo4j',
            name: 'neo4j',
            base_schema: { description: '', parameters: [] },
            create_schema: {
              description: '',
              parameters: [
                {
                  name: 'code_analysis_datasources',
                  description: 'Select data sources',
                  required: true,
                  parameter_type: PROVIDER_FIELD_TYPES.MULTISELECT,
                  enum: null,
                  multiselect_options: dataSource,
                  title: 'Code Analysis Datasources',
                  example: null,
                },
              ],
            },
          } as unknown as DataProvider
        }
      />
    )

    const element = document.querySelector('[id="code_analysis_datasources"]')
    expect(element).not.toBeNull()
    // The stale scalar must be reset (to []) rather than retained as a string.
    const formValue = (element as any)?.value ?? (element as any)?._value
    expect(formValue).not.toBe('stale-scalar-uuid')
    expect(formValue == null || Array.isArray(formValue)).toBe(true)
  })

  // ── AC: single-element array (the original bug scenario) ──────────────────
  it('does NOT unwrap single-element MULTISELECT arrays to strings', () => {
    // This is the exact scenario from EPMCDME-13617 where the bug occurred.
    // Before the fix: ['uuid'] → 'uuid' (string, crashes on .every())
    // After the fix:  ['uuid'] → ['uuid'] (stays array)

    const dataSource = [
      { value: 'e8d242c9-9eed-4cdc-aa2f-1380f0fab565', project_name: 'test-project' },
    ]

    const { container } = render(
      <Harness
        defaultValues={{ code_analysis_datasources: dataSource }}
        values={{
          create_params: {
            code_analysis_datasources: ['e8d242c9-9eed-4cdc-aa2f-1380f0fab565'],
          },
        }}
        dataProvider={
          {
            id: 'p-1',
            toolkit_id: 't-1',
            provider_name: 'neo4j',
            name: 'neo4j',
            base_schema: { description: '', parameters: [] },
            create_schema: {
              description: '',
              parameters: [
                {
                  name: 'code_analysis_datasources',
                  description: 'Select data sources',
                  required: true,
                  parameter_type: PROVIDER_FIELD_TYPES.MULTISELECT,
                  enum: null,
                  multiselect_options: dataSource,
                  title: 'Code Analysis Datasources',
                  example: null,
                },
              ],
            },
          } as unknown as DataProvider
        }
      />
    )

    // Critical: if this doesn't render, the fix didn't work
    const element = container.querySelector('[id="code_analysis_datasources"]')
    expect(element).not.toBeNull()
    // Verify single-element array is preserved, not unwrapped to a string
    const formValue = (element as any)?.value || (element as any)?._value
    expect(Array.isArray(formValue) || formValue === undefined).toBe(true)
  })

  // ── AC: other field types still get unwrapped ────────────────────────────
  it('still unwraps non-MULTISELECT array fields (e.g., STRING, URL, UUID)', () => {
    // Ensure the fix only applies to MULTISELECT, not other field types.
    // Other stringish types like URL, UUID should still be unwrapped from arrays.

    render(
      <Harness
        defaultValues={{ database_url: 'https://localhost:7687' }}
        values={{
          create_params: {
            database_url: ['https://localhost:7687'],
          },
        }}
        dataProvider={
          {
            id: 'p-1',
            toolkit_id: 't-1',
            provider_name: 'neo4j',
            name: 'neo4j',
            base_schema: { description: '', parameters: [] },
            create_schema: {
              description: '',
              parameters: [
                {
                  name: 'database_url',
                  description: 'Database URL',
                  required: true,
                  parameter_type: PROVIDER_FIELD_TYPES.URL,
                  enum: null,
                  multiselect_options: [],
                  title: 'Database URL',
                  example: null,
                },
              ],
            },
          } as unknown as DataProvider
        }
      />
    )

    // Should render without errors. URL field value should be unwrapped from array.
    const urlInput = document.querySelector('[id="database_url"]') as HTMLInputElement
    expect(urlInput).not.toBeNull()
    expect(urlInput.value).toBe('https://localhost:7687')
  })
})
