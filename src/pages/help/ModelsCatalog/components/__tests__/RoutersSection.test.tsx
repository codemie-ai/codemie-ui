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

import type { LLMRouterOption } from '@/types/entity/configuration'

import RoutersSection from '../RoutersSection'

const { mockAppInfoStore } = vi.hoisted(() => ({
  mockAppInfoStore: {
    findLLMLabel: vi.fn((value: string) => `Label(${value})`),
  },
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))

const baseRouter: LLMRouterOption = {
  value: 'smart-router',
  label: 'Smart Router',
  provider: 'azure_openai',
  isPremium: true,
  routerType: 'switchyard',
  strategy: 'classifier',
  classifierModel: 'gpt-5-mini',
  tiers: {
    simple: { model: 'gpt-5-mini', label: 'GPT-5 mini' },
    medium: { model: 'gpt-5', label: 'GPT-5' },
    complex: { model: 'gpt-5', label: 'GPT-5' },
    reasoning: { model: 'gpt-5-pro', label: 'GPT-5 Pro' },
  },
}

describe('RoutersSection', () => {
  it('renders nothing when there are no routers', () => {
    const { container } = render(<RoutersSection routers={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders router name, premium badge, provider and type/strategy chips', () => {
    render(<RoutersSection routers={[baseRouter]} />)

    expect(screen.getByText('Smart Router')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Premium' })).toBeInTheDocument()
    expect(screen.getByText('Azure OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Switchyard')).toBeInTheDocument()
    expect(screen.getByText('Classifier routing → Label(gpt-5-mini)')).toBeInTheDocument()
  })

  it('renders all 4 tiers in order with their model labels', () => {
    render(<RoutersSection routers={[baseRouter]} />)
    ;['Simple', 'Medium', 'Complex', 'Reasoning'].forEach((label) =>
      expect(screen.getByText(label)).toBeInTheDocument()
    )
    expect(screen.getByText('GPT-5 mini')).toBeInTheDocument()
    expect(screen.getAllByText('GPT-5')).toHaveLength(2)
    expect(screen.getByText('GPT-5 Pro')).toBeInTheDocument()
  })

  it('shows strategy without a classifier arrow when there is no classifier model', () => {
    const signalRouter: LLMRouterOption = {
      ...baseRouter,
      value: 'signal-router',
      label: 'Signal Router',
      strategy: 'signal',
      classifierModel: undefined,
    }
    render(<RoutersSection routers={[signalRouter]} />)

    expect(screen.getByText('Signal routing')).toBeInTheDocument()
  })

  it('falls back to the raw string for unknown router_type/strategy values', () => {
    const unknownRouter: LLMRouterOption = {
      ...baseRouter,
      value: 'exotic-router',
      label: 'Exotic Router',
      routerType: 'future_engine',
      strategy: 'heuristic',
      classifierModel: undefined,
    }
    render(<RoutersSection routers={[unknownRouter]} />)

    expect(screen.getByText('future_engine')).toBeInTheDocument()
    expect(screen.getByText('heuristic')).toBeInTheDocument()
  })

  it('resolves a tier model label via findLLMLabel when the tier has no label', () => {
    const routerWithUnlabeledTier: LLMRouterOption = {
      ...baseRouter,
      value: 'partial-router',
      label: 'Partial Router',
      tiers: {
        ...baseRouter.tiers,
        simple: { model: 'gpt-5-nano' },
      },
    }
    render(<RoutersSection routers={[routerWithUnlabeledTier]} />)

    expect(screen.getByText('Label(gpt-5-nano)')).toBeInTheDocument()
  })
})
