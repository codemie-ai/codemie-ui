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
import { describe, expect, it, vi } from 'vitest'

import OnboardingToursSection from '../OnboardingToursSection'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('valtio', () => ({
  useSnapshot: vi.fn(),
}))

vi.mock('@/components/Onboarding/OnboardingFlowCard', () => ({
  default: (props: { flowId: string }) => <div data-testid={`flow-card-${props.flowId}`} />,
}))

const mockGetAllFlows = vi.fn()
const mockIsFlowCompleted = vi.fn(() => false)

vi.mock('@/store/onboarding', () => ({
  onboardingStore: {
    getAllFlows: () => mockGetAllFlows(),
    isFlowCompleted: () => mockIsFlowCompleted(),
  },
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('OnboardingToursSection', () => {
  it('renders section with data-onboarding="help-onboarding-section" when flows are present', () => {
    mockGetAllFlows.mockReturnValue([
      { id: 'flow-1', name: 'Flow 1', description: 'Desc', emoji: '🎯', duration: '1 min' },
    ])

    const { container } = render(<OnboardingToursSection />)
    const section = container.querySelector('section[data-onboarding="help-onboarding-section"]')
    expect(section).toBeInTheDocument()
  })

  it('returns null and omits the section when no flows are available', () => {
    mockGetAllFlows.mockReturnValue([])

    const { container } = render(<OnboardingToursSection />)
    const section = container.querySelector('section[data-onboarding="help-onboarding-section"]')
    expect(section).not.toBeInTheDocument()
  })
})
