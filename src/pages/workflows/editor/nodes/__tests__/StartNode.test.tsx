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

import { CommonNodeProps } from '../common'
import { StartNode } from '../StartNode'

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
    id: 'start',
    type: 'start',
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

const renderStartNode = (props: Partial<CommonNodeProps> = {}) => {
  const finalProps = createMockProps(props)

  return render(
    <ReactFlowProvider>
      <StartNode {...finalProps} />
    </ReactFlowProvider>
  )
}

describe('StartNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the start node with id as title', () => {
      renderStartNode()

      expect(screen.getByText('Start')).toBeInTheDocument()
    })

    it('renders with custom id', () => {
      renderStartNode({ id: 'custom_start' })

      expect(screen.getByText('Custom_start')).toBeInTheDocument()
    })
  })

  describe('selected state', () => {
    it('renders with selected border when selected', () => {
      const { container } = renderStartNode({ selected: true })

      const baseNode = container.querySelector('.border-border-specific-node-border-focus')
      expect(baseNode).not.toBeNull()
    })

    it('renders without selected border when not selected', () => {
      const { container } = renderStartNode({ selected: false })

      const baseNode = container.querySelector('.border-border-specific-node-border-focus')
      expect(baseNode).toBeNull()
    })
  })

  describe('connection state', () => {
    it('renders with default connected styling (no isConnected prop)', () => {
      // StartNode doesn't check connection state, so it should always render with default styling
      const { container } = renderStartNode()

      // Should not have error border
      const errorBorder = container.querySelector('.border-failed-secondary')
      expect(errorBorder).toBeNull()
    })
  })
})
