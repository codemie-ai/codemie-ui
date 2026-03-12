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

import { render, screen, fireEvent } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach } from 'vitest'

import AssistantMenu, { ActionItem } from '../AssistantMenu'

describe('AssistantMenu', () => {
  const EditIcon = () => <div data-testid="edit-icon"></div>
  const DeleteIcon = () => <div data-testid="delete-icon"></div>
  const ShareIcon = () => <div data-testid="share-icon"></div>

  const mockEditAction = vi.fn()
  const mockDeleteAction = vi.fn()
  const mockShareAction = vi.fn()

  const mockActions: ActionItem[] = [
    {
      id: 'edit',
      label: 'Edit',
      icon: <EditIcon />,
      onClick: mockEditAction,
      isVisible: true,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <DeleteIcon />,
      onClick: mockDeleteAction,
      isVisible: true,
    },
    {
      id: 'share',
      label: 'Share',
      icon: <ShareIcon />,
      onClick: mockShareAction,
      isVisible: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders visible actions correctly', () => {
    render(<AssistantMenu actions={mockActions} />)
    screen.debug()
    const openButton = screen.getByRole('button')
    fireEvent.click(openButton)

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument()
    expect(screen.getByTestId('delete-icon')).toBeInTheDocument()

    expect(screen.queryByText('Share')).not.toBeInTheDocument()
    expect(screen.queryByTestId('share-icon')).not.toBeInTheDocument()
  })

  it('calls the correct action handler when clicked', () => {
    render(<AssistantMenu actions={mockActions} />)
    const openButton = screen.getByRole('button')
    fireEvent.click(openButton)

    fireEvent.click(screen.getByText('Edit'))
    expect(mockEditAction).toHaveBeenCalledTimes(1)
    expect(mockDeleteAction).not.toHaveBeenCalled()

    fireEvent.click(openButton)

    fireEvent.click(screen.getByText('Delete'))
    expect(mockDeleteAction).toHaveBeenCalledTimes(1)
  })

  it('returns null when no visible actions are provided', () => {
    const noVisibleActions = mockActions.map((action) => ({
      ...action,
      isVisible: false,
    }))

    const { container } = render(<AssistantMenu actions={noVisibleActions} />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByTestId('navigation-more')).not.toBeInTheDocument()
  })

  it('handles actions without explicit isVisible property', () => {
    const actionsWithoutVisibility = [
      {
        id: 'edit',
        label: 'Edit',
        icon: <EditIcon />,
        onClick: mockEditAction,
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: <DeleteIcon />,
        onClick: mockDeleteAction,
      },
    ] as ActionItem[]

    render(<AssistantMenu actions={actionsWithoutVisibility} />)

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('handles empty actions array', () => {
    const { container } = render(<AssistantMenu actions={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
