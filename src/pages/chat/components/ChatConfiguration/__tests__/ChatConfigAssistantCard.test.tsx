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
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import ChatConfigAssistantCard from '../ChatConfigAssistants/ChatConfigAssistantCard'

vi.hoisted(() => vi.resetModules())

const mockOpenConfigForm = vi.fn()

vi.mock('@/utils/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  copyToClipboard: vi.fn(),
  getRootPath: vi.fn(() => 'http://localhost:3000'),
}))

vi.mock('@/utils/entity', () => ({
  canEdit: vi.fn((assistant) => assistant.canEdit !== false),
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => ({
    openConfigForm: mockOpenConfigForm,
  })),
}))

const mockAssistant: Assistant = {
  id: 'assistant-123',
  name: 'Test Assistant',
  description: 'Test Description',
  icon_url: 'http://example.com/icon.png',
  system_prompt: 'You are a helpful assistant',
  model: 'gpt-4',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  canEdit: true,
} as unknown as Assistant

const mockAssistantNoEdit: Assistant = {
  ...mockAssistant,
  id: 'assistant-456',
  name: 'Read Only Assistant',
  canEdit: false,
} as Assistant

describe('ChatConfigAssistantCard', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockOpenConfigForm.mockClear()
  })

  it('renders assistant name correctly', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)
    expect(screen.getByText('Test Assistant')).toBeInTheDocument()
  })

  it('renders assistant ID correctly', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)
    expect(screen.getByText('assistant-123')).toBeInTheDocument()
  })

  it('renders assistant link that opens in new tab', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'http://localhost:3000/#/assistants/assistant-123')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveTextContent('http://localhost:3000/#/assistants/assistant-123')
  })

  it('renders ID copy button with correct title', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)
    expect(screen.getByTitle('Copy ID')).toBeInTheDocument()
  })

  it('renders Link copy button with correct title', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)
    expect(screen.getByTitle('Copy Link')).toBeInTheDocument()
  })

  it('calls copyToClipboard when ID copy button is clicked', async () => {
    const { copyToClipboard } = await import('@/utils/utils')
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)

    const copyIdButton = screen.getByTitle('Copy ID')
    await user.click(copyIdButton)

    expect(copyToClipboard).toHaveBeenCalledWith(
      'assistant-123',
      'Assistant ID copied to clipboard'
    )
  })

  it('calls copyToClipboard when Link copy button is clicked', async () => {
    const { copyToClipboard } = await import('@/utils/utils')
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)

    const copyLinkButton = screen.getByTitle('Copy Link')
    await user.click(copyLinkButton)

    expect(copyToClipboard).toHaveBeenCalledWith(
      'http://localhost:3000/#/assistants/assistant-123',
      'Assistant Link copied to clipboard'
    )
  })

  it('renders Configure & Test button when canEdit is true', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)
    expect(screen.getByText('Configure & Test')).toBeInTheDocument()
  })

  it('does not render Configure & Test button when canEdit is false', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistantNoEdit} />)
    expect(screen.queryByText('Configure & Test')).not.toBeInTheDocument()
  })

  it('calls openConfigForm when Configure & Test button is clicked', async () => {
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)

    const configButton = screen.getByText('Configure & Test')
    await user.click(configButton)

    expect(mockOpenConfigForm).toHaveBeenCalledWith('assistant-123')
  })

  it('truncates long assistant names properly', () => {
    const longNameAssistant = {
      ...mockAssistant,
      name: 'This is a very long assistant name that should be truncated in the UI',
    }
    render(<ChatConfigAssistantCard assistant={longNameAssistant} />)
    const nameElement = screen.getByText(longNameAssistant.name)
    expect(nameElement).toHaveClass('truncate')
  })

  it('truncates long assistant IDs properly', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)
    const idElement = screen.getByText('assistant-123')
    expect(idElement).toHaveClass('truncate')
  })

  it('displays assistant avatar', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)
    expect(screen.getByText('Test Assistant')).toBeInTheDocument()
  })

  it('renders all interactive elements for editable assistant', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistant} />)

    expect(screen.getByTitle('Copy ID')).toBeInTheDocument()
    expect(screen.getByTitle('Copy Link')).toBeInTheDocument()
    expect(screen.getByText('Configure & Test')).toBeInTheDocument()
  })

  it('renders only copy buttons for non-editable assistant', () => {
    render(<ChatConfigAssistantCard assistant={mockAssistantNoEdit} />)

    expect(screen.getByTitle('Copy ID')).toBeInTheDocument()
    expect(screen.getByTitle('Copy Link')).toBeInTheDocument()
    expect(screen.queryByText('Configure & Test')).not.toBeInTheDocument()
  })
})
