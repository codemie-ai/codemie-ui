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

import { deorphanReferencedStates } from '../deserializer'

describe('deorphanReferencedStates', () => {
  let baseConfig: WorkflowConfiguration

  beforeEach(() => {
    baseConfig = { states: [] }
  })

  describe('no-op cases', () => {
    it('does nothing on empty config', () => {
      expect(() => deorphanReferencedStates(baseConfig)).not.toThrow()
      expect(baseConfig.states).toEqual([])
    })

    it('does nothing when all states are already connected', () => {
      baseConfig.states = [
        {
          id: 'state_a',
          next: { state_id: 'state_b' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'state_b',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      expect(baseConfig.states.every((s) => s._meta?.is_connected === true)).toBe(true)
    })

    it('does nothing when there are no connected states', () => {
      baseConfig.states = [
        {
          id: 'state_a',
          next: { state_id: 'state_b' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
        {
          id: 'state_b',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      expect(baseConfig.states.every((s) => s._meta?.is_connected === false)).toBe(true)
    })

    it('does not deorphan an orphaned state that is not referenced by any connected state', () => {
      baseConfig.states = [
        {
          id: 'state_a',
          next: { state_id: 'state_b' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'state_b',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'unreferenced_orphan',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const orphan = baseConfig.states.find((s) => s.id === 'unreferenced_orphan')
      expect(orphan?._meta?.is_connected).toBe(false)
    })
  })

  describe('deorphaning via state_id', () => {
    it('deorphans a state referenced via state_id from a connected state', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: { state_id: 'orphaned' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const orphaned = baseConfig.states.find((s) => s.id === 'orphaned')
      expect(orphaned?._meta?.is_connected).toBe(true)
    })
  })

  describe('deorphaning via state_ids', () => {
    it('deorphans all states referenced via state_ids from a connected state', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: { state_ids: ['orphaned_a', 'orphaned_b'] },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned_a',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
        {
          id: 'orphaned_b',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const orphanedA = baseConfig.states.find((s) => s.id === 'orphaned_a')
      const orphanedB = baseConfig.states.find((s) => s.id === 'orphaned_b')
      expect(orphanedA?._meta?.is_connected).toBe(true)
      expect(orphanedB?._meta?.is_connected).toBe(true)
    })
  })

  describe('deorphaning via condition branches', () => {
    it('deorphans a state referenced via condition.then from a connected state', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: {
            condition: { expression: 'x > 0', then: 'orphaned_then', otherwise: 'connected_else' },
            meta_next_state_id: 'cond_node',
          },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned_then',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
        {
          id: 'connected_else',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const orphanedThen = baseConfig.states.find((s) => s.id === 'orphaned_then')
      expect(orphanedThen?._meta?.is_connected).toBe(true)
    })

    it('deorphans a state referenced via condition.otherwise from a connected state', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: {
            condition: { expression: 'x > 0', then: 'connected_then', otherwise: 'orphaned_else' },
            meta_next_state_id: 'cond_node',
          },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'connected_then',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned_else',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const orphanedElse = baseConfig.states.find((s) => s.id === 'orphaned_else')
      expect(orphanedElse?._meta?.is_connected).toBe(true)
    })

    it('deorphans both condition branches when both are orphaned', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: {
            condition: { expression: 'x > 0', then: 'orphaned_then', otherwise: 'orphaned_else' },
            meta_next_state_id: 'cond_node',
          },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned_then',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
        {
          id: 'orphaned_else',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const orphanedThen = baseConfig.states.find((s) => s.id === 'orphaned_then')
      const orphanedElse = baseConfig.states.find((s) => s.id === 'orphaned_else')
      expect(orphanedThen?._meta?.is_connected).toBe(true)
      expect(orphanedElse?._meta?.is_connected).toBe(true)
    })
  })

  describe('deorphaning via switch branches', () => {
    it('deorphans a state referenced via switch.cases from a connected state', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: {
            switch: {
              cases: [
                { condition: 'type === "a"', state_id: 'orphaned_case' },
                { condition: 'type === "b"', state_id: 'connected_case' },
              ],
              default: 'connected_default',
            },
            meta_next_state_id: 'switch_node',
          },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned_case',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
        {
          id: 'connected_case',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'connected_default',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const orphanedCase = baseConfig.states.find((s) => s.id === 'orphaned_case')
      expect(orphanedCase?._meta?.is_connected).toBe(true)
    })

    it('deorphans a state referenced via switch.default from a connected state', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: {
            switch: {
              cases: [{ condition: 'type === "a"', state_id: 'connected_case' }],
              default: 'orphaned_default',
            },
            meta_next_state_id: 'switch_node',
          },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'connected_case',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned_default',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const orphanedDefault = baseConfig.states.find((s) => s.id === 'orphaned_default')
      expect(orphanedDefault?._meta?.is_connected).toBe(true)
    })
  })

  describe('transitive deorphaning', () => {
    it('deorphans a chain: connected → orphaned_A → orphaned_B', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: { state_id: 'orphaned_a' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned_a',
          next: { state_id: 'orphaned_b' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
        {
          id: 'orphaned_b',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const orphanedA = baseConfig.states.find((s) => s.id === 'orphaned_a')
      const orphanedB = baseConfig.states.find((s) => s.id === 'orphaned_b')
      expect(orphanedA?._meta?.is_connected).toBe(true)
      expect(orphanedB?._meta?.is_connected).toBe(true)
    })

    it('does not deorphan orphaned_B when only orphaned_A references it (no connected state references orphaned_A)', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: { state_id: 'other_connected' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'other_connected',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned_a',
          next: { state_id: 'orphaned_b' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
        {
          id: 'orphaned_b',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const orphanedA = baseConfig.states.find((s) => s.id === 'orphaned_a')
      const orphanedB = baseConfig.states.find((s) => s.id === 'orphaned_b')
      expect(orphanedA?._meta?.is_connected).toBe(false)
      expect(orphanedB?._meta?.is_connected).toBe(false)
    })
  })

  describe('circular references', () => {
    it('handles circular references among orphaned states without infinite loop', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: { state_id: 'orphaned_a' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned_a',
          next: { state_id: 'orphaned_b' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
        {
          id: 'orphaned_b',
          next: { state_id: 'orphaned_a' }, // circular
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      expect(() => deorphanReferencedStates(baseConfig)).not.toThrow()

      const orphanedA = baseConfig.states.find((s) => s.id === 'orphaned_a')
      const orphanedB = baseConfig.states.find((s) => s.id === 'orphaned_b')
      expect(orphanedA?._meta?.is_connected).toBe(true)
      expect(orphanedB?._meta?.is_connected).toBe(true)
    })

    it('handles self-reference on an orphaned state', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: { state_id: 'orphaned' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'orphaned',
          next: { state_id: 'orphaned' }, // self-reference
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      expect(() => deorphanReferencedStates(baseConfig)).not.toThrow()

      const orphaned = baseConfig.states.find((s) => s.id === 'orphaned')
      expect(orphaned?._meta?.is_connected).toBe(true)
    })
  })

  describe('mixed scenarios', () => {
    it('only deorphans states that have a path from a connected state, leaving unrelated orphans untouched', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: { state_id: 'reachable_orphan' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
        {
          id: 'reachable_orphan',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
        {
          id: 'unreachable_orphan',
          _meta: { type: NodeTypes.ASSISTANT, is_connected: false },
        },
      ] as StateConfiguration[]

      deorphanReferencedStates(baseConfig)

      const reachable = baseConfig.states.find((s) => s.id === 'reachable_orphan')
      const unreachable = baseConfig.states.find((s) => s.id === 'unreachable_orphan')
      expect(reachable?._meta?.is_connected).toBe(true)
      expect(unreachable?._meta?.is_connected).toBe(false)
    })

    it('handles references to non-existent state IDs without throwing', () => {
      baseConfig.states = [
        {
          id: 'connected',
          next: { state_id: 'nonexistent' },
          _meta: { type: NodeTypes.ASSISTANT, is_connected: true },
        },
      ] as StateConfiguration[]

      expect(() => deorphanReferencedStates(baseConfig)).not.toThrow()
    })
  })
})
