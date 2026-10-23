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

import { errorTextWithWait, formatShare, formatWait } from '../utils'

describe('formatShare', () => {
  it.each([
    [7.0918, '7.1%'],
    [100, '100.0%'],
    [0.12, '0.1%'],
    [0.03, '<0.1%'],
    [0, '0.0%'],
    [null, '—'],
    [undefined, '—'],
  ])('shows %s percent as "%s"', (value, text) => {
    expect(formatShare(value)).toBe(text)
  })
})

describe('formatWait', () => {
  it.each([
    [1, 'in 1 s'],
    [42, 'in 42 s'],
    [59, 'in 59 s'],
    [41.2, 'in 42 s'],
  ])('says %s seconds as "%s" under a minute', (seconds, text) => {
    expect(formatWait(seconds)).toBe(text)
  })

  it.each([
    [60, 'in 1 min'],
    [61, 'in 2 min'],
    [2520, 'in 42 min'],
    [2461, 'in 42 min'],
    [3540, 'in 59 min'],
  ])('says %s seconds as "%s" (rounded up) under an hour', (seconds, text) => {
    expect(formatWait(seconds)).toBe(text)
  })

  it.each([
    [3541, 'in 1 h'],
    [3600, 'in 1 h'],
    [7200, 'in 2 h'],
    [3601, 'in 1 h 1 min'],
    [5400, 'in 1 h 30 min'],
    [9000, 'in 2 h 30 min'],
  ])('says %s seconds as "%s" from an hour', (seconds, text) => {
    expect(formatWait(seconds)).toBe(text)
  })

  it.each([null, undefined, 0, -5, Number.NaN])('says nothing without a wait (%s)', (seconds) => {
    expect(formatWait(seconds)).toBe('')
  })
})

describe('errorTextWithWait', () => {
  it('adds the wait after the details', () => {
    expect(
      errorTextWithWait({
        message: 'Too many analyses',
        details:
          'You started 10 computations with custom settings in the last hour, the most allowed. Reset to the defaults or wait.',
        status: 429,
        retryAfter: 2520,
      })
    ).toBe(
      'Too many analyses: You started 10 computations with custom settings in the last hour, the most allowed. Reset to the defaults or wait. Try again in 42 min.'
    )
  })

  it('ends a sentence without a full stop before the wait', () => {
    expect(errorTextWithWait({ message: 'Analysis timed out', status: 504, retryAfter: 30 })).toBe(
      'Analysis timed out. Try again in 30 s.'
    )
  })

  it('is the error text alone without a Retry-After', () => {
    expect(errorTextWithWait({ message: 'Analysis failed', details: 'Boom', status: 500 })).toBe(
      'Analysis failed: Boom'
    )
  })

  it('is empty without an error', () => {
    expect(errorTextWithWait(null)).toBe('')
  })
})
