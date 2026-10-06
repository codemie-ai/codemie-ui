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

import {
  act,
  cleanup,
  fireEvent,
  render as rtlRender,
  screen,
  waitFor,
} from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LLMRouterOption, ModelOption } from '@/types/entity/configuration'

import LLMSelector from '../LLMSelector'

// The premium note links to the models catalog, so the selector needs the router
// context the app always provides.
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

const { mockAppInfoStore } = vi.hoisted(() => ({
  mockAppInfoStore: {
    llmModels: [
      { label: 'Claude Opus 4.1', value: 'claude-opus-4-1', isDefault: false, isPremium: true },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
    ],
    llmRouters: [] as LLMRouterOption[],
    imageGenerationModels: [],
    projectLlmModels: {} as Record<string, ModelOption[]>,
    getLLMModels: vi.fn(),
    getProjectLLMModels: vi.fn(),
    getImageGenerationModels: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn(() => mockAppInfoStore),
  subscribe: vi.fn(),
}))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))

// The indication itself is unchanged — a premium selection says so on the closed
// surface and a standard one says nothing. Only the wording moved: the badge
// became a `Premium model` note under the field.
describe('LLMSelector premium indication', () => {
  it('names the selected premium model on the closed surface', () => {
    render(<LLMSelector value="claude-opus-4-1" onChange={vi.fn()} allowEmpty />)

    expect(screen.getByText('Premium model')).toBeInTheDocument()
  })

  it('renders no premium indication for a standard selection', () => {
    render(<LLMSelector value="gpt-4o" onChange={vi.fn()} allowEmpty />)

    expect(screen.queryByText('Premium model')).not.toBeInTheDocument()
  })
})

// Routers are folded into the same flat option list as regular models (no
// grouping here — see ChatPromptLlmSelector for the grouped variant), each
// marked with the same meta-line treatment Premium already uses: a Router
// line in blue, joined with Premium on one line when both apply.
describe('LLMSelector — routers', () => {
  const routerFixture: LLMRouterOption[] = [
    {
      value: 'smart-router',
      label: 'Smart Router',
      isPremium: false,
      tiers: {
        simple: { model: 'gpt-4o', label: 'GPT-4o' },
        medium: { model: 'gpt-4o', label: 'GPT-4o' },
        complex: { model: 'gpt-4o', label: 'GPT-4o' },
        reasoning: { model: 'gpt-4o', label: 'GPT-4o' },
      },
    },
    {
      value: 'premium-router',
      label: 'Premium Router',
      isPremium: true,
      tiers: {
        simple: { model: 'claude-opus-4-1', label: 'Claude Opus 4.1' },
        medium: { model: 'claude-opus-4-1', label: 'Claude Opus 4.1' },
        complex: { model: 'claude-opus-4-1', label: 'Claude Opus 4.1' },
        reasoning: { model: 'claude-opus-4-1', label: 'Claude Opus 4.1' },
      },
    },
  ]

  const openPanel = (props: Partial<Parameters<typeof LLMSelector>[0]> = {}) => {
    const { container } = render(
      <LLMSelector value="gpt-4o" onChange={vi.fn()} allowEmpty {...props} />
    )
    fireEvent.click(container.querySelector('.p-multiselect')!)
    return container
  }

  const rowFor = (label: string) =>
    screen.getAllByTestId('llm-option-row').find((row) => row.textContent?.includes(label))!

  afterEach(() => {
    mockAppInfoStore.llmRouters = []
  })

  it('renders a Router meta line, in blue, on a router option row', () => {
    mockAppInfoStore.llmRouters = routerFixture
    openPanel()

    const row = rowFor('Smart Router')
    const meta = row.querySelector<HTMLElement>('[data-testid="llm-option-meta"]')!
    expect(meta.textContent).toBe('Router')
    expect(meta.querySelector('.text-in-progress-primary')).not.toBeNull()
  })

  it('joins Router and Premium on the same meta line when a router is also premium', () => {
    mockAppInfoStore.llmRouters = routerFixture
    openPanel()

    const row = rowFor('Premium Router')
    const meta = row.querySelector<HTMLElement>('[data-testid="llm-option-meta"]')!
    expect(meta.textContent).toBe('Router · Premium')
  })

  it('renders no Router meta line on a regular model row', () => {
    mockAppInfoStore.llmRouters = routerFixture
    openPanel()

    const row = rowFor('GPT-4o')
    expect(row.querySelector('[data-testid="llm-option-meta"]')).toBeNull()
  })

  it('accepts a router value as a valid selection — no invalid-model warning', () => {
    mockAppInfoStore.llmRouters = routerFixture
    render(<LLMSelector value="smart-router" onChange={vi.fn()} allowEmpty />)

    expect(screen.queryByText(/is not valid and was reset to default/)).not.toBeInTheDocument()
  })
})

describe('LLMSelector workflow model selection', () => {
  const projectModels: ModelOption[] = [
    {
      value: 'project-model',
      deploymentName: 'project-deployment',
      label: 'Project model',
      isDefault: true,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.projectLlmModels = {}
  })

  afterEach(cleanup)

  it('preserves an unavailable selection and displays its stored name', async () => {
    mockAppInfoStore.projectLlmModels = { project: projectModels }
    const onChange = vi.fn()
    render(
      <LLMSelector
        projectId="project"
        value="blocked-model"
        onChange={onChange}
        allowEmpty
        preserveUnavailableSelection
      />
    )
    await act(async () => {})

    expect(screen.getByText('blocked-model')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps an empty custom-node selection so execution can choose the project default', async () => {
    mockAppInfoStore.projectLlmModels = { project: projectModels }
    const onChange = vi.fn()
    const { container } = render(
      <LLMSelector
        projectId="project"
        value=""
        onChange={onChange}
        allowEmpty
        preserveUnavailableSelection
      />
    )
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(await screen.findByText('Project model')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not offer global models while loading or when the project list is empty', async () => {
    // projectLlmModels has no entry for 'project', so the hook returns an empty list
    // (and triggers a fetch) instead of falling back to the unfiltered platform list.
    const onChange = vi.fn()
    const { container } = render(
      <LLMSelector
        projectId="project"
        value="blocked-model"
        onChange={onChange}
        preserveUnavailableSelection
      />
    )
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(screen.queryByRole('option', { name: /GPT-4o/ })).not.toBeInTheDocument()
    expect(mockAppInfoStore.getProjectLLMModels).toHaveBeenCalledWith('project')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('accepts a deployment alias and displays the model label', async () => {
    mockAppInfoStore.projectLlmModels = { project: projectModels }
    const onChange = vi.fn()
    render(
      <LLMSelector
        projectId="project"
        value="project-deployment"
        onChange={onChange}
        preserveUnavailableSelection
      />
    )

    expect(await screen.findByText('Project model')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('continues replacing an unavailable selection in ordinary assistant forms', async () => {
    mockAppInfoStore.projectLlmModels = { project: projectModels }
    const onChange = vi.fn()
    render(<LLMSelector projectId="project" value="blocked-model" onChange={onChange} />)

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('project-model'))
  })

  it('does not leak another project’s cached models into this one', async () => {
    mockAppInfoStore.projectLlmModels = {
      old: [{ value: 'old-model', label: 'Old model', isDefault: true }],
    }
    const props = {
      value: 'blocked-model',
      onChange: vi.fn(),
      allowEmpty: true,
      preserveUnavailableSelection: true,
    }
    const { container } = render(<LLMSelector {...props} projectId="new" />)
    fireEvent.click(container.querySelector('.p-multiselect')!)

    expect(screen.queryByText('Old model')).not.toBeInTheDocument()
    expect(mockAppInfoStore.getProjectLLMModels).toHaveBeenCalledWith('new')
  })
})
