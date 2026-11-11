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

import { filterComponentsArray, filterComponentsObject, filterSummaryMetrics } from '../katasFilter'

// Keys come from backend `_score_d6`; no real response fixture exists in the repo, so these are
// literal shapes, not built from the constants.
const metrics = { cli_sessions: 12, kata_completed: 3, total_spend: 1 }
const array = [
  { key: 'learning', label: 'Learning' },
  { key: 'adoption', label: 'Adoption' },
]
const object = { learning: { label: 'Learning' }, adoption: { label: 'Adoption' } }

describe('katasFilter', () => {
  it('removes exactly the kata metric when off, without mutating', () => {
    expect(filterSummaryMetrics(false, metrics)).toEqual({ cli_sessions: 12, total_spend: 1 })
    expect(metrics.kata_completed).toBe(3)
  })

  it('removes exactly the learning component from an array when off', () => {
    expect(filterComponentsArray(false, array)).toEqual([{ key: 'adoption', label: 'Adoption' }])
    expect(array).toHaveLength(2)
  })

  it('removes exactly the learning component from an object when off', () => {
    expect(filterComponentsObject(false, object)).toEqual({ adoption: { label: 'Adoption' } })
    expect(Object.keys(object)).toEqual(['learning', 'adoption'])
  })

  it('returns the input unchanged when on', () => {
    expect(filterSummaryMetrics(true, metrics)).toBe(metrics)
    expect(filterComponentsArray(true, array)).toBe(array)
    expect(filterComponentsObject(true, object)).toBe(object)
  })

  it('matches keys exactly, not by substring', () => {
    const other = { learning_path: 1, kata_completed_total: 2 }
    expect(filterSummaryMetrics(false, other)).toEqual(other)
    expect(filterComponentsObject(false, { learning_path: 1 })).toEqual({ learning_path: 1 })
  })
})
