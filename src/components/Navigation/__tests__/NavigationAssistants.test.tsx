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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import NavigationAssistants from '../NavigationAssistants'

vi.hoisted(() => vi.resetModules())

const { mockAssistantsStore, mockRouter, mockOnboardingAssistant } = vi.hoisted(() => {
  const mockOnboardingAssistant = {
    id: 'onboarding-id',
    slug: 'onboarding',
    name: 'Onboarding Assistant',
    description: 'Get started',
    icon_url: 'onboarding.png',
  } as any

  const mockAssistantsStore = {
    helpAssistants: [] as any[],
  }

  return {
    mockOnboardingAssistant,
    mockAssistantsStore,
    mockRouter: {
      push: vi.fn(),
      resolve: vi.fn(),
    },
  }
})

const setAssistants = (assistants: any[]) => {
  mockAssistantsStore.helpAssistants = assistants as any
}

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAssistantsStore) return mockAssistantsStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: mockAssistantsStore,
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => mockRouter),
}))

vi.mock('@/constants/assistants', () => ({
  ONBOARDING_ASSISTANT_SLUG: 'onboarding',
  CHATBOT_ASSISTANT_SLUG: 'ai-run-chatbot',
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [true, true]),
}))

describe('NavigationAssistants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setAssistants([])
    mockRouter.resolve.mockReturnValue({ fullPath: '/assistants/test' })
  })

  it('renders nothing when no assistants are available', () => {
    setAssistants([])
    const { container } = render(<NavigationAssistants isExpanded={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders available assistants', () => {
    setAssistants([mockOnboardingAssistant])
    const { container } = render(<NavigationAssistants isExpanded={false} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays assistant names when expanded', () => {
    setAssistants([mockOnboardingAssistant])
    render(<NavigationAssistants isExpanded={true} />)
    expect(screen.getByText('Onboarding Assistant')).toBeInTheDocument()
  })

  it('ignores assistants not in the allowed list', () => {
    const otherAssistant = {
      id: 'other-id',
      slug: 'other-assistant',
      name: 'Other Assistant',
      description: 'Other',
      icon_url: 'other.png',
    } as any
    setAssistants([otherAssistant])
    const { container } = render(<NavigationAssistants isExpanded={true} />)
    expect(container.firstChild).toBeNull()
  })

  it('removes "AI/Run" from assistant names', () => {
    setAssistants([{ ...mockOnboardingAssistant, name: 'AI/Run Onboarding Assistant' }])
    const { container } = render(<NavigationAssistants isExpanded={true} />)
    const assistantText = container.querySelector('.text-sm')

    expect(assistantText?.textContent).toBe(' Onboarding Assistant')
  })

  it('displays assistant icons', () => {
    setAssistants([mockOnboardingAssistant])
    render(<NavigationAssistants isExpanded={false} />)

    const link = screen.getByRole('link', { name: /Onboarding Assistant/i })
    const img = link.querySelector('img')

    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'onboarding.png')
  })

  it('uses generated avatar when icon_url is not provided', () => {
    setAssistants([{ ...mockOnboardingAssistant, icon_url: '' }])
    render(<NavigationAssistants isExpanded={false} />)

    const link = screen.getByRole('link', { name: /Onboarding Assistant/i })
    const img = link.querySelector('img')

    expect(img).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'))
  })

  it('shows tooltips based on expansion state', () => {
    setAssistants([mockOnboardingAssistant])

    const { container, rerender } = render(<NavigationAssistants isExpanded={false} />)
    let link = container.querySelector('a')

    expect(link).toHaveAttribute('data-tooltip-content', 'Onboarding Assistant')

    rerender(<NavigationAssistants isExpanded={true} />)
    link = container.querySelector('a')
    expect(link).toHaveAttribute('data-tooltip-content', 'Onboarding Assistant \n\n Get started')
  })

  it('generates correct links for assistants', () => {
    mockRouter.resolve.mockReturnValue({ fullPath: '/assistants/onboarding/start' })
    setAssistants([mockOnboardingAssistant])

    const { container } = render(<NavigationAssistants isExpanded={false} />)
    const link = container.querySelector('a')

    expect(link).toHaveAttribute('href', '/#/assistants/onboarding/start')
    expect(mockRouter.resolve).toHaveBeenCalledWith({
      name: 'start-assistant-chat',
      params: { slug: 'onboarding' },
    })
  })

  it('uses empty string when router resolve returns null', () => {
    mockRouter.resolve.mockReturnValue(null)
    setAssistants([mockOnboardingAssistant])

    const { container } = render(<NavigationAssistants isExpanded={false} />)
    const link = container.querySelector('a')

    expect(link).toHaveAttribute('href', '')
  })
})
