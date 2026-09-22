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

import { describe, expect, it } from 'vitest'

import { NodeTypes, WorkflowNode } from '@/types/workflowEditor/base'
import { StateConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { LAYOUT } from '@/utils/workflowEditor/build/constants'
import {
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  ITERATOR_NODE_DEFAULT_HEIGHT,
  ITERATOR_NODE_DEFAULT_WIDTH,
} from '@/utils/workflowEditor/constants'
import { layoutRemovedIteratorGhosts } from '@/utils/workflowEditor/wrapRemovedIteratorGhosts'

function nodeById(nodes: WorkflowNode[], id: string): WorkflowNode {
  const node = nodes.find((candidate) => candidate.id === id)
  if (!node) throw new Error(`expected node ${id}`)
  return node
}

describe('layoutRemovedIteratorGhosts', () => {
  it('pins an empty removed iterator to iterator default size instead of the generic node size', () => {
    const iteratorId = 'iterator_empty'
    const nodes: WorkflowNode[] = [
      {
        id: iteratorId,
        type: NodeTypes.ITERATOR,
        position: { x: 80, y: 40 },
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        data: { diffStatus: 'removed' },
      },
    ]
    const baselineConfig: WorkflowConfiguration = {
      states: [{ id: iteratorId, _meta: { type: NodeTypes.ITERATOR } } as StateConfiguration],
    }

    const result = nodeById(layoutRemovedIteratorGhosts(nodes, baselineConfig), iteratorId)

    expect(result.width).toBe(ITERATOR_NODE_DEFAULT_WIDTH)
    expect(result.height).toBe(ITERATOR_NODE_DEFAULT_HEIGHT)
    expect(result.style).toEqual(
      expect.objectContaining({
        width: ITERATOR_NODE_DEFAULT_WIDTH,
        height: ITERATOR_NODE_DEFAULT_HEIGHT,
      })
    )
  })

  it('computes a nested removed-iterator bbox in root coordinates across the full parent chain', () => {
    const outerId = 'iterator_outer'
    const innerId = 'iterator_inner'
    const childId = 'child'
    const grandchildId = 'grandchild'
    const grandchildWidth = DEFAULT_NODE_WIDTH
    const grandchildHeight = DEFAULT_NODE_HEIGHT
    const nodes: WorkflowNode[] = [
      {
        id: outerId,
        type: NodeTypes.ITERATOR,
        position: { x: 100, y: 200 },
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        data: { diffStatus: 'removed' },
      },
      {
        id: innerId,
        type: NodeTypes.ITERATOR,
        position: { x: 10, y: 20 },
        parentId: outerId,
        data: {},
      },
      {
        id: childId,
        type: NodeTypes.ASSISTANT,
        position: { x: 5, y: 8 },
        parentId: innerId,
        data: {},
      },
      {
        id: grandchildId,
        type: NodeTypes.ASSISTANT,
        position: { x: 2, y: 3 },
        width: grandchildWidth,
        height: grandchildHeight,
        parentId: childId,
        data: {},
      },
    ]
    const baselineConfig: WorkflowConfiguration = {
      states: [
        { id: outerId, _meta: { type: NodeTypes.ITERATOR } } as StateConfiguration,
        {
          id: grandchildId,
          next: { meta_iter_state_id: outerId },
          _meta: { type: NodeTypes.ASSISTANT },
        } as StateConfiguration,
      ],
    }

    const result = nodeById(layoutRemovedIteratorGhosts(nodes, baselineConfig), outerId)

    const rootX = 100 + 10 + 5 + 2
    const rootY = 200 + 20 + 8 + 3
    expect(result.position).toEqual({
      x: rootX - LAYOUT.ITERATOR_PADDING,
      y: rootY - LAYOUT.ITERATOR_TOP_PADDING,
    })
    expect(result.width).toBe(grandchildWidth + LAYOUT.ITERATOR_PADDING * 2)
    expect(result.height).toBe(
      grandchildHeight + LAYOUT.ITERATOR_TOP_PADDING + LAYOUT.ITERATOR_PADDING
    )
  })

  it('computes a nested removed-iterator bbox from the inner iterator recalculated size, not its stale snapshot size', () => {
    const outerId = 'iterator_outer_removed'
    const innerId = 'iterator_inner_removed'
    const leafId = 'leaf'
    const leafWidth = DEFAULT_NODE_WIDTH
    const leafHeight = DEFAULT_NODE_HEIGHT
    const nodes: WorkflowNode[] = [
      {
        id: outerId,
        type: NodeTypes.ITERATOR,
        position: { x: 100, y: 200 },
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        data: { diffStatus: 'removed' },
      },
      {
        id: innerId,
        type: NodeTypes.ITERATOR,
        position: { x: 10, y: 20 },
        parentId: outerId,
        // Stale snapshot size from before the diff recompute — must NOT be used
        // for the outer bbox once the inner iterator is itself recalculated.
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        data: { diffStatus: 'removed' },
      },
      {
        id: leafId,
        type: NodeTypes.ASSISTANT,
        position: { x: 5, y: 8 },
        width: leafWidth,
        height: leafHeight,
        parentId: innerId,
        data: {},
      },
    ]
    const baselineConfig: WorkflowConfiguration = {
      states: [
        { id: outerId, _meta: { type: NodeTypes.ITERATOR } } as StateConfiguration,
        {
          id: innerId,
          _meta: {
            type: NodeTypes.ITERATOR,
            data: { next: { meta_iter_state_id: outerId } },
          },
        } as StateConfiguration,
        {
          id: leafId,
          next: { meta_iter_state_id: innerId },
          _meta: { type: NodeTypes.ASSISTANT },
        } as StateConfiguration,
      ],
    }

    const result = layoutRemovedIteratorGhosts(nodes, baselineConfig)
    const inner = nodeById(result, innerId)
    const outer = nodeById(result, outerId)

    const innerRootX = 100 + 10 + 5
    const innerRootY = 200 + 20 + 8
    const expectedInnerWidth = leafWidth + LAYOUT.ITERATOR_PADDING * 2
    const expectedInnerHeight = leafHeight + LAYOUT.ITERATOR_TOP_PADDING + LAYOUT.ITERATOR_PADDING
    const expectedInnerRootX = innerRootX - LAYOUT.ITERATOR_PADDING
    const expectedInnerRootY = innerRootY - LAYOUT.ITERATOR_TOP_PADDING

    // Inner iterator ghost is pinned to its own recalculated bbox, not the stale snapshot size.
    expect(inner.width).toBe(expectedInnerWidth)
    expect(inner.height).toBe(expectedInnerHeight)
    expect(inner.parentId).toBe(outerId)
    expect(inner.position).toEqual({
      x: expectedInnerRootX - outer.position.x,
      y: expectedInnerRootY - outer.position.y,
    })

    // Outer bbox must contain the inner ghost's recalculated (not stale) bbox.
    expect(outer.width).toBe(expectedInnerWidth + LAYOUT.ITERATOR_PADDING * 2)
    expect(outer.height).toBe(
      expectedInnerHeight + LAYOUT.ITERATOR_TOP_PADDING + LAYOUT.ITERATOR_PADDING
    )
    expect(outer.position).toEqual({
      x: expectedInnerRootX - LAYOUT.ITERATOR_PADDING,
      y: expectedInnerRootY - LAYOUT.ITERATOR_TOP_PADDING,
    })
  })

  it('reparents meta children that store the iterator link on _meta.data.next even without parentId', () => {
    const iteratorId = 'iterator_removed'
    const childId = 'decision_child'
    const childPosition = { x: 400, y: 300 }
    const nodes: WorkflowNode[] = [
      {
        id: iteratorId,
        type: NodeTypes.ITERATOR,
        position: { x: 50, y: 60 },
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        data: { diffStatus: 'removed' },
      },
      {
        id: childId,
        type: NodeTypes.CONDITIONAL,
        position: childPosition,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        data: {},
      },
    ]
    const baselineConfig: WorkflowConfiguration = {
      states: [
        { id: iteratorId, _meta: { type: NodeTypes.ITERATOR } } as StateConfiguration,
        {
          id: childId,
          _meta: {
            type: NodeTypes.CONDITIONAL,
            data: { next: { meta_iter_state_id: iteratorId } },
          },
        } as StateConfiguration,
      ],
    }

    const resultNodes = layoutRemovedIteratorGhosts(nodes, baselineConfig)
    const iterator = nodeById(resultNodes, iteratorId)
    const child = nodeById(resultNodes, childId)

    expect(child.parentId).toBe(iteratorId)
    expect(child.position).toEqual({
      x: childPosition.x - iterator.position.x,
      y: childPosition.y - iterator.position.y,
    })
    expect(iterator.position).toEqual({
      x: childPosition.x - LAYOUT.ITERATOR_PADDING,
      y: childPosition.y - LAYOUT.ITERATOR_TOP_PADDING,
    })
  })
})
