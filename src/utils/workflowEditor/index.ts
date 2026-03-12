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
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
} from '@xyflow/react'

import { WorkflowNode, WorkflowEdge, NodeType } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import { actions, type IteratorParentChange, type ConfigurationUpdate } from './actions'
import buildGraph, { applyLayout } from './build'
import { buildEdges } from './build/edges'
import { buildNodes } from './build/nodes'
import { NODE_CHANGE_TYPE, EDGE_CHANGE_TYPE } from './constants'
import { markBackwardsConnections } from './helpers/connections'
import {
  translateToRelative,
  translateToAbsolute,
  sortNodesByParentChild,
  validateIteratorDimensions,
  adjustOverlappingNodes,
  isIteratorNodeById,
} from './helpers/nodes'
import { clearSelection } from './helpers/states'
import { deserialize, serialize } from './serialization'

/**
 * Workflow manager interface
 * Main facade for managing workflow configuration, nodes, and edges
 */
export interface WorkflowEditor {
  config: WorkflowConfiguration
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNode: WorkflowNode | null
  handleNodesChange: (changes: NodeChange[]) => void
  handleEdgesChange: (changes: EdgeChange[]) => void
  handleNodeDrag: (node: WorkflowNode) => void
  handleNodeDragStop: () => void
  removeState: (nodeID: string, shouldNotify?: boolean) => void
  duplicateState: (nodeID: string) => boolean
  removeEdge: (edgeID: string) => void
  resetSelection: () => void
  createState: (type: string, position: { x: number; y: number }) => void
  addEdge: (connection: Connection) => void
  updateConfig: (update: ConfigurationUpdate) => void
  updateAdvancedConfig: (advancedConfig: Partial<WorkflowConfiguration>) => void
  validateConnection: (sourceId: string, targetId: string, showError?: boolean) => boolean
  beautify: (triggerUpdate?: boolean) => WorkflowNode[]
}

/* Main Factory Function */
const createworkflowEditor = (
  yamlConfigString: string,
  onConfigurationUpdate: (configYaml: string) => void,
  getIntersectingNodes: (node: WorkflowNode) => WorkflowNode[],
  isInitialLoad: boolean = false
): WorkflowEditor => {
  const loaddedConfig = deserialize(yamlConfigString)

  const { config, nodes, edges, selectedNode } = buildGraph(loaddedConfig, isInitialLoad)

  const _notifyConfigurationChange = () => {
    const yamlString = serialize(manager.config)
    onConfigurationUpdate(yamlString)
  }

  /* Handle iterator drop - returns all changes and iterator parent changes */
  const _handleIteratorDrop = (
    changes: NodeChange[],
    getIntersectingNodes: (node: WorkflowNode) => WorkflowNode[]
  ): { changes: NodeChange[]; iteratorParentChanges: IteratorParentChange[] } => {
    const positionChanges = changes.filter(
      (c): c is NodeChange & { type: 'position' } =>
        c.type === NODE_CHANGE_TYPE.POSITION && !c.dragging
    )

    if (positionChanges.length === 0) {
      return { changes, iteratorParentChanges: [] }
    }

    const dropResult = actions.nodes.handleIteratorDrop(
      positionChanges,
      manager.nodes,
      manager.config,
      getIntersectingNodes
    )

    const otherChanges = changes.filter(
      (c) => !(c.type === NODE_CHANGE_TYPE.POSITION && !c.dragging)
    )
    const allChanges = [...otherChanges, ...dropResult.changes]

    return { changes: allChanges, iteratorParentChanges: dropResult.parentChanges }
  }

  /* Set parentId on nodes for iterator children (non-mutating) */
  const _applyIteratorParentIDs = (
    nodes: WorkflowNode[],
    iteratorParentChanges: IteratorParentChange[]
  ): WorkflowNode[] => {
    if (iteratorParentChanges.length === 0) return nodes

    const updatedNodes = [...nodes]

    for (const parentChange of iteratorParentChanges) {
      const { nodeId, newIteratorId } = parentChange
      const nodeIndex = updatedNodes.findIndex((n) => n.id === nodeId)

      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          parentId: newIteratorId ?? undefined,
        }
      }
    }

    return updatedNodes
  }

  /* Update config with iterator relationships and convert node coordinates */
  const _updateConfigForIterators = (iteratorParentChanges: IteratorParentChange[]): boolean => {
    if (iteratorParentChanges.length === 0) return false

    for (const { nodeId, oldIteratorId, newIteratorId } of iteratorParentChanges) {
      if (newIteratorId) {
        // Update config: add/remove iterator relationship
        manager.config = actions.states.makeIterable(nodeId, newIteratorId, manager.config).config
      } else {
        manager.config = actions.states.makeNonIterable(nodeId, manager.config).config
      }

      if (oldIteratorId) {
        // Convert node coordinates: relative <-> absolute
        manager.nodes = translateToAbsolute(nodeId, oldIteratorId, manager.nodes)
      }
      if (newIteratorId) {
        manager.nodes = translateToRelative(nodeId, newIteratorId, manager.nodes)
      }
    }

    manager.nodes = sortNodesByParentChild(manager.nodes)
    return true
  }

  /* Remove deleted states from config */
  const _removeStatesFromConfig = (changes: NodeChange[]): boolean => {
    const removeChanges = changes.filter((c) => c.type === NODE_CHANGE_TYPE.REMOVE)
    if (removeChanges.length === 0) return false

    for (const change of removeChanges) manager.removeState(change.id, false)

    return true
  }

  /* Save node metadata to config (position, selection, dimensions) */
  const _saveMetadataToConfig = (changes: NodeChange[]): boolean => {
    const metadataChanges = changes.filter(
      (c) =>
        (c.type === NODE_CHANGE_TYPE.POSITION && !c.dragging) ||
        c.type === NODE_CHANGE_TYPE.SELECT ||
        (c.type === NODE_CHANGE_TYPE.DIMENSIONS && !c.resizing)
    )

    if (metadataChanges.length === 0) return false

    for (const change of metadataChanges) {
      const node = manager.nodes.find((node) => node.id === (change as { id: string }).id)
      if (node) manager.config = actions.states.saveMetadata(node, manager.config)
    }

    return true
  }

  const manager: WorkflowEditor = {
    config,
    nodes,
    edges,
    selectedNode,

    createState: (type: string, position: { x: number; y: number }) => {
      manager.resetSelection()
      const result = actions.states.create(type as NodeType, position, manager.config)
      manager.config = result.config

      manager.nodes = buildNodes(manager.config)

      const newStateId = manager.config.states[manager.config.states.length - 1].id
      const newNode = manager.nodes.find((n) => n.id === newStateId)
      const newNodeChange = {
        type: NODE_CHANGE_TYPE.POSITION,
        id: newStateId,
        position: newNode?.position,
        dragging: false,
      }
      const overlapPushChanges = adjustOverlappingNodes([newNodeChange], manager.nodes, newStateId)

      if (overlapPushChanges.length > 0) {
        manager.nodes = applyNodeChanges(overlapPushChanges, manager.nodes)
        _saveMetadataToConfig(overlapPushChanges)
      }

      manager.edges = buildEdges(manager.config)
      manager.edges = markBackwardsConnections(manager.edges, manager.nodes)

      _notifyConfigurationChange()
    },

    removeState: (nodeID, shouldNotify = true) => {
      const result = actions.states.remove(nodeID, manager.config)
      manager.config = result.config
      if (shouldNotify) _notifyConfigurationChange()
    },

    duplicateState: (nodeID: string): boolean => {
      const originalStatesLength = manager.config.states.length
      const result = actions.states.duplicate(nodeID, manager.config)

      if (result.config.states.length !== originalStatesLength) {
        manager.config = result.config
        _notifyConfigurationChange()
        return true
      }

      return false
    },

    removeEdge: (edgeID: string) => {
      const edge = manager.edges.find((e) => e.id === edgeID)

      if (!edge) {
        console.warn('Edge not found:', edgeID)
        return
      }

      const result = actions.connections.delete(
        edge.source,
        edge.target,
        edge.sourceHandle,
        manager.config
      )
      manager.config = result.config

      _notifyConfigurationChange()
    },

    updateConfig: (update: ConfigurationUpdate) => {
      const { config: updatedConfig } = actions.states.update(manager.config, update)

      manager.config = updatedConfig
      _notifyConfigurationChange()
    },

    updateAdvancedConfig: (advancedConfig: Partial<WorkflowConfiguration>) => {
      const { config: updatedConfig } = actions.config.updateAdvancedConfig(
        manager.config,
        advancedConfig
      )

      manager.config = updatedConfig
      _notifyConfigurationChange()
    },

    /**
     * Handles node changes from React Flow
     *
     * Algorithm:
     * 1. Validate iterator drops and extract parent changes
     * 2. Set parentId on nodes FIRST (before layout calculations) - sets node.parentId for iterator children
     * 3. Validate iterator dimensions with parentId set - calculates minimum sizes to contain children
     * 4. Adjust overlapping nodes with parentId set - allows iterator-child overlaps, pushes others away
     * 5. Apply all accumulated changes to nodes (processed + dimension + overlap)
     * 6. Update config for iterators - set meta_iter_state_id and convert coordinates (absolute <-> relative)
     * 7. Remove deleted states from config and save metadata to config
     * 8. Notify configuration changed if needed
     */
    handleNodesChange: (changes) => {
      const { changes: processedChanges, iteratorParentChanges } = _handleIteratorDrop(
        changes,
        getIntersectingNodes
      )
      const nodesWithParentId = _applyIteratorParentIDs(manager.nodes, iteratorParentChanges)
      const { iteratorDimensionChanges, iteratorPositionChanges } = validateIteratorDimensions(
        processedChanges,
        nodesWithParentId
      )

      const initialChanges = [
        ...processedChanges,
        ...iteratorDimensionChanges,
        ...iteratorPositionChanges,
      ]
      const overlapPushChanges = adjustOverlappingNodes(initialChanges, nodesWithParentId)
      const allChanges = [...initialChanges, ...overlapPushChanges]

      manager.nodes = applyNodeChanges(allChanges as NodeChange<WorkflowNode>[], nodesWithParentId)

      const hasDimenstionChanges = changes.some(
        (change) => change.type === NODE_CHANGE_TYPE.DIMENSIONS && !change.resizing
      )
      const hasIteratorChanges = _updateConfigForIterators(iteratorParentChanges)
      const hasRemovalChanges = _removeStatesFromConfig(processedChanges)
      const hasMetaChanges = _saveMetadataToConfig(allChanges)

      if (hasIteratorChanges || hasRemovalChanges || hasMetaChanges || hasDimenstionChanges) {
        _notifyConfigurationChange()
      }
    },

    handleEdgesChange: (changes) => {
      const removeChanges = changes.filter((c) => c.type === EDGE_CHANGE_TYPE.REMOVE)

      for (const change of removeChanges) {
        manager.removeEdge(change.id)
      }

      manager.edges = applyEdgeChanges(changes as EdgeChange<WorkflowEdge>[], manager.edges)
    },

    addEdge: (connection) => {
      const result = actions.connections.create(connection, manager.config)
      manager.config = result.config

      _notifyConfigurationChange()
    },

    resetSelection: () => {
      const result = clearSelection(manager.nodes, manager.config)
      manager.nodes = result.nodes
      manager.config = result.config
      manager.selectedNode = null
      _notifyConfigurationChange()
    },

    validateConnection: (
      sourceId: string,
      targetId: string,
      showError: boolean = false
    ): boolean => {
      return actions.connections.validate(
        { source: sourceId, target: targetId } as Connection,
        manager.nodes,
        manager.config,
        showError
      )
    },

    handleNodeDrag: (node: WorkflowNode) => {
      const intersectingNodes = getIntersectingNodes(node)
      const intersectingIterator = intersectingNodes.find((n) => isIteratorNodeById(n))

      manager.nodes = manager.nodes.map((n) => {
        if (isIteratorNodeById(n)) {
          return {
            ...n,
            data: {
              ...n.data,
              highlighted: n.id === intersectingIterator?.id,
            },
          }
        }
        return n
      })
    },

    handleNodeDragStop: () => {
      manager.nodes = manager.nodes.map((n) => {
        if (isIteratorNodeById(n)) {
          return {
            ...n,
            data: {
              ...n.data,
              highlighted: false,
            },
          }
        }
        return n
      })
    },

    beautify: (shouldNotify = true) => {
      manager.nodes = applyLayout(manager.nodes, manager.edges)
      manager.edges = markBackwardsConnections(manager.edges, manager.nodes)
      manager.config = actions.states.saveToMeta(manager.nodes, manager.config)

      if (shouldNotify) _notifyConfigurationChange()

      return manager.nodes
    },
  }

  return manager
}

export default createworkflowEditor
export type { ConfigurationUpdate } from './actions'
