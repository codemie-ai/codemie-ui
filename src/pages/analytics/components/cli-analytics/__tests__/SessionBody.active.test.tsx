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

const activeValue = (s: Partial<SessionDetail>) => {
  render(<SessionBody session={{ ...BASE, ...s }} />)
  const el = screen.getByText('Active', { selector: 'p' }).parentElement?.parentElement
  return (el?.textContent ?? '').slice('Active'.length)
}

describe('SessionBody Active tile (EPMCDME-16573)', () => {
  it('null active_ms is Not reported', () => {
    expect(activeValue({ active_ms: null })).toBe('Not reportedExcludes idle')
  })

  it('omitted active_ms is Not reported', () => {
    expect(activeValue({})).toBe('Not reportedExcludes idle')
  })

  it('zero active_ms is 0 ms', () => {
    expect(activeValue({ active_ms: 0 })).toBe('0 msExcludes idle')
  })

  it('positive active_ms keeps duration formatting', () => {
    expect(activeValue({ active_ms: 90000 })).toBe('1min 30sExcludes idle')
  })
})
