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
import React from 'react'
import { BrowserRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import HelpPage from '../HelpPage'

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

vi.hoisted(() => vi.resetModules())

const { mockUserStore, mockAssistantsStore, mockAppInfoStore } = vi.hoisted(() => {
  const helpAssistants = [
    {
      id: 'onboarding-id',
      slug: 'onboarding',
      name: 'Onboarding Assistant',
      description: 'Get started with the platform',
      icon_url: 'onboarding-icon.png',
    },
    {
      id: 'feedback-id',
      slug: 'feedback',
      name: 'Feedback Assistant',
      description: 'Share your feedback',
      icon_url: 'feedback-icon.png',
    },
    {
      id: 'chatbot-id',
      slug: 'chatbot',
      name: 'Chatbot Assistant',
      description: 'Ask questions and get help',
      icon_url: 'chatbot-icon.png',
    },
  ]

  const configs = [
    {
      id: 'feedbackAssistant',
      settings: { enabled: true },
    },
    {
      id: 'userGuide',
      settings: {
        enabled: true,
        name: 'User Guide',
        description: 'Comprehensive documentation',
        url: 'https://example.com/guide',
      },
    },
    {
      id: 'videoPortal',
      settings: {
        enabled: true,
        name: 'Video Portal',
        description: 'Tutorial videos',
        url: 'https://example.com/videos',
      },
    },
    {
      id: 'youtubeChannel',
      settings: {
        enabled: false,
        name: 'YouTube Channel',
        description: 'Video tutorials on YouTube',
        url: 'https://youtube.com/example',
      },
    },
  ]

  return {
    mockUserStore: {
      user: { id: 'user-123', name: 'Test User' },
    },
    mockAssistantsStore: {
      helpAssistants,
    },
    mockAppInfoStore: {
      configs,
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockUserStore) return mockUserStore
    if (store === mockAssistantsStore) return mockAssistantsStore
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store', () => ({
  userStore: mockUserStore,
  assistantsStore: mockAssistantsStore,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/utils/settings', async () => {
  const actual = await vi.importActual('@/utils/settings')
  return {
    ...actual,
    getConfigItemSettings: vi.fn((configs, id) => {
      const config = configs.find((c: any) => c.id === id)
      return config?.settings || {}
    }),
    isConfigItemEnabled: vi.fn((configs, id) => {
      const config = configs.find((c: any) => c.id === id)
      return config?.settings?.enabled ?? false
    }),
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

describe('HelpPage', () => {
  const initialHelpAssistants = [...mockAssistantsStore.helpAssistants]
  const initialConfigs = [...mockAppInfoStore.configs]

  beforeEach(() => {
    vi.clearAllMocks()
    mockAssistantsStore.helpAssistants = [...initialHelpAssistants]
    mockAppInfoStore.configs = [...initialConfigs]
  })

  it('renders without crashing', () => {
    const { container } = renderWithRouter(<HelpPage />)
    expect(container.firstChild).toBeInTheDocument()
  })

  describe('page header', () => {
    it('displays the page title', () => {
      renderWithRouter(<HelpPage />)
      expect(screen.getByText('Help Center')).toBeInTheDocument()
    })

    it('displays the page description', () => {
      renderWithRouter(<HelpPage />)
      expect(
        screen.getByText('Your go-to place for assistance, learning, and updates.')
      ).toBeInTheDocument()
    })
  })

  describe('AI Help section', () => {
    it('displays AI Help section with title, description, and all assistants', () => {
      renderWithRouter(<HelpPage />)
      expect(screen.getByText('AI Help')).toBeInTheDocument()
      expect(screen.getByText('Get instant support from our smart tools.')).toBeInTheDocument()
      expect(screen.getByText('Onboarding Assistant')).toBeInTheDocument()
      expect(screen.getByText('Get started with the platform')).toBeInTheDocument()
      expect(screen.getByText('Chatbot Assistant')).toBeInTheDocument()
      expect(screen.getByText('Ask questions and get help')).toBeInTheDocument()
    })

    it('does not display feedback assistant when disabled', () => {
      mockAppInfoStore.configs = initialConfigs.map((c) =>
        c.id === 'feedbackAssistant' ? { ...c, settings: { enabled: false } } : c
      )
      renderWithRouter(<HelpPage />)
      expect(screen.queryByText('Feedback Assistant')).not.toBeInTheDocument()
    })

    it('does not display AI Help section when no assistants are available', () => {
      mockAssistantsStore.helpAssistants = []
      renderWithRouter(<HelpPage />)
      expect(screen.queryByText('AI Help')).not.toBeInTheDocument()
    })

    it('displays partial assistants when some are missing', () => {
      mockAssistantsStore.helpAssistants = [
        {
          id: 'onboarding-id',
          slug: 'onboarding',
          name: 'Onboarding Assistant',
          description: 'Get started with the platform',
          icon_url: 'onboarding-icon.png',
        },
      ]
      renderWithRouter(<HelpPage />)
      expect(screen.getByText('Onboarding Assistant')).toBeInTheDocument()
      expect(screen.queryByText('Feedback Assistant')).not.toBeInTheDocument()
      expect(screen.queryByText('Chatbot Assistant')).not.toBeInTheDocument()
    })
  })

  describe('Learning Resources section', () => {
    it('displays Learning Resources section with title, description, and enabled resources', () => {
      renderWithRouter(<HelpPage />)
      expect(screen.getByText('Learning Resources')).toBeInTheDocument()
      expect(
        screen.getByText('Explore guides and videos to get the most out of the platform.')
      ).toBeInTheDocument()
      expect(screen.getByText('User Guide')).toBeInTheDocument()
      expect(screen.getByText('Video Portal')).toBeInTheDocument()
      expect(screen.queryByText('YouTube Channel')).not.toBeInTheDocument()
    })

    it('does not display Learning Resources section when all resources are disabled', () => {
      // @ts-expect-error: i dont know
      mockAppInfoStore.configs = initialConfigs.map((c) => ({
        ...c,
        settings: { ...c.settings, enabled: false },
      }))
      renderWithRouter(<HelpPage />)
      expect(screen.queryByText('Learning Resources')).not.toBeInTheDocument()
    })
  })

  describe('Product Updates section', () => {
    it('displays Product Updates section with title, description, and Release Notes', () => {
      renderWithRouter(<HelpPage />)
      expect(screen.getByText('Product Updates')).toBeInTheDocument()
      expect(screen.getByText("Track what's new, and what's improved!")).toBeInTheDocument()
      expect(screen.getByText('Release Notes')).toBeInTheDocument()
      expect(
        screen.getByText('View the latest changes, fixes, and enhancements.')
      ).toBeInTheDocument()
    })
  })

  describe('sections layout', () => {
    it('renders all sections in order', () => {
      renderWithRouter(<HelpPage />)
      const sections = screen.getAllByRole('heading', { level: 2 })
      expect(sections[0]).toHaveTextContent('AI Help')
      expect(sections[1]).toHaveTextContent('Learning Resources')
      expect(sections[2]).toHaveTextContent('Product Updates')
    })

    it('updates sections when configs change', () => {
      const { rerender } = renderWithRouter(<HelpPage />)
      expect(screen.getByText('User Guide')).toBeInTheDocument()

      // @ts-expect-error: ...
      mockAppInfoStore.configs = initialConfigs.map((c) =>
        c.id === 'userGuide' ? { ...c, settings: { ...c.settings, enabled: false } } : c
      )
      rerender(
        <BrowserRouter>
          <HelpPage />
        </BrowserRouter>
      )

      expect(screen.queryByText('User Guide')).not.toBeInTheDocument()
    })

    it('updates sections when helpAssistants change', () => {
      const { rerender } = renderWithRouter(<HelpPage />)
      expect(screen.getByText('Onboarding Assistant')).toBeInTheDocument()

      mockAssistantsStore.helpAssistants = []
      rerender(
        <BrowserRouter>
          <HelpPage />
        </BrowserRouter>
      )

      expect(screen.queryByText('AI Help')).not.toBeInTheDocument()
    })
  })
})
