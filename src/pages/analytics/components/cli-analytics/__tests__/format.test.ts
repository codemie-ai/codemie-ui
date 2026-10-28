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

import { buildRepoMetrics, formatDuration, formatToolSuccess, truncateModelName } from '../format'

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
    expect(formatDuration(90000)).toBe('1m 30s')
  })
  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661000)).toBe('1h 1m 1s')
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
    })
    const toolSuccess = metrics.find((m) => m.id === 'tool_success_rate')
    expect(toolSuccess?.value).toBe(28.8)
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
