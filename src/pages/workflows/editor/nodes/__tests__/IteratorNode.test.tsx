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
import { ReactFlowProvider } from '@xyflow/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { StateConfiguration } from '@/types/workflowEditor/configuration'

import { CommonNodeProps } from '../common'
import { IteratorNode } from '../IteratorNode'

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react')
  return {
    ...actual,
    NodeResizeControl: ({ children }: any) => <div data-testid="resize-control">{children}</div>,
  }
})

vi.mock('@/assets/images/node-iterator-border.svg?react', () => ({
  default: () => <svg data-testid="iterator-border" />,
}))

vi.mock('@/assets/icons/refresh.svg?react', () => ({
  default: () => <svg data-testid="refresh-icon" />,
}))

vi.mock('@/assets/icons/expand.svg?react', () => ({
  default: () => <svg data-testid="expand-icon" />,
}))

const mockFindState = vi.fn()
const mockGetConfig = vi.fn()
const mockUpdateConfig = vi.fn()
const mockRemoveState = vi.fn()

const createMockProps = (overrides?: Partial<CommonNodeProps>): CommonNodeProps =>
  ({
    id: 'iterator1',
    type: 'iterator',
    selected: false,
    data: {
      findState: mockFindState,
      getConfig: mockGetConfig,
      updateConfig: mockUpdateConfig,
      removeState: mockRemoveState,
      highlighted: false,
      isFullscreen: true,
    },
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    ...overrides,
  } as CommonNodeProps)

const renderIteratorNode = (props: Partial<CommonNodeProps> = {}) => {
  const finalProps = createMockProps(props)

  return render(
    <ReactFlowProvider>
      <IteratorNode {...finalProps} />
    </ReactFlowProvider>
  )
}

describe('IteratorNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the iterator node with title', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderIteratorNode()

      expect(screen.getByText('Iterator')).toBeInTheDocument()
    })

    it('renders refresh icon', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderIteratorNode()

      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument()
    })

    it('renders resize control', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderIteratorNode()

      expect(screen.getByTestId('resize-control')).toBeInTheDocument()
      expect(screen.getByTestId('expand-icon')).toBeInTheDocument()
    })

    it('renders iter_key when provided', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
          data: {
            next: {
              iter_key: 'items',
            },
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderIteratorNode()

      expect(screen.getByText('items')).toBeInTheDocument()
    })

    it('does not render iter_key badge when not provided', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderIteratorNode()

      // Check that there's no badge element
      const badge = container.querySelector('.border-border-structural.bg-surface-interactive-hover')
      expect(badge).toBeNull()
    })

    it('renders with custom iter_key', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
          data: {
            next: {
              iter_key: 'custom_data',
            },
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderIteratorNode()

      expect(screen.getByText('custom_data')).toBeInTheDocument()
    })
  })

  describe('selected state', () => {
    it('renders when selected', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderIteratorNode({ selected: true })

      // IteratorNode renders with title
      expect(screen.getByText('Iterator')).toBeInTheDocument()
    })

    it('renders when not selected', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderIteratorNode({ selected: false })

      // IteratorNode renders with title
      expect(screen.getByText('Iterator')).toBeInTheDocument()
    })
  })

  describe('highlighted state', () => {
    it('applies highlighted background when highlighted', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const highlightedProps = createMockProps({
        data: {
          ...createMockProps().data,
          highlighted: true,
        },
      })

      const { container } = render(
        <ReactFlowProvider>
          <IteratorNode {...highlightedProps} />
        </ReactFlowProvider>
      )

      const background = container.querySelector('.bg-surface-interactive-hover')
      expect(background).not.toBeNull()
    })

    it('does not apply highlighted background when not highlighted', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderIteratorNode()

      // Should still have bg class but not highlighted specific class
      const content = container.querySelector('[class*="bg-surface-interactive-hover"]')
      // Check that bg-surface-interactive-hover is not in the main container class list
      expect(content).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('renders when state is not found', () => {
      mockFindState.mockReturnValue(undefined)

      renderIteratorNode()

      expect(screen.getByText('Iterator')).toBeInTheDocument()
    })

    it('renders when meta is missing', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
      }

      mockFindState.mockReturnValue(mockState)

      renderIteratorNode()

      expect(screen.getByText('Iterator')).toBeInTheDocument()
    })

    it('renders when meta.data is missing', () => {
      const mockState: StateConfiguration = {
        id: 'iterator1',
        _meta: {
          type: 'iterator',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderIteratorNode()

      expect(screen.getByText('Iterator')).toBeInTheDocument()
    })
  })

  describe('integration with findState', () => {
    it('calls findState with correct id', () => {
      const mockState: StateConfiguration = {
        id: 'custom-iterator-id',
        _meta: {
          type: 'iterator',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderIteratorNode({ id: 'custom-iterator-id' })

      expect(mockFindState).toHaveBeenCalledWith('custom-iterator-id')
    })
  })
})
