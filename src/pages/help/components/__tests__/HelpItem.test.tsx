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

import HelpItem from '../HelpItem'

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

const TestIconSvg = (props: any) => <svg data-testid="test-icon" {...props} />

describe('HelpItem', () => {
  const defaultProps = {
    name: 'Test Assistant',
    description: 'This is a test assistant description',
    link: '/assistants/test/start',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = renderWithRouter(<HelpItem {...defaultProps} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays the item name and description', () => {
    renderWithRouter(<HelpItem {...defaultProps} />)
    expect(screen.getByText('Test Assistant')).toBeInTheDocument()
    expect(screen.getByText('This is a test assistant description')).toBeInTheDocument()
  })

  it('renders with default button text "Explore" for link type', () => {
    renderWithRouter(<HelpItem {...defaultProps} type="link" />)
    expect(screen.getByText('Explore')).toBeInTheDocument()
  })

  it('renders with default button text "Chat Now" for chat type', () => {
    renderWithRouter(<HelpItem {...defaultProps} type="chat" />)
    expect(screen.getByText('Chat Now')).toBeInTheDocument()
  })

  it('renders with custom button text', () => {
    renderWithRouter(<HelpItem {...defaultProps} buttonText="Get Started" />)
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  it('renders icons', () => {
    renderWithRouter(<HelpItem {...defaultProps} type="chat" />)
    expect(screen.getByTestId('chat-icon')).toBeInTheDocument()
  })

  it('renders custom icon when provided', () => {
    renderWithRouter(<HelpItem {...defaultProps} icon={TestIconSvg} />)
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('renders iconUrl image when provided', () => {
    renderWithRouter(<HelpItem {...defaultProps} iconUrl="https://example.com/icon.png" />)
    const img = screen.getByAltText('Test Assistant')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/icon.png')
  })

  it('renders default avatar when no icon or iconUrl provided', () => {
    renderWithRouter(<HelpItem {...defaultProps} />)

    const img = screen.getByAltText('Test Assistant')

    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'ai-avatar.png')
  })

  it('prioritizes iconUrl over custom icon', () => {
    renderWithRouter(
      <HelpItem {...defaultProps} iconUrl="https://example.com/icon.png" icon={TestIconSvg} />
    )

    const img = screen.getByAltText('Test Assistant')

    expect(img).toHaveAttribute('src', 'https://example.com/icon.png')
    expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument()
  })

  it('renders as internal link by default', () => {
    renderWithRouter(<HelpItem {...defaultProps} link="/internal-page" />)

    const link = screen.getByRole('link')

    expect(link).toHaveAttribute('href', '/internal-page')
    expect(link).not.toHaveAttribute('target', '_blank')
  })

  it('renders as external link when isExternal is true', () => {
    renderWithRouter(<HelpItem {...defaultProps} link="https://example.com" isExternal />)

    const links = screen.getAllByRole('link')
    const externalLinks = links.filter((link) => link.getAttribute('target') === '_blank')
    expect(externalLinks.length).toBeGreaterThan(0)

    const linkWithRel = externalLinks.find((link) => link.getAttribute('rel') === 'noreferrer')
    expect(linkWithRel).toBeDefined()
    expect(linkWithRel).toHaveAttribute('href', 'https://example.com')
  })

  it('renders with all props combined', () => {
    renderWithRouter(
      <HelpItem
        name="Advanced Assistant"
        description="Full featured assistant"
        link="https://example.com/assistant"
        type="chat"
        buttonText="Start Chat"
        iconUrl="https://example.com/avatar.png"
        isExternal
      />
    )

    expect(screen.getByText('Advanced Assistant')).toBeInTheDocument()
    expect(screen.getByText('Full featured assistant')).toBeInTheDocument()
    expect(screen.getByText('Start Chat')).toBeInTheDocument()
    expect(screen.getByTestId('external-link-icon')).toBeInTheDocument()
    const img = screen.getByAltText('Advanced Assistant')
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
  })
})
