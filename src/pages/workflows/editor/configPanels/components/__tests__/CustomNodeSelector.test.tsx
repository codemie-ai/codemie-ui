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

import { CustomNodeType } from '@/types/workflowEditor/configuration'

import { CUSTOM_NODE_TYPES_USING_TASK } from '../CustomNodeSelector'

describe('CUSTOM_NODE_TYPES_USING_TASK', () => {
  it('includes only STATE_PROCESSOR among currently-selectable custom node types', () => {
    expect(CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.STATE_PROCESSOR)).toBe(true)
    expect(CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.GENERATE_DOCUMENT_TREE)).toBe(false)
    expect(CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.RESULT_FINALIZER)).toBe(false)
    expect(CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.SUPERVISOR)).toBe(false)
    expect(CUSTOM_NODE_TYPES_USING_TASK.has(CustomNodeType.SUMMARIZE_CONVERSATION)).toBe(false)
  })

  // Explicit expected map over every CustomNodeType member (not just the ones the
  // selector currently offers in CUSTOM_NODE_OPTIONS) so that adding a new enum
  // member forces a decision on its Task visibility instead of silently passing.
  const EXPECTED_TASK_VISIBILITY: Record<CustomNodeType, boolean> = {
    [CustomNodeType.STATE_PROCESSOR]: true,
    [CustomNodeType.GENERATE_DOCUMENT_TREE]: false,
    [CustomNodeType.RESULT_FINALIZER]: false,
    [CustomNodeType.SUPERVISOR]: false,
    [CustomNodeType.SUMMARIZE_CONVERSATION]: false,
    [CustomNodeType.TRANSFORM]: false,
  }

  it.each(Object.values(CustomNodeType))(
    'has an explicit, decided Task-visibility rule for %s',
    (customNodeType) => {
      expect(EXPECTED_TASK_VISIBILITY).toHaveProperty(customNodeType)
      expect(CUSTOM_NODE_TYPES_USING_TASK.has(customNodeType)).toBe(
        EXPECTED_TASK_VISIBILITY[customNodeType]
      )
    }
  )

  it('covers every CustomNodeType member with no leftover/stale entries', () => {
    const byName = (a: string, b: string) => a.localeCompare(b)
    expect(Object.keys(EXPECTED_TASK_VISIBILITY).sort(byName)).toEqual(
      Object.values(CustomNodeType).sort(byName)
    )
  })
})
