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

import { describe, it, expect } from 'vitest'

import { TopNFilter, toTopN, toPerPage, TOP_N_OPTIONS, API_MAX_PER_PAGE } from '../topNFilter'

describe('topNFilter utilities', () => {
  describe('TopNFilter constant', () => {
    it('should have correct values', () => {
      expect(TopNFilter.TEN).toBe(10)
      expect(TopNFilter.TWENTY).toBe(20)
      expect(TopNFilter.ALL).toBe('all')
    })
  })

  describe('TOP_N_OPTIONS', () => {
    it('should have three options with correct labels and values', () => {
      expect(TOP_N_OPTIONS).toHaveLength(3)
      expect(TOP_N_OPTIONS[0]).toEqual({ label: 'Top 10', value: '10' })
      expect(TOP_N_OPTIONS[1]).toEqual({ label: 'Top 20', value: '20' })
      expect(TOP_N_OPTIONS[2]).toEqual({ label: 'All', value: 'all' })
    })
  })

  describe('toTopN', () => {
    it('should convert "10" to TopNFilter.TEN', () => {
      expect(toTopN('10')).toBe(10)
    })

    it('should convert "20" to TopNFilter.TWENTY', () => {
      expect(toTopN('20')).toBe(20)
    })

    it('should convert "all" to TopNFilter.ALL', () => {
      expect(toTopN('all')).toBe('all')
    })

    it('should fallback to TopNFilter.TEN for invalid input', () => {
      expect(toTopN('99')).toBe(TopNFilter.TEN)
      expect(toTopN('invalid')).toBe(TopNFilter.TEN)
    })
  })

  describe('toPerPage', () => {
    it('should convert TopNFilter.TEN to 10', () => {
      expect(toPerPage(TopNFilter.TEN)).toBe(10)
    })

    it('should convert TopNFilter.TWENTY to 20', () => {
      expect(toPerPage(TopNFilter.TWENTY)).toBe(20)
    })

    it('should convert TopNFilter.ALL to API_MAX_PER_PAGE', () => {
      expect(toPerPage(TopNFilter.ALL)).toBe(API_MAX_PER_PAGE)
    })
  })
})
