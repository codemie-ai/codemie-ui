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

import {
  applyNodeChanges,
  NodeChange,
  NodeProps,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react'

import { cn } from '@/utils/utils'
import { resolveVisualDiffEdgeStatus } from '@/utils/workflowEditor/buildVisualDiffGraph'
import type { VisualDiffCanvasGraph } from '@/utils/workflowEditor/prepareVisualDiffCanvas'

import DiffCanvasControls from '../editor/DiffCanvasControls'
import EditorBackground from '../editor/EditorBackground'
import { nodeTypeComponents } from '../editor/nodes'
import { getDiffColor } from '../editor/nodes/diffChromeContext'
import { DiffNodeWrapper } from '../editor/nodes/DiffNodeWrapper'

const diffNodeTypes = Object.fromEntries(
  Object.entries(nodeTypeComponents).map(([type, Comp]) => {
    const OrigComp = Comp as unknown as React.ComponentType<NodeProps>
    const WrappedNode = (props: Parameters<typeof DiffNodeWrapper>[0]) => (
      <DiffNodeWrapper {...props} data={{ ...props.data, OriginalComponent: OrigComp }} />
    )
    return [type, WrappedNode]
  })
)

export interface WorkflowVisualDiffViewProps extends VisualDiffCanvasGraph {
  isActive?: boolean
  className?: string
}

const WorkflowVisualDiffView: React.FC<WorkflowVisualDiffViewProps> = ({
  nodes: graphNodes,
  edges,
  statusById,
  isActive = true,
  className,
}) => {
  const coloredEdges = useMemo(() => {
    return edges.map((edge) => {
      const status = resolveVisualDiffEdgeStatus(edge, statusById)
      if (!status) return edge
      return {
        ...edge,
        zIndex: status === 'added' || status === 'removed' ? 1 : edge.zIndex,
        style: { ...(edge.style ?? {}), stroke: getDiffColor(status), strokeWidth: 2 },
      }
    })
  }, [edges, statusById])

  const [nodes, setNodes] = useState(graphNodes)

  useLayoutEffect(() => {
    setNodes(graphNodes)
  }, [graphNodes])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const layoutPreserving = changes.filter(
      (change) => change.type !== 'dimensions' && change.type !== 'remove'
    )
    if (layoutPreserving.length === 0) return
    setNodes((current) => applyNodeChanges(layoutPreserving, current))
  }, [])

  return (
    <div className={cn('relative min-h-0 w-full h-full', className)}>
      <ReactFlowProvider>
        <ReactFlow
          id="workflow-visual-diff"
          className="w-full h-full"
          nodeTypes={diffNodeTypes}
          nodes={nodes}
          edges={coloredEdges}
          onNodesChange={onNodesChange}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          deleteKeyCode={null}
          panOnDrag
          zoomOnScroll
          minZoom={0.05}
          maxZoom={1.2}
          proOptions={{ hideAttribution: true }}
        >
          <EditorBackground isFullscreen={false} />
          <DiffCanvasControls isActive={isActive} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}

export default WorkflowVisualDiffView
