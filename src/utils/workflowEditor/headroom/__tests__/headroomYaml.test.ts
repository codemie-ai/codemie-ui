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

import type { HeadroomOverride } from '@/types/entity/assistant'

import { buildHeadroom, resolveEffective, setHeadroomField } from '../headroomYaml'

describe('buildHeadroom', () => {
  it('keeps a block that carries overrides', () => {
    expect(buildHeadroom({ enabled: false })).toEqual({ enabled: false })
  })

  it('returns undefined for an empty or missing block so the key is omitted', () => {
    expect(buildHeadroom({})).toBeUndefined()
    expect(buildHeadroom(undefined)).toBeUndefined()
  })
})

describe('setHeadroomField', () => {
  it('sets and unsets cleanly, dropping empty blocks', () => {
    const one = setHeadroomField(undefined, 'enabled', false)
    expect(one).toEqual({ enabled: false })
    expect(setHeadroomField(one, 'strategy', 'lossless')).toEqual({
      enabled: false,
      strategy: 'lossless',
    })
    expect(setHeadroomField(one, 'enabled', undefined)).toBeUndefined()
  })

  it('keeps invalid and unknown keys for the backend to validate', () => {
    const manual = { strategy: 'foo', future_field: 1 } as unknown as HeadroomOverride
    expect(setHeadroomField(manual, 'enabled', true)).toEqual({
      strategy: 'foo',
      future_field: 1,
      enabled: true,
    })
  })

  it('starts a new block when the YAML value is not an object', () => {
    const malformed = 'on' as unknown as HeadroomOverride
    expect(setHeadroomField(malformed, 'enabled', true)).toEqual({ enabled: true })
  })
})

describe('resolveEffective', () => {
  it('resolves node > workflow > assistant > default', () => {
    expect(resolveEffective('strategy', undefined, undefined)).toEqual({
      value: 'balanced',
      source: 'default',
    })
    expect(
      resolveEffective('strategy', undefined, undefined, { strategy: 'lossless' }).source
    ).toBe('assistant')
    expect(
      resolveEffective('strategy', undefined, { strategy: 'aggressive' }, { strategy: 'lossless' })
    ).toEqual({ value: 'aggressive', source: 'workflow' })
    expect(
      resolveEffective('strategy', { strategy: 'lossless' }, { strategy: 'aggressive' }).source
    ).toBe('node')
  })

  it('lets node enabled:false beat workflow true', () => {
    expect(resolveEffective('enabled', { enabled: false }, { enabled: true })).toEqual({
      value: false,
      source: 'node',
    })
  })
})
