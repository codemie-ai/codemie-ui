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
import { expect, describe, it, vi } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import StatusLabel from '../StatusLabel'

vi.mock('@/components/Tooltip', () => ({
  default: () => null,
}))

describe('StatusLabel', () => {
  const createMockAssistant = (isGlobal = false): Assistant =>
    ({
      id: 'test-id',
      name: 'Test Assistant',
      description: 'Test Description',
      is_global: isGlobal,
      unique_users_count: isGlobal ? 42 : undefined,
    } as Assistant)

  it('renders Global Assistant status when assistant is global', () => {
    const mockAssistant = createMockAssistant(true)

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('42 uses')
    // Check for SVG icon
    const svgElement = statusElement.querySelector('svg')
    expect(svgElement).toBeInTheDocument()
  })

  it('renders singular "use" and "total use" wording when unique_users_count is 1', () => {
    const mockAssistant = createMockAssistant(true)
    mockAssistant.unique_users_count = 1

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('1 use')
    expect(statusElement).toHaveAttribute('aria-label', '1 total use')
  })

  it('renders singular "use" and "total use" wording when unique_users_count is the string "1"', () => {
    const mockAssistant = createMockAssistant(true)
    mockAssistant.unique_users_count = '1' as unknown as number

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('1 use')
    expect(statusElement).toHaveAttribute('aria-label', '1 total use')
  })

  it('renders "0 uses" when unique_users_count is 0', () => {
    const mockAssistant = createMockAssistant(true)
    mockAssistant.unique_users_count = 0

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('0 uses')
  })

  it('renders compact label and exact tooltip/aria wording for large counts', () => {
    const mockAssistant = createMockAssistant(true)
    mockAssistant.unique_users_count = 20900

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('20.9K uses')
    expect(statusElement).toHaveAttribute('aria-label', '20,900 total uses')
    expect(statusElement).toHaveAttribute('data-pr-tooltip', '20,900 total uses')
  })

  it('has a 4px gap between icon and value for the GLOBAL status', () => {
    const mockAssistant = createMockAssistant(true)

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveClass('gap-1')
    expect(statusElement).not.toHaveClass('gap-3')
  })

  it('renders Shared with project status for a project member on a project-shared assistant', () => {
    const mockAssistant = createMockAssistant(false)

    render(
      <StatusLabel
        assistant={mockAssistant}
        isShared={true}
        isOwned={false}
        isProjectMember={true}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('Shared with project')
  })

  it('renders nothing for a user the assistant is shared with individually (collaboration), outside the project', () => {
    const mockAssistant = createMockAssistant(false)

    render(
      <StatusLabel
        assistant={mockAssistant}
        isShared={true}
        isOwned={false}
        isProjectMember={false}
      />
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders Not shared with project status for a project member, non-owner, non-shared assistant', () => {
    const mockAssistant = createMockAssistant(false)

    render(
      <StatusLabel
        assistant={mockAssistant}
        isShared={false}
        isOwned={false}
        isProjectMember={true}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('Not shared with project')
  })

  it('renders Shared with project status for the owner who shared their assistant', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} isShared={true} isOwned={true} />)

    expect(screen.getByRole('status')).toHaveTextContent('Shared with project')
  })

  it('renders Not shared with project status for the owner of a private assistant', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} isOwned={true} />)

    expect(screen.getByRole('status')).toHaveTextContent('Not shared with project')
  })

  it('renders nothing for a viewer with no ownership or project relationship', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('renders Not shared with project status for a project member who is not the owner', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} isProjectMember={true} />)

    expect(screen.getByRole('status')).toHaveTextContent('Not shared with project')
  })

  it('renders nothing for a user the assistant is shared with individually, outside the project', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} isOwned={false} isProjectMember={false} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('StatusLabel for a GLOBAL assistant keeps rendering regardless of isOwned', () => {
    const mockAssistant = createMockAssistant(true)

    render(<StatusLabel assistant={mockAssistant} isOwned={false} />)

    expect(screen.getByRole('status')).toHaveTextContent('42 uses')
  })

  it('prioritizes global status over other statuses', () => {
    const mockAssistant = createMockAssistant(true)

    render(<StatusLabel assistant={mockAssistant} isShared={true} isOwned={true} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('42 uses')
  })

  it('has the correct gap spacing between icon and text', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} isShared={true} isOwned={true} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveClass('gap-3')
  })

  it('prevents text wrapping with whitespace-nowrap', () => {
    const mockAssistant = createMockAssistant(true)

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveClass('whitespace-nowrap')
  })
})
