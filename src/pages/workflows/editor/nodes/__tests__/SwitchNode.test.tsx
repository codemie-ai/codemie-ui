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
import { SwitchNode } from '../SwitchNode'

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react')
  return {
    ...actual,
    useUpdateNodeInternals: () => vi.fn(),
    useNodeConnections: () => [],
  }
})

const mockFindState = vi.fn()
const mockGetConfig = vi.fn()
const mockUpdateConfig = vi.fn()
const mockRemoveState = vi.fn()

const createMockProps = (overrides?: Partial<CommonNodeProps>): CommonNodeProps =>
  ({
    id: 'switch1',
    type: 'switch',
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

const renderSwitchNode = (props: Partial<CommonNodeProps> = {}) => {
  const finalProps = createMockProps(props)

  return render(
    <ReactFlowProvider>
      <SwitchNode {...finalProps} />
    </ReactFlowProvider>
  )
}

describe('SwitchNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the switch node with title', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderSwitchNode()

      expect(screen.getByText('Switch')).toBeInTheDocument()
    })

    it('renders switch node with empty cases', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: true,
          data: {
            next: {
              switch: {
                cases: [],
              },
            },
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderSwitchNode()

      // Should render only the default "Else" case
      expect(screen.getByText('Else')).toBeInTheDocument()
      expect(screen.getByText('(default)')).toBeInTheDocument()
    })

    it('renders multiple switch cases', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: true,
          data: {
            next: {
              switch: {
                cases: [
                  { condition: 'status == "active"' },
                  { condition: 'status == "pending"' },
                  { condition: 'status == "inactive"' },
                ],
              },
            },
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderSwitchNode()

      // Should render all three cases
      expect(screen.getByText('Case 1')).toBeInTheDocument()
      expect(screen.getByText('status == "active"')).toBeInTheDocument()

      expect(screen.getByText('Case 2')).toBeInTheDocument()
      expect(screen.getByText('status == "pending"')).toBeInTheDocument()

      expect(screen.getByText('Case 3')).toBeInTheDocument()
      expect(screen.getByText('status == "inactive"')).toBeInTheDocument()

      // Should also render the default "Else" case
      expect(screen.getByText('Else')).toBeInTheDocument()
      expect(screen.getByText('(default)')).toBeInTheDocument()
    })

    it('renders default case label when condition is missing', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: true,
          data: {
            next: {
              switch: {
                cases: [
                  {}, // Case without condition
                  { condition: '' }, // Case with empty condition
                ],
              },
            },
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderSwitchNode()

      // Should render default labels for empty conditions
      expect(screen.getByText('Case 1')).toBeInTheDocument()
      expect(screen.getByText('case 1')).toBeInTheDocument()

      expect(screen.getByText('Case 2')).toBeInTheDocument()
      expect(screen.getByText('case 2')).toBeInTheDocument()
    })
  })

  describe('connection state', () => {
    it('renders connection indicator when is_connected is true', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderSwitchNode()

      const indicator = container.querySelector('.bg-success-primary')
      expect(indicator).not.toBeNull()
    })

    it('renders disconnection indicator when is_connected is false', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: false,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderSwitchNode()

      const indicator = container.querySelector('.bg-failed-secondary')
      expect(indicator).not.toBeNull()
    })

    it('defaults to disconnected when meta is missing', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderSwitchNode()

      const indicator = container.querySelector('.bg-failed-secondary')
      expect(indicator).not.toBeNull()
    })
  })

  describe('selected state', () => {
    it('renders with selected border when selected', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderSwitchNode({ selected: true })

      const baseNode = container.querySelector('.border-border-specific-node-border-focus')
      expect(baseNode).not.toBeNull()
    })

    it('renders without selected border when not selected', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      const { container } = renderSwitchNode({ selected: false })

      const baseNode = container.querySelector('.border-border-specific-node-border-focus')
      expect(baseNode).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('renders when state is not found', () => {
      mockFindState.mockReturnValue(undefined)

      renderSwitchNode()

      // Should still render the switch node
      expect(screen.getByText('Switch')).toBeInTheDocument()
      expect(screen.getByText('Else')).toBeInTheDocument()
    })

    it('renders when next is missing', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: true,
          data: {},
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderSwitchNode()

      // Should render with default "Else" case
      expect(screen.getByText('Switch')).toBeInTheDocument()
      expect(screen.getByText('Else')).toBeInTheDocument()
    })

    it('renders when switch data is missing', () => {
      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: true,
          data: {
            next: {},
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderSwitchNode()

      // Should render with default "Else" case
      expect(screen.getByText('Switch')).toBeInTheDocument()
      expect(screen.getByText('Else')).toBeInTheDocument()
    })

    it('handles large number of cases', () => {
      const cases = Array.from({ length: 20 }, (_, i) => ({
        condition: `condition ${i + 1}`,
      }))

      const mockState: StateConfiguration = {
        id: 'switch1',
        _meta: {
          type: 'switch',
          is_connected: true,
          data: {
            next: {
              switch: {
                cases,
              },
            },
          },
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderSwitchNode()

      // Should render all 20 cases
      expect(screen.getByText('Case 1')).toBeInTheDocument()
      expect(screen.getByText('Case 20')).toBeInTheDocument()
      expect(screen.getByText('condition 20')).toBeInTheDocument()
    })
  })

  describe('integration with findState', () => {
    it('calls findState with correct id', () => {
      const mockState: StateConfiguration = {
        id: 'custom-switch-id',
        _meta: {
          type: 'switch',
          is_connected: true,
        },
      }

      mockFindState.mockReturnValue(mockState)

      renderSwitchNode({ id: 'custom-switch-id' })

      expect(mockFindState).toHaveBeenCalledWith('custom-switch-id')
    })
  })
})
