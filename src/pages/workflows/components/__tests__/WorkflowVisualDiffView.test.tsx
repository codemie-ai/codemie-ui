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

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DiffStatus } from '@/utils/workflowEditor/diffWorkflowGraphs'
import type { VisualDiffCanvasGraph } from '@/utils/workflowEditor/prepareVisualDiffCanvas'

vi.mock('@/utils/tailwindColors', () => ({
  getTailwindColor: (_property: string, fallback?: string) => fallback ?? '#111',
}))

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>()
  return {
    ...actual,
    ReactFlow: ({
      children,
      id,
      edges,
    }: {
      children?: React.ReactNode
      id?: string
      edges?: Array<{ id: string; style?: { stroke?: string } }>
    }) => (
      <div data-testid="react-flow" data-flow-id={id}>
        {edges?.map((edge) => (
          <div
            key={edge.id}
            data-testid={`diff-edge-${edge.id}`}
            data-stroke={edge.style?.stroke ?? ''}
            style={{ stroke: edge.style?.stroke }}
          />
        ))}
        {children}
      </div>
    ),
    ReactFlowProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Controls: () => <div data-testid="rf-controls" />,
    useReactFlow: () => ({
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      fitView: vi.fn(),
      getNodes: () => [],
    }),
    useUpdateNodeInternals: () => vi.fn(),
    useNodesInitialized: () => true,
    useStore: () => 800,
    applyNodeChanges: vi.fn((_changes, nodes) => nodes),
  }
})

vi.mock('@/pages/workflows/editor/nodes', () => ({
  nodeTypeComponents: {},
}))

vi.mock('@/pages/workflows/editor/CanvasControlButton', () => ({
  default: () => null,
}))

vi.mock('@/pages/workflows/editor/DiffCanvasControls', () => ({
  default: () => null,
}))

vi.mock('@/pages/workflows/editor/nodes/DiffNodeWrapper', () => ({
  DiffNodeWrapper: () => null,
}))

vi.mock('@/pages/workflows/editor/nodes/diffChromeContext', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/pages/workflows/editor/nodes/diffChromeContext')
  >()
  return {
    ...actual,
    getDiffColor: (status: string) => `diff-color-${status}`,
  }
})

vi.mock('@/pages/workflows/editor/EditorBackground', () => ({
  default: () => <div data-testid="editor-background" />,
}))

afterEach(() => {
  cleanup()
})

const identicalGraph: VisualDiffCanvasGraph = {
  nodes: [],
  edges: [],
  statusById: new Map<string, DiffStatus>(),
}

const differGraph: VisualDiffCanvasGraph = {
  nodes: [],
  edges: [
    { id: 'added-edge-a-b', source: 'a', target: 'b' },
    { id: 'removed-edge-b-a', source: 'b', target: 'a' },
  ],
  statusById: new Map<string, DiffStatus>([
    ['a', 'added'],
    ['b', 'removed'],
  ]),
}

describe('WorkflowVisualDiffView', () => {
  const renderView = async (graph: VisualDiffCanvasGraph) => {
    const { default: WorkflowVisualDiffView } = await import('../WorkflowVisualDiffView')
    return render(<WorkflowVisualDiffView {...graph} />)
  }

  it('still renders the canvas when graphs are identical', async () => {
    const { getByTestId } = await renderView(identicalGraph)

    expect(getByTestId('react-flow')).toBeInTheDocument()
  })

  it('renders the ReactFlow canvas when a node diff exists', async () => {
    const { getByTestId } = await renderView(differGraph)

    expect(getByTestId('react-flow')).toBeInTheDocument()
    expect(getByTestId('editor-background')).toBeInTheDocument()
  })

  // xyflow Background uses a document-global SVG pattern id of `pattern-${rfId}`.
  // Both this canvas and the editor are mounted at once; a shared default rfId
  // (`1`) makes the popup fill the editor's pattern, so zoom no longer scales dots.
  it("gives the canvas a unique ReactFlow id so its background pattern is not the editor's", async () => {
    const { getByTestId } = await renderView(differGraph)

    expect(getByTestId('react-flow')).toHaveAttribute('data-flow-id', 'workflow-visual-diff')
  })

  it('applies status colors to added and removed edge strokes', async () => {
    const { getByTestId } = await renderView(differGraph)

    expect(getByTestId('diff-edge-added-edge-a-b')).toHaveAttribute(
      'data-stroke',
      'diff-color-added'
    )
    expect(getByTestId('diff-edge-removed-edge-b-a')).toHaveAttribute(
      'data-stroke',
      'diff-color-removed'
    )
  })
})
