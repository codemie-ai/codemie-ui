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
import { SubWorkflowNode } from '../SubWorkflowNode'

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
    id: 'sub1',
    type: 'sub_workflow',
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

const renderSubWorkflowNode = (props: Partial<CommonNodeProps> = {}) =>
  render(
    <ReactFlowProvider>
      <SubWorkflowNode {...createMockProps(props)} />
    </ReactFlowProvider>
  )

describe('SubWorkflowNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls findState with the node id', () => {
    mockFindState.mockReturnValue(undefined)
    renderSubWorkflowNode({ id: 'my-sub-node' })
    expect(mockFindState).toHaveBeenCalledWith('my-sub-node')
  })

  it('renders the node id as title', () => {
    mockFindState.mockReturnValue({
      id: 'sub1',
      _meta: { type: 'sub_workflow', is_connected: true },
    } as unknown as StateConfiguration)
    renderSubWorkflowNode()
    expect(screen.getByText('Sub1')).toBeInTheDocument()
  })

  it('defaults to disconnected indicator when state not found', () => {
    mockFindState.mockReturnValue(undefined)
    const { container } = renderSubWorkflowNode()
    expect(container.querySelector('.bg-failed-secondary')).not.toBeNull()
  })
})
