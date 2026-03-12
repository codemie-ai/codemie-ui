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
import { vi, expect, beforeEach, describe, it } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import AssistantCard from '../AssistantCard'

vi.mock('@/utils/helpers', () => ({
  createdBy: (user) => user?.name || 'Unknown',
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
})
