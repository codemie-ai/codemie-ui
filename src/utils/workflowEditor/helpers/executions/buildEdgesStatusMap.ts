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

import type { WorkflowExecutionStatus } from '@/types/entity'

import type { StatusMap } from './common'
import type { Edge } from '@xyflow/react'

type BuildEdgesStatusMapParams = {
  edges: Edge[]
  executedEdgeStatuses: Map<string, WorkflowExecutionStatus>
}

/**
 * Builds edges status map.
 * An edge's status is derived from the status of its target node.
 */
export const buildEdgesStatusMap = ({
  edges,
  executedEdgeStatuses, // This is the Map<string, Status> from the logic above
}: BuildEdgesStatusMapParams): StatusMap => {
  const map: StatusMap = new Map()

  edges.forEach((edge) => {
    const status = executedEdgeStatuses.get(edge.id)
    if (status) {
      map.set(edge.id, status)
    }
  })

  return map
}
