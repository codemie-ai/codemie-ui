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

import { fireEvent, render, screen } from '@testing-library/react'
import { vi, expect, beforeEach, describe, it } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import AssistantCard from '../AssistantCard'

vi.mock('@/utils/helpers', () => ({
  createdBy: (user) => user?.name || 'Unknown',
  formatCompactCount: (value?: number | string | null) =>
    Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' })
      .format(Number(value) || 0)
      .toLocaleLowerCase(),
}))

vi.mock('@/assets/images/ai-avatar.png', () => ({
  default: 'mocked-ai-avatar-url',
}))

vi.mock('@/components/Tooltip', () => ({
  __esModule: true,
  default: () => <div data-testid="tooltip">Tooltip</div>,
}))

vi.mock('@/constants/assistants', () => ({
  AssistantType: {},
  ASSISTANT_DESCRIPTION_LIMIT: 100,
  ASSISTANT_NAME_LIMIT: 50,
}))

vi.mock('@/constants/avatar', () => ({
  AvatarType: {},
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    removeReaction: vi.fn(),
    reactToAssistant: vi.fn(),
  },
}))

const mockRouterPush = vi.fn()
vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: {
    startNewChat: vi.fn(),
  },
}))

vi.mock('@/store/favorites', () => ({
  favoritesStore: {
    patchAssistantReaction: vi.fn(),
    patchAssistantPinned: vi.fn(),
  },
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFavoritesEnabled: () => [false],
  usePinnedAssistantsEnabled: () => [false],
  useFeatureFlag: () => [false],
}))

describe('AssistantCard', () => {
  const mockAssistant: Assistant = {
    id: 'test-id-123',
    name: 'Test Assistant',
    description: 'This is a test assistant description',
    created_by: {
      id: 'user-123',
      name: 'Test User',
    },
    is_global: false,
    icon_url: 'https://example.com/icon.png',
  } as Assistant

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders assistant card with correct information', () => {
    render(<AssistantCard assistant={mockAssistant} onViewAssistant={() => {}} />)

    expect(screen.getByText('Test Assistant')).toBeInTheDocument()
    expect(screen.getByText('This is a test assistant description')).toBeInTheDocument()
    expect(screen.getByText('by Test User')).toBeInTheDocument()
  })

  it('renders with the correct styling classes', () => {
    const { container } = render(
      <AssistantCard assistant={mockAssistant} onViewAssistant={() => {}} />
    )

    const cardElement = container.children[1] as HTMLElement
    expect(cardElement).toHaveClass('rounded-xl')
    expect(cardElement).toHaveClass('bg-surface-specific-card')
    expect(cardElement).toHaveClass('border-border-structural')
    expect(cardElement).toHaveClass('border-1')
  })

  it('renders custom name and description when provided', () => {
    const customName = 'Custom Name'
    const customDescription = 'Custom Description'

    render(
      <AssistantCard
        assistant={mockAssistant}
        name={customName}
        description={customDescription}
        onViewAssistant={() => {}}
      />
    )

    expect(screen.getByText(customName)).toBeInTheDocument()
    expect(screen.getByText(customDescription)).toBeInTheDocument()
  })

  it('renders navigation element when provided', () => {
    const navigationElement = <div data-testid="navigation">Navigation</div>

    render(
      <AssistantCard
        assistant={mockAssistant}
        navigation={navigationElement}
        onViewAssistant={() => {}}
      />
    )

    expect(screen.getByTestId('navigation')).toBeInTheDocument()
  })

  it('renders status label with correct text', () => {
    render(<AssistantCard assistant={mockAssistant} isShared={true} onViewAssistant={() => {}} />)

    const statusLabel = screen.getByRole('status')
    expect(statusLabel).toBeInTheDocument()
  })

  it('does not render status label when isTemplate is true', () => {
    render(
      <AssistantCard
        assistant={mockAssistant}
        isTemplate={true}
        isShared={true}
        onViewAssistant={() => {}}
      />
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders clone count next to like/dislike counters when assistant is global', () => {
    const globalAssistant: Assistant = {
      ...mockAssistant,
      is_global: true,
      unique_likes_count: 3,
      unique_dislikes_count: 1,
      clone_count: 7,
    }

    render(<AssistantCard assistant={globalAssistant} onViewAssistant={() => {}} />)

    expect(screen.getByLabelText(`Clone ${globalAssistant.name}, 7`)).toBeInTheDocument()
  })

  it('defaults clone count to 0 when clone_count is absent', () => {
    const globalAssistant: Assistant = {
      ...mockAssistant,
      is_global: true,
      unique_likes_count: 0,
      unique_dislikes_count: 0,
    }

    render(<AssistantCard assistant={globalAssistant} onViewAssistant={() => {}} />)

    expect(screen.getByLabelText(`Clone ${globalAssistant.name}, 0`)).toBeInTheDocument()
  })

  it('navigates to clone route when clone button is clicked', () => {
    const globalAssistant: Assistant = {
      ...mockAssistant,
      is_global: true,
      unique_likes_count: 0,
      unique_dislikes_count: 0,
      clone_count: 4,
    }

    render(<AssistantCard assistant={globalAssistant} onViewAssistant={() => {}} />)

    fireEvent.click(screen.getByLabelText(`Clone ${globalAssistant.name}, 4`))

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: 'clone-assistant',
      params: { id: globalAssistant.id },
    })
  })

  it('renders 5-digit counters in compact form and keeps the chat button intact', () => {
    const globalAssistant: Assistant = {
      ...mockAssistant,
      is_global: true,
      unique_likes_count: 12345,
      unique_dislikes_count: 67890,
      clone_count: 54321,
    }

    render(<AssistantCard assistant={globalAssistant} onViewAssistant={() => {}} />)

    expect(screen.getByLabelText(`Like ${globalAssistant.name}, 12345`)).toHaveTextContent('12k')
    expect(screen.getByLabelText(`Dislike ${globalAssistant.name}, 67890`)).toHaveTextContent('68k')
    expect(screen.getByLabelText(`Clone ${globalAssistant.name}, 54321`)).toHaveTextContent('54k')

    const chatButton = screen.getByLabelText(`Start chat with ${globalAssistant.name}`)
    expect(chatButton).toBeInTheDocument()
    expect(chatButton).toHaveClass('shrink-0')
  })
})
