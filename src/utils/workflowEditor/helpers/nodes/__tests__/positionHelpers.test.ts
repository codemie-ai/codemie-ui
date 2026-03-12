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

import { describe, it, expect } from 'vitest'

import { WorkflowNode } from '@/types/workflowEditor/base'
import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'

import {
  hasSavedPositions,
  clearNodePosition,
  clearAllNodePositions,
  translateToRelative,
  translateToAbsolute,
  sortNodesByParentChild,
} from '../positionHelpers'

describe('positionHelpers', () => {
  describe('hasSavedPositions', () => {
    it('returns true when nodes have saved positions', () => {
      const nodes: WorkflowNode[] = [
        { id: 'node1', type: 'assistant', position: { x: 100, y: 100 }, data: {} },
      ]

      const config: WorkflowConfiguration = {
        states: [{ id: 'node1', _meta: { position: { x: 100, y: 100 } } } as StateConfiguration],
      }

      expect(hasSavedPositions(nodes, config)).toBe(true)
    })

    it('returns false when nodes have no saved positions', () => {
      const nodes: WorkflowNode[] = [
        { id: 'node1', type: 'assistant', position: { x: 100, y: 100 }, data: {} },
      ]

      const config: WorkflowConfiguration = {
        states: [{ id: 'node1', _meta: {} } as StateConfiguration],
      }

      expect(hasSavedPositions(nodes, config)).toBe(false)
    })
  })

  describe('clearNodePosition', () => {
    it('clears position from node meta', () => {
      const config: WorkflowConfiguration = {
        states: [{ id: 'node1', _meta: { position: { x: 100, y: 100 } } } as StateConfiguration],
      }

      const result = clearNodePosition('node1', config)

      expect(result.states?.[0]._meta?.position).toBeUndefined()
    })

    it('returns unchanged config when node not found', () => {
      const config: WorkflowConfiguration = {
        states: [{ id: 'node1', _meta: { position: { x: 100, y: 100 } } } as StateConfiguration],
      }

      const result = clearNodePosition('node2', config)

      expect(result).toBe(config)
    })
  })

  describe('clearAllNodePositions', () => {
    it('clears positions from all nodes', () => {
      const nodes: WorkflowNode[] = [
        { id: 'node1', type: 'assistant', position: { x: 100, y: 100 }, data: {} },
        { id: 'node2', type: 'assistant', position: { x: 200, y: 200 }, data: {} },
      ]

      const config: WorkflowConfiguration = {
        states: [
          { id: 'node1', _meta: { position: { x: 100, y: 100 } } } as StateConfiguration,
          { id: 'node2', _meta: { position: { x: 200, y: 200 } } } as StateConfiguration,
        ],
      }

      const result = clearAllNodePositions(nodes, config)

      expect(result.states?.[0]._meta?.position).toBeUndefined()
      expect(result.states?.[1]._meta?.position).toBeUndefined()
    })
  })

  describe('translateToRelative', () => {
    it('converts absolute position to relative', () => {
      const nodes: WorkflowNode[] = [
        { id: 'parent', type: 'iterator', position: { x: 100, y: 100 }, data: {} },
        { id: 'child', type: 'assistant', position: { x: 150, y: 200 }, data: {} },
      ]

      const result = translateToRelative('child', 'parent', nodes)

      expect(result[1].position).toEqual({ x: 50, y: 100 })
    })

    it('returns unchanged array when node not found', () => {
      const nodes: WorkflowNode[] = [
        { id: 'parent', type: 'iterator', position: { x: 100, y: 100 }, data: {} },
      ]

      const result = translateToRelative('nonexistent', 'parent', nodes)

      expect(result).toBe(nodes)
    })
  })

  describe('translateToAbsolute', () => {
    it('converts relative position to absolute', () => {
      const nodes: WorkflowNode[] = [
        { id: 'parent', type: 'iterator', position: { x: 100, y: 100 }, data: {} },
        { id: 'child', type: 'assistant', position: { x: 50, y: 100 }, data: {} },
      ]

      const result = translateToAbsolute('child', 'parent', nodes)

      expect(result[1].position).toEqual({ x: 150, y: 200 })
    })

    it('returns unchanged array when parent not found', () => {
      const nodes: WorkflowNode[] = [
        { id: 'child', type: 'assistant', position: { x: 50, y: 100 }, data: {} },
      ]

      const result = translateToAbsolute('child', 'nonexistent', nodes)

      expect(result).toBe(nodes)
    })
  })

  describe('sortNodesByParentChild', () => {
    it('places parent before child', () => {
      const nodes: WorkflowNode[] = [
        { id: 'child', type: 'assistant', position: { x: 0, y: 0 }, parentId: 'parent', data: {} },
        { id: 'parent', type: 'iterator', position: { x: 0, y: 0 }, data: {} },
      ]

      const result = sortNodesByParentChild(nodes)

      expect(result[0].id).toBe('parent')
      expect(result[1].id).toBe('child')
    })

    it('handles multiple levels of nesting', () => {
      const nodes: WorkflowNode[] = [
        {
          id: 'grandchild',
          type: 'assistant',
          position: { x: 0, y: 0 },
          parentId: 'child',
          data: {},
        },
        { id: 'child', type: 'iterator', position: { x: 0, y: 0 }, parentId: 'parent', data: {} },
        { id: 'parent', type: 'iterator', position: { x: 0, y: 0 }, data: {} },
      ]

      const result = sortNodesByParentChild(nodes)

      expect(result[0].id).toBe('parent')
      expect(result[1].id).toBe('child')
      expect(result[2].id).toBe('grandchild')
    })
  })
})
