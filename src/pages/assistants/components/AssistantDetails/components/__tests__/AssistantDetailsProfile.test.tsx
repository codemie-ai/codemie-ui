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

import { Assistant } from '@/types/entity/assistant'

import AssistantDetailsProfile from '../AssistantDetailsProfile'

const { mockUserStore } = await vi.hoisted(async () => {
  const { proxy } = await import('valtio')
  return {
    // Mutations in tests below go through this same proxy reference — a
    // mutation on a plain object that was only *passed into* proxy() at
    // creation time does not propagate into valtio's internal state, since
    // proxy() wraps nested plain objects in its own inner proxies.
    mockUserStore: proxy({ user: { userId: 'viewer-1', isAdmin: false as boolean } }),
  }
})

vi.mock('@/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/store')>()
  return {
    ...actual,
    userStore: mockUserStore,
  }
})

vi.mock('@/hooks/useFeatureFlags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useFeatureFlags')>()
  return {
    ...actual,
    useMarketplaceManagementEnabled: () => [true, true],
    useMarketplaceApprovalGateEnabled: () => [false, true],
  }
})

const baseAssistant: Assistant = {
  id: 'assistant-1',
  name: 'Test Assistant',
  icon_url: 'https://example.com/icon.png',
  created_by: { id: 'owner-1', name: 'Owner' },
  is_verified: false,
  marketplace_status: 'PENDING_REVIEW',
  shared: false,
} as Assistant

/**
 * AssistantCard/getAssistantCardInfo show the REVIEW/REJECTED badge to
 * isOwned || isAdmin || isShared, but this component previously only checked
 * isOwned — an admin (or a user the assistant was shared with) saw the badge
 * on the card in the grid, then no badge at all on the same assistant's
 * detail page (EPMCDME-14234, CR-010).
 */
describe('AssistantDetailsProfile badge visibility', () => {
  it('shows the REVIEW badge to the owner', () => {
    mockUserStore.user.userId = 'owner-1'
    mockUserStore.user.isAdmin = false
    render(<AssistantDetailsProfile assistant={baseAssistant} />)
    expect(screen.getByTestId('assistant-status-badge')).toHaveTextContent('REVIEW')
  })

  it('shows the REVIEW badge to an admin who is not the owner', () => {
    mockUserStore.user.userId = 'viewer-1'
    mockUserStore.user.isAdmin = true
    render(<AssistantDetailsProfile assistant={baseAssistant} />)
    expect(screen.getByTestId('assistant-status-badge')).toHaveTextContent('REVIEW')
  })

  it('shows the REVIEW badge to a non-owner the assistant was shared with', () => {
    mockUserStore.user.userId = 'viewer-1'
    mockUserStore.user.isAdmin = false
    render(<AssistantDetailsProfile assistant={{ ...baseAssistant, shared: true }} />)
    expect(screen.getByTestId('assistant-status-badge')).toHaveTextContent('REVIEW')
  })

  it('hides the badge from a non-owner, non-admin, non-shared viewer', () => {
    mockUserStore.user.userId = 'viewer-1'
    mockUserStore.user.isAdmin = false
    render(<AssistantDetailsProfile assistant={baseAssistant} />)
    expect(screen.queryByTestId('assistant-status-badge')).not.toBeInTheDocument()
  })

  it('shows the REJECTED badge to an admin who is not the owner', () => {
    mockUserStore.user.userId = 'viewer-1'
    mockUserStore.user.isAdmin = true
    render(
      <AssistantDetailsProfile assistant={{ ...baseAssistant, marketplace_status: 'REJECTED' }} />
    )
    expect(screen.getByTestId('assistant-status-badge')).toHaveTextContent('REJECTED')
  })

  it('does NOT show the REJECTED badge to a non-owner, non-admin viewer even if shared', () => {
    // Matches AssistantCard: rejected stays out of the marketplace, so its
    // badge is owner/admin-only — sharing does not extend to it.
    mockUserStore.user.userId = 'viewer-1'
    mockUserStore.user.isAdmin = false
    render(
      <AssistantDetailsProfile
        assistant={{ ...baseAssistant, marketplace_status: 'REJECTED', shared: true }}
      />
    )
    expect(screen.queryByTestId('assistant-status-badge')).not.toBeInTheDocument()
  })

  it('shows the rejection reason inline to the owner', () => {
    mockUserStore.user.userId = 'owner-1'
    mockUserStore.user.isAdmin = false
    render(
      <AssistantDetailsProfile
        assistant={{
          ...baseAssistant,
          marketplace_status: 'REJECTED',
          marketplace_decision_reason: 'Content policy',
        }}
      />
    )
    expect(screen.getByTestId('assistant-rejection-reason')).toHaveTextContent('Content policy')
  })

  it('shows the inline rejection reason to an admin who is not the owner', () => {
    mockUserStore.user.userId = 'viewer-1'
    mockUserStore.user.isAdmin = true
    render(
      <AssistantDetailsProfile
        assistant={{
          ...baseAssistant,
          marketplace_status: 'REJECTED',
          marketplace_decision_reason: 'Content policy',
        }}
      />
    )
    expect(screen.getByTestId('assistant-rejection-reason')).toHaveTextContent('Content policy')
  })

  it('shows the reason as plain text without a prefix and with no tooltip on the badge', () => {
    mockUserStore.user.userId = 'owner-1'
    mockUserStore.user.isAdmin = false
    render(
      <AssistantDetailsProfile
        assistant={{
          ...baseAssistant,
          marketplace_status: 'REJECTED',
          marketplace_decision_reason: 'Content policy',
        }}
      />
    )
    expect(screen.getByTestId('assistant-rejection-reason').textContent).toBe('Content policy')
    expect(screen.getByTestId('assistant-status-badge')).not.toHaveAttribute('data-pr-tooltip')
  })
})
