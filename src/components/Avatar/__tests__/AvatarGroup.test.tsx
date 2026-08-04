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
import { describe, it, expect, vi } from 'vitest'

import AvatarGroup from '../AvatarGroup'

vi.mock('../Avatar', () => ({
  default: ({ name, iconUrl }: { name?: string; iconUrl?: string | null }) => (
    <div data-testid="avatar" data-name={name} data-icon={iconUrl ?? ''} />
  ),
}))

describe('AvatarGroup', () => {
  it('renders a single placeholder avatar when iconUrls is empty', () => {
    render(<AvatarGroup iconUrls={[]} />)

    expect(screen.getAllByTestId('avatar')).toHaveLength(1)
  })

  it('renders the correct number of visible avatars', () => {
    render(<AvatarGroup iconUrls={['url1', 'url2', 'url3']} />)

    expect(screen.getAllByTestId('avatar')).toHaveLength(3)
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
  })

  it('shows +N badge when iconUrls exceeds maxVisible (default 3)', () => {
    render(<AvatarGroup iconUrls={['url1', 'url2', 'url3', 'url4', 'url5']} />)

    expect(screen.getAllByTestId('avatar')).toHaveLength(3)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('does not show +N badge when exactly at maxVisible limit', () => {
    render(<AvatarGroup iconUrls={['url1', 'url2', 'url3']} maxVisible={3} />)

    expect(screen.getAllByTestId('avatar')).toHaveLength(3)
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument()
  })

  it('respects custom maxVisible prop', () => {
    render(<AvatarGroup iconUrls={['url1', 'url2', 'url3', 'url4']} maxVisible={2} />)

    expect(screen.getAllByTestId('avatar')).toHaveLength(2)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('passes names to individual Avatar components', () => {
    render(<AvatarGroup iconUrls={['url1', 'url2']} names={['Alice', 'Bob']} />)

    const avatars = screen.getAllByTestId('avatar')
    expect(avatars[0]).toHaveAttribute('data-name', 'Alice')
    expect(avatars[1]).toHaveAttribute('data-name', 'Bob')
  })

  it('applies className to the wrapper', () => {
    const { container } = render(<AvatarGroup iconUrls={['url1']} className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles null and undefined values in iconUrls', () => {
    render(<AvatarGroup iconUrls={[null, undefined, 'url3']} />)

    expect(screen.getAllByTestId('avatar')).toHaveLength(3)
  })
})
