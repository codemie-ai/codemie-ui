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

import { afterEach, describe, expect, it, vi } from 'vitest'

import { navigationIntroductionFlow } from '@/configs/onboarding/navigationIntroduction'

vi.mock('@/components/Onboarding/FirstTimeWelcomeContent', () => ({ default: () => null }))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    completeOnboarding: vi.fn(),
    navigationExpanded: false,
    toggleNavigationExpanded: vi.fn(),
  },
}))
vi.mock('@/store/user', () => ({ userStore: { user: null } }))
vi.mock('@/utils/enterpriseEdition', () => ({ isEnterpriseEdition: vi.fn(() => false) }))
vi.mock('@/utils/onboarding', () => ({
  findNavLinkByText: vi.fn(() => null),
  getElementPosition: vi.fn(() => null),
}))

describe('navigationIntroductionFlow — prebuilt-assistants condition', () => {
  const step = navigationIntroductionFlow.steps.find((s) => s.id === 'prebuilt-assistants')!
  const condition = step.condition!

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns false when [data-onboarding="prebuilt-assistants"] is absent from DOM', () => {
    expect(condition()).toBe(false)
  })

  it('returns true when [data-onboarding="prebuilt-assistants"] exists in DOM', () => {
    const el = document.createElement('div')
    el.setAttribute('data-onboarding', 'prebuilt-assistants')
    document.body.appendChild(el)

    expect(condition()).toBe(true)
  })
})
