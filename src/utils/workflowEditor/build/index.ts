/**
 * Graph Builders
 *
 * Centralized exports for all graph building utilities.
 * Handles construction of nodes and edges from workflow configuration.
 */

import { WorkflowEdge, WorkflowNode } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import { buildEdges } from './edges'
import { applyLayout } from './layout'
import { buildNodes } from './nodes'
import { saveStatesToMetaState } from '../actions/states'
import { markBackwardsConnections } from '../helpers/connections'
import { clearAllNodePositions } from '../helpers/nodes'
import { hasSavedPositions } from '../helpers/nodes/positionHelpers'
import { findSelectedNode } from '../helpers/states/manageSelection'

const hasSavedPosition = (node: WorkflowNode, config: WorkflowConfiguration): boolean =>
  config.states?.find((state) => state.id === node.id)?._meta?.position !== undefined

/**
 * Gives every node without a saved position its dagre layout position.
 * Saved positions are kept. A child keeps the layout offset inside its iterator, so it stays in
 * the iterator's frame whether or not that iterator was positioned.
 */
const placeUnpositionedNodes = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  config: WorkflowConfiguration
): WorkflowNode[] => {
  const savedCount = nodes.filter((node) => hasSavedPosition(node, config)).length
  if (savedCount === 0 || savedCount === nodes.length) return nodes

  const layoutPositions = new Map(applyLayout(nodes, edges).map((node) => [node.id, node.position]))

  return nodes.map((node) =>
    hasSavedPosition(node, config)
      ? node
      : { ...node, position: layoutPositions.get(node.id) ?? node.position }
  )
}

const buildGraph = (
  config: WorkflowConfiguration,
  isInitialLoad: boolean
) => {
  let nodes = buildNodes(config)
  let edges = buildEdges(config)
  edges = markBackwardsConnections(edges, nodes)

  if (!hasSavedPositions(nodes, config)) {
    config = clearAllNodePositions(nodes, config)
    nodes = buildNodes(config)
    nodes = applyLayout(nodes, edges)
    config = saveStatesToMetaState(nodes, config)
  }

  if (isInitialLoad) {
    nodes = placeUnpositionedNodes(nodes, edges, config)
  }

  edges = markBackwardsConnections(edges, nodes)
  const selectedNode = findSelectedNode(nodes, config) ?? null

  if (isInitialLoad && hasSavedPositions(nodes, config)) {
    config = saveStatesToMetaState(nodes, config)
  }

  return {
    config, nodes, edges, selectedNode
  }
}

export { applyLayout } from './layout'
export default buildGraph
