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

import { WorkflowNode } from '@/types/workflowEditor/base'
import { StateConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { buildEdges } from '@/utils/workflowEditor/build/edges'
import { applyLayout } from '@/utils/workflowEditor/build/layout'
import { buildNodes } from '@/utils/workflowEditor/build/nodes'
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from '@/utils/workflowEditor/constants'
import { DiffResult, DiffStatus } from '@/utils/workflowEditor/diffWorkflowGraphs'

import { layoutRemovedIteratorGhosts } from './wrapRemovedIteratorGhosts'

const DIFF_SEVERITY: Record<DiffStatus, number> = { removed: 3, modified: 2, added: 1 }

const ADDED_EDGE_ID_PREFIX = 'added-edge-'
const REMOVED_EDGE_ID_PREFIX = 'removed-edge-'

const noop = () => undefined

function statesByLastId(config: WorkflowConfiguration): Map<string, StateConfiguration> {
  return new Map((config.states ?? []).map((state) => [state.id, state]))
}

function workflowEdgeKey(edge: ReturnType<typeof buildEdges>[number]): string {
  return `${edge.source}|${edge.sourceHandle ?? ''}|${edge.target}|${edge.targetHandle ?? ''}`
}

export function resolveVisualDiffEdgeStatus(
  edge: { id: string; source: string; target: string },
  statusById: Map<string, DiffStatus>
): DiffStatus | undefined {
  if (edge.id.startsWith(ADDED_EDGE_ID_PREFIX)) return 'added'
  if (edge.id.startsWith(REMOVED_EDGE_ID_PREFIX)) return 'removed'
  return pickHigherSeverity(statusById.get(edge.source), statusById.get(edge.target))
}

export function hasWorkflowEdgeDiff(
  canvasConfig: WorkflowConfiguration,
  baselineConfig: WorkflowConfiguration
): boolean {
  const canvasKeys = new Set(buildEdges(canvasConfig).map(workflowEdgeKey))
  const baselineKeys = new Set(buildEdges(baselineConfig).map(workflowEdgeKey))
  if (canvasKeys.size !== baselineKeys.size) return true
  for (const key of canvasKeys) {
    if (!baselineKeys.has(key)) return true
  }
  return false
}

function pickHigherSeverity(
  a: DiffStatus | undefined,
  b: DiffStatus | undefined
): DiffStatus | undefined {
  if (!a) return b
  if (!b) return a
  return DIFF_SEVERITY[a] >= DIFF_SEVERITY[b] ? a : b
}

function withDiffNodeData(
  node: WorkflowNode,
  config: WorkflowConfiguration,
  diffStatus: DiffStatus | undefined
): WorkflowNode {
  const width = node.measured?.width ?? node.width ?? DEFAULT_NODE_WIDTH
  const height = node.measured?.height ?? node.height ?? DEFAULT_NODE_HEIGHT
  const statesById = statesByLastId(config)

  return {
    ...node,
    width,
    height,
    measured: node.measured ?? { width, height },
    data: {
      ...node.data,
      diffStatus,
      active: false,
      findState: (id: string) => statesById.get(id),
      getConfig: () => config,
      updateConfig: noop,
      removeState: noop,
      onNodesChange: noop,
      hasError: false,
    },
  }
}

function buildRemovedGhostNodes(
  diff: DiffResult,
  restoreIds: Set<string>,
  currentBuiltById: Map<string, WorkflowNode>,
  baselineConfig: WorkflowConfiguration
): WorkflowNode[] {
  const removedNodes: WorkflowNode[] = []
  for (const entry of diff.nodes) {
    if (entry.status !== 'removed' || restoreIds.has(entry.id)) continue
    const currentNode = currentBuiltById.get(entry.id)
    if (currentNode) {
      removedNodes.push(withDiffNodeData(currentNode, baselineConfig, 'removed'))
      continue
    }
    if (!entry.baselineNode) continue
    const fallback = buildNodes({ ...baselineConfig, states: [entry.baselineNode] }).find(
      (built) => built.id === entry.id
    )
    if (fallback) {
      removedNodes.push(withDiffNodeData(fallback, baselineConfig, 'removed'))
      continue
    }

    console.warn(
      `buildVisualDiffGraph: removed node "${entry.id}" was not emitted by buildNodes; using a synthetic ghost`
    )
    const baselineMeta = entry.baselineNode._meta
    const synthetic: WorkflowNode = {
      id: entry.id,
      type: baselineMeta?.type,
      position: baselineMeta?.position ?? { x: 0, y: 0 },
      data: {},
    }
    removedNodes.push(withDiffNodeData(synthetic, baselineConfig, 'removed'))
  }
  return removedNodes
}

export function buildVisualDiffGraph(
  canvasConfig: WorkflowConfiguration,
  baselineConfig: WorkflowConfiguration,
  diff: DiffResult
): { nodes: WorkflowNode[]; edges: ReturnType<typeof buildEdges> } {
  const statusById = new Map<string, DiffStatus>(diff.nodes.map((n) => [n.id, n.status]))
  const restoreNodes = buildNodes(canvasConfig).map((node) =>
    withDiffNodeData(node, canvasConfig, statusById.get(node.id))
  )
  const currentBuiltById = new Map(buildNodes(baselineConfig).map((n) => [n.id, n]))
  const restoreIds = new Set(restoreNodes.map((n) => n.id))
  const removedNodes = buildRemovedGhostNodes(diff, restoreIds, currentBuiltById, baselineConfig)

  const currentEdges = buildEdges(baselineConfig)
  const currentKeys = new Set(currentEdges.map(workflowEdgeKey))
  const canvasEdges = buildEdges(canvasConfig)
  const restoreKeys = new Set(canvasEdges.map(workflowEdgeKey))
  const restoreEdges = canvasEdges.map((edge) =>
    currentKeys.has(workflowEdgeKey(edge))
      ? edge
      : { ...edge, id: `${ADDED_EDGE_ID_PREFIX}${edge.id}` }
  )
  const removedCurrentEdges = currentEdges
    .filter((edge) => !restoreKeys.has(workflowEdgeKey(edge)))
    .map((edge) => ({ ...edge, id: `${REMOVED_EDGE_ID_PREFIX}${edge.id}` }))
  const edges = [...restoreEdges, ...removedCurrentEdges]

  const nodes = layoutRemovedIteratorGhosts(
    applyLayout([...restoreNodes, ...removedNodes], edges),
    baselineConfig
  )

  return { nodes, edges }
}
