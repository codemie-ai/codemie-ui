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
import { ToolNode } from '../ToolNode'

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
    id: 'tool1',
    type: 'tool',
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

const renderToolNode = (props: Partial<CommonNodeProps> = {}) => {
  const finalProps = createMockProps(props)

  return render(
    <ReactFlowProvider>
      <ToolNode {...finalProps} />
    </ReactFlowProvider>
  )
}

describe('ToolNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the tool node with id as title', () => {
      const mockState: StateConfiguration = {
        id: 'tool1',
        _meta: {
          type: 'tool',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderToolNode()

      expect(screen.getByText('Tool1')).toBeInTheDocument()
    })

    it('renders with custom id', () => {
      const mockState: StateConfiguration = {
        id: 'my_custom_tool',
        _meta: {
          type: 'tool',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderToolNode({ id: 'my_custom_tool' })

      expect(screen.getByText('My_custom_tool')).toBeInTheDocument()
    })
  })

  describe('connection state', () => {
    it('renders connection indicator when is_connected is true', () => {
      const mockState: StateConfiguration = {
        id: 'tool1',
        _meta: {
          type: 'tool',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderToolNode()

      const indicator = container.querySelector('.bg-success-primary')
      expect(indicator).not.toBeNull()
    })

    it('renders disconnection indicator when is_connected is false', () => {
      const mockState: StateConfiguration = {
        id: 'tool1',
        _meta: {
          type: 'tool',
          is_connected: false,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderToolNode()

      const indicator = container.querySelector('.bg-failed-secondary')
      expect(indicator).not.toBeNull()
    })

    it('defaults to disconnected when meta is missing', () => {
      const mockState: StateConfiguration = {
        id: 'tool1',
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderToolNode()

      // When is_connected is false (default), shows error indicator
      const indicator = container.querySelector('.bg-failed-secondary')
      expect(indicator).not.toBeNull()
    })

    it('defaults to disconnected when state is not found', () => {
      mockFindState.mockReturnValue(undefined)

      const { container } = renderToolNode()

      // When state not found, is_connected defaults to false, showing error indicator
      const indicator = container.querySelector('.bg-failed-secondary')
      expect(indicator).not.toBeNull()
    })
  })

  describe('selected state', () => {
    it('renders with selected border when selected', () => {
      const mockState: StateConfiguration = {
        id: 'tool1',
        _meta: {
          type: 'tool',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderToolNode({ selected: true })

      const baseNode = container.querySelector('.border-border-specific-node-border-focus')
      expect(baseNode).not.toBeNull()
    })

    it('renders without selected border when not selected', () => {
      const mockState: StateConfiguration = {
        id: 'tool1',
        _meta: {
          type: 'tool',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderToolNode({ selected: false })

      const baseNode = container.querySelector('.border-border-specific-node-border-focus')
      expect(baseNode).toBeNull()
    })
  })

  describe('integration with findState', () => {
    it('calls findState with correct id', () => {
      const mockState: StateConfiguration = {
        id: 'custom-tool-id',
        _meta: {
          type: 'tool',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderToolNode({ id: 'custom-tool-id' })

      expect(mockFindState).toHaveBeenCalledWith('custom-tool-id')
    })
  })
})
