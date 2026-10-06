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

import { cleanup, render as rtlRender, screen } from '@testing-library/react'
import { ReactElement, useState } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelOption } from '@/types/entity/configuration'

import { AssistantFormContext } from '../../AssistantForm'
import LLMSelector from '../LLMSelector'

const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

const { mockAppInfoStore, mockUseProjectLLMModels } = vi.hoisted(() => ({
  mockAppInfoStore: { imageGenerationModels: [], getImageGenerationModels: vi.fn() },
  mockUseProjectLLMModels: vi.fn(),
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn(() => mockAppInfoStore),
  subscribe: vi.fn(),
}))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/hooks/useProjectLLMModels', () => ({ useProjectLLMModels: mockUseProjectLLMModels }))
vi.mock('@/pages/assistants/components/AssistantForm/AssistantForm', async () => {
  const { createContext } = await import('react')
  return { default: () => null, AssistantFormContext: createContext({ project: '' }) }
})

const PROJECT_MODELS: ModelOption[] = [
  { label: 'Model A', value: 'model-a', isDefault: true },
  { label: 'Model B', value: 'model-b', isDefault: false },
]

describe('LLMSelector — project model settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseProjectLLMModels.mockReturnValue(PROJECT_MODELS)
  })

  afterEach(cleanup)

  it('scopes the list to the enclosing assistant form project', () => {
    render(
      <AssistantFormContext.Provider value={{ project: 'team' } as any}>
        <LLMSelector value="model-a" onChange={vi.fn()} />
      </AssistantFormContext.Provider>
    )

    expect(mockUseProjectLLMModels).toHaveBeenCalledWith('team')
  })

  it('prefers an explicit project over the form project', () => {
    render(
      <AssistantFormContext.Provider value={{ project: 'team' } as any}>
        <LLMSelector value="model-a" project="workflow-project" onChange={vi.fn()} />
      </AssistantFormContext.Provider>
    )

    expect(mockUseProjectLLMModels).toHaveBeenCalledWith('workflow-project')
  })

  it('resets a model the project hides and names the project in the warning', () => {
    const onChange = vi.fn()
    // Controlled like a real form field, so the reset value flows back into the selector.
    const ControlledSelector = () => {
      const [value, setValue] = useState('hidden-model')
      return (
        <LLMSelector
          value={value}
          project="team"
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
        />
      )
    }

    render(<ControlledSelector />)

    expect(onChange).toHaveBeenCalledWith('model-a')
    expect(
      screen.getByText(
        'Model hidden-model is not available in project team and was reset to default'
      )
    ).toBeInTheDocument()
  })

  it('clears the warning once another model is picked', () => {
    const { rerender } = render(<LLMSelector value="model-a" project="team" onChange={vi.fn()} />)
    rerender(
      <MemoryRouter>
        <LLMSelector value="hidden-model" project="team" onChange={vi.fn()} />
      </MemoryRouter>
    )
    rerender(
      <MemoryRouter>
        <LLMSelector value="model-b" project="team" onChange={vi.fn()} />
      </MemoryRouter>
    )

    expect(screen.queryByText(/was reset to default/)).not.toBeInTheDocument()
  })

  it('does not scope image generation models to a project', () => {
    render(<LLMSelector modelType="imageGeneration" project="team" onChange={vi.fn()} allowEmpty />)

    expect(mockUseProjectLLMModels).toHaveBeenCalledWith(null)
  })
})
