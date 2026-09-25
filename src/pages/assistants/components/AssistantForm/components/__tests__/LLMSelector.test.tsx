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

import { fireEvent, render as rtlRender, screen } from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LLMRouterOption } from '@/types/entity/configuration'

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
    getLLMModels: vi.fn(),
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
