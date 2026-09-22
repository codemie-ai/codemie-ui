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

import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'

import { WOKRFLOW_EXECUTIONS } from '@/constants/routes'
import { routes } from '@/router'

describe('workflowRoutes - WOKRFLOW_EXECUTIONS optional executionId', () => {
  it('matches the bare executions-list path with no executionId param', () => {
    const matches = matchRoutes(routes, '/workflows/wf-123/workflow-executions')

    expect(matches?.at(-1)?.route.id).toBe(WOKRFLOW_EXECUTIONS)
    expect(matches?.at(-1)?.params.workflowId).toBe('wf-123')
    expect(matches?.at(-1)?.params.executionId).toBeUndefined()
  })

  it('still matches the path with an executionId param', () => {
    const matches = matchRoutes(routes, '/workflows/wf-123/workflow-executions/exec-1')

    expect(matches?.at(-1)?.route.id).toBe(WOKRFLOW_EXECUTIONS)
    expect(matches?.at(-1)?.params.workflowId).toBe('wf-123')
    expect(matches?.at(-1)?.params.executionId).toBe('exec-1')
  })
})
