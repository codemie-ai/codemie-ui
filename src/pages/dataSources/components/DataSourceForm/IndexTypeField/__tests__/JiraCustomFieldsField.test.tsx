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
import { FC } from 'react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import { FormValues } from '../../hooks/useEditPopupForm'
import JiraCustomFieldsField from '../JiraCustomFieldsField'

vi.mock('@/store/dataSources', () => ({
  dataSourceStore: {
    getJiraFields: vi.fn().mockResolvedValue([]),
  },
}))

const TestWrapper: FC = () => {
  const { control } = useForm<FormValues>({
    defaultValues: {
      jiraCustomFields: ['customfield_1', 'customfield_2'],
      setting_id: 's1',
    } as Partial<FormValues>,
  })

  return (
    <JiraCustomFieldsField
      control={control}
      errors={{}}
      projectName="p"
      availableSettings={[{ id: 's1' }]}
    />
  )
}

const renderControl = () => {
  const { container } = render(<TestWrapper />)
  const control = container.querySelector('.p-multiselect')
  expect(control).not.toBeNull()
  return control as HTMLElement
}

describe('JiraCustomFieldsField spacing', () => {
  it('gives the control room to grow so wrapped chip rows are not clipped', () => {
    const { className } = renderControl()

    expect(className).toContain('!h-auto')
    expect(className).toContain('!max-h-none')
    expect(className).toContain('min-h-11')
  })

  it('restores label padding, wrapping and chip gap that the global SCSS removes', () => {
    const { className } = renderControl()

    expect(className).toContain('[&_.p-multiselect-label]:!py-1.5')
    expect(className).toContain('[&_.p-multiselect-label]:!overflow-visible')
    expect(className).toContain('[&_.p-multiselect-label]:!whitespace-normal')
    expect(className).toContain('[&_.p-multiselect-label]:!gap-2')
  })

  it('keeps the field margin off the control, which MultiSelect applies className to twice', () => {
    expect(renderControl().className).not.toMatch(/\bmb-3\b/)
  })
})
