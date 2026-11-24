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
import * as jsYaml from 'js-yaml'
import { describe, expect, it } from 'vitest'

import { deserialize, serialize } from '..'

const YAML = `headroom:
  enabled: true
  strategy: lossless
assistants:
  - id: a1
    model: gpt-4o
    system_prompt: hi
    headroom:
      enabled: false
  - id: a2
    model: gpt-4o
    system_prompt: hi
states:
  - id: s1
    assistant_id: a1
    next:
      state_id: end
  - id: s2
    assistant_id: a2
    next:
      state_id: end
`

describe('headroom round trip', () => {
  const out = jsYaml.load(serialize(deserialize(YAML))) as any

  it('keeps the workflow-level block with identical values', () => {
    expect(out.headroom).toEqual({ enabled: true, strategy: 'lossless' })
  })

  it('keeps the per-assistant block and leaves unset fields absent', () => {
    expect(out.assistants[0].headroom).toEqual({ enabled: false })
    expect(out.assistants[1]).not.toHaveProperty('headroom')
  })
})
