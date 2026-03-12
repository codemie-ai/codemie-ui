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
import { BrowserRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { HelpItemType } from '../../HelpPage'
import HelpSection from '../HelpSection'

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

vi.mock('@/hooks/useIsTruncated', () => ({
  useIsTruncated: vi.fn(() => false),
}))

vi.mock('@/assets/icons/chat-new-filled.svg?react', () => ({
  default: (props: any) => <svg data-testid="chat-icon" {...props} />,
}))

vi.mock('@/assets/icons/external.svg?react', () => ({
  default: (props: any) => <svg data-testid="external-link-icon" {...props} />,
}))

vi.mock('@/assets/images/ai-avatar.png', () => ({
  default: 'ai-avatar.png',
}))

describe('HelpSection', () => {
  const mockItems: HelpItemType[] = [
    {
      name: 'Assistant 1',
      description: 'First assistant description',
      link: '/assistants/1/start',
      type: 'chat',
    },
    {
      name: 'Assistant 2',
      description: 'Second assistant description',
      link: '/assistants/2/start',
      type: 'chat',
    },
    {
      name: 'Resource 1',
      description: 'External resource',
      link: 'https://example.com/resource',
      type: 'link',
      isExternal: true,
    },
  ]

  const defaultProps = {
    title: 'AI Assistants',
    description: 'Get instant help, feedback, or answers from our smart tools.',
    items: mockItems,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = renderWithRouter(<HelpSection {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays the section title', () => {
    renderWithRouter(<HelpSection {...defaultProps} />)
    expect(screen.getByText('AI Assistants')).toBeInTheDocument()
  })

  it('displays the section description', () => {
    renderWithRouter(<HelpSection {...defaultProps} />)
    expect(
      screen.getByText('Get instant help, feedback, or answers from our smart tools.')
    ).toBeInTheDocument()
  })

  it('renders all items', () => {
    renderWithRouter(<HelpSection {...defaultProps} />)
    expect(screen.getByText('Assistant 1')).toBeInTheDocument()
    expect(screen.getByText('Assistant 2')).toBeInTheDocument()
    expect(screen.getByText('Resource 1')).toBeInTheDocument()
  })

  it('renders items with their descriptions', () => {
    renderWithRouter(<HelpSection {...defaultProps} />)
    expect(screen.getByText('First assistant description')).toBeInTheDocument()
    expect(screen.getByText('Second assistant description')).toBeInTheDocument()
    expect(screen.getByText('External resource')).toBeInTheDocument()
  })

  it('renders nothing when items array is empty', () => {
    renderWithRouter(<HelpSection {...defaultProps} items={[]} />)
    expect(screen.queryByText('AI Assistants')).not.toBeInTheDocument()
    expect(screen.queryByText('Assistant 1')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('renders section with single item', () => {
    const singleItem: HelpItemType[] = [
      {
        name: 'Single Assistant',
        description: 'Only one assistant',
        link: '/assistants/single/start',
        type: 'chat',
      },
    ]
    renderWithRouter(<HelpSection {...defaultProps} items={singleItem} />)
    expect(screen.getByText('Single Assistant')).toBeInTheDocument()
  })

  it('handles items with custom button text', () => {
    const customItems: HelpItemType[] = [
      {
        name: 'Custom Item',
        description: 'Custom description',
        link: '/custom',
        type: 'link',
        buttonText: 'Custom Button',
      },
    ]
    renderWithRouter(<HelpSection {...defaultProps} items={customItems} />)
    expect(screen.getByText('Custom Button')).toBeInTheDocument()
  })

  it('handles items with icons', () => {
    const TestIcon = (props: any) => <svg data-testid="custom-icon" {...props} />
    const itemsWithIcon: HelpItemType[] = [
      {
        name: 'Icon Item',
        description: 'Item with icon',
        link: '/icon',
        type: 'link',
        icon: TestIcon,
      },
    ]
    renderWithRouter(<HelpSection {...defaultProps} items={itemsWithIcon} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('handles items with iconUrl', () => {
    const itemsWithIconUrl: HelpItemType[] = [
      {
        name: 'Avatar Item',
        description: 'Item with avatar',
        link: '/avatar',
        type: 'chat',
        iconUrl: 'https://example.com/avatar.png',
      },
    ]
    renderWithRouter(<HelpSection {...defaultProps} items={itemsWithIconUrl} />)
    const img = screen.getByAltText('Avatar Item')
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
  })
})
