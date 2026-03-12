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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactFlowProvider } from '@xyflow/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { NoteStateConfiguration } from '@/types/workflowEditor/configuration'

import { CommonNodeProps } from '../common'
import { NoteNode } from '../NoteNode'

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <span data-testid="delete-icon" />,
}))

const mockFindState = vi.fn()
const mockGetConfig = vi.fn()
const mockUpdateConfig = vi.fn()
const mockRemoveState = vi.fn()
const mockOnNodesChange = vi.fn()

const createMockProps = (overrides?: Partial<CommonNodeProps>): CommonNodeProps =>
  ({
    id: 'note1',
    type: 'note',
    selected: false,
    data: {
      findState: mockFindState,
      getConfig: mockGetConfig,
      updateConfig: mockUpdateConfig,
      removeState: mockRemoveState,
      onNodesChange: mockOnNodesChange,
      highlighted: false,
    },
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    ...overrides,
  } as CommonNodeProps)

const renderNoteNode = (props: Partial<CommonNodeProps> = {}) => {
  const finalProps = createMockProps(props)

  return render(
    <ReactFlowProvider>
      <NoteNode {...finalProps} />
    </ReactFlowProvider>
  )
}

describe('NoteNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the note node with title', () => {
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: '',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: '',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      expect(screen.getByText('Note')).toBeInTheDocument()
    })

    it('renders delete button', () => {
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: '',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: '',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      expect(screen.getByTestId('delete-icon')).toBeInTheDocument()
    })

    it('renders textarea with placeholder', () => {
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: '',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: '',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      const textarea = screen.getByPlaceholderText('Add your note here...')
      expect(textarea).toBeInTheDocument()
    })

    it('renders with existing note content', () => {
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: 'Existing note content',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: 'Existing note content',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      const textarea = screen.getByDisplayValue('Existing note content')
      expect(textarea).toBeInTheDocument()
    })

    it('returns empty fragment when state is not found', () => {
      mockFindState.mockReturnValue(undefined)

      const { container } = renderNoteNode()

      expect(container.firstChild).toBeNull()
    })
  })

  describe('user interactions', () => {
    it('updates content when user types', async () => {
      const user = userEvent.setup()
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: '',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: '',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      const textarea = screen.getByPlaceholderText('Add your note here...')
      await user.type(textarea, 'New note content')

      expect(textarea).toHaveValue('New note content')
    })

    it('calls updateConfig on blur with new content', async () => {
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: 'Original content',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: 'Original content',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      const textarea = screen.getByDisplayValue('Original content')

      fireEvent.change(textarea, { target: { value: 'Updated content' } })
      fireEvent.blur(textarea)

      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith({
          state: {
            id: 'note1',
            data: { note: 'Updated content' },
          },
        })
      })
    })

    it('does not call updateConfig on blur when content unchanged', async () => {
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: 'Same content',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: 'Same content',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      const textarea = screen.getByDisplayValue('Same content')

      fireEvent.blur(textarea)

      expect(mockUpdateConfig).not.toHaveBeenCalled()
    })

    it('calls removeState when delete button is clicked', async () => {
      const user = userEvent.setup()
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: '',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: '',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      const deleteButton = screen.getByTestId('delete-icon').closest('button')
      expect(deleteButton).toBeInTheDocument()

      if (deleteButton) {
        await user.click(deleteButton)

        expect(mockRemoveState).toHaveBeenCalledWith('note1')
      }
    })
  })

  describe('selected state', () => {
    it('applies border to textarea when selected', () => {
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: '',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: '',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode({ selected: true })

      const textarea = screen.getByPlaceholderText('Add your note here...')
      expect(textarea).toHaveClass('border-text-specific-node-note-text/50')
    })

    it('hides scrollbar when not selected', () => {
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: '',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: '',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode({ selected: false })

      const textarea = screen.getByPlaceholderText('Add your note here...')
      expect(textarea).toHaveClass('[&::-webkit-scrollbar]:hidden')
    })
  })

  describe('integration with findState', () => {
    it('calls findState with correct id', () => {
      const mockState: NoteStateConfiguration = {
        id: 'custom-note-id',
        note: '',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: '',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode({ id: 'custom-note-id' })

      expect(mockFindState).toHaveBeenCalledWith('custom-note-id')
    })
  })

  describe('edge cases', () => {
    it('handles empty note content', () => {
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: '',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: '',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      const textarea = screen.getByPlaceholderText('Add your note here...')
      expect(textarea).toHaveValue('')
    })

    it('handles note content with special characters', () => {
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: 'Special chars: <>&"\'',
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: 'Special chars: <>&"\'',
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      const textarea = screen.getByDisplayValue('Special chars: <>&"\'')
      expect(textarea).toBeInTheDocument()
    })

    it('handles multiline note content', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3'
      const mockState: NoteStateConfiguration = {
        id: 'note1',
        note: multilineText,
        _meta: {
          type: 'note',
          is_connected: false,
          data: {
            note: multilineText,
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderNoteNode()

      const textarea = screen.getByPlaceholderText('Add your note here...')
      expect(textarea).toBeInTheDocument()
      expect((textarea as HTMLTextAreaElement).value).toContain('Line 1')
      expect((textarea as HTMLTextAreaElement).value).toContain('Line 2')
      expect((textarea as HTMLTextAreaElement).value).toContain('Line 3')
    })
  })
})
