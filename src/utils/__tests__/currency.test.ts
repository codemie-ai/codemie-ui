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

import { formatCurrency, formatSpend } from '../currency'

describe('formatCurrency', () => {
  it('formats with two fraction digits', () => {
    expect(formatCurrency(120.5)).toBe('$120.50')
  })

  it('includes thousands separators', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('formats zero as $0.00', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('rounds to two decimals', () => {
    expect(formatCurrency(10.126)).toBe('$10.13')
  })
})

describe('formatSpend', () => {
  it('returns a dash for null', () => {
    expect(formatSpend(null)).toBe('-')
  })

  it('returns a dash for undefined', () => {
    expect(formatSpend(undefined)).toBe('-')
  })

  it('formats zero rather than treating it as absent', () => {
    expect(formatSpend(0)).toBe('$0.00')
  })

  it('formats a number', () => {
    expect(formatSpend(1234.5)).toBe('$1,234.50')
  })
})
