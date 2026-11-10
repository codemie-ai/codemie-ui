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

import { ABSENT_VALUE_MARKER } from '@/constants'

import {
  buildRepoMetrics,
  formatDuration,
  formatLines,
  formatToolSuccess,
  linesTitle,
  LINES_NOT_REPORTED_TITLE,
  truncateModelName,
} from '../format'

describe('formatDuration', () => {
  it('returns em-dash for null', () => {
    expect(formatDuration(null)).toBe('—')
  })
  it('returns em-dash for zero', () => {
    expect(formatDuration(0)).toBe('—')
  })
  it('formats sub-second as ms', () => {
    expect(formatDuration(500)).toBe('500ms')
  })
  it('formats seconds only', () => {
    expect(formatDuration(5000)).toBe('5s')
  })
  it('formats minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1min 30s')
  })
  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661000)).toBe('1h 1min 1s')
  })
  it('writes months as m, minutes as min, and drops zero units', () => {
    const day = 24 * 3600 * 1000
    expect(formatDuration(120 * day)).toBe('4m')
    expect(formatDuration(62 * day)).toBe('2m 2d')
    expect(formatDuration(34 * day)).toBe('1m 4d')
    expect(formatDuration(7 * day)).toBe('1w')
    expect(formatDuration(3600000 + 5000)).toBe('1h 5s')
    expect(formatDuration(60000)).toBe('1min')
  })
})

describe('truncateModelName', () => {
  it('returns em-dash for empty string', () => {
    expect(truncateModelName('')).toBe('—')
  })
  it('returns name unchanged when within max', () => {
    expect(truncateModelName('short-model')).toBe('short-model')
  })
  it('truncates with ellipsis when name exceeds default max of 25', () => {
    expect(truncateModelName('a'.repeat(26))).toBe('a'.repeat(25) + '…')
  })
  it('respects custom max', () => {
    expect(truncateModelName('hello-world', 5)).toBe('hello…')
  })
})

describe('buildRepoMetrics', () => {
  // EPMCDME-15585 review follow-up: the backend is now the only producer of
  // tool_success_rate (repository, branch and single-session levels alike), so this must
  // render the value exactly as given, not recompute it from raw counts.
  it('passes the backend-computed tool_success_rate straight through', () => {
    const metrics = buildRepoMetrics({
      session_count: 4,
      cost_usd: 1,
      files_changed: 2,
      net_lines: 10,
      tool_success_rate: 28.8,
      tool_calls: 52,
    })
    const toolSuccess = metrics.find((m) => m.id === 'tool_success_rate')
    expect(toolSuccess?.value).toBe('28.80%')
  })

  // EPMCDME-16991: a repository with no tool calls has no success rate, not 0%.
  it('dashes the tool success rate when there were no tool calls', () => {
    const metrics = buildRepoMetrics({
      session_count: 131,
      cost_usd: 3.7,
      files_changed: 0,
      net_lines: null,
      tool_success_rate: 0,
      tool_calls: 0,
    })
    expect(metrics.find((m) => m.id === 'tool_success_rate')?.value).toBe('—')
  })

  it('labels the session count as Total Sessions', () => {
    const metrics = buildRepoMetrics({
      session_count: 1,
      cost_usd: 0,
      files_changed: 0,
      net_lines: 0,
      tool_success_rate: 0,
      tool_calls: 0,
    })
    expect(metrics.find((m) => m.id === 'session_count')?.label).toBe('Total Sessions')
  })
})

describe('formatToolSuccess', () => {
  it('dashes when there are no tool calls', () => {
    expect(formatToolSuccess(0, 0)).toBe('—')
  })

  it('dashes when the tool-call count is missing', () => {
    expect(formatToolSuccess(undefined, undefined)).toBe('—')
  })

  it('keeps a real 0% when calls exist and all of them failed', () => {
    expect(formatToolSuccess(0, 12)).toBe('0.00%')
  })

  it('formats a normal rate as a two-decimal percentage', () => {
    expect(formatToolSuccess(95, 20)).toBe('95.00%')
  })

  it('treats a missing rate with calls present as 0.00%', () => {
    expect(formatToolSuccess(undefined, 5)).toBe('0.00%')
  })
})

describe('formatLines / linesTitle', () => {
  it('returns the marker for null and undefined', () => {
    expect(formatLines(null)).toBe(ABSENT_VALUE_MARKER)
    expect(formatLines(undefined)).toBe(ABSENT_VALUE_MARKER)
  })
  it('returns 0 for a real zero', () => {
    expect(formatLines(0)).toBe('0')
  })
  it('groups thousands', () => {
    expect(formatLines(1234)).toBe((1234).toLocaleString())
  })
  it('sets the title only when not reported', () => {
    expect(linesTitle(null)).toBe(LINES_NOT_REPORTED_TITLE)
    expect(linesTitle(undefined)).toBe(LINES_NOT_REPORTED_TITLE)
    expect(linesTitle(0)).toBeUndefined()
    expect(linesTitle(1234)).toBeUndefined()
  })
})

describe('buildRepoMetrics null lines', () => {
  it('keeps null net_lines as null', () => {
    const m = buildRepoMetrics({
      session_count: 1,
      cost_usd: 1,
      files_changed: 1,
      net_lines: null,
      tool_success_rate: 1,
      tool_calls: 1,
    })
    expect(m.find((x) => x.id === 'net_lines')?.value).toBeNull()
  })
})
