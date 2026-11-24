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

import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import { updateHeadroom } from '../updateHeadroom'

const base = {
  states: [],
  assistants: [{ id: 'a1' }, { id: 'a2', headroom: { enabled: true } }],
} as WorkflowConfiguration

describe('updateHeadroom', () => {
  it('writes the workflow-level block', () => {
    expect(updateHeadroom(base, { enabled: false }).config.headroom).toEqual({ enabled: false })
  })

  it('drops an empty workflow-level block', () => {
    const withBlock = { ...base, headroom: { enabled: true } }
    expect(updateHeadroom(withBlock, undefined).config.headroom).toBeUndefined()
  })

  it('writes into the matching assistant only', () => {
    const { config } = updateHeadroom(base, { strategy: 'lossless' }, 'a1')
    expect(config.assistants![0].headroom).toEqual({ strategy: 'lossless' })
    expect(config.assistants![1].headroom).toEqual({ enabled: true })
  })

  it('removes the assistant block when cleared', () => {
    const { config } = updateHeadroom(base, undefined, 'a2')
    expect(config.assistants![1].headroom).toBeUndefined()
  })
})
