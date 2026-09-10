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

import { formatDuration, truncateModelName } from '../format'

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
