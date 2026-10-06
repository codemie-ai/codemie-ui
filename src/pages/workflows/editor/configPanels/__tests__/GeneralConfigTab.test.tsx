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

import { act, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, it, expect, vi } from 'vitest'

import GeneralConfigTab from '../GeneralConfigTab'

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((s) => s),
  proxy: vi.fn((s) => s),
  subscribe: vi.fn(),
}))
vi.mock('@/store/settings', () => ({
  settingsStore: { settings: {}, indexSettings: vi.fn() },
}))
vi.mock('@/utils/workflows', () => ({
  hasUserIntegrationInYamlConfig: () => false,
}))
vi.mock('@/components/ProjectSelector', () => ({
  default: (props: any) => <input data-testid="project-selector" {...props} />,
}))
vi.mock('@/components/guardrails/GuardrailAssignmentPanel/GuardrailAssignmentPanel', () => ({
  default: () => <div data-testid="guardrail-panel" />,
}))
vi.mock('@/pages/assistants/components/AssistantForm/components/MarketplaceCategories', () => ({
  default: () => <div data-testid="marketplace-categories" />,
}))
vi.mock('./components/TabFooter', () => ({ default: () => null }))

describe('GeneralConfigTab — categories', () => {
  it('renders MarketplaceCategories', () => {
    render(<GeneralConfigTab onClose={vi.fn()} />)
    expect(screen.getByTestId('marketplace-categories')).toBeInTheDocument()
  })

  it('getValues returns categories from defaultValues', async () => {
    const ref = createRef<any>()
    render(
      <GeneralConfigTab
        ref={ref}
        defaultValues={{ name: 'w', categories: ['cat-1'] }}
        onClose={vi.fn()}
      />
    )
    const values = ref.current?.getValues()
    expect(values?.categories).toEqual(['cat-1'])
  })

  it('save without edits keeps categories and is not dirty', async () => {
    const ref = createRef<any>()
    const onUpdate = vi.fn()
    const onChange = vi.fn()
    render(
      <GeneralConfigTab
        ref={ref}
        defaultValues={{ name: 'w', project: 'p', categories: ['cat-1'] }}
        onUpdate={onUpdate}
        onChange={onChange}
        onClose={vi.fn()}
      />
    )
    expect(ref.current?.isDirty()).toBe(false)
    await act(async () => {
      await ref.current?.save()
    })
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ categories: ['cat-1'] }))
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ categories: [] }))
  })
})
