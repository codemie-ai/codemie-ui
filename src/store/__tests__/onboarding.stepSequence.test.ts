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

import { describe, expect, it, vi } from 'vitest'

import { navigationIntroductionFlow } from '@/configs/onboarding/navigationIntroduction'
import { isTechnicalStep } from '@/types/onboarding'

// Import the real flow after mocks are in place

// ─── Mocks for navigationIntroduction.tsx dependencies ───────────────────────

vi.mock('@/components/Onboarding/FirstTimeWelcomeContent', () => ({ default: vi.fn() }))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    completeOnboarding: vi.fn(),
    navigationExpanded: false,
    toggleNavigationExpanded: vi.fn(),
  },
}))

vi.mock('@/store/user', () => ({
  userStore: { user: { userId: 'test-user', isAdmin: false } },
}))

vi.mock('@/utils/enterpriseEdition', () => ({
  isEnterpriseEdition: vi.fn(() => false),
}))

vi.mock('@/utils/onboarding', () => ({
  findNavLinkByText: vi.fn(() => null),
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('navigationIntroductionFlow — onboarding-tours-section step 18 sequence', () => {
  it('onboarding-tours-section step exists and has no delay', () => {
    const step = navigationIntroductionFlow.steps.find((s) => s.id === 'onboarding-tours-section')
    expect(step).toBeDefined()
    expect(step).not.toHaveProperty('delay')
  })

  it('onboarding-tours-section appears between product-updates-section and profile-section', () => {
    const { steps } = navigationIntroductionFlow
    const idxUpdates = steps.findIndex((s) => s.id === 'product-updates-section')
    const idxTours = steps.findIndex((s) => s.id === 'onboarding-tours-section')
    const idxProfile = steps.findIndex((s) => s.id === 'profile-section')

    expect(idxUpdates).toBeGreaterThan(-1)
    expect(idxTours).toBeGreaterThan(idxUpdates)
    expect(idxProfile).toBeGreaterThan(idxTours)
  })

  it('next user-visible step after product-updates-section is onboarding-tours-section, not profile-section', () => {
    const { steps } = navigationIntroductionFlow
    const updatesIdx = steps.findIndex((s) => s.id === 'product-updates-section')
    expect(updatesIdx).toBeGreaterThan(-1)

    let nextVisible: (typeof steps)[number] | null = null
    for (let i = updatesIdx + 1; i < steps.length; i += 1) {
      if (!isTechnicalStep(steps[i])) {
        nextVisible = steps[i]
        break
      }
    }

    expect(nextVisible?.id).toBe('onboarding-tours-section')
  })
})
