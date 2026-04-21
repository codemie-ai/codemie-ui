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

import type { ExtendedWorkflowExecutionState } from '@/types/entity/workflow'
import type { StateConfiguration } from '@/types/workflowEditor/configuration'

import { configState, execState, xyEdge } from './factories'
import { buildExecutionPath } from '../buildExecutionPath'
import { buildHandlesStatusMap } from '../buildHandlesStatusMap'
import { buildStatesStatusMap } from '../buildStatesStatusMap'

import type { Edge } from '@xyflow/react'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Runs the real execution pipeline and returns the handles status map.
 * Exercises buildExecutionPath → buildStatesStatusMap → buildHandlesStatusMap together.
 *
 * Convention: every executed Action node should have its own log entry
 * (as in the real system) so getActionStatus can find the correct status.
 * Nodes with null preceding_state_ids are skipped by buildExecutionPath but
 * still read by getActionStatus when computing their source handle status.
 */
const runHandlesMap = ({
  configStates,
  edges,
  executionStates,
}: {
  configStates: StateConfiguration[]
  edges: Edge[]
  executionStates: ExtendedWorkflowExecutionState[]
}) => {
  const executionPath = buildExecutionPath({ executionStates, configStates, edges })
  const statesStatusMap = buildStatesStatusMap({
    configStates,
    executionStates,
    executedStateIds: new Set(executionPath.stateIds),
  })
  return buildHandlesStatusMap({
    edges,
    edgeStatuses: executionPath.edgeStatuses,
    configStates,
    statesStatusMap,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildHandlesStatusMap', () => {
  describe('empty inputs', () => {
    it('returns an empty map when no edges are provided', () => {
      expect(
        buildHandlesStatusMap({
          edges: [],
          edgeStatuses: new Map(),
          configStates: [],
          statesStatusMap: new Map(),
        })
      ).toStrictEqual(new Map())
    })

    it('returns an empty map when no edges have an edgeStatus entry (nothing executed)', () => {
      expect(
        buildHandlesStatusMap({
          edges: [xyEdge('A', 'B')],
          edgeStatuses: new Map(),
          configStates: [configState({ id: 'A' }), configState({ id: 'B' })],
          statesStatusMap: new Map(),
        })
      ).toStrictEqual(new Map())
    })
  })

  describe('Action source handles', () => {
    it("reflects the source Action's own status from statesStatusMap", () => {
      // A→B: both have log entries; A is the source node.
      const edge = xyEdge('A', 'B')

      expect(
        runHandlesMap({
          configStates: [
            configState({ id: 'A', type: 'Action', next: 'B' }),
            configState({ id: 'B', type: 'Action' }),
          ],
          edges: [edge],
          executionStates: [
            execState({
              resolvedId: 'A',
              preceding_state_ids: null,
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'B',
              preceding_state_ids: ['A'],
              status: 'Succeeded',
            }),
          ],
        })
      ).toStrictEqual(
        new Map([
          [edge.sourceHandle, 'Succeeded'], // A's own status
          [edge.targetHandle, 'Succeeded'], // B's own status
        ])
      )
    })

    it('reflects Failed when the source Action failed', () => {
      // Pattern: Assign Courier (Failed) → Ship Order (InProgress)
      const edge = xyEdge('Assign Courier', 'Ship Order')

      expect(
        runHandlesMap({
          configStates: [
            configState({ id: 'Assign Courier', type: 'Action', next: 'Ship Order' }),
            configState({ id: 'Ship Order', type: 'Action' }),
          ],
          edges: [edge],
          executionStates: [
            execState({
              resolvedId: 'Assign Courier',
              preceding_state_ids: null,
              status: 'Failed',
            }),
            execState({
              resolvedId: 'Ship Order',
              preceding_state_ids: ['Assign Courier'],
              status: 'In Progress',
            }),
          ],
        })
      ).toStrictEqual(
        new Map([
          [edge.sourceHandle, 'Failed'], // Assign Courier = Failed
          [edge.targetHandle, 'In Progress'], // Ship Order = InProgress
        ])
      )
    })

    it('defaults to NotStarted when the source state is absent from statesStatusMap', () => {
      const edge = xyEdge('A', 'B')

      expect(
        buildHandlesStatusMap({
          edges: [edge],
          edgeStatuses: new Map([[edge.id, 'Succeeded']]),
          configStates: [configState({ id: 'A', type: 'Action' }), configState({ id: 'B' })],
          statesStatusMap: new Map(), // A absent
        })
      ).toStrictEqual(
        new Map([
          [edge.sourceHandle, 'Not Started'],
          [edge.targetHandle, 'Not Started'],
        ])
      )
    })
  })

  describe('Decision source handles', () => {
    it('is always Success for a Decision source handle — regardless of what the branch targets', () => {
      // A→Dec→B (B=Failed). Decision's source handle still shows Success.
      const edgeADec = xyEdge('A', 'Dec')
      const edgeDecB = xyEdge('Dec', 'B')

      expect(
        runHandlesMap({
          configStates: [
            configState({ id: 'A', type: 'Action', next: 'Dec' }),
            configState({ id: 'Dec', type: 'Decision', next: [['B']] }),
            configState({ id: 'B', type: 'Action' }),
          ],
          edges: [edgeADec, edgeDecB],
          executionStates: [
            execState({
              resolvedId: 'A',
              preceding_state_ids: null,
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'B',
              preceding_state_ids: ['A'],
              status: 'Failed',
            }),
          ],
        })
      ).toStrictEqual(
        new Map([
          [edgeADec.sourceHandle, 'Succeeded'], // A's own status
          [edgeADec.targetHandle, 'Succeeded'], // Dec target = Success (Decision always)
          [edgeDecB.sourceHandle, 'Succeeded'], // Decision source = always Success
          [edgeDecB.targetHandle, 'Failed'], // B's own status
        ])
      )
    })

    it('only populates the taken branch handle — the untaken branch is absent', () => {
      // Pattern: Validate Order (D) has two branches; only branch B is taken.
      const edgeADec = xyEdge('A', 'Dec')
      const edgeDecB = xyEdge('Dec', 'B', { sourceHandle: 'Dec-out-0' })
      const edgeDecC = xyEdge('Dec', 'C', { sourceHandle: 'Dec-out-1' })

      expect(
        runHandlesMap({
          configStates: [
            configState({ id: 'A', type: 'Action', next: 'Dec' }),
            configState({ id: 'Dec', type: 'Decision', next: [['B'], ['C']] }),
            configState({ id: 'B', type: 'Action' }),
            configState({ id: 'C', type: 'Action' }),
          ],
          edges: [edgeADec, edgeDecB, edgeDecC],
          executionStates: [
            execState({
              resolvedId: 'A',
              preceding_state_ids: null,
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'B',
              preceding_state_ids: ['A'],
              status: 'Succeeded',
            }),
          ],
        })
      ).toStrictEqual(
        new Map([
          [edgeADec.sourceHandle, 'Succeeded'], // A's status
          [edgeADec.targetHandle, 'Succeeded'], // Dec = Success
          [edgeDecB.sourceHandle, 'Succeeded'], // taken branch = Success
          [edgeDecB.targetHandle, 'Succeeded'], // B's status
          // edgeDecC entries are absent — branch was not taken
        ])
      )
    })

    it('shows Success on both branch handles when both branches executed (parallel branches)', () => {
      const edgeADec = xyEdge('A', 'Dec')
      const edgeDecB = xyEdge('Dec', 'B', { sourceHandle: 'Dec-out-0' })
      const edgeDecC = xyEdge('Dec', 'C', { sourceHandle: 'Dec-out-1' })

      expect(
        runHandlesMap({
          configStates: [
            configState({ id: 'A', type: 'Action', next: 'Dec' }),
            configState({ id: 'Dec', type: 'Decision', next: [['B'], ['C']] }),
            configState({ id: 'B', type: 'Action' }),
            configState({ id: 'C', type: 'Action' }),
          ],
          edges: [edgeADec, edgeDecB, edgeDecC],
          executionStates: [
            execState({
              resolvedId: 'A',
              preceding_state_ids: null,
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'B',
              preceding_state_ids: ['A'],
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'C',
              preceding_state_ids: ['A'],
              status: 'Failed',
            }),
          ],
        })
      ).toStrictEqual(
        new Map([
          [edgeADec.sourceHandle, 'Succeeded'], // A's status
          [edgeADec.targetHandle, 'Succeeded'], // Dec = Success
          [edgeDecB.sourceHandle, 'Succeeded'], // Decision source always Success
          [edgeDecB.targetHandle, 'Succeeded'], // B's status
          [edgeDecC.sourceHandle, 'Succeeded'], // Decision source always Success
          [edgeDecC.targetHandle, 'Failed'], // C's status
        ])
      )
    })
  })

  describe('target handles', () => {
    it('defaults to NotStarted when the target state is absent from statesStatusMap', () => {
      const edge = xyEdge('A', 'B')

      expect(
        buildHandlesStatusMap({
          edges: [edge],
          edgeStatuses: new Map([[edge.id, 'Succeeded']]),
          configStates: [configState({ id: 'A' }), configState({ id: 'B' })],
          statesStatusMap: new Map(), // B absent
        })
      ).toStrictEqual(
        new Map([
          [edge.sourceHandle, 'Not Started'],
          [edge.targetHandle, 'Not Started'],
        ])
      )
    })
  })

  describe('edges without handles', () => {
    it('skips the source side when the edge has no sourceHandle', () => {
      const edge = xyEdge('A', 'B', { sourceHandle: undefined })

      expect(
        buildHandlesStatusMap({
          edges: [edge],
          edgeStatuses: new Map([[edge.id, 'Succeeded']]),
          configStates: [configState({ id: 'A' }), configState({ id: 'B' })],
          statesStatusMap: new Map([['B', 'Succeeded']]),
        })
      ).toStrictEqual(
        new Map([
          [edge.targetHandle, 'Succeeded'], // only target side
        ])
      )
    })

    it('skips the target side when the edge has no targetHandle', () => {
      const edge = xyEdge('A', 'B', { targetHandle: undefined })

      expect(
        buildHandlesStatusMap({
          edges: [edge],
          edgeStatuses: new Map([[edge.id, 'Succeeded']]),
          configStates: [configState({ id: 'A' }), configState({ id: 'B' })],
          statesStatusMap: new Map([['A', 'Succeeded']]),
        })
      ).toStrictEqual(
        new Map([
          [edge.sourceHandle, 'Succeeded'], // only source side
        ])
      )
    })
  })

  describe('realistic workflow scenarios', () => {
    it('builds the full map for a happy path: START → RO → [Val (D)] → RI → [PP (D)] → GI', () => {
      const edgeStartRO = xyEdge('START', 'Receive Order')
      const edgeROVal = xyEdge('Receive Order', 'Validate Order')
      const edgeValRI = xyEdge('Validate Order', 'Reserve Inventory', {
        sourceHandle: 'Val-out-0',
      })
      const edgeValReject = xyEdge('Validate Order', 'Reject Order', {
        sourceHandle: 'Val-out-1',
      })
      const edgeRIPP = xyEdge('Reserve Inventory', 'Process Payment')
      const edgePPGI = xyEdge('Process Payment', 'Generate Invoice', {
        sourceHandle: 'PP-out-0',
      })
      const edgePPRetry = xyEdge('Process Payment', 'Retry Payment', {
        sourceHandle: 'PP-out-1',
      })

      expect(
        runHandlesMap({
          configStates: [
            configState({ id: 'START', type: 'Action', next: 'Receive Order' }),
            configState({ id: 'Receive Order', type: 'Action', next: 'Validate Order' }),
            configState({
              id: 'Validate Order',
              type: 'Decision',
              next: [['Reserve Inventory'], ['Reject Order']],
            }),
            configState({
              id: 'Reserve Inventory',
              type: 'Action',
              next: 'Process Payment',
            }),
            configState({
              id: 'Process Payment',
              type: 'Decision',
              next: [['Generate Invoice'], ['Retry Payment']],
            }),
            configState({ id: 'Generate Invoice', type: 'Action' }),
            configState({ id: 'Retry Payment', type: 'Action' }),
            configState({ id: 'Reject Order', type: 'Action' }),
          ],
          edges: [
            edgeStartRO,
            edgeROVal,
            edgeValRI,
            edgeValReject,
            edgeRIPP,
            edgePPGI,
            edgePPRetry,
          ],
          executionStates: [
            execState({
              resolvedId: 'START',
              preceding_state_ids: null,
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'Receive Order',
              preceding_state_ids: ['START'],
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'Reserve Inventory',
              preceding_state_ids: ['Receive Order'],
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'Generate Invoice',
              preceding_state_ids: ['Reserve Inventory'],
              status: 'Succeeded',
            }),
          ],
        })
      ).toStrictEqual(
        new Map([
          // START → Receive Order
          [edgeStartRO.sourceHandle, 'Succeeded'], // START's own status
          [edgeStartRO.targetHandle, 'Succeeded'], // Receive Order's status
          // Receive Order → Validate Order
          [edgeROVal.sourceHandle, 'Succeeded'], // Receive Order's own status
          [edgeROVal.targetHandle, 'Succeeded'], // Validate Order (Decision) = Success
          // Validate Order → Reserve Inventory (taken branch)
          [edgeValRI.sourceHandle, 'Succeeded'], // Decision source = always Success
          [edgeValRI.targetHandle, 'Succeeded'], // Reserve Inventory's status
          // edgeValReject: absent (untaken branch)
          // Reserve Inventory → Process Payment
          [edgeRIPP.sourceHandle, 'Succeeded'], // Reserve Inventory's own status
          [edgeRIPP.targetHandle, 'Succeeded'], // Process Payment (Decision) = Success
          // Process Payment → Generate Invoice (taken branch)
          [edgePPGI.sourceHandle, 'Succeeded'], // Decision source = always Success
          [edgePPGI.targetHandle, 'Succeeded'], // Generate Invoice's status
          // edgePPRetry: absent (untaken branch)
        ])
      )
    })

    it('builds the full map when an Action fails mid-flow', () => {
      // Manual Review → [Prepare Shipment (D)] → Assign Courier (Failed) → Ship Order (InProgress)
      const edgeMRPS = xyEdge('Manual Review', 'Prepare Shipment')
      const edgePSAssign = xyEdge('Prepare Shipment', 'Assign Courier', {
        sourceHandle: 'PS-out-0',
      })
      const edgePSOther = xyEdge('Prepare Shipment', 'Other', {
        sourceHandle: 'PS-out-1',
      })
      const edgeAssignShip = xyEdge('Assign Courier', 'Ship Order')

      expect(
        runHandlesMap({
          configStates: [
            configState({
              id: 'Manual Review',
              type: 'Action',
              next: 'Prepare Shipment',
            }),
            configState({
              id: 'Prepare Shipment',
              type: 'Decision',
              next: [['Assign Courier'], ['Other']],
            }),
            configState({ id: 'Assign Courier', type: 'Action', next: 'Ship Order' }),
            configState({ id: 'Ship Order', type: 'Action' }),
            configState({ id: 'Other', type: 'Action' }),
          ],
          edges: [edgeMRPS, edgePSAssign, edgePSOther, edgeAssignShip],
          executionStates: [
            execState({
              resolvedId: 'Manual Review',
              preceding_state_ids: null,
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'Assign Courier',
              preceding_state_ids: ['Manual Review'],
              status: 'Failed',
            }),
            execState({
              resolvedId: 'Ship Order',
              preceding_state_ids: ['Assign Courier'],
              status: 'In Progress',
            }),
          ],
        })
      ).toStrictEqual(
        new Map([
          // Manual Review → Prepare Shipment
          [edgeMRPS.sourceHandle, 'Succeeded'], // Manual Review's own status
          [edgeMRPS.targetHandle, 'Succeeded'], // Prepare Shipment (Decision) = Success
          // Prepare Shipment → Assign Courier (taken branch)
          [edgePSAssign.sourceHandle, 'Succeeded'], // Decision source = always Success
          [edgePSAssign.targetHandle, 'Failed'], // Assign Courier's status
          // edgePSOther: absent (untaken branch)
          // Assign Courier → Ship Order
          [edgeAssignShip.sourceHandle, 'Failed'], // Assign Courier's own status
          [edgeAssignShip.targetHandle, 'In Progress'], // Ship Order's status
        ])
      )
    })

    it('builds the full map for the Retry Payment loop', () => {
      // Reserve Inventory → [Process Payment (D)] → Retry Payment → [Process Payment (D)] → Generate Invoice
      const edgeRIPP = xyEdge('Reserve Inventory', 'Process Payment')
      const edgePPGI = xyEdge('Process Payment', 'Generate Invoice', {
        sourceHandle: 'PP-out-0',
      })
      const edgePPRetry = xyEdge('Process Payment', 'Retry Payment', {
        sourceHandle: 'PP-out-1',
      })
      const edgeRetryPP = xyEdge('Retry Payment', 'Process Payment')

      expect(
        runHandlesMap({
          configStates: [
            configState({
              id: 'Reserve Inventory',
              type: 'Action',
              next: 'Process Payment',
            }),
            configState({
              id: 'Process Payment',
              type: 'Decision',
              next: [['Generate Invoice'], ['Retry Payment']],
            }),
            configState({ id: 'Retry Payment', type: 'Action', next: 'Process Payment' }),
            configState({ id: 'Generate Invoice', type: 'Action' }),
          ],
          edges: [edgeRIPP, edgePPGI, edgePPRetry, edgeRetryPP],
          executionStates: [
            execState({
              resolvedId: 'Reserve Inventory',
              preceding_state_ids: null,
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'Retry Payment',
              preceding_state_ids: ['Reserve Inventory'],
              status: 'Succeeded',
            }),
            execState({
              resolvedId: 'Generate Invoice',
              preceding_state_ids: ['Retry Payment'],
              status: 'Succeeded',
            }),
          ],
        })
      ).toStrictEqual(
        new Map([
          // Reserve Inventory → Process Payment
          [edgeRIPP.sourceHandle, 'Succeeded'], // Reserve Inventory's status
          [edgeRIPP.targetHandle, 'Succeeded'], // Process Payment (Decision) = Success
          // Process Payment → Retry Payment (first loop iteration)
          [edgePPRetry.sourceHandle, 'Succeeded'], // Decision source = always Success
          [edgePPRetry.targetHandle, 'Succeeded'], // Retry Payment's status
          // Retry Payment → Process Payment (loop back)
          [edgeRetryPP.sourceHandle, 'Succeeded'], // Retry Payment's own status
          [edgeRetryPP.targetHandle, 'Succeeded'], // Process Payment (Decision) = Success
          // Process Payment → Generate Invoice (second iteration, exits loop)
          [edgePPGI.sourceHandle, 'Succeeded'], // Decision source = always Success
          [edgePPGI.targetHandle, 'Succeeded'], // Generate Invoice's status
        ])
      )
    })
  })
})
