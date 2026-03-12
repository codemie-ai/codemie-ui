/**
 * Dagre-based Workflow Layout
 *
 * Uses dagre library for automatic graph layout of workflow nodes.
 * Provides hierarchical left-to-right layout with proper spacing.
 */

import dagre from 'dagre'

import { WorkflowNode, WorkflowEdge } from '@/types/workflowEditor/base'
import {
  getNodeDimensions,
  calculateIteratorBoundingBox,
  isIteratorNode,
  isChildNode
} from '@/utils/workflowEditor/helpers/nodes'

import { LAYOUT } from './constants'

/* Layout options for dagre */
const DAGRE_OPTIONS = {
  rankdir: 'LR', // Left to right layout
  ranksep: LAYOUT.SPACING_X, // Horizontal spacing between ranks (columns)
  nodesep: LAYOUT.SPACING_Y, // Vertical spacing between nodes in same rank
  marginx: LAYOUT.MARGIN_X,
  marginy: LAYOUT.MARGIN_Y,
}

/**
 * Result of iterator adjustment with its children
 */
interface IteratorAdjustmentResult {
  iterator: WorkflowNode
  children: WorkflowNode[]
}

/**
 * Categorized nodes for layout processing
 */
interface CategorizedNodes {
  iterators: WorkflowNode[]
  notes: WorkflowNode[]
  childrenToLayout: WorkflowNode[]
  topLevelToLayout: WorkflowNode[]
}

/**
 * Categorizes nodes into groups for layout processing
 * Single pass through nodes array for better performance
 */
const categorizeNodes = (nodes: WorkflowNode[]): CategorizedNodes => {
  const result: CategorizedNodes = {
    iterators: [],
    notes: [],
    childrenToLayout: [],
    topLevelToLayout: [],
  }

  for (const node of nodes) {
    if (isIteratorNode(node)) {
      result.iterators.push(node)
    } else if (isChildNode(node)) {
      result.childrenToLayout.push(node)
    } else {
      result.topLevelToLayout.push(node)
    }
  }

  return result
}

/**
 * Converts dagre center position to top-left position
 */
const convertCenterToTopLeft = (
  centerX: number,
  centerY: number,
  width: number,
  height: number
): { x: number; y: number } => ({
  x: centerX - width / 2,
  y: centerY - height / 2,
})

/**
 * Adjusts iterator node to fit its children
 * Converts child positions from absolute to relative
 */
const adjustIteratorToChildren = (
  iterator: WorkflowNode,
  children: WorkflowNode[]
): IteratorAdjustmentResult => {
  if (children.length === 0) {
    return { iterator, children: [] }
  }

  const bbox = calculateIteratorBoundingBox(children)

  const adjustedIterator = {
    ...iterator,
    position: { x: bbox.x, y: bbox.y },
    width: bbox.width,
    height: bbox.height,
    measured: { width: bbox.width, height: bbox.height },
  }

  const adjustedChildren = children.map(child => ({
    ...child,
    position: {
      x: child.position.x - bbox.x,
      y: child.position.y - bbox.y,
    },
  }))

  return { iterator: adjustedIterator, children: adjustedChildren }
}

/**
 * Assembles final node array from categorized and adjusted nodes
 */
const assembleLayoutedNodes = (
  layoutedNodes: WorkflowNode[],
  adjustedChildren: WorkflowNode[],
  adjustedIterators: WorkflowNode[],
): WorkflowNode[] => {
  const topLevelNodes = layoutedNodes.filter(node => !isChildNode(node))

  return [
    ...adjustedIterators,
    ...topLevelNodes,
    ...adjustedChildren,
  ]
}

/**
 * Applies dagre layout to workflow nodes
 * Skips iterator nodes and note nodes
 * Treats iterator children as top-level nodes for layout
 * Converts child node positions from relative to absolute after layout
 *
 * @param nodes - Array of workflow nodes
 * @param edges - Array of workflow edges
 * @returns Array of nodes with updated positions
 */

export const applyLayout = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] => {
  if (nodes.length === 0) return nodes

  const { iterators, childrenToLayout, topLevelToLayout } = categorizeNodes(nodes)
  const nodesToLayout = [...topLevelToLayout, ...childrenToLayout]

  // Layout all non-iterator nodes with dagre (children get absolute positions)
  const layoutedNodes = layoutNodes(nodesToLayout, edges)

  // For each iterator, fit it around its children and convert child positions to relative
  const iteratorAdjustments = iterators.map(iterator => {
    const children = layoutedNodes.filter(node => node.parentId === iterator.id)
    return adjustIteratorToChildren(iterator, children)
  })

  const adjustedIterators = iteratorAdjustments.map(a => a.iterator)
  const adjustedChildren = iteratorAdjustments.flatMap(a => a.children)

  return assembleLayoutedNodes(layoutedNodes, adjustedChildren, adjustedIterators)
}

/**
 * Internal function to layout a set of nodes using dagre
 *
 * @param nodes - Nodes to layout
 * @param edges - Edges between the nodes
 * @param options - Optional dagre graph options to override defaults
 * @returns Nodes with updated positions
 */
const layoutNodes = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: Partial<typeof DAGRE_OPTIONS> = {}
): WorkflowNode[] => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ ...DAGRE_OPTIONS, ...options })

  // Add nodes to dagre graph
  for (const node of nodes) {
    const { width, height } = getNodeDimensions(node)
    dagreGraph.setNode(node.id, { width, height })
  }

  // Add edges to dagre graph (only those connecting these nodes)
  const nodeIds = new Set(nodes.map(n => n.id))
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      dagreGraph.setEdge(edge.source, edge.target)
    }
  }

  dagre.layout(dagreGraph)

  return nodes.map(node => {
    const nodeWithPosition = dagreGraph.node(node.id)

    if (!nodeWithPosition) {
      console.warn(`Node ${node.id} not found in dagre graph after layout`)
      return node
    }

    const { width, height } = getNodeDimensions(node)

    // Dagre returns center positions, convert to top-left
    return {
      ...node,
      position: convertCenterToTopLeft(
        nodeWithPosition.x,
        nodeWithPosition.y,
        width,
        height
      ),
    }
  })
}
