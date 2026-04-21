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

import type { WorkflowExecutionStatus } from '@/types/entity'

import { configState, execState, xyEdge } from './factories'
import { buildExecutionPath } from '../buildExecutionPath'

// ---------------------------------------------------------------------------
// Helper — wraps the result into a shape that allows order-independent
// comparison of stateIds and handleIds (they come from Sets internally).
// ---------------------------------------------------------------------------
const asComparable = (result: ReturnType<typeof buildExecutionPath>) => ({
  stateIds: new Set(result.stateIds),
  edgeStatuses: result.edgeStatuses,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildExecutionPath', () => {
  describe('empty / degenerate inputs', () => {
    it('returns empty collections when no execution states are provided', () => {
      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [],
            configStates: [configState({ id: 'A', next: 'B' }), configState({ id: 'B' })],
            edges: [xyEdge('A', 'B')],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(),
        edgeStatuses: new Map(),
      })
    })

    it('skips execution entries with null preceding_state_ids', () => {
      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [execState({ resolvedId: 'A', preceding_state_ids: null })],
            configStates: [configState({ id: 'A' })],
            edges: [],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(),
        edgeStatuses: new Map(),
      })
    })

    it('records nothing when the preceding state is not in configStates', () => {
      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'B',
                preceding_state_ids: ['GHOST'],
                status: 'Succeeded',
              }),
            ],
            configStates: [configState({ id: 'B' })],
            edges: [xyEdge('GHOST', 'B')],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(),
        edgeStatuses: new Map(),
      })
    })

    it('records nothing when no XFlow edge exists between the two states', () => {
      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'B',
                preceding_state_ids: ['A'],
                status: 'Succeeded',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'B' }),
              configState({ id: 'B', type: 'Action' }),
            ],
            edges: [], // edge list intentionally empty
          })
        )
      ).toStrictEqual({
        stateIds: new Set(),
        edgeStatuses: new Map(),
      })
    })
  })

  describe('direct Action → Action path', () => {
    it('records both states, their handles, and the correct edge status', () => {
      const edge = xyEdge('A', 'B')

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'B',
                preceding_state_ids: ['A'],
                status: 'Succeeded',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'B' }),
              configState({ id: 'B', type: 'Action' }),
            ],
            edges: [edge],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['A', 'B']),
        edgeStatuses: new Map([[edge.id, 'Succeeded']]),
      })
    })

    it('records all edges and statuses in a multi-hop A → B → C chain', () => {
      const edgeAB = xyEdge('A', 'B')
      const edgeBC = xyEdge('B', 'C')

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'B',
                preceding_state_ids: ['A'],
                status: 'Succeeded',
              }),
              execState({
                resolvedId: 'C',
                preceding_state_ids: ['B'],
                status: 'In Progress',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'B' }),
              configState({ id: 'B', type: 'Action', next: 'C' }),
              configState({ id: 'C', type: 'Action' }),
            ],
            edges: [edgeAB, edgeBC],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['A', 'B', 'C']),
        edgeStatuses: new Map([
          [edgeAB.id, 'Succeeded'],
          [edgeBC.id, 'In Progress'],
        ]),
      })
    })

    it.each<WorkflowExecutionStatus>([
      'Succeeded',
      'Failed',
      'In Progress',
      'Aborted',
      'Interrupted',
    ])('assigns %s status to the edge exactly as-is', (status) => {
      const edge = xyEdge('A', 'B')

      const result = buildExecutionPath({
        executionStates: [execState({ resolvedId: 'B', preceding_state_ids: ['A'], status })],
        configStates: [
          configState({ id: 'A', type: 'Action', next: 'B' }),
          configState({ id: 'B', type: 'Action' }),
        ],
        edges: [edge],
      })

      expect(result.edgeStatuses).toStrictEqual(new Map([[edge.id, status]]))
    })
  })

  describe('single Decision bridge (Action → Decision → Action)', () => {
    // Pattern: Receive Order → Validate Order (D) → [branch] → Target
    // The execution log skips Decision nodes entirely. buildExecutionPath bridges the gap.

    it('includes the Decision node and assigns Success to both legs; actual status to the terminal edge', () => {
      const edgeADec = xyEdge('A', 'Dec')
      const edgeDecB = xyEdge('Dec', 'B', { sourceHandle: 'Dec-out-0' })
      const edgeDecOther = xyEdge('Dec', 'Other', { sourceHandle: 'Dec-out-1' })

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'B',
                preceding_state_ids: ['A'],
                status: 'Failed',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'Dec' }),
              configState({ id: 'Dec', type: 'Decision', next: [['B'], ['Other']] }),
              configState({ id: 'B', type: 'Action' }),
              configState({ id: 'Other', type: 'Action' }),
            ],
            edges: [edgeADec, edgeDecB, edgeDecOther],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['A', 'Dec', 'B']), // 'Other' is absent
        edgeStatuses: new Map([
          [edgeADec.id, 'Succeeded'], // A→Dec: transition to Decision = Success
          [edgeDecB.id, 'Failed'], // Dec→B: actual execution status
          // edgeDecOther absent
        ]),
      })
    })
  })

  describe('double Decision bridge (Action → Dec1 → Dec2 → Action)', () => {
    // Pattern: Receive Order → Validate Order (D) → Check Customer Account (D) → Request Account Verification

    it('includes both Decision nodes and assigns Success to all bridge edges', () => {
      const edgeAD1 = xyEdge('A', 'D1')
      const edgeD1D2 = xyEdge('D1', 'D2')
      const edgeD2B = xyEdge('D2', 'B')

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'B',
                preceding_state_ids: ['A'],
                status: 'In Progress',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'D1' }),
              configState({ id: 'D1', type: 'Decision', next: [['D2']] }),
              configState({ id: 'D2', type: 'Decision', next: [['B']] }),
              configState({ id: 'B', type: 'Action' }),
            ],
            edges: [edgeAD1, edgeD1D2, edgeD2B],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['A', 'D1', 'D2', 'B']),
        edgeStatuses: new Map([
          [edgeAD1.id, 'Succeeded'],
          [edgeD1D2.id, 'Succeeded'],
          [edgeD2B.id, 'In Progress'],
        ]),
      })
    })
  })

  describe('triple Decision bridge', () => {
    // Pattern: Request Account Verification → [D1 → D2 → D3] → Reserve Inventory

    it('bridges three consecutive Decision nodes, all legs are Success', () => {
      const edgeAD1 = xyEdge('A', 'D1')
      const edgeD1D2 = xyEdge('D1', 'D2')
      const edgeD2D3 = xyEdge('D2', 'D3')
      const edgeD3B = xyEdge('D3', 'B')

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'B',
                preceding_state_ids: ['A'],
                status: 'Succeeded',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'D1' }),
              configState({ id: 'D1', type: 'Decision', next: [['D2']] }),
              configState({ id: 'D2', type: 'Decision', next: [['D3']] }),
              configState({ id: 'D3', type: 'Decision', next: [['B']] }),
              configState({ id: 'B', type: 'Action' }),
            ],
            edges: [edgeAD1, edgeD1D2, edgeD2D3, edgeD3B],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['A', 'D1', 'D2', 'D3', 'B']),
        edgeStatuses: new Map([
          [edgeAD1.id, 'Succeeded'],
          [edgeD1D2.id, 'Succeeded'],
          [edgeD2D3.id, 'Succeeded'],
          [edgeD3B.id, 'Succeeded'],
        ]),
      })
    })
  })

  describe('loop back through Decision (Retry Payment pattern)', () => {
    // Pattern: Reserve Inventory → [Process Payment (D)] → Retry Payment → [Process Payment (D)] → Generate Invoice

    it('records all nodes in the loop and both Decision branches', () => {
      const edgeStartDec = xyEdge('Start', 'Dec')
      const edgeDecDone = xyEdge('Dec', 'Done', { sourceHandle: 'Dec-out-0' })
      const edgeDecRetry = xyEdge('Dec', 'Retry', { sourceHandle: 'Dec-out-1' })
      const edgeRetryDec = xyEdge('Retry', 'Dec')

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'Retry',
                preceding_state_ids: ['Start'],
                status: 'Succeeded',
              }),
              execState({
                resolvedId: 'Done',
                preceding_state_ids: ['Retry'],
                status: 'Succeeded',
              }),
            ],
            configStates: [
              configState({ id: 'Start', type: 'Action', next: 'Dec' }),
              configState({ id: 'Dec', type: 'Decision', next: [['Done'], ['Retry']] }),
              configState({ id: 'Retry', type: 'Action', next: 'Dec' }),
              configState({ id: 'Done', type: 'Action' }),
            ],
            edges: [edgeStartDec, edgeDecDone, edgeDecRetry, edgeRetryDec],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['Start', 'Dec', 'Retry', 'Done']),
        edgeStatuses: new Map([
          [edgeStartDec.id, 'Succeeded'],
          [edgeDecRetry.id, 'Succeeded'],
          [edgeRetryDec.id, 'Succeeded'],
          [edgeDecDone.id, 'Succeeded'],
        ]),
      })
    })

    it('overwrites edgeStatus on a re-traversed edge with the latest execution status', () => {
      // Dec→Retry is traversed twice. The second traversal (Interrupted) overwrites the first (Success).
      const edgeDecRetry = xyEdge('Dec', 'Retry', { sourceHandle: 'Dec-out-1' })

      const result = buildExecutionPath({
        executionStates: [
          execState({
            resolvedId: 'Retry',
            preceding_state_ids: ['Source'],
            status: 'Succeeded',
          }),
          execState({
            resolvedId: 'Retry',
            preceding_state_ids: ['Source'],
            status: 'Interrupted',
          }),
        ],
        configStates: [
          configState({ id: 'Source', type: 'Action', next: 'Dec' }),
          configState({ id: 'Dec', type: 'Decision', next: [['Target'], ['Retry']] }),
          configState({ id: 'Retry', type: 'Action', next: 'Dec' }),
          configState({ id: 'Target', type: 'Action' }),
        ],
        edges: [
          xyEdge('Source', 'Dec'),
          xyEdge('Dec', 'Target', { sourceHandle: 'Dec-out-0' }),
          edgeDecRetry,
          xyEdge('Retry', 'Dec'),
        ],
      })

      expect(result.edgeStatuses.get(edgeDecRetry.id)).toBe('Interrupted')
    })
  })

  describe('multiple independent execution pairs', () => {
    it('unions states and handles across all log entries and assigns separate statuses', () => {
      const edgeStartB = xyEdge('Start', 'B', { sourceHandle: 'Start-out-0' })
      const edgeStartC = xyEdge('Start', 'C', { sourceHandle: 'Start-out-1' })

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'B',
                preceding_state_ids: ['Start'],
                status: 'Succeeded',
              }),
              execState({
                resolvedId: 'C',
                preceding_state_ids: ['Start'],
                status: 'Failed',
              }),
            ],
            configStates: [
              configState({ id: 'Start', type: 'Action', next: ['B', 'C'] }),
              configState({ id: 'B', type: 'Action' }),
              configState({ id: 'C', type: 'Action' }),
            ],
            edges: [edgeStartB, edgeStartC],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['Start', 'B', 'C']),
        edgeStatuses: new Map([
          [edgeStartB.id, 'Succeeded'],
          [edgeStartC.id, 'Failed'],
        ]),
      })
    })
  })

  describe('cycle detection in recordPath', () => {
    it('does not infinite-loop when Decision nodes form a cycle in config', () => {
      expect(() =>
        buildExecutionPath({
          executionStates: [
            execState({
              resolvedId: 'B',
              preceding_state_ids: ['A'],
              status: 'Succeeded',
            }),
          ],
          configStates: [
            configState({ id: 'A', type: 'Action', next: 'D1' }),
            configState({ id: 'D1', type: 'Decision', next: [['D2']] }),
            configState({ id: 'D2', type: 'Decision', next: [['D1']] }), // cycle
            configState({ id: 'B', type: 'Action' }),
          ],
          edges: [xyEdge('A', 'D1'), xyEdge('D1', 'D2'), xyEdge('D2', 'D1')],
        })
      ).not.toThrow()
    })
  })

  describe('array preceding_state_ids support', () => {
    it('records paths from all preceding states when preceding_state_ids is an array', () => {
      const edgeAC = xyEdge('A', 'C')
      const edgeBC = xyEdge('B', 'C')

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'C',
                preceding_state_ids: ['A', 'B'],
                status: 'Succeeded',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'C' }),
              configState({ id: 'B', type: 'Action', next: 'C' }),
              configState({ id: 'C', type: 'Action' }),
            ],
            edges: [edgeAC, edgeBC],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['A', 'B', 'C']),
        edgeStatuses: new Map([
          [edgeAC.id, 'Succeeded'],
          [edgeBC.id, 'Succeeded'],
        ]),
      })
    })

    it('records paths through Decision nodes for each element in array preceding_state_ids', () => {
      const edgeADec = xyEdge('A', 'Dec')
      const edgeDecC = xyEdge('Dec', 'C', { sourceHandle: 'Dec-out-0' })
      const edgeBC = xyEdge('B', 'C')

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'C',
                preceding_state_ids: ['A', 'B'],
                status: 'Failed',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'Dec' }),
              configState({ id: 'Dec', type: 'Decision', next: [['C'], ['Other']] }),
              configState({ id: 'B', type: 'Action', next: 'C' }),
              configState({ id: 'C', type: 'Action' }),
              configState({ id: 'Other', type: 'Action' }),
            ],
            edges: [
              edgeADec,
              edgeDecC,
              edgeBC,
              xyEdge('Dec', 'Other', { sourceHandle: 'Dec-out-1' }),
            ],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['A', 'Dec', 'B', 'C']),
        edgeStatuses: new Map([
          [edgeADec.id, 'Succeeded'],
          [edgeDecC.id, 'Failed'],
          [edgeBC.id, 'Failed'],
        ]),
      })
    })

    it('handles array where some preceding states have no path to target', () => {
      const edgeAC = xyEdge('A', 'C')

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'C',
                preceding_state_ids: ['A', 'B'],
                status: 'Succeeded',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'C' }),
              configState({ id: 'B', type: 'Action' }),
              configState({ id: 'C', type: 'Action' }),
            ],
            edges: [edgeAC],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['A', 'C']),
        edgeStatuses: new Map([[edgeAC.id, 'Succeeded']]),
      })
    })

    it('handles array where some preceding states are not in config', () => {
      const edgeAC = xyEdge('A', 'C')

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'C',
                preceding_state_ids: ['A', 'GHOST'],
                status: 'Succeeded',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'C' }),
              configState({ id: 'C', type: 'Action' }),
            ],
            edges: [edgeAC, xyEdge('GHOST', 'C')],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['A', 'C']),
        edgeStatuses: new Map([[edgeAC.id, 'Succeeded']]),
      })
    })

    it('handles empty array preceding_state_ids', () => {
      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'C',
                preceding_state_ids: [],
                status: 'Succeeded',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'C' }),
              configState({ id: 'C', type: 'Action' }),
            ],
            edges: [xyEdge('A', 'C')],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(),
        edgeStatuses: new Map(),
      })
    })

    it('applies the same status to all edges from array preceding states', () => {
      const edgeAC = xyEdge('A', 'C')
      const edgeBC = xyEdge('B', 'C')

      const result = buildExecutionPath({
        executionStates: [
          execState({
            resolvedId: 'C',
            preceding_state_ids: ['A', 'B'],
            status: 'In Progress',
          }),
        ],
        configStates: [
          configState({ id: 'A', type: 'Action', next: 'C' }),
          configState({ id: 'B', type: 'Action', next: 'C' }),
          configState({ id: 'C', type: 'Action' }),
        ],
        edges: [edgeAC, edgeBC],
      })

      expect(result.edgeStatuses.get(edgeAC.id)).toBe('In Progress')
      expect(result.edgeStatuses.get(edgeBC.id)).toBe('In Progress')
    })

    it('combines array preceding_state_ids with other execution states in the log', () => {
      const edgeAC = xyEdge('A', 'C')
      const edgeBC = xyEdge('B', 'C')
      const edgeCD = xyEdge('C', 'D')

      expect(
        asComparable(
          buildExecutionPath({
            executionStates: [
              execState({
                resolvedId: 'C',
                preceding_state_ids: ['A', 'B'],
                status: 'Succeeded',
              }),
              execState({
                resolvedId: 'D',
                preceding_state_ids: ['C'],
                status: 'In Progress',
              }),
            ],
            configStates: [
              configState({ id: 'A', type: 'Action', next: 'C' }),
              configState({ id: 'B', type: 'Action', next: 'C' }),
              configState({ id: 'C', type: 'Action', next: 'D' }),
              configState({ id: 'D', type: 'Action' }),
            ],
            edges: [edgeAC, edgeBC, edgeCD],
          })
        )
      ).toStrictEqual({
        stateIds: new Set(['A', 'B', 'C', 'D']),
        edgeStatuses: new Map([
          [edgeAC.id, 'Succeeded'],
          [edgeBC.id, 'Succeeded'],
          [edgeCD.id, 'In Progress'],
        ]),
      })
    })
  })
})
