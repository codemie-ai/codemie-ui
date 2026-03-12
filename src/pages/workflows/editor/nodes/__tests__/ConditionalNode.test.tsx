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
import { ConditionalNode } from '../ConditionalNode'

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react')
  return {
    ...actual,
    useNodeConnections: () => [],
  }
})

const mockFindState = vi.fn()
const mockGetConfig = vi.fn()
const mockUpdateConfig = vi.fn()
const mockRemoveState = vi.fn()

const createMockProps = (overrides?: Partial<CommonNodeProps>): CommonNodeProps =>
  ({
    id: 'conditional1',
    type: 'conditional',
    selected: false,
    data: {
      findState: mockFindState,
      getConfig: mockGetConfig,
      updateConfig: mockUpdateConfig,
      removeState: mockRemoveState,
      highlighted: false,
    },
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    ...overrides,
  } as CommonNodeProps)

const renderConditionalNode = (props: Partial<CommonNodeProps> = {}) => {
  const finalProps = createMockProps(props)

  return render(
    <ReactFlowProvider>
      <ConditionalNode {...finalProps} />
    </ReactFlowProvider>
  )
}

describe('ConditionalNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the conditional node with title', () => {
      const mockState: StateConfiguration = {
        id: 'conditional1',
        _meta: {
          type: 'conditional',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderConditionalNode()

      expect(screen.getByText('Conditional')).toBeInTheDocument()
    })

    it('renders If and Else branches', () => {
      const mockState: StateConfiguration = {
        id: 'conditional1',
        _meta: {
          type: 'conditional',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderConditionalNode()

      expect(screen.getByText('If')).toBeInTheDocument()
      expect(screen.getByText('Else')).toBeInTheDocument()
      expect(screen.getByText('(default)')).toBeInTheDocument()
    })

    it('renders with custom expression', () => {
      const mockState: StateConfiguration = {
        id: 'conditional1',
        _meta: {
          type: 'conditional',
          is_connected: true,
          data: {
            next: {
              condition: {
                expression: 'status == "active"',
              },
            },
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderConditionalNode()

      expect(screen.getByText('status == "active"')).toBeInTheDocument()
    })

    it('renders default condition when expression is missing', () => {
      const mockState: StateConfiguration = {
        id: 'conditional1',
        _meta: {
          type: 'conditional',
          is_connected: true,
          data: {
            next: {
              condition: {},
            },
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderConditionalNode()

      expect(screen.getByText('condition')).toBeInTheDocument()
    })

    it('renders default condition when next is missing', () => {
      const mockState: StateConfiguration = {
        id: 'conditional1',
        _meta: {
          type: 'conditional',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderConditionalNode()

      expect(screen.getByText('condition')).toBeInTheDocument()
    })
  })

  describe('connection state', () => {
    it('renders connection indicator when is_connected is true', () => {
      const mockState: StateConfiguration = {
        id: 'conditional1',
        _meta: {
          type: 'conditional',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderConditionalNode()

      const indicator = container.querySelector('.bg-success-primary')
      expect(indicator).not.toBeNull()
    })

    it('renders disconnection indicator when is_connected is false', () => {
      const mockState: StateConfiguration = {
        id: 'conditional1',
        _meta: {
          type: 'conditional',
          is_connected: false,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderConditionalNode()

      const indicator = container.querySelector('.bg-failed-secondary')
      expect(indicator).not.toBeNull()
    })

    it('defaults to disconnected when meta is missing', () => {
      const mockState: StateConfiguration = {
        id: 'conditional1',
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderConditionalNode()

      const indicator = container.querySelector('.bg-failed-secondary')
      expect(indicator).not.toBeNull()
    })

    it('defaults to disconnected when state is not found', () => {
      mockFindState.mockReturnValue(undefined)

      const { container } = renderConditionalNode()

      const indicator = container.querySelector('.bg-failed-secondary')
      expect(indicator).not.toBeNull()
    })
  })

  describe('selected state', () => {
    it('renders with selected border when selected', () => {
      const mockState: StateConfiguration = {
        id: 'conditional1',
        _meta: {
          type: 'conditional',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderConditionalNode({ selected: true })

      const baseNode = container.querySelector('.border-border-specific-node-border-focus')
      expect(baseNode).not.toBeNull()
    })

    it('renders without selected border when not selected', () => {
      const mockState: StateConfiguration = {
        id: 'conditional1',
        _meta: {
          type: 'conditional',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderConditionalNode({ selected: false })

      const baseNode = container.querySelector('.border-border-specific-node-border-focus')
      expect(baseNode).toBeNull()
    })
  })

  describe('integration with findState', () => {
    it('calls findState with correct id', () => {
      const mockState: StateConfiguration = {
        id: 'custom-conditional-id',
        _meta: {
          type: 'conditional',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderConditionalNode({ id: 'custom-conditional-id' })

      expect(mockFindState).toHaveBeenCalledWith('custom-conditional-id')
    })
  })
})
