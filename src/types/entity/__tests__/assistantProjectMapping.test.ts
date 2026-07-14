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

import type {
  AssistantProjectFeature,
  AssistantProjectMappingRequest,
  AssistantProjectMappingResponse,
} from '../assistantProjectMapping'

describe('assistantProjectMapping types', () => {
  it('accepts "teams" as a valid AssistantProjectFeature', () => {
    const feature: AssistantProjectFeature = 'teams'
    expect(feature).toBe('teams')
  })

  it('AssistantProjectMappingRequest has project_name and feature fields', () => {
    const req: AssistantProjectMappingRequest = { project_name: 'my-project', feature: 'teams' }
    expect(req.project_name).toBe('my-project')
    expect(req.feature).toBe('teams')
  })

  it('AssistantProjectMappingResponse has a message field', () => {
    const res: AssistantProjectMappingResponse = { message: 'ok' }
    expect(res.message).toBe('ok')
  })
})
