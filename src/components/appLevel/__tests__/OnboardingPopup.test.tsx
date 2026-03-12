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

import OnboardingPopup from '../OnboardingPopup'

vi.hoisted(() => vi.resetModules())

const mockRouter = {
  push: vi.fn(),
}

const { mockAppInfoStore, mockUserStore } = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      configs: [
        {
          id: 'userGuide',
          settings: {
            enabled: true,
            name: 'User Guide',
            url: 'https://example.com/guide',
          },
        },
        {
          id: 'videoPortal',
          settings: {
            enabled: true,
            name: 'Video Portal',
            url: 'https://example.com/videos',
          },
        },
      ],
      isOnboardingCompleted: vi.fn(() => false),
      completeOnboarding: vi.fn(),
    },
    mockUserStore: {
      isSSOUser: vi.fn(() => true),
    },
  }
})

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => mockRouter),
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAppInfoStore) return mockAppInfoStore
    if (store === mockUserStore) return mockUserStore
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

vi.mock('@/utils/settings', async () => {
  const actual = await vi.importActual('@/utils/settings')
  return {
    ...actual,
    getConfigItem: vi.fn((configs, id) => configs.find((c: any) => c.id === id)),
    doesAssistantBySlugExist: vi.fn(() => Promise.resolve(true)),
  }
})

vi.mock('@/constants/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/constants/common')>()
  return {
    ...actual,
    ADDITIONAL_USER_MATERIALS: {
      USER_GUIDE: 'userGuide',
      VIDEO_PORTAL: 'videoPortal',
      YOUTUBE_CHANNEL: 'youtubeChannel',
    },
  }
})

vi.mock('@/constants/assistants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/constants/assistants')>()
  return {
    ...actual,
    ONBOARDING_ASSISTANT_SLUG: 'onboarding',
    FEEDBACK_ASSISTANT_SLUG: 'feedback',
    CHATBOT_ASSISTANT_SLUG: 'chatbot',
  }
})

describe('OnboardingPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.isOnboardingCompleted.mockReturnValue(false)
    mockUserStore.isSSOUser.mockReturnValue(true)
  })

  describe('visibility behavior', () => {
    it('shows popup for SSO user with incomplete onboarding', () => {
      mockAppInfoStore.isOnboardingCompleted.mockReturnValue(false)
      mockUserStore.isSSOUser.mockReturnValue(true)

      render(<OnboardingPopup />)
      expect(screen.getByText('Onboarding')).toBeInTheDocument()
    })

    it('does not show popup when onboarding is completed or for non-SSO user', () => {
      mockAppInfoStore.isOnboardingCompleted.mockReturnValue(true)
      mockUserStore.isSSOUser.mockReturnValue(true)

      render(<OnboardingPopup />)
      expect(screen.queryByText('Onboarding')).not.toBeInTheDocument()

      vi.clearAllMocks()
      mockAppInfoStore.isOnboardingCompleted.mockReturnValue(false)
      mockUserStore.isSSOUser.mockReturnValue(false)

      render(<OnboardingPopup />)
      expect(screen.queryByText('Onboarding')).not.toBeInTheDocument()
    })
  })

  describe('popup content', () => {
    it('displays header, introduction text, and action button', () => {
      render(<OnboardingPopup />)
      expect(screen.getByText('Onboarding')).toBeInTheDocument()
      expect(
        screen.getByText(/To start using AI\/Run, navigate to Explore Assistants/i)
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Got It, Thanks!/i })).toBeInTheDocument()
    })
  })

  describe('assistant links', () => {
    it('displays assistant links with descriptions', () => {
      render(<OnboardingPopup />)
      expect(screen.getByText(/AI\/Run Feedback:/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Guides you through initial setup and familiarisation/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/AI\/Run Chatbot:/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Assists with real-time conversations and generates instant responses/i)
      ).toBeInTheDocument()
    })
  })

  describe('material links', () => {
    it('displays material links section and configured materials', () => {
      render(<OnboardingPopup />)
      expect(
        screen.getByText(/please familiarise yourself with the following materials/i)
      ).toBeInTheDocument()
      expect(screen.getByText('User Guide')).toBeInTheDocument()
      expect(screen.getByText('Video Portal')).toBeInTheDocument()
    })

    it('does not display material section when no materials configured', () => {
      mockAppInfoStore.configs = []
      render(<OnboardingPopup />)
      expect(
        screen.queryByText(/please familiarise yourself with the following materials/i)
      ).not.toBeInTheDocument()
    })

    it('only displays enabled materials', () => {
      mockAppInfoStore.configs = [
        {
          id: 'userGuide',
          settings: {
            enabled: true,
            name: 'User Guide',
            url: 'https://example.com/guide',
          },
        },
        {
          id: 'disabled_material',
          settings: {
            enabled: false,
            name: 'Disabled Material',
            url: 'https://example.com/disabled',
          },
        },
      ]

      render(<OnboardingPopup />)
      expect(screen.getByText('User Guide')).toBeInTheDocument()
      expect(screen.queryByText('Disabled Material')).not.toBeInTheDocument()
    })
  })

  describe('feedback assistant visibility', () => {
    it('hides feedback assistant when disabled', () => {
      mockAppInfoStore.configs = [
        {
          id: 'feedback',
          settings: { enabled: false, name: '', url: '' },
        },
      ]

      render(<OnboardingPopup />)
      // Should only show onboarding assistant (first one), not feedback
      const descriptions = screen.queryByText(
        /Helps report bugs and features efficiently to CodeMie team/i
      )
      expect(descriptions).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles empty configs array', () => {
      mockAppInfoStore.configs = []
      render(<OnboardingPopup />)
      expect(screen.getByText('Onboarding')).toBeInTheDocument()
    })

    it('handles configs without settings', () => {
      mockAppInfoStore.configs = [{ id: 'invalid', settings: undefined } as any]
      render(<OnboardingPopup />)
      expect(screen.getByText('Onboarding')).toBeInTheDocument()
    })

    it('renders without crashing for SSO users', () => {
      const { container } = render(<OnboardingPopup />)
      expect(container).toBeInTheDocument()
    })
  })
})
