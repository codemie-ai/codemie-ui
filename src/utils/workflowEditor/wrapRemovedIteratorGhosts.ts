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

import { NodeTypes, WorkflowNode } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import {
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  ITERATOR_NODE_DEFAULT_HEIGHT,
  ITERATOR_NODE_DEFAULT_WIDTH,
} from '@/utils/workflowEditor/constants'
import { calculateIteratorBoundingBox } from '@/utils/workflowEditor/helpers/nodes'
import { getStateNext } from '@/utils/workflowEditor/helpers/states'

type NodeUpdate = Partial<
  Pick<WorkflowNode, 'position' | 'width' | 'height' | 'measured' | 'parentId'>
>

function pinIteratorDimension(
  explicit: number | undefined,
  measured: number | undefined,
  genericDefault: number,
  iteratorDefault: number
): number {
  if (measured != null && measured !== genericDefault) return measured
  if (explicit != null && explicit !== genericDefault) return explicit
  return iteratorDefault
}

function pinIteratorLayoutSize(node: WorkflowNode): WorkflowNode {
  if (node.type !== NodeTypes.ITERATOR) return node

  const pinGenericToIteratorDefault = node.data.diffStatus === 'removed'
  const width = pinGenericToIteratorDefault
    ? pinIteratorDimension(
        node.width,
        node.measured?.width,
        DEFAULT_NODE_WIDTH,
        ITERATOR_NODE_DEFAULT_WIDTH
      )
    : node.width ?? ITERATOR_NODE_DEFAULT_WIDTH
  const height = pinGenericToIteratorDefault
    ? pinIteratorDimension(
        node.height,
        node.measured?.height,
        DEFAULT_NODE_HEIGHT,
        ITERATOR_NODE_DEFAULT_HEIGHT
      )
    : node.height ?? ITERATOR_NODE_DEFAULT_HEIGHT

  return {
    ...node,
    width,
    height,
    style: { ...node.style, width, height },
  }
}

function getRootAbsolutePosition(
  node: WorkflowNode,
  byId: Map<string, WorkflowNode>,
  resolvedAbsolutePositions: Map<string, { x: number; y: number }>,
  seen: Set<string> = new Set()
): { x: number; y: number } {
  const resolved = resolvedAbsolutePositions.get(node.id)
  if (resolved) return resolved

  if (!node.parentId) return node.position
  if (seen.has(node.id)) return node.position

  const parent = byId.get(node.parentId)
  if (!parent) return node.position

  seen.add(node.id)
  const origin = getRootAbsolutePosition(parent, byId, resolvedAbsolutePositions, seen)
  return {
    x: node.position.x + origin.x,
    y: node.position.y + origin.y,
  }
}

function collectRemovedIteratorUpdate(
  node: WorkflowNode,
  byId: Map<string, WorkflowNode>,
  baselineConfig: WorkflowConfiguration,
  resolvedAbsolutePositions: Map<string, { x: number; y: number }>
): Map<string, NodeUpdate> {
  const updates = new Map<string, NodeUpdate>()
  const children = (baselineConfig.states ?? [])
    .filter((state) => getStateNext(state)?.meta_iter_state_id === node.id)
    .flatMap((state) => {
      const child = byId.get(state.id)
      return child ? [child] : []
    })

  if (children.length === 0) return updates

  const absChildren = children.map((child) => ({
    ...child,
    parentId: undefined,
    position: getRootAbsolutePosition(child, byId, resolvedAbsolutePositions),
  }))
  const bbox = calculateIteratorBoundingBox(absChildren)

  resolvedAbsolutePositions.set(node.id, { x: bbox.x, y: bbox.y })

  updates.set(node.id, {
    position: { x: bbox.x, y: bbox.y },
    width: bbox.width,
    height: bbox.height,
    measured: { width: bbox.width, height: bbox.height },
  })

  for (const absChild of absChildren) {
    updates.set(absChild.id, {
      parentId: node.id,
      position: {
        x: absChild.position.x - bbox.x,
        y: absChild.position.y - bbox.y,
      },
    })
  }

  return updates
}

function getIteratorChildIds(nodeId: string, baselineConfig: WorkflowConfiguration): string[] {
  return (baselineConfig.states ?? [])
    .filter((state) => getStateNext(state)?.meta_iter_state_id === nodeId)
    .map((state) => state.id)
}

function orderRemovedIteratorsInnermostFirst(
  removedIterators: WorkflowNode[],
  baselineConfig: WorkflowConfiguration
): WorkflowNode[] {
  const removedIds = new Set(removedIterators.map((node) => node.id))
  const depthById = new Map<string, number>()

  function nestingDepth(nodeId: string, seen: Set<string>): number {
    if (depthById.has(nodeId)) return depthById.get(nodeId)!
    if (seen.has(nodeId)) return 0
    seen.add(nodeId)

    const removedChildIds = getIteratorChildIds(nodeId, baselineConfig).filter((id) =>
      removedIds.has(id)
    )
    const depth =
      removedChildIds.length === 0
        ? 0
        : 1 + Math.max(...removedChildIds.map((id) => nestingDepth(id, seen)))

    depthById.set(nodeId, depth)
    return depth
  }

  return [...removedIterators].sort(
    (a, b) => nestingDepth(a.id, new Set()) - nestingDepth(b.id, new Set())
  )
}

function wrapRemovedIteratorsAroundBaselineChildren(
  nodes: WorkflowNode[],
  baselineConfig: WorkflowConfiguration
): WorkflowNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const updates = new Map<string, NodeUpdate>()
  const resolvedAbsolutePositions = new Map<string, { x: number; y: number }>()

  const removedIterators = nodes.filter(
    (node) => node.type === NodeTypes.ITERATOR && node.data.diffStatus === 'removed'
  )
  const orderedRemovedIterators = orderRemovedIteratorsInnermostFirst(
    removedIterators,
    baselineConfig
  )

  for (const node of orderedRemovedIterators) {
    const nodeUpdates = collectRemovedIteratorUpdate(
      node,
      byId,
      baselineConfig,
      resolvedAbsolutePositions
    )
    for (const [id, upd] of nodeUpdates) {
      const mergedUpdate = { ...updates.get(id), ...upd }
      updates.set(id, mergedUpdate)
      const existingNode = byId.get(id)
      if (existingNode) byId.set(id, { ...existingNode, ...mergedUpdate })
    }
  }

  if (updates.size === 0) return nodes

  return nodes.map((node) => {
    const upd = updates.get(node.id)
    return upd ? { ...node, ...upd } : node
  })
}

export function layoutRemovedIteratorGhosts(
  nodes: WorkflowNode[],
  baselineConfig: WorkflowConfiguration
): WorkflowNode[] {
  return wrapRemovedIteratorsAroundBaselineChildren(nodes, baselineConfig).map(
    pinIteratorLayoutSize
  )
}
