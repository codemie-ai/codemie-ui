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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import toaster from '@/utils/toaster'

import { prepareVisualDiffCanvas } from '../prepareVisualDiffCanvas'

const VALID_EMPTY_GRAPH = 'states: []\n'

const yamlWithAssistant = (id: string, task: string) => `states:
  - id: ${id}
    task: ${task}
    assistant_id: a1
    next:
      state_id: end
`

afterEach(() => {
  vi.mocked(toaster.error).mockClear()
})

beforeEach(() => {
  vi.mocked(toaster.error).mockClear()
})

describe('prepareVisualDiffCanvas', () => {
  it('returns ok:true for valid YAML including identical graphs', () => {
    const result = prepareVisualDiffCanvas(VALID_EMPTY_GRAPH, VALID_EMPTY_GRAPH)

    expect(result).toMatchObject({ ok: true })
    if (result.ok) {
      expect(result.nodes.length).toBeGreaterThan(0)
      expect(result.statusById.size).toBe(0)
    }
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('marks a canvas-only node as added and a baseline-only node as removed', () => {
    const result = prepareVisualDiffCanvas(
      yamlWithAssistant('Assistant_1', 'hello'),
      yamlWithAssistant('Assistant_2', 'world')
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.statusById.get('Assistant_1')).toBe('added')
    expect(result.statusById.get('Assistant_2')).toBe('removed')
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('marks a same-id content change as modified', () => {
    const result = prepareVisualDiffCanvas(
      yamlWithAssistant('Assistant_1', 'v2'),
      yamlWithAssistant('Assistant_1', 'v1')
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.statusById.get('Assistant_1')).toBe('modified')
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('returns selected-empty for blank selected YAML without toasting', () => {
    expect(prepareVisualDiffCanvas('', VALID_EMPTY_GRAPH)).toEqual({
      ok: false,
      failure: 'selected-empty',
    })
    expect(prepareVisualDiffCanvas('   \n', VALID_EMPTY_GRAPH)).toEqual({
      ok: false,
      failure: 'selected-empty',
    })
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('returns selected-parse for invalid selected YAML without toasting', () => {
    expect(prepareVisualDiffCanvas('{{{', VALID_EMPTY_GRAPH)).toEqual({
      ok: false,
      failure: 'selected-parse',
    })
    expect(prepareVisualDiffCanvas('this: [unterminated', VALID_EMPTY_GRAPH)).toEqual({
      ok: false,
      failure: 'selected-parse',
    })
    expect(prepareVisualDiffCanvas('[]', VALID_EMPTY_GRAPH)).toEqual({
      ok: false,
      failure: 'selected-parse',
    })
    expect(prepareVisualDiffCanvas('null', VALID_EMPTY_GRAPH)).toEqual({
      ok: false,
      failure: 'selected-parse',
    })
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('returns editor-empty for blank current editor YAML without toasting', () => {
    expect(prepareVisualDiffCanvas(VALID_EMPTY_GRAPH, '')).toEqual({
      ok: false,
      failure: 'editor-empty',
    })
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('returns editor-parse for invalid current editor YAML without toasting', () => {
    expect(prepareVisualDiffCanvas(VALID_EMPTY_GRAPH, '{{{')).toEqual({
      ok: false,
      failure: 'editor-parse',
    })
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('prefers the selected-side failure when both YAML strings are unusable', () => {
    expect(prepareVisualDiffCanvas('{{{', '')).toEqual({
      ok: false,
      failure: 'selected-parse',
    })
    expect(prepareVisualDiffCanvas('', '{{{')).toEqual({
      ok: false,
      failure: 'selected-empty',
    })
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('returns graph when parsed YAML cannot be turned into a visual canvas', () => {
    expect(prepareVisualDiffCanvas('states: not-an-array\n', VALID_EMPTY_GRAPH)).toEqual({
      ok: false,
      failure: 'graph',
    })
    expect(toaster.error).not.toHaveBeenCalled()
  })
})
