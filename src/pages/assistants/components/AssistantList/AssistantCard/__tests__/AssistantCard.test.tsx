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

import { assistantsStore } from '@/store/assistants'
import { favoritesStore } from '@/store/favorites'
import { preferencesStore } from '@/store/preferences'
import { Assistant } from '@/types/entity/assistant'

import AssistantCard from '../AssistantCard'

type CountValue = number | string | null

vi.mock('@/utils/helpers', () => ({
  createdBy: (user) => user?.name || 'Unknown',
  formatCompactCount: (value?: CountValue) =>
    Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' })
      .format(Number(value) || 0)
      .toLocaleLowerCase(),
  formatMetricCount: (value?: CountValue) =>
    Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    }).format(Number(value) || 0),
  formatExactCount: (value?: CountValue) => Number(value || 0).toLocaleString('en-US'),
}))

vi.mock('@/assets/images/ai-avatar.png', () => ({
  default: 'mocked-ai-avatar-url',
}))

vi.mock('@/components/Tooltip', () => ({
  __esModule: true,
  default: () => <div data-testid="tooltip">Tooltip</div>,
}))

vi.mock('@/constants/assistants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/constants/assistants')>()),
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
    pinAssistant: vi.fn(),
    unpinAssistant: vi.fn(),
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
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  },
}))

const { mockMarketplaceFlag } = vi.hoisted(() => ({ mockMarketplaceFlag: { enabled: true } }))
const featureFlags = vi.hoisted(() => ({ favorites: false, pinned: false }))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFavoritesEnabled: () => [featureFlags.favorites],
  usePinnedAssistantsEnabled: () => [featureFlags.pinned],
  useFeatureFlag: () => [false],
  useMarketplaceManagementEnabled: () => [mockMarketplaceFlag.enabled, true],
  useMarketplaceApprovalGateEnabled: () => [false, true],
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

  const OWNER_ID = mockAssistant.created_by!.id
  const ownedFixture: Partial<Assistant> = {
    created_by: { id: OWNER_ID, name: 'Test User', email: '' },
  }
  const nonOwnedFixture: Partial<Assistant> = {
    created_by: { id: 'other-user', name: 'Other User', email: '' },
  }

  const renderCard = (overrides: Partial<Assistant> = {}, isAdmin = false) => {
    const assistant = { ...mockAssistant, ...overrides }
    const isOwned = assistant.created_by?.id === OWNER_ID
    render(
      <AssistantCard
        assistant={assistant}
        isOwned={isOwned}
        isAdmin={isAdmin}
        onViewAssistant={() => {}}
      />
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockMarketplaceFlag.enabled = true
    featureFlags.favorites = false
    featureFlags.pinned = false
    preferencesStore.preferences = null
  })

  describe('pinned and favorited state', () => {
    beforeEach(() => {
      featureFlags.favorites = true
      featureFlags.pinned = true
    })

    it('renders unpinned and unfavorited while preferences are null', () => {
      renderCard()

      expect(screen.getByRole('button', { name: 'Pin assistant' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add to favorites' })).toBeInTheDocument()
    })

    it('renders pinned and favorited from preferences, not from assistant fields', () => {
      preferencesStore.preferences = {
        user_id: 'user-123',
        pinned_assistants: ['', mockAssistant.id],
        favorites: { assistants: [mockAssistant.id], workflows: [], skills: [] },
      }

      renderCard()

      expect(screen.getByRole('button', { name: 'Unpin assistant' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove from favorites' })).toBeInTheDocument()
    })

    it('pins the assistant when an unpinned pin button is clicked', () => {
      renderCard()

      fireEvent.click(screen.getByRole('button', { name: 'Pin assistant' }))

      expect(assistantsStore.pinAssistant).toHaveBeenCalledWith(mockAssistant.id)
    })

    it('adds the assistant to favorites when an unfavorited star is clicked', () => {
      renderCard()

      fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }))

      expect(favoritesStore.addFavorite).toHaveBeenCalledWith('assistant', mockAssistant.id)
    })
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

  it('renders status label for global assistants', () => {
    const globalAssistant: Assistant = {
      ...mockAssistant,
      is_global: true,
      unique_users_count: 42,
    }

    render(<AssistantCard assistant={globalAssistant} onViewAssistant={() => {}} />)

    const statusLabel = screen.getByRole('status')
    expect(statusLabel).toBeInTheDocument()
    expect(statusLabel).toHaveTextContent('42 uses')
  })

  it('renders Shared with project status for a non-owner project member', () => {
    render(
      <AssistantCard
        assistant={mockAssistant}
        isShared={true}
        isOwned={false}
        isProjectMember={true}
        onViewAssistant={() => {}}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('Shared with project')
  })

  it('renders nothing for a user the assistant is shared with individually, outside the project', () => {
    render(
      <AssistantCard
        assistant={mockAssistant}
        isShared={true}
        isOwned={false}
        isProjectMember={false}
        onViewAssistant={() => {}}
      />
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders Shared with project status for the owner who shared their assistant', () => {
    render(
      <AssistantCard
        assistant={mockAssistant}
        isShared={true}
        isOwned={true}
        onViewAssistant={() => {}}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('Shared with project')
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

  it('renders verified badge when is_verified', () => {
    renderCard({ is_verified: true })
    expect(
      screen.getByText(/VERIFIED/i, { selector: '[data-testid="assistant-status-badge"]' })
    ).toBeInTheDocument()
  })

  it('does not render verified badge when not verified', () => {
    renderCard({ is_verified: false })
    expect(
      screen.queryByText(/VERIFIED/i, { selector: '[data-testid="assistant-status-badge"]' })
    ).not.toBeInTheDocument()
  })

  it('renders pending badge for owned card with pending marketplace_status', () => {
    renderCard({ ...ownedFixture, marketplace_status: 'PENDING_REVIEW' })
    expect(
      screen.getByText(/REVIEW/i, { selector: '[data-testid="assistant-status-badge"]' })
    ).toBeInTheDocument()
  })

  it('does not render pending badge for non-owned, non-admin, non-shared card', () => {
    renderCard({ ...nonOwnedFixture, marketplace_status: 'PENDING_REVIEW' })
    expect(
      screen.queryByText(/REVIEW/i, { selector: '[data-testid="assistant-status-badge"]' })
    ).not.toBeInTheDocument()
  })

  it('renders pending badge for shared non-owned card', () => {
    const assistant = {
      ...mockAssistant,
      ...nonOwnedFixture,
      marketplace_status: 'PENDING_REVIEW' as const,
    }
    render(
      <AssistantCard
        assistant={assistant}
        isOwned={false}
        isAdmin={false}
        isShared={true}
        onViewAssistant={() => {}}
      />
    )
    expect(
      screen.getByText(/REVIEW/i, { selector: '[data-testid="assistant-status-badge"]' })
    ).toBeInTheDocument()
  })

  it('does not render rejected badge for non-owned, non-admin card', () => {
    // Rejected assistants stay out of the marketplace entirely, so the badge
    // -- and the reason inside it -- stays restricted to the owner or an admin.
    renderCard({ ...nonOwnedFixture, marketplace_status: 'REJECTED' })
    expect(
      screen.queryByText(/REJECTED/i, { selector: '[data-testid="assistant-status-badge"]' })
    ).not.toBeInTheDocument()
  })

  it('renders rejected badge for non-owned card when viewer is admin', () => {
    renderCard({ ...nonOwnedFixture, marketplace_status: 'REJECTED' }, true)
    expect(
      screen.getByText(/REJECTED/i, { selector: '[data-testid="assistant-status-badge"]' })
    ).toBeInTheDocument()
  })

  it('does not render the rejection reason as text on the card', () => {
    renderCard({
      ...ownedFixture,
      marketplace_status: 'REJECTED',
      marketplace_decision_reason: 'Missing required disclosures',
    })
    expect(screen.queryByTestId('assistant-rejection-reason')).not.toBeInTheDocument()
  })

  it('surfaces the rejection reason to an admin viewing a non-owned card', () => {
    renderCard(
      {
        ...nonOwnedFixture,
        marketplace_status: 'REJECTED',
        marketplace_decision_reason: 'Missing required disclosures',
      },
      true
    )
    expect(screen.getByTestId('assistant-status-badge')).toHaveTextContent(
      'REJECTED: Missing required disclosures'
    )
  })

  describe('when marketplace management is disabled', () => {
    beforeEach(() => {
      mockMarketplaceFlag.enabled = false
    })

    it('does not render the verified badge', () => {
      renderCard({ is_verified: true })
      expect(
        screen.queryByText(/VERIFIED|REVIEW|REJECTED/i, {
          selector: '[data-testid="assistant-status-badge"]',
        })
      ).not.toBeInTheDocument()
    })

    it('does not render the review badge on an owned pending card', () => {
      renderCard({ ...ownedFixture, marketplace_status: 'PENDING_REVIEW' })
      expect(
        screen.queryByText(/VERIFIED|REVIEW|REJECTED/i, {
          selector: '[data-testid="assistant-status-badge"]',
        })
      ).not.toBeInTheDocument()
    })

    it('does not render the rejected badge for an admin', () => {
      renderCard({ ...nonOwnedFixture, marketplace_status: 'REJECTED' }, true)
      expect(
        screen.queryByText(/VERIFIED|REVIEW|REJECTED/i, {
          selector: '[data-testid="assistant-status-badge"]',
        })
      ).not.toBeInTheDocument()
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

  it('shrinks the reaction buttons to content width so they do not push the metric off the card', () => {
    const globalAssistant: Assistant = {
      ...mockAssistant,
      is_global: true,
      unique_likes_count: 3,
      unique_dislikes_count: 1,
      clone_count: 7,
    }

    render(<AssistantCard assistant={globalAssistant} onViewAssistant={() => {}} />)

    const likeButton = screen.getByLabelText(`Like ${globalAssistant.name}, 3`)
    const dislikeButton = screen.getByLabelText(`Dislike ${globalAssistant.name}, 1`)
    const cloneButton = screen.getByLabelText(`Clone ${globalAssistant.name}, 7`)

    for (const button of [likeButton, dislikeButton, cloneButton]) {
      expect(button).toHaveClass('min-w-0')
      expect(button).toHaveClass('px-1.5')
    }
  })
})
