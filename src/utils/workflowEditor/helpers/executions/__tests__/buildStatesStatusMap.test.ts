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

import { configState, execState } from './factories'
import { buildStatesStatusMap, getPriorityStatus } from '../buildStatesStatusMap'

// ---------------------------------------------------------------------------
// getPriorityStatus
// ---------------------------------------------------------------------------

describe('getPriorityStatus', () => {
  it('returns NotStarted for an empty list', () => {
    expect(getPriorityStatus([])).toBe('Not Started')
  })

  it('returns the sole status when only one is provided', () => {
    expect(getPriorityStatus(['Failed'] as WorkflowExecutionStatus[])).toBe('Failed')
  })

  it('respects the full priority order: Interrupted > InProgress > Aborted > Failed > Success > NotStarted', () => {
    const all: WorkflowExecutionStatus[] = [
      'Not Started',
      'Succeeded',
      'Failed',
      'Aborted',
      'In Progress',
      'Interrupted',
    ]
    expect(getPriorityStatus(all)).toBe('Interrupted')
  })

  it.each([
    [['In Progress', 'Interrupted'], 'Interrupted'],
    [['Failed', 'In Progress'], 'In Progress'],
    [['Aborted', 'Failed'], 'Aborted'],
    [['Succeeded', 'Failed'], 'Failed'],
    [['Not Started', 'Succeeded'], 'Succeeded'],
  ] as const)('picks the higher-priority status from %s', (pair, expected) => {
    expect(getPriorityStatus([...pair])).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// buildStatesStatusMap
// ---------------------------------------------------------------------------

describe('buildStatesStatusMap', () => {
  describe('empty inputs', () => {
    it('returns an empty map when no config states are provided', () => {
      expect(
        buildStatesStatusMap({
          configStates: [],
          executionStates: [],
          executedStateIds: new Set(),
        })
      ).toStrictEqual(new Map())
    })

    it('returns an empty map when executedStateIds is empty (nothing on the path)', () => {
      expect(
        buildStatesStatusMap({
          configStates: [configState({ id: 'A' })],
          executionStates: [execState({ resolvedId: 'A', status: 'Succeeded' })],
          executedStateIds: new Set(),
        })
      ).toStrictEqual(new Map())
    })
  })

  describe('Action states', () => {
    it('returns the status from the single execution log entry', () => {
      expect(
        buildStatesStatusMap({
          configStates: [configState({ id: 'A', type: 'Action' })],
          executionStates: [execState({ resolvedId: 'A', status: 'Failed' })],
          executedStateIds: new Set(['A']),
        })
      ).toStrictEqual(new Map([['A', 'Failed']]))
    })

    it('uses the LAST (most recent) execution entry when a state ran multiple times', () => {
      // Pattern from mock data: Retry Payment appears three times.
      // getActionStatus iterates backwards → last array entry wins.
      expect(
        buildStatesStatusMap({
          configStates: [configState({ id: 'Retry Payment', type: 'Action' })],
          executionStates: [
            execState({ resolvedId: 'Retry Payment', status: 'Succeeded' }), // run 1
            execState({ resolvedId: 'Retry Payment', status: 'Interrupted' }), // run 2
            execState({ resolvedId: 'Retry Payment', status: 'Succeeded' }), // run 3 ← latest
          ],
          executedStateIds: new Set(['Retry Payment']),
        })
      ).toStrictEqual(new Map([['Retry Payment', 'Succeeded']]))
    })

    it('uses last entry even when an earlier entry has higher priority', () => {
      // getActionStatus does NOT use priority selection — last wins unconditionally.
      expect(
        buildStatesStatusMap({
          configStates: [configState({ id: 'A', type: 'Action' })],
          executionStates: [
            execState({ resolvedId: 'A', status: 'Interrupted' }), // higher priority
            execState({ resolvedId: 'A', status: 'Succeeded' }), // last entry
          ],
          executedStateIds: new Set(['A']),
        })
      ).toStrictEqual(new Map([['A', 'Succeeded']]))
    })

    it('returns NotStarted when state is in executedStateIds but has no log entry', () => {
      expect(
        buildStatesStatusMap({
          configStates: [configState({ id: 'A', type: 'Action' })],
          executionStates: [],
          executedStateIds: new Set(['A']),
        })
      ).toStrictEqual(new Map([['A', 'Not Started']]))
    })

    it('omits a state that is not in executedStateIds', () => {
      expect(
        buildStatesStatusMap({
          configStates: [configState({ id: 'A', type: 'Action' })],
          executionStates: [execState({ resolvedId: 'A', status: 'Succeeded' })],
          executedStateIds: new Set(['SomeOtherState']),
        })
      ).toStrictEqual(new Map())
    })
  })

  describe('Decision states', () => {
    it('always returns Success for a Decision node regardless of execution log', () => {
      // Decision nodes are not logged — their status is always synthesized as Success.
      expect(
        buildStatesStatusMap({
          configStates: [configState({ id: 'Dec', type: 'Decision' })],
          executionStates: [],
          executedStateIds: new Set(['Dec']),
        })
      ).toStrictEqual(new Map([['Dec', 'Succeeded']]))
    })

    it('returns Success for a Decision even when the following Action failed', () => {
      expect(
        buildStatesStatusMap({
          configStates: [
            configState({ id: 'Dec', type: 'Decision' }),
            configState({ id: 'A', type: 'Action' }),
          ],
          executionStates: [execState({ resolvedId: 'A', status: 'Failed' })],
          executedStateIds: new Set(['Dec', 'A']),
        })
      ).toStrictEqual(
        new Map([
          ['Dec', 'Succeeded'],
          ['A', 'Failed'],
        ])
      )
    })
  })

  describe('realistic mixed scenario', () => {
    it('builds the correct map for the order-processing happy-then-fail path', () => {
      // Simulating: Receive Order (Success) → [Validate Order (D)] → Reserve Inventory (Success)
      // → Retry Payment (Interrupted earlier, last run = Success) → Generate Invoice (Success) → Assign Courier (Failed)
      expect(
        buildStatesStatusMap({
          configStates: [
            configState({ id: 'Receive Order', type: 'Action' }),
            configState({ id: 'Validate Order', type: 'Decision' }),
            configState({ id: 'Reserve Inventory', type: 'Action' }),
            configState({ id: 'Retry Payment', type: 'Action' }),
            configState({ id: 'Generate Invoice', type: 'Action' }),
            configState({ id: 'Assign Courier', type: 'Action' }),
          ],
          executionStates: [
            execState({ resolvedId: 'Receive Order', status: 'Succeeded' }),
            execState({ resolvedId: 'Reserve Inventory', status: 'Succeeded' }),
            execState({ resolvedId: 'Retry Payment', status: 'Interrupted' }),
            execState({ resolvedId: 'Retry Payment', status: 'Succeeded' }), // latest
            execState({ resolvedId: 'Generate Invoice', status: 'Succeeded' }),
            execState({ resolvedId: 'Assign Courier', status: 'Failed' }),
          ],
          executedStateIds: new Set([
            'Receive Order',
            'Validate Order',
            'Reserve Inventory',
            'Retry Payment',
            'Generate Invoice',
            'Assign Courier',
          ]),
        })
      ).toStrictEqual(
        new Map([
          ['Receive Order', 'Succeeded'],
          ['Validate Order', 'Succeeded'], // Decision → always Success
          ['Reserve Inventory', 'Succeeded'],
          ['Retry Payment', 'Succeeded'], // last entry wins
          ['Generate Invoice', 'Succeeded'],
          ['Assign Courier', 'Failed'],
        ])
      )
    })
  })
})
