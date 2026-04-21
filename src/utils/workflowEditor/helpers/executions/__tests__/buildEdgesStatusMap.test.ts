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

import { xyEdge } from './factories'
import { buildEdgesStatusMap } from '../buildEdgesStatusMap'

describe('buildEdgesStatusMap', () => {
  describe('empty inputs', () => {
    it('returns an empty map when edges list is empty', () => {
      expect(buildEdgesStatusMap({ edges: [], executedEdgeStatuses: new Map() })).toStrictEqual(
        new Map()
      )
    })

    it('returns an empty map when executedEdgeStatuses is empty', () => {
      expect(
        buildEdgesStatusMap({
          edges: [xyEdge('A', 'B')],
          executedEdgeStatuses: new Map(),
        })
      ).toStrictEqual(new Map())
    })

    it('returns an empty map when no edge IDs overlap with executedEdgeStatuses', () => {
      expect(
        buildEdgesStatusMap({
          edges: [xyEdge('A', 'B')],
          executedEdgeStatuses: new Map([['ghost-edge-id', 'Succeeded']]),
        })
      ).toStrictEqual(new Map())
    })
  })

  describe('single edge', () => {
    it.each<WorkflowExecutionStatus>([
      'Succeeded',
      'Failed',
      'In Progress',
      'Aborted',
      'Interrupted',
    ])('maps the edge to %s status exactly', (status) => {
      const edge = xyEdge('A', 'B')

      expect(
        buildEdgesStatusMap({
          edges: [edge],
          executedEdgeStatuses: new Map([[edge.id, status]]),
        })
      ).toStrictEqual(new Map([[edge.id, status]]))
    })
  })

  describe('multiple edges', () => {
    it('maps each executed edge to its own status and omits non-executed edges', () => {
      // Three-hop chain; only A→B and B→C are on the execution path
      const edgeAB = xyEdge('A', 'B')
      const edgeBC = xyEdge('B', 'C')
      const edgeCD = xyEdge('C', 'D')

      expect(
        buildEdgesStatusMap({
          edges: [edgeAB, edgeBC, edgeCD],
          executedEdgeStatuses: new Map([
            [edgeAB.id, 'Succeeded'],
            [edgeBC.id, 'In Progress'],
          ]),
        })
      ).toStrictEqual(
        new Map([
          [edgeAB.id, 'Succeeded'],
          [edgeBC.id, 'In Progress'],
          // edgeCD is deliberately absent
        ])
      )
    })

    it('maps both Decision branches independently when both were executed', () => {
      const edgeDecB = xyEdge('Dec', 'B', { sourceHandle: 'Dec-out-0' })
      const edgeDecC = xyEdge('Dec', 'C', { sourceHandle: 'Dec-out-1' })

      expect(
        buildEdgesStatusMap({
          edges: [edgeDecB, edgeDecC],
          executedEdgeStatuses: new Map([
            [edgeDecB.id, 'Succeeded'],
            [edgeDecC.id, 'Failed'],
          ]),
        })
      ).toStrictEqual(
        new Map([
          [edgeDecB.id, 'Succeeded'],
          [edgeDecC.id, 'Failed'],
        ])
      )
    })
  })
})
