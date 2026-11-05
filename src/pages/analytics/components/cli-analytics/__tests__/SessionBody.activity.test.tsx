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

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SessionDetail } from '@/types/cliAnalytics'

import SessionBody from '../views/SessionBody'

const ALL = ['agents', 'skills', 'tool_calls', 'turns'] as const

const BASE: SessionDetail = {
  trace_id: 't1',
  developer_name: 'alice@co.com',
  repository: 'svc',
  branch: null,
  start_time: '2026-07-01T09:00:00Z',
  duration_ms: 45000,
  model_name: 'claude',
  input_tokens: 10,
  output_tokens: 10,
  cost_usd: 0.1,
  tool_call_count: 0,
  harness_name: 'Claude-Code',
  events: [],
}

// Value + note text of the Activity card with the given label (label itself stripped).
const card = (label: string) => {
  const el = screen.getByText(label, { selector: 'p' }).parentElement?.parentElement as HTMLElement
  return (el.textContent ?? '').slice(label.length)
}

const renderSession = (s: Partial<SessionDetail>) =>
  render(<SessionBody session={{ ...BASE, ...s }} />)

describe('SessionBody activity metrics (EPMCDME-16833)', () => {
  it('ordinary complete session shows plain values with no qualifier', () => {
    renderSession({
      turns: 5,
      agent_count: 2,
      skill_count: 1,
      tool_call_count: 10,
      tool_calls_total: 10,
      tool_calls_success: 10,
      tool_success_rate: 100,
      summary_state: 'final',
      summary_metrics: [...ALL],
    })
    expect(card('Turns')).toBe('5')
    expect(card('Agents')).toBe('2')
    expect(card('Tool calls')).toBe('10100% ok')
    expect(screen.queryByText(/Partial|Provisional|Not reported/)).toBeNull()
  })

  it('unknown values render as unavailable, not zero', () => {
    renderSession({
      turns: null,
      agent_count: null,
      skill_count: null,
      tool_call_count: 0,
      tool_calls_total: null,
      summary_state: 'none',
      summary_metrics: [],
    })
    for (const l of ['Turns', 'Tool calls', 'Agents', 'Skills']) {
      expect(card(l)).toBe('—Not reported')
    }
  })

  it('a reported zero stays 0', () => {
    renderSession({
      turns: 0,
      agent_count: 0,
      skill_count: 0,
      tool_call_count: 0,
      tool_calls_total: 0,
      summary_state: 'final',
      summary_metrics: [...ALL],
    })
    expect(card('Turns')).toBe('0')
    expect(card('Agents')).toBe('0')
    expect(card('Tool calls')).toBe('0')
  })

  it('summary total with no observed outcomes says so', () => {
    renderSession({
      turns: 1,
      tool_call_count: 0,
      tool_calls_total: 4,
      summary_state: 'final',
      summary_metrics: [...ALL],
    })
    expect(card('Tool calls')).toBe('4No outcomes observed')
  })

  it('full summary total is not presented as 100% success for every call', () => {
    renderSession({
      turns: 2,
      tool_call_count: 1,
      tool_calls_total: 3,
      tool_calls_success: 1,
      tool_success_rate: 100,
      summary_state: 'final',
      summary_metrics: [...ALL],
    })
    expect(card('Tool calls')).toBe('31 observed of 3 total · 100% ok')
  })

  it('provisional is labelled', () => {
    renderSession({
      turns: 2,
      tool_call_count: 2,
      tool_calls_total: 2,
      tool_calls_success: 2,
      tool_success_rate: 100,
      summary_state: 'provisional',
      summary_metrics: [...ALL],
    })
    expect(card('Turns')).toBe('2Provisional')
    // total == observed does not make it complete
    expect(card('Tool calls')).toContain('Provisional')
  })

  it('final summary that omits a metric does not make that metric complete', () => {
    renderSession({
      turns: 1,
      tool_call_count: 1,
      tool_calls_total: null,
      tool_calls_success: 1,
      tool_success_rate: 100,
      summary_state: 'final',
      summary_metrics: [],
    })
    expect(card('Turns')).toBe('1Partial')
    expect(card('Tool calls')).toBe('1Observed only · 100% ok')
    expect(card('Agents')).toBe('—Not reported')
  })

  it('legacy payload without summary metadata is unknown, not final', () => {
    renderSession({
      turns: 2,
      tool_call_count: 1,
      tool_calls_total: 3,
      tool_calls_success: 1,
      tool_success_rate: 100,
    })
    expect(card('Turns')).toBe('2Partial')
    expect(card('Tool calls')).toBe('3Partial · 1 observed of 3 total · 100% ok')
  })

  it('a count without any summary is labelled unavailable, not partial', () => {
    renderSession({ turns: 1, summary_state: 'none', summary_metrics: [] })
    expect(card('Turns')).toBe('1Summary unavailable')
  })

  it('a missing success rate is not shown as 0% ok', () => {
    renderSession({
      tool_call_count: 2,
      tool_calls_total: 2,
      tool_calls_success: 2,
      tool_success_rate: null,
      summary_state: 'final',
      summary_metrics: [...ALL],
    })
    expect(card('Tool calls')).toBe('2')
  })
})
