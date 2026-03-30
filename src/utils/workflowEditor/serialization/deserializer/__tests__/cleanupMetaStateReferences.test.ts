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

import { describe, it, expect, beforeEach } from 'vitest'

import { NodeTypes } from '@/types/workflowEditor/base'
import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'

import { cleanupMetaStateReferences } from '../deserializer'

describe('cleanupMetaStateReferences', () => {
  let baseConfig: WorkflowConfiguration

  beforeEach(() => {
    baseConfig = { states: [] }
  })

  describe('meta_iter_state_id cleanup', () => {
    it('removes meta_iter_state_id when parent has no iter_key', () => {
      baseConfig.states = [
        {
          id: 'parent',
          next: { state_id: 'child' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
        {
          id: 'child',
          next: { meta_iter_state_id: 'iterator_1' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
      ] as StateConfiguration[]

      cleanupMetaStateReferences(baseConfig)

      const child = baseConfig.states.find((s) => s.id === 'child')
      expect(child?.next?.meta_iter_state_id).toBeUndefined()
    })

    it('keeps meta_iter_state_id when parent has iter_key and points to child via state_id', () => {
      baseConfig.states = [
        {
          id: 'parent',
          next: { state_id: 'child', iter_key: 'items' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
        {
          id: 'child',
          next: { meta_iter_state_id: 'iterator_1' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
      ] as StateConfiguration[]

      cleanupMetaStateReferences(baseConfig)

      const child = baseConfig.states.find((s) => s.id === 'child')
      expect(child?.next?.meta_iter_state_id).toBe('iterator_1')
    })

    it('keeps meta_iter_state_id when parent has iter_key and points to child via state_ids', () => {
      baseConfig.states = [
        {
          id: 'parent',
          next: { state_ids: ['child1', 'child2'], iter_key: 'items' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
        {
          id: 'child1',
          next: { meta_iter_state_id: 'iterator_1' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
        {
          id: 'child2',
          next: { meta_iter_state_id: 'iterator_1' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
      ] as StateConfiguration[]

      cleanupMetaStateReferences(baseConfig)

      const child1 = baseConfig.states.find((s) => s.id === 'child1')
      const child2 = baseConfig.states.find((s) => s.id === 'child2')
      expect(child1?.next?.meta_iter_state_id).toBe('iterator_1')
      expect(child2?.next?.meta_iter_state_id).toBe('iterator_1')
    })

    it('removes meta_iter_state_id when state has no parent at all', () => {
      baseConfig.states = [
        {
          id: 'orphan',
          next: { meta_iter_state_id: 'iterator_1' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false, data: {} },
        },
      ] as StateConfiguration[]

      cleanupMetaStateReferences(baseConfig)

      const orphan = baseConfig.states.find((s) => s.id === 'orphan')
      expect(orphan?.next?.meta_iter_state_id).toBeUndefined()
    })
  })

  describe('meta_next_state_id cleanup', () => {
    it('removes meta_next_state_id when state has no condition or switch', () => {
      baseConfig.states = [
        {
          id: 'state_a',
          next: { state_id: 'state_b', meta_next_state_id: 'conditional_1' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
        {
          id: 'state_b',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
      ] as StateConfiguration[]

      cleanupMetaStateReferences(baseConfig)

      const stateA = baseConfig.states.find((s) => s.id === 'state_a')
      expect(stateA?.next?.meta_next_state_id).toBeUndefined()
    })

    it('keeps meta_next_state_id when state has condition', () => {
      baseConfig.states = [
        {
          id: 'state_a',
          next: {
            meta_next_state_id: 'conditional_1',
            condition: { expression: 'x > 0', then: 'state_b', otherwise: 'state_c' },
          },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
      ] as StateConfiguration[]

      cleanupMetaStateReferences(baseConfig)

      const stateA = baseConfig.states.find((s) => s.id === 'state_a')
      expect(stateA?.next?.meta_next_state_id).toBe('conditional_1')
    })

    it('keeps meta_next_state_id when state has switch', () => {
      baseConfig.states = [
        {
          id: 'state_a',
          next: {
            meta_next_state_id: 'switch_1',
            switch: { cases: [{ condition: 'x === 1', state_id: 'state_b' }], default: 'state_c' },
          },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
      ] as StateConfiguration[]

      cleanupMetaStateReferences(baseConfig)

      const stateA = baseConfig.states.find((s) => s.id === 'state_a')
      expect(stateA?.next?.meta_next_state_id).toBe('switch_1')
    })
  })

  describe('edge cases', () => {
    it('does nothing when states have no next', () => {
      baseConfig.states = [
        {
          id: 'state_a',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
      ] as StateConfiguration[]

      expect(() => cleanupMetaStateReferences(baseConfig)).not.toThrow()
    })

    it('does nothing when states have no meta references', () => {
      baseConfig.states = [
        {
          id: 'state_a',
          next: { state_id: 'state_b' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
      ] as StateConfiguration[]

      cleanupMetaStateReferences(baseConfig)

      const stateA = baseConfig.states.find((s) => s.id === 'state_a')
      expect(stateA?.next?.meta_iter_state_id).toBeUndefined()
      expect(stateA?.next?.meta_next_state_id).toBeUndefined()
    })

    it('handles empty states array', () => {
      baseConfig.states = []
      expect(() => cleanupMetaStateReferences(baseConfig)).not.toThrow()
    })

    it('cleans only stale references, preserves valid ones', () => {
      baseConfig.states = [
        {
          id: 'parent',
          next: { state_id: 'valid_child', iter_key: 'items' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
        {
          id: 'valid_child',
          next: { meta_iter_state_id: 'iterator_1' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true, data: {} },
        },
        {
          id: 'stale_child',
          next: { meta_iter_state_id: 'iterator_1' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false, data: {} },
        },
      ] as StateConfiguration[]

      cleanupMetaStateReferences(baseConfig)

      const validChild = baseConfig.states.find((s) => s.id === 'valid_child')
      const staleChild = baseConfig.states.find((s) => s.id === 'stale_child')
      expect(validChild?.next?.meta_iter_state_id).toBe('iterator_1')
      expect(staleChild?.next?.meta_iter_state_id).toBeUndefined()
    })
  })
})
