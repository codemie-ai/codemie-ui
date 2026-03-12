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

import { addIteratorStates } from '../iterators'

describe('addIteratorStates', () => {
  let baseConfig: WorkflowConfiguration

  beforeEach(() => {
    baseConfig = {
      assistants: [],
      states: [],
      retry_policy: {},
    }
  })

  describe('detecting iter_key and adding meta_iter_state_id to children', () => {
    it('adds meta_iter_state_id to single child when parent has iter_key', () => {
      baseConfig.states = [
        {
          id: 'parent',
          assistant_id: 'assistant1',
          task: 'Fetch items',
          next: {
            state_id: 'child',
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child',
          assistant_id: 'assistant2',
          task: 'Process item',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
      ] as StateConfiguration[]

      addIteratorStates(baseConfig)

      const child = baseConfig.states.find((s) => s.id === 'child')
      expect(child?.next?.meta_iter_state_id).toBeDefined()
      expect(child?.next?.meta_iter_state_id).toMatch(/^iterator_/)
    })

    it('adds meta_iter_state_id to all children when parent has state_ids with iter_key', () => {
      baseConfig.states = [
        {
          id: 'parent',
          assistant_id: 'assistant1',
          task: 'Fetch items',
          next: {
            state_ids: ['child1', 'child2'],
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child1',
          assistant_id: 'assistant2',
          task: 'Process item',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child2',
          assistant_id: 'assistant3',
          task: 'Validate item',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
      ] as StateConfiguration[]

      addIteratorStates(baseConfig)

      const child1 = baseConfig.states.find((s) => s.id === 'child1')
      const child2 = baseConfig.states.find((s) => s.id === 'child2')

      expect(child1?.next?.meta_iter_state_id).toBeDefined()
      expect(child2?.next?.meta_iter_state_id).toBeDefined()
      // Both children should reference the same iterator
      expect(child1?.next?.meta_iter_state_id).toBe(child2?.next?.meta_iter_state_id)
    })

    it('creates iterator node with correct iter_key', () => {
      baseConfig.states = [
        {
          id: 'parent',
          assistant_id: 'assistant1',
          task: 'Fetch items',
          next: {
            state_id: 'child',
            iter_key: 'my_items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child',
          assistant_id: 'assistant2',
          task: 'Process item',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
      ] as StateConfiguration[]

      addIteratorStates(baseConfig)

      const child = baseConfig.states.find((s) => s.id === 'child')
      const iteratorId = child?.next?.meta_iter_state_id

      const iterator = baseConfig.states.find((s) => s.id === iteratorId)
      expect(iterator).toBeDefined()
      expect(iterator?._meta?.type).toBe(NodeTypes.ITERATOR)
      expect(iterator?._meta?.data?.next?.iter_key).toBe('my_items')
    })

    it('does not add meta_iter_state_id when parent has no iter_key', () => {
      baseConfig.states = [
        {
          id: 'parent',
          assistant_id: 'assistant1',
          task: 'Regular task',
          next: {
            state_id: 'child',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child',
          assistant_id: 'assistant2',
          task: 'Another task',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
      ] as StateConfiguration[]

      addIteratorStates(baseConfig)

      const child = baseConfig.states.find((s) => s.id === 'child')
      expect(child?.next?.meta_iter_state_id).toBeUndefined()
    })

    it('does not add meta_iter_state_id when parent has no children', () => {
      baseConfig.states = [
        {
          id: 'parent',
          assistant_id: 'assistant1',
          task: 'Fetch items',
          next: {
            state_id: '',
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
      ] as StateConfiguration[]

      addIteratorStates(baseConfig)

      // Should not create iterator since there are no children
      const iterators = baseConfig.states.filter((s) => s._meta?.type === NodeTypes.ITERATOR)
      expect(iterators.length).toBe(0)
    })
  })

  describe('iterator grouping by iter_key', () => {
    it('creates one iterator per unique iter_key', () => {
      baseConfig.states = [
        {
          id: 'parent1',
          assistant_id: 'assistant1',
          task: 'Fetch items',
          next: {
            state_id: 'child1',
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'parent2',
          assistant_id: 'assistant2',
          task: 'Fetch users',
          next: {
            state_id: 'child2',
            iter_key: 'users',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child1',
          assistant_id: 'assistant3',
          task: 'Process item',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child2',
          assistant_id: 'assistant4',
          task: 'Process user',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
      ] as StateConfiguration[]

      addIteratorStates(baseConfig)

      const iterators = baseConfig.states.filter((s) => s._meta?.type === NodeTypes.ITERATOR)
      expect(iterators.length).toBe(2)

      const itemsIterator = iterators.find((i) => i._meta?.data?.next?.iter_key === 'items')
      const usersIterator = iterators.find((i) => i._meta?.data?.next?.iter_key === 'users')

      expect(itemsIterator).toBeDefined()
      expect(usersIterator).toBeDefined()
    })

    it('reuses same iterator for multiple parents with same iter_key', () => {
      baseConfig.states = [
        {
          id: 'parent1',
          assistant_id: 'assistant1',
          task: 'Fetch items A',
          next: {
            state_id: 'child1',
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'parent2',
          assistant_id: 'assistant2',
          task: 'Fetch items B',
          next: {
            state_id: 'child2',
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child1',
          assistant_id: 'assistant3',
          task: 'Process item A',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child2',
          assistant_id: 'assistant4',
          task: 'Process item B',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
      ] as StateConfiguration[]

      addIteratorStates(baseConfig)

      const child1 = baseConfig.states.find((s) => s.id === 'child1')
      const child2 = baseConfig.states.find((s) => s.id === 'child2')

      // Both children should reference the same iterator
      expect(child1?.next?.meta_iter_state_id).toBe(child2?.next?.meta_iter_state_id)

      // Should only create one iterator for 'items'
      const iterators = baseConfig.states.filter((s) => s._meta?.type === NodeTypes.ITERATOR)
      expect(iterators.length).toBe(1)
      expect(iterators[0]._meta?.data?.next?.iter_key).toBe('items')
    })

    it('accumulates all children for same iter_key', () => {
      baseConfig.states = [
        {
          id: 'parent1',
          assistant_id: 'assistant1',
          task: 'Fetch items',
          next: {
            state_ids: ['child1', 'child2'],
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'parent2',
          assistant_id: 'assistant2',
          task: 'More items',
          next: {
            state_id: 'child3',
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child1',
          assistant_id: 'assistant3',
          task: 'Process 1',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child2',
          assistant_id: 'assistant4',
          task: 'Process 2',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child3',
          assistant_id: 'assistant5',
          task: 'Process 3',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
      ] as StateConfiguration[]

      addIteratorStates(baseConfig)

      const child1 = baseConfig.states.find((s) => s.id === 'child1')
      const child2 = baseConfig.states.find((s) => s.id === 'child2')
      const child3 = baseConfig.states.find((s) => s.id === 'child3')

      // All three children should reference the same iterator
      const iteratorId = child1?.next?.meta_iter_state_id
      expect(iteratorId).toBeDefined()
      expect(child2?.next?.meta_iter_state_id).toBe(iteratorId)
      expect(child3?.next?.meta_iter_state_id).toBe(iteratorId)

      // Only one iterator should be created
      const iterators = baseConfig.states.filter((s) => s._meta?.type === NodeTypes.ITERATOR)
      expect(iterators.length).toBe(1)
    })
  })

  describe('existing iterator handling', () => {
    it('reuses existing iterator when child already has meta_iter_state_id', () => {
      const existingIteratorId = 'iterator_existing'

      baseConfig.states = [
        {
          id: 'parent',
          assistant_id: 'assistant1',
          task: 'Fetch items',
          next: {
            state_id: 'child',
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child',
          assistant_id: 'assistant2',
          task: 'Process item',
          next: {
            state_id: '',
            meta_iter_state_id: existingIteratorId,
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: existingIteratorId,
          _meta: {
            type: NodeTypes.ITERATOR,
            is_connected: false,
            data: {
              next: { iter_key: 'items' },
            },
          },
        } as StateConfiguration,
      ]

      addIteratorStates(baseConfig)

      // Should not create a new iterator
      const iterators = baseConfig.states.filter((s) => s._meta?.type === NodeTypes.ITERATOR)
      expect(iterators.length).toBe(1)
      expect(iterators[0].id).toBe(existingIteratorId)

      // Child should still reference existing iterator
      const child = baseConfig.states.find((s) => s.id === 'child')
      expect(child?.next?.meta_iter_state_id).toBe(existingIteratorId)
    })
  })

  describe('edge cases', () => {
    it('handles empty states array', () => {
      baseConfig.states = []

      addIteratorStates(baseConfig)

      expect(baseConfig.states.length).toBe(0)
    })

    it('handles state with no next property', () => {
      baseConfig.states = [
        {
          id: 'state1',
          assistant_id: 'assistant1',
          task: 'Task',
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        } as StateConfiguration,
      ]

      addIteratorStates(baseConfig)

      // Should not throw error
      expect(baseConfig.states.length).toBe(1)
    })

    it('preserves existing state properties when adding meta_iter_state_id', () => {
      baseConfig.states = [
        {
          id: 'parent',
          assistant_id: 'assistant1',
          task: 'Fetch items',
          next: {
            state_id: 'child',
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child',
          assistant_id: 'assistant2',
          task: 'Process item',
          next: {
            state_id: 'grandchild',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'grandchild',
          assistant_id: 'assistant3',
          task: 'Final task',
          next: { state_id: '' },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
      ] as StateConfiguration[]

      addIteratorStates(baseConfig)

      const child = baseConfig.states.find((s) => s.id === 'child')

      // Should preserve existing next.state_id
      expect(child?.next?.state_id).toBe('grandchild')
      // And add meta_iter_state_id
      expect(child?.next?.meta_iter_state_id).toBeDefined()
    })

    it('creates next object if child has no next property', () => {
      baseConfig.states = [
        {
          id: 'parent',
          assistant_id: 'assistant1',
          task: 'Fetch items',
          next: {
            state_id: 'child',
            iter_key: 'items',
          },
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        },
        {
          id: 'child',
          assistant_id: 'assistant2',
          task: 'Process item',
          _meta: {
            type: NodeTypes.ASSISTANT,
            is_connected: true,
            data: {},
          },
        } as StateConfiguration,
      ]

      addIteratorStates(baseConfig)

      const child = baseConfig.states.find((s) => s.id === 'child')

      expect(child?.next).toBeDefined()
      expect(child?.next?.meta_iter_state_id).toBeDefined()
    })
  })
})
