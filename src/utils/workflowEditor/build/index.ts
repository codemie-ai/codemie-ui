/**
 * Graph Builders
 *
 * Centralized exports for all graph building utilities.
 * Handles construction of nodes and edges from workflow configuration.
 */

import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import { buildEdges } from './edges'
import { applyLayout } from './layout'
import { buildNodes } from './nodes'
import { saveStatesToMetaState } from '../actions/states'
import { markBackwardsConnections } from '../helpers/connections'
import { clearAllNodePositions } from '../helpers/nodes'
import { hasSavedPositions } from '../helpers/nodes/positionHelpers'
import { findSelectedNode } from '../helpers/states/manageSelection'


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
