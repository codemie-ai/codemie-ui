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

import { Thought, WorkflowExecutionState } from '@/types/entity'

import {
  buildCallHistoryExport,
  formatCallHistoryJson,
  getCallHistoryFilename,
} from '../callHistoryExport'

const state = {
  id: 's1',
  execution_id: 'e1',
  name: 'My Node',
  status: 'Succeeded',
  started_at: '2026-01-01T00:00:00Z',
  completed_at: '2026-01-01T00:00:10Z',
  thoughts: [],
} as unknown as WorkflowExecutionState

const thought = (over: Partial<Thought> = {}): Thought => ({
  id: 't1',
  author_name: 'a',
  tool_name: 'tool',
  author_type: 'Tool',
  message: 'msg',
  input_text: 'in',
  in_progress: false,
  content: 'msg',
  ...over,
})

describe('callHistoryExport', () => {
  it('returns null for no thoughts', () => {
    expect(buildCallHistoryExport(state, [])).toBeNull()
  })

  it('maps state fields and calls with 1-based index', () => {
    const exp = buildCallHistoryExport(state, [thought(), thought({ id: 't2' })])!
    expect(exp.execution_id).toBe('e1')
    expect(exp.state_id).toBe('s1')
    expect(exp.node).toBe('My Node')
    expect(exp.status).toBe('Succeeded')
    expect(exp.duration_seconds).toBe(10)
    expect(exp.calls.map((c) => [c.index, c.id])).toEqual([
      [1, 't1'],
      [2, 't2'],
    ])
    expect(exp.calls[0].tool_name).toBe('tool')
  })

  it('duration is null when completed_at missing', () => {
    const exp = buildCallHistoryExport({ ...state, completed_at: null }, [thought()])!
    expect(exp.duration_seconds).toBeNull()
  })

  it('keeps error and children', () => {
    const child = thought({ id: 'c' })
    const exp = buildCallHistoryExport(state, [
      thought({ error: 'boom', children: [child] }),
      thought({ id: 't2', error: true }),
    ])!
    expect(exp.calls[0].error).toBe('boom')
    expect(exp.calls[0].children).toEqual([child])
    expect(exp.calls[1].error).toBe(true)
    expect(JSON.parse(formatCallHistoryJson(exp)).calls).toHaveLength(2)
    expect(formatCallHistoryJson(exp)).toContain('\n  "')
  })

  it('maps message from content, matching what the popup shows', () => {
    const exp = buildCallHistoryExport(state, [thought({ content: 'raw message' })])!
    expect(exp.calls[0].message).toBe('raw message')
  })

  it('exports JSON object and array content as parsed JSON', () => {
    const exp = buildCallHistoryExport(state, [
      thought({ content: '{"total_count": 2, "items": [1, 2]}' }),
      thought({ id: 't2', content: '[{"a": 1}, {"a": 2}]' }),
    ])!
    expect((exp.calls[0] as any).content).toEqual({ total_count: 2, items: [1, 2] })
    expect((exp.calls[1] as any).content).toEqual([{ a: 1 }, { a: 2 }])

    const json = formatCallHistoryJson(exp)
    expect(json).toContain('"total_count": 2')
    // "content" is parsed JSON, not a JSON-encoded string — unlike "message", which keeps the raw text.
    expect(json).toMatch(/"content": {\s*\n\s*"total_count": 2/)
  })

  it('falls back to the raw text when content is not a JSON object or array', () => {
    const exp = buildCallHistoryExport(state, [
      thought({ content: 'plain text' }),
      thought({ id: 't2', content: '{not json' }),
      thought({ id: 't3', content: '42' }),
      thought({ id: 't4', content: undefined }),
    ])!
    expect(exp.calls.map((c) => c.content)).toEqual(['plain text', '{not json', '42', ''])
    expect(exp.calls.map((c) => c.message)).toEqual(['plain text', '{not json', '42', ''])
  })

  it('includes the call output for API-shaped thoughts with no message field', () => {
    // Mirrors WorkflowExecutionStateThoughtWithChildren: no `message`, plain-text `content`.
    const apiThought = {
      id: 't1',
      author_name: 'assistant',
      author_type: 'assistant',
      input_text: 'question',
      content: 'The answer is 42, see details below.',
      date: '2026-01-01T00:00:05Z',
      children: [],
    } as unknown as Thought

    const exp = buildCallHistoryExport(state, [apiThought])!
    const json = formatCallHistoryJson(exp)

    expect(exp.calls[0].message).toBe('The answer is 42, see details below.')
    expect(exp.calls[0].content).toBe('The answer is 42, see details below.')
    expect(exp.calls[0].date).toBe('2026-01-01T00:00:05Z')
    expect(json).toContain('The answer is 42, see details below.')
  })

  it('strips special characters from filename', () => {
    const name = getCallHistoryFilename({ ...state, name: 'a/b: c*?' })
    expect(name).toMatch(/^[a-z0-9-]+$/)
    expect(name).toContain('e1')
  })
})
