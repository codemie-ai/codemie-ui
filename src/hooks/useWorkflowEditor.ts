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
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  OnNodeDrag,
  OnBeforeDelete,
  OnSelectionChangeFunc,
  useReactFlow,
} from '@xyflow/react'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'

import { WorkflowNode, WorkflowEdge } from '@/types/workflowEditor/base'
import { StateConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import createworkflowEditor from '@/utils/workflowEditor'
import { NODE_CHANGE_TYPE, EDGE_CHANGE_TYPE } from '@/utils/workflowEditor/constants'
import { isIteratorNodeById } from '@/utils/workflowEditor/helpers/nodes'
import { serialize } from '@/utils/workflowEditor/serialization'

import useUndo from './useUndo'

type UseWorkflowEditorReturn = {
  // ReactFlow Stuff
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNode?: WorkflowNode
  selectedEdge?: WorkflowEdge
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onNodeDrag: OnNodeDrag
  onNodeDragStop: () => void
  onSelectionChange: OnSelectionChangeFunc
  onSelectionReset: () => void
  onConnect: OnConnect
  onBeforeDelete: OnBeforeDelete
  createState: (type: string, position: { x: number; y: number }) => void
  fitView: (options?: any) => Promise<any>
  zoomIn: () => Promise<any>
  zoomOut: () => Promise<any>
  getNodes: () => WorkflowNode[]

  // Node callbacks
  getConfig: () => WorkflowConfiguration
  findState: (stateID: string) => StateConfiguration | null
  updateConfig: (update: any) => void
  updateAdvancedConfig: (advancedConfig: Partial<WorkflowConfiguration>) => void
  removeState: (nodeId: string) => void
  duplicateState: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  deleteConnection: (edgeId: string) => void
  selectNode: (nodeId: string) => void

  config: WorkflowConfiguration
  onBeautify: () => void
  canUndo: boolean
  undo: () => void
}

type UseWorkflowEditorOptions = {
  handleSelectionChange?: (selection: { node?: WorkflowNode; edge?: WorkflowEdge }) => void
}

/* Main hook for managing workflow graph and configuration */
const useWorkflowEditor = (
  configurationString: string,
  onConfigurationUpdate: (configYaml: string) => void,
  options?: UseWorkflowEditorOptions
) => {
  const isInitialLoad = useRef(true)
  const initialConfigRef = useRef(configurationString)
  const { getIntersectingNodes, fitView, zoomIn, zoomOut, getNodes } = useReactFlow()
  const undoManager = useUndo(initialConfigRef.current, onConfigurationUpdate)

  const manager = useMemo(
    () =>
      createworkflowEditor(
        configurationString,
        onConfigurationUpdate,
        getIntersectingNodes,
        isInitialLoad.current
      ),
    [configurationString, onConfigurationUpdate, getIntersectingNodes]
  )

  const [nodes, setNodes] = useState<WorkflowNode[]>(manager.nodes)
  const [edges, setEdges] = useState<WorkflowEdge[]>(manager.edges)
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | undefined>(
    manager.selectedNode ?? undefined
  )
  const [selectedEdge, setSelectedEdge] = useState<WorkflowEdge | undefined>(undefined)

  useEffect(() => {
    setNodes(manager.nodes)
    setEdges(manager.edges)
    setSelectedNode(manager.selectedNode ?? undefined)
    isInitialLoad.current = false
  }, [manager])

  const trackChange = useCallback(() => {
    if (isInitialLoad.current) return
    undoManager.trackChange(serialize(manager.config))
  }, [manager, undoManager])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      manager.handleNodesChange(changes)
      setNodes([...manager.nodes])
    },
    [manager]
  )

  const createState = useCallback(
    (type: string, position: { x: number; y: number }) => {
      manager.createState(type, position)
      setNodes(manager.nodes)
      setEdges(manager.edges)
      trackChange()
    },
    [manager, trackChange]
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      manager.handleEdgesChange(changes)
      setEdges([...manager.edges])
      trackChange()
    },
    [manager, trackChange]
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!manager.validateConnection(connection.source, connection.target, true)) {
        return
      }

      manager.addEdge(connection)
      trackChange()
    },
    [manager, trackChange]
  )

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      if (selectedNodes.length > 0) {
        const node = selectedNodes[0] as WorkflowNode
        setSelectedNode(node)
        setSelectedEdge(undefined)
        options?.handleSelectionChange?.({ node })
      } else if (selectedEdges.length > 0) {
        const edge = selectedEdges[0] as WorkflowEdge
        setSelectedNode(undefined)
        setSelectedEdge(edge)
        options?.handleSelectionChange?.({ edge })
      } else {
        setSelectedNode(undefined)
        setSelectedEdge(undefined)
        options?.handleSelectionChange?.({})
      }
    },
    [options?.handleSelectionChange]
  )

  const onSelectionReset = useCallback(() => {
    manager.resetSelection()
    setSelectedEdge(undefined)

    const selectedEdges = edges.filter((e) => e.selected)

    if (selectedEdges.length > 0) {
      const edgeChanges = selectedEdges.map((edge) => ({
        id: edge.id,
        type: EDGE_CHANGE_TYPE.SELECT,
        selected: false,
      }))
      onEdgesChange(edgeChanges)
    }
  }, [manager, edges, onEdgesChange])

  const deleteConnection = useCallback(
    (edgeId: string) => {
      manager.removeEdge(edgeId)
      setEdges([...manager.edges])
      setSelectedEdge(undefined)
      trackChange()
    },
    [manager, trackChange]
  )

  const onNodeDrag: OnNodeDrag = useCallback(
    (_event, node) => {
      manager.handleNodeDrag(node)
      setNodes([...manager.nodes])
    },
    [manager]
  )

  const onNodeDragStop = useCallback(() => {
    manager.handleNodeDragStop()
    setNodes([...manager.nodes])
    trackChange()
  }, [manager, trackChange])

  const onBeautify = useCallback(() => {
    manager.beautify()
    trackChange()
  }, [manager, trackChange])

  const removeState = useCallback(
    (nodeId: string) => {
      manager.removeState(nodeId)
      trackChange()
    },
    [manager, trackChange]
  )

  const duplicateState = useCallback(
    (nodeId: string) => {
      const success = manager.duplicateState(nodeId)

      if (!success) return

      setNodes(manager.nodes)
      setEdges(manager.edges)

      trackChange()
    },
    [manager, trackChange]
  )

  const updateConfig = useCallback(
    (update: any) => {
      manager.updateConfig(update)
    },
    [manager]
  )

  const updateAdvancedConfig = useCallback(
    (generalConfig: Partial<WorkflowConfiguration>) => {
      manager.updateAdvancedConfig(generalConfig)
      trackChange()
    },
    [manager, trackChange]
  )

  const getConfig = useCallback(() => {
    return manager.config
  }, [manager])

  const findState = useCallback(
    (stateID: string) => {
      return manager.config.states?.find((state) => state.id === stateID) ?? null
    },
    [manager]
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      const connectedEdges = edges.filter(
        (edge) => edge.source === nodeId || edge.target === nodeId
      )

      if (connectedEdges.length > 0) {
        const edgeChanges = connectedEdges.map((edge) => ({
          id: edge.id,
          type: EDGE_CHANGE_TYPE.REMOVE,
        }))
        onEdgesChange(edgeChanges)
      }

      onNodesChange([{ id: nodeId, type: NODE_CHANGE_TYPE.REMOVE }])
      trackChange()
    },
    [edges, onNodesChange, onEdgesChange, trackChange]
  )

  const onBeforeDelete: OnBeforeDelete = useCallback(
    async ({ nodes: nodesToDelete, edges: edgesToDelete }) => {
      const hasIterator = nodesToDelete.some((node) => isIteratorNodeById(node as WorkflowNode))

      if (hasIterator) {
        // Only delete iterator nodes, filter out children
        const iteratorNodes = nodesToDelete.filter((node) =>
          isIteratorNodeById(node as WorkflowNode)
        )
        const childNodes = nodesToDelete.filter((node) => !isIteratorNodeById(node as WorkflowNode))
        const childNodeIds = new Set(childNodes.map((node) => node.id))

        const filteredEdges = edgesToDelete.filter(
          (edge) => !childNodeIds.has(edge.source) && !childNodeIds.has(edge.target)
        )

        return { nodes: iteratorNodes, edges: filteredEdges }
      }

      return { nodes: nodesToDelete, edges: edgesToDelete }
    },
    []
  )

  const selectNode = useCallback(
    (nodeId: string) => {
      const nodeChanges = nodes
        .filter((node) => node.selected)
        .map((node) => ({
          id: node.id,
          type: NODE_CHANGE_TYPE.SELECT,
          selected: false,
        }))

      const edgeChanges = edges
        .filter((edge) => edge.selected)
        .map((edge) => ({
          id: edge.id,
          type: EDGE_CHANGE_TYPE.SELECT,
          selected: false,
        }))

      const selectChange = {
        id: nodeId,
        type: NODE_CHANGE_TYPE.SELECT,
        selected: true,
      }

      if (nodeChanges.length > 0) {
        onNodesChange(nodeChanges)
      }
      if (edgeChanges.length > 0) {
        onEdgesChange(edgeChanges)
      }
      onNodesChange([selectChange])
    },
    [nodes, edges, onNodesChange, onEdgesChange]
  )

  const editor: UseWorkflowEditorReturn = {
    nodes,
    edges,
    config: manager.config,
    selectedNode,
    selectedEdge,
    onNodesChange,
    onEdgesChange,
    onNodeDrag,
    onNodeDragStop,
    onSelectionChange,
    onConnect,
    onSelectionReset,
    onBeforeDelete,
    createState,
    onBeautify,
    removeState,
    duplicateState,
    deleteNode,
    deleteConnection,
    selectNode,

    updateConfig,
    updateAdvancedConfig,
    getConfig,
    findState,

    fitView,
    zoomIn,
    zoomOut,
    getNodes,

    canUndo: undoManager.canUndo,
    undo: undoManager.undo,
  }

  return editor
}

export default useWorkflowEditor
