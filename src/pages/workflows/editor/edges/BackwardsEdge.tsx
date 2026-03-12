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

import { BaseEdge, EdgeProps } from '@xyflow/react'
import React from 'react'

import { BACKWARDS_EDGE_DASH } from '@/utils/workflowEditor/constants'

const VERTICAL_OFFSET = -200 // px above
const WAYPOINT_OFFSET = 30

/**
 * Backwards edge that routes with vertical offset for visibility
 * Used when an edge points backwards (source X > target X)
 */
const BackwardsEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
}) => {
  const x1 = sourceX + WAYPOINT_OFFSET
  const x2 = targetX - WAYPOINT_OFFSET
  const y2 = sourceY + VERTICAL_OFFSET

  const path = [
    `M ${sourceX} ${sourceY}`, // Start at source
    `L ${x1} ${sourceY}`, // Go horizontal from source
    `L ${x1} ${y2}`, // Go up to offset level
    `L ${x2} ${y2}`, // Go horizontal at top (back)
    `L ${x2} ${targetY}`, // Go down to target level
    `L ${targetX} ${targetY}`, // Connect to target
  ].join(' ')

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{
        ...style,
        strokeDasharray: BACKWARDS_EDGE_DASH,
      }}
    />
  )
}

export default BackwardsEdge
