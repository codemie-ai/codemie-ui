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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import FirstTimeUserPopup from '../FirstTimeUserPopup'

vi.hoisted(() => vi.resetModules())

const { mockAppInfoStore, mockUserStore, mockOnboardingStore } = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      isOnboardingCompleted: vi.fn(() => false),
    },
    mockUserStore: {
      isSSOUser: vi.fn(() => true),
    },
    mockOnboardingStore: {
      startFlow: vi.fn(() => Promise.resolve()),
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/store', () => ({
  userStore: mockUserStore,
}))

vi.mock('@/store/onboarding', () => ({
  onboardingStore: mockOnboardingStore,
}))

describe('FirstTimeUserPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.isOnboardingCompleted.mockReturnValue(false)
    mockUserStore.isSSOUser.mockReturnValue(true)
    mockOnboardingStore.startFlow.mockResolvedValue(undefined)
  })

  describe('flow triggering', () => {
    it('starts the navigation-introduction flow for SSO user with incomplete onboarding', () => {
      render(<FirstTimeUserPopup />)
      expect(mockOnboardingStore.startFlow).toHaveBeenCalledWith('navigation-introduction')
    })

    it('does not start flow when onboarding is already completed', () => {
      mockAppInfoStore.isOnboardingCompleted.mockReturnValue(true)
      render(<FirstTimeUserPopup />)
      expect(mockOnboardingStore.startFlow).not.toHaveBeenCalled()
    })

    it('does not start flow for non-SSO user', () => {
      mockUserStore.isSSOUser.mockReturnValue(false)
      render(<FirstTimeUserPopup />)
      expect(mockOnboardingStore.startFlow).not.toHaveBeenCalled()
    })

    it('does not start flow when onboarding is completed and user is not SSO', () => {
      mockAppInfoStore.isOnboardingCompleted.mockReturnValue(true)
      mockUserStore.isSSOUser.mockReturnValue(false)
      render(<FirstTimeUserPopup />)
      expect(mockOnboardingStore.startFlow).not.toHaveBeenCalled()
    })
  })

  describe('rendering', () => {
    it('renders nothing to the DOM', () => {
      const { container } = render(<FirstTimeUserPopup />)
      expect(container.firstChild).toBeNull()
    })

    it('renders without crashing for SSO users', () => {
      const { container } = render(<FirstTimeUserPopup />)
      expect(container).toBeInTheDocument()
    })
  })
})
