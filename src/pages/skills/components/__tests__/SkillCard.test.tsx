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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { skillsStore } from '@/store/skills'
import { Skill, SkillVisibility } from '@/types/entity/skill'

import SkillCard from '../SkillCard'

// Mock the store
vi.mock('@/store/skills', () => ({
  skillsStore: {
    reactToSkill: vi.fn(),
    removeReaction: vi.fn(),
  },
}))

describe('SkillCard', () => {
  let user: ReturnType<typeof userEvent.setup>

  const mockSkill: Skill = {
    id: 'skill-123',
    name: 'Test Skill',
    description: 'A test skill description',
    content: 'Skill content',
    project: 'test-project',
    visibility: SkillVisibility.PROJECT,
    created_by: {
      id: 'user-123',
      username: 'testuser',
      name: 'Test User',
      email: 'testuser@example.com',
    },
    categories: [],
    version: '1.0.0',
    assistants_count: 5,
    unique_likes_count: 10,
    unique_dislikes_count: 2,
    is_liked: false,
    is_disliked: false,
  }

  const mockOnView = vi.fn()
  const mockOnExport = vi.fn()
  const mockReloadSkills = vi.fn()

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders skill card with correct information', () => {
    render(<SkillCard skill={mockSkill} onView={mockOnView} onExport={mockOnExport} />)

    expect(screen.getByText('Test Skill')).toBeInTheDocument()
    expect(screen.getByText('A test skill description')).toBeInTheDocument()
    expect(screen.getByText(/by Test User/)).toBeInTheDocument()
    expect(screen.getByText('Shared with Project')).toBeInTheDocument()
    expect(screen.queryByText('5 assistants')).not.toBeInTheDocument()
  })

  it('renders skill card with assistants count in marketplace mode without visibility', () => {
    render(<SkillCard skill={mockSkill} onView={mockOnView} isMarketplace={true} />)

    expect(screen.getByText('Test Skill')).toBeInTheDocument()
    expect(screen.queryByText('Shared with Project')).not.toBeInTheDocument()
    expect(screen.getByText('5 assistants')).toBeInTheDocument()
  })

  it('displays correct author name from created_by field', () => {
    render(<SkillCard skill={mockSkill} onView={mockOnView} />)

    expect(screen.getByText(/by Test User/)).toBeInTheDocument()
  })

  it('falls back to username if name is not available', () => {
    const skillWithoutName = {
      ...mockSkill,
      created_by: { id: 'user-123', username: 'testuser' },
    }

    render(<SkillCard skill={skillWithoutName as Skill} onView={mockOnView} />)

    expect(screen.getByText(/by testuser/)).toBeInTheDocument()
  })

  it('displays Unknown for missing author', () => {
    const skillWithoutAuthor = {
      ...mockSkill,
      created_by: null,
    }

    render(<SkillCard skill={skillWithoutAuthor} onView={mockOnView} />)

    expect(screen.getByText(/by Unknown/)).toBeInTheDocument()
  })

  it('displays correct visibility status without assistant count', () => {
    const privateSkill = {
      ...mockSkill,
      visibility: SkillVisibility.PRIVATE,
    }

    render(<SkillCard skill={privateSkill} onView={mockOnView} />)

    expect(screen.getByText('Not shared')).toBeInTheDocument()
    expect(screen.queryByText('5 assistants')).not.toBeInTheDocument()
  })

  it('renders marketplace actions when isMarketplace is true', () => {
    render(<SkillCard skill={mockSkill} onView={mockOnView} isMarketplace={true} />)

    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('does not render marketplace actions when isMarketplace is false', () => {
    const { container } = render(
      <SkillCard skill={mockSkill} onView={mockOnView} isMarketplace={false} />
    )

    // Check that the marketplace reaction buttons container doesn't exist
    const marketplaceContainer = container.querySelector('.flex.h-full.pl-4.gap-1')
    expect(marketplaceContainer).not.toBeInTheDocument()
  })

  it('calls reactToSkill when like button is clicked', async () => {
    vi.mocked(skillsStore.reactToSkill).mockResolvedValue()

    const { container } = render(
      <SkillCard
        skill={mockSkill}
        onView={mockOnView}
        reloadSkills={mockReloadSkills}
        isMarketplace={true}
      />
    )

    // Find like button by tooltip attribute
    const likeButton = container.querySelector('[data-pr-tooltip="Like this skill"]')
    expect(likeButton).toBeTruthy()
    await user.click(likeButton!)

    await waitFor(() => {
      expect(skillsStore.reactToSkill).toHaveBeenCalledWith('skill-123', 'like')
      expect(mockReloadSkills).toHaveBeenCalled()
    })
  })

  it('calls removeReaction when already liked skill is clicked', async () => {
    const likedSkill = {
      ...mockSkill,
      is_liked: true,
    }

    vi.mocked(skillsStore.removeReaction).mockResolvedValue()

    const { container } = render(
      <SkillCard
        skill={likedSkill}
        onView={mockOnView}
        reloadSkills={mockReloadSkills}
        isMarketplace={true}
      />
    )

    const likeButton = container.querySelector('[data-pr-tooltip="Remove like"]')
    expect(likeButton).toBeTruthy()
    await user.click(likeButton!)

    await waitFor(() => {
      expect(skillsStore.removeReaction).toHaveBeenCalledWith('skill-123')
      expect(mockReloadSkills).toHaveBeenCalled()
    })
  })

  it('calls reactToSkill when dislike button is clicked', async () => {
    vi.mocked(skillsStore.reactToSkill).mockResolvedValue()

    const { container } = render(
      <SkillCard
        skill={mockSkill}
        onView={mockOnView}
        reloadSkills={mockReloadSkills}
        isMarketplace={true}
      />
    )

    const dislikeButton = container.querySelector('[data-pr-tooltip="Dislike this skill"]')
    expect(dislikeButton).toBeTruthy()
    await user.click(dislikeButton!)

    await waitFor(() => {
      expect(skillsStore.reactToSkill).toHaveBeenCalledWith('skill-123', 'dislike')
      expect(mockReloadSkills).toHaveBeenCalled()
    })
  })

  it('calls removeReaction when already disliked skill is clicked', async () => {
    const dislikedSkill = {
      ...mockSkill,
      is_disliked: true,
    }

    vi.mocked(skillsStore.removeReaction).mockResolvedValue()

    const { container } = render(
      <SkillCard
        skill={dislikedSkill}
        onView={mockOnView}
        reloadSkills={mockReloadSkills}
        isMarketplace={true}
      />
    )

    const dislikeButton = container.querySelector('[data-pr-tooltip="Remove dislike"]')
    expect(dislikeButton).toBeTruthy()
    await user.click(dislikeButton!)

    await waitFor(() => {
      expect(skillsStore.removeReaction).toHaveBeenCalledWith('skill-123')
      expect(mockReloadSkills).toHaveBeenCalled()
    })
  })

  it('handles error when toggling like fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(skillsStore.reactToSkill).mockRejectedValue(new Error('Network error'))

    const { container } = render(
      <SkillCard
        skill={mockSkill}
        onView={mockOnView}
        reloadSkills={mockReloadSkills}
        isMarketplace={true}
      />
    )

    const likeButton = container.querySelector('[data-pr-tooltip="Like this skill"]')
    expect(likeButton).toBeTruthy()
    await user.click(likeButton!)

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Error toggling like:', expect.any(Error))
    })

    consoleError.mockRestore()
  })

  it('handles error when toggling dislike fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(skillsStore.reactToSkill).mockRejectedValue(new Error('Network error'))

    const { container } = render(
      <SkillCard
        skill={mockSkill}
        onView={mockOnView}
        reloadSkills={mockReloadSkills}
        isMarketplace={true}
      />
    )

    const dislikeButton = container.querySelector('[data-pr-tooltip="Dislike this skill"]')
    expect(dislikeButton).toBeTruthy()
    await user.click(dislikeButton!)

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Error toggling dislike:', expect.any(Error))
    })

    consoleError.mockRestore()
  })

  it('defaults to 0 for missing counts', () => {
    const skillWithoutCounts = {
      ...mockSkill,
      assistants_count: undefined,
      unique_likes_count: undefined,
      unique_dislikes_count: undefined,
    }

    render(
      <SkillCard skill={skillWithoutCounts as Skill} onView={mockOnView} isMarketplace={true} />
    )

    // In marketplace mode, should show assistants count, not visibility
    expect(screen.queryByText('Shared with Project')).not.toBeInTheDocument()
    // Check for assistants count
    expect(screen.getByText('0 assistants')).toBeInTheDocument()
    // Check for '0' texts in likes and dislikes count
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(2)
  })
})
