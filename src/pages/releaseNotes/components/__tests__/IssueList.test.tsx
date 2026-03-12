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

import IssueList, { Issue } from '../IssueList'

vi.mock('@/assets/icons/bug.svg?react', () => ({
  default: (props: any) => <svg data-testid="bug-icon" {...props} />,
}))

vi.mock('@/assets/icons/lightning.svg?react', () => ({
  default: (props: any) => <svg data-testid="lightning-icon" {...props} />,
}))

const mockBugIssues: Issue[] = [
  {
    key: 'BUG-123',
    title: 'Fix login issue',
    link: 'https://example.com/BUG-123',
    type: 'BUG',
  },
  {
    key: 'BUG-456',
    title: 'Resolve navigation error',
    link: 'https://example.com/BUG-456',
    type: 'BUG',
  },
]

const mockStoryIssues: Issue[] = [
  {
    key: 'STORY-789',
    title: 'Add new feature',
    link: 'https://example.com/STORY-789',
    type: 'STORY',
  },
]

describe('IssueList', () => {
  it('renders nothing when issues array is empty', () => {
    const { container } = render(<IssueList type="BUG" issues={[]} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders BUG icon for BUG type', () => {
    render(<IssueList type="BUG" issues={mockBugIssues} />)
    const icon = screen.getByTestId('bug-icon')

    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('aria-label', 'BUG')
  })

  it('renders STORY icon for STORY type', () => {
    render(<IssueList type="STORY" issues={mockStoryIssues} />)
    const icon = screen.getByTestId('lightning-icon')

    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('aria-label', 'STORY')
  })

  it('renders all issues with correct keys and titles', () => {
    render(<IssueList type="BUG" issues={mockBugIssues} />)

    expect(screen.getByText('BUG-123')).toBeInTheDocument()
    expect(screen.getByText('Fix login issue')).toBeInTheDocument()
    expect(screen.getByText('BUG-456')).toBeInTheDocument()
    expect(screen.getByText('Resolve navigation error')).toBeInTheDocument()
  })

  it('renders issue links with correct attributes', () => {
    render(<IssueList type="BUG" issues={mockBugIssues} />)
    const link = screen.getByText('BUG-123').closest('a')

    expect(link).toHaveAttribute('href', 'https://example.com/BUG-123')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
