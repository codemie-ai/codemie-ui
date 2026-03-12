/**
 * Iterator Builder
 *
 * Main logic for building and adjusting iterator nodes.
 * Handles creation, sizing, and positioning of iterator nodes.
 */

import { WorkflowNode } from '@/types/workflowEditor/base'
import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'
import {
  ITERATOR_NODE_DEFAULT_WIDTH,
  ITERATOR_NODE_DEFAULT_HEIGHT,
  NODE_Z_INDEX,
  DEFAULT_NODE_WIDTH
} from '@/utils/workflowEditor/constants'
import { translateToRelative } from '@/utils/workflowEditor/helpers/nodes'

import { LAYOUT } from '../constants'

/* Creates an iterator node from state configuration */
const createIteratorNode = (
  state: StateConfiguration,
  fallbackPosition: { x: number; y: number },
  dimensions: { width: number; height: number }
): WorkflowNode => {
  return {
    id: state.id,
    type: state._meta?.type,
    data: {},
    position: state._meta?.position || fallbackPosition,
    selected: state._meta?.selected,
    width: dimensions.width,
    height: dimensions.height,
    zIndex: NODE_Z_INDEX.ITERATOR,
  } as WorkflowNode
}

/* Gets default dimensions from iterator state or constants */
const getDefaultDimensions = (iteratorState: StateConfiguration) => ({
  width: iteratorState._meta?.measured?.width || ITERATOR_NODE_DEFAULT_WIDTH,
  height: iteratorState._meta?.measured?.height || ITERATOR_NODE_DEFAULT_HEIGHT
})

/* Calculates position for new iterator based on child node */
const calculatePositionFromChild = (childNode: WorkflowNode) => ({
  x: childNode.position.x - LAYOUT.ITERATOR_PADDING,
  y: childNode.position.y - LAYOUT.ITERATOR_PADDING
})

/* Gets default position from iterator state or constants */
const getDefaultPosition = (iteratorState: StateConfiguration) =>
  iteratorState._meta?.position || { x: LAYOUT.DEFAULT_NODE_POSITION.X, y: LAYOUT.DEFAULT_NODE_POSITION.Y }

/* Calculates iterator dimensions to fit a child node */
const calculateDimensionsFromChild = (childNode: WorkflowNode) => {
  const childWidth = childNode.width || childNode.measured?.width || DEFAULT_NODE_WIDTH
  const childHeight = childNode.height || childNode.measured?.height || ITERATOR_NODE_DEFAULT_HEIGHT

  return {
    width: childWidth + (LAYOUT.ITERATOR_PADDING * 2),
    height: childHeight + (LAYOUT.ITERATOR_PADDING * 2)
  }
}

/* Case 1: Creates new iterator with child node positioning */
const createIteratorFromChild = (
  iteratorState: StateConfiguration,
  childNode: WorkflowNode,
  nodes: WorkflowNode[]
): WorkflowNode => {
  const position = calculatePositionFromChild(childNode)

  const dimensions = iteratorState._meta?.measured
    ? { 
      width: iteratorState._meta.measured.width || ITERATOR_NODE_DEFAULT_WIDTH, 
      height: iteratorState._meta.measured.height || ITERATOR_NODE_DEFAULT_HEIGHT 
    }
    : calculateDimensionsFromChild(childNode)

  const iteratorNode = createIteratorNode(iteratorState, position, dimensions)
  nodes.push(iteratorNode)

  // Convert child position from absolute to relative using helper
  if (!childNode.measured) {
    const nodesAfterTranslate = translateToRelative(childNode.id, iteratorNode.id, nodes)
    const translatedChild = nodesAfterTranslate.find(n => n.id === childNode.id)

    if (translatedChild) {
      childNode.position = translatedChild.position
    }
  }

  return iteratorNode
}

/* Creates new iterator with default positioning */
const createIteratorWithDefaults = (
  iteratorState: StateConfiguration,
  nodes: WorkflowNode[]
): WorkflowNode => {
  const position = getDefaultPosition(iteratorState)
  const dimensions = getDefaultDimensions(iteratorState)

  const iteratorNode = createIteratorNode(iteratorState, position, dimensions)
  nodes.push(iteratorNode)

  return iteratorNode
}

/**
 * Builds or adjusts an iterator node based on its children
 *
 * Case 0: Existing iterator with _meta dimensions set → skip (dimensions are already set)
 * Case 1: No existing iterator, child node provided → create with child position
 * Case 2: Existing iterator, no child node → skip (nothing to do)
 * Case 3: No existing iterator, no child node → create with defaults
 *
 * Note: Iterator expansion when children move is handled automatically by constrainIteratorResize
 * during drag operations, so no need for explicit expansion logic here.
 */
export const buildOrAdjustIteratorNode = (
  iteratorStateID: string,
  config: WorkflowConfiguration,
  nodes: WorkflowNode[],
  childNode?: WorkflowNode
): void => {
  const iteratorState = config.states?.find(s => s.id === iteratorStateID)
  if (!iteratorState) {
    console.warn(`Iterator state not found: ${iteratorStateID}`)
    return
  }

  const existingIterator = nodes.find(n => n.id === iteratorStateID)

  // Case 0: Existing iterator with manual dimensions set
  if (existingIterator && iteratorState._meta?.measured) {
    return
  }

  // Case 1: No existing iterator, child node provided
  if (!existingIterator && childNode) {
    createIteratorFromChild(iteratorState, childNode, nodes)
    return
  }

  // Case 2: Existing iterator, no child node
  // Note: If existing iterator needs to expand when children are moved,
  // this is handled automatically by constrainIteratorResize in iteratorResizeValidator.ts
  // during dimension changes via _validateIteratorDimensions
  if (existingIterator && !childNode) {
    return
  }

  // Case 3: No existing iterator, no child node
  if (!existingIterator && !childNode) {
    createIteratorWithDefaults(iteratorState, nodes)
  }
}
