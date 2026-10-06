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

import { describe, expect, it } from 'vitest'

import {
  normalizeBudgetInput,
  parseBudgetNumber,
} from '../../../components/projectsManagement/budgetNumber'

describe('budget number parsing', () => {
  it('normalizes decimal comma input', () => {
    expect(normalizeBudgetInput('12,50')).toBe('12.50')
  })

  it('normalizes thousands separators', () => {
    expect(normalizeBudgetInput('1,500.25')).toBe('1500.25')
    expect(normalizeBudgetInput('1,500')).toBe('1500')
  })

  it('returns null for empty or invalid values', () => {
    expect(parseBudgetNumber('')).toBeNull()
    expect(parseBudgetNumber('not-a-number')).toBeNull()
  })

  it('parses normalized numeric values', () => {
    expect(parseBudgetNumber('1 024,75')).toBe(1024.75)
  })
})
