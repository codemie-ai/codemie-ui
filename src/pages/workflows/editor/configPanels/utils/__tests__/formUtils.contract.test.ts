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

import type { CommonStateConfiguration } from '@/types/workflowEditor/configuration'
import { stateActions } from '@/utils/workflowEditor/actions'
import { serialize } from '@/utils/workflowEditor/serialization'

import { buildCommonStateConfig } from '../formUtils'

const applyToStored = (stored: Record<string, unknown>, built: object) =>
  stateActions.update({ states: [stored as any] }, { state: { id: 's1', data: built } }).config

describe('buildCommonStateConfig — contract keys', () => {
  it('carries input_schema, output_schema and validation', () => {
    const built = buildCommonStateConfig({
      id: 's1',
      input_schema: '{"type":"object"}',
      output_schema: '{"type":"string"}',
      save_validation: 'strict',
    })

    expect(built).toEqual(
      expect.objectContaining({
        input_schema: '{"type":"object"}',
        output_schema: '{"type":"string"}',
        save_validation: 'strict',
      })
    )
  })

  it('treats an unset mode and an empty input contract as undefined', () => {
    const built = buildCommonStateConfig({ id: 's1', input_schema: '', save_validation: '' })

    expect(built.save_validation).toBeUndefined()
    expect(built.input_schema).toBeUndefined()
  })

  it('clears a stored mode and input contract once they are unset, and the YAML omits the keys', () => {
    const built = buildCommonStateConfig({ id: 's1', input_schema: '', save_validation: '' })

    const config = applyToStored({ id: 's1', save_validation: 'strict', input_schema: '{}' }, built)

    const [state] = config.states as CommonStateConfiguration[]
    expect(state.save_validation).toBeUndefined()
    expect(state.input_schema).toBeUndefined()
    const yamlText = serialize(config)
    expect(yamlText).not.toContain('save_validation')
    expect(yamlText).not.toContain('input_schema')
  })
})
