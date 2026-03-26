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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getTailwindColor } from '@/utils/tailwindColors'

import { calculatePercentage, getStatusColor, getStatusColorWithOpacity } from '../utils'

vi.mock('@/utils/tailwindColors', () => ({
  getTailwindColor: vi.fn(),
}))

const mockGetTailwindColor = vi.mocked(getTailwindColor)

describe('RatioWidget utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculatePercentage', () => {
    it('should return 0 when limit is 0', () => {
      expect(calculatePercentage(50, 0)).toBe(0)
    })

    it('should return 0 when current is NaN', () => {
      expect(calculatePercentage(NaN, 100)).toBe(0)
    })

    it('should return 0 when limit is NaN', () => {
      expect(calculatePercentage(50, NaN)).toBe(0)
    })

    it('should return 0 when both values are NaN', () => {
      expect(calculatePercentage(NaN, NaN)).toBe(0)
    })

    it('should calculate percentage correctly for normal values', () => {
      expect(calculatePercentage(50, 100)).toBe(50)
    })

    it('should calculate percentage correctly for partial values', () => {
      expect(calculatePercentage(1, 4)).toBe(25)
    })

    it('should cap the result at 100 when current exceeds limit', () => {
      expect(calculatePercentage(150, 100)).toBe(100)
    })

    it('should return 100 when current equals limit', () => {
      expect(calculatePercentage(100, 100)).toBe(100)
    })

    it('should return 0 when current is 0', () => {
      expect(calculatePercentage(0, 100)).toBe(0)
    })

    it('should handle decimal results', () => {
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 1)
    })
  })

  describe('getStatusColor', () => {
    it('should return red color when percentage exceeds dangerThreshold', () => {
      const redColor = '#ff0000'
      mockGetTailwindColor.mockReturnValue(redColor)

      const result = getStatusColor(90, 80, 60)

      expect(mockGetTailwindColor).toHaveBeenCalledWith('--colors-surface-specific-charts-red')
      expect(result).toBe(redColor)
    })

    it('should return yellow color when percentage exceeds warningThreshold but not dangerThreshold', () => {
      const yellowColor = '#ffff00'
      mockGetTailwindColor.mockReturnValue(yellowColor)

      const result = getStatusColor(70, 80, 60)

      expect(mockGetTailwindColor).toHaveBeenCalledWith('--colors-surface-specific-charts-yellow')
      expect(result).toBe(yellowColor)
    })

    it('should return green color when percentage is below warningThreshold', () => {
      const greenColor = '#00ff00'
      mockGetTailwindColor.mockReturnValue(greenColor)

      const result = getStatusColor(50, 80, 60)

      expect(mockGetTailwindColor).toHaveBeenCalledWith('--colors-surface-specific-charts-green')
      expect(result).toBe(greenColor)
    })

    it('should return green color when percentage equals warningThreshold', () => {
      const greenColor = '#00ff00'
      mockGetTailwindColor.mockReturnValue(greenColor)

      const result = getStatusColor(60, 80, 60)

      expect(mockGetTailwindColor).toHaveBeenCalledWith('--colors-surface-specific-charts-green')
      expect(result).toBe(greenColor)
    })

    it('should return red color when percentage equals dangerThreshold plus one', () => {
      const redColor = '#ff0000'
      mockGetTailwindColor.mockReturnValue(redColor)

      const result = getStatusColor(81, 80, 60)

      expect(mockGetTailwindColor).toHaveBeenCalledWith('--colors-surface-specific-charts-red')
      expect(result).toBe(redColor)
    })
  })

  describe('getStatusColorWithOpacity', () => {
    it('should return red color with opacity when percentage exceeds dangerThreshold', () => {
      const redColorOpacity = 'rgba(255,0,0,0.2)'
      mockGetTailwindColor.mockReturnValue(redColorOpacity)

      const result = getStatusColorWithOpacity(90, 80, 60)

      expect(mockGetTailwindColor).toHaveBeenCalledWith(
        '--colors-surface-specific-charts-red',
        undefined,
        0.2
      )
      expect(result).toBe(redColorOpacity)
    })

    it('should return yellow color with opacity when percentage exceeds warningThreshold but not dangerThreshold', () => {
      const yellowColorOpacity = 'rgba(255,255,0,0.2)'
      mockGetTailwindColor.mockReturnValue(yellowColorOpacity)

      const result = getStatusColorWithOpacity(70, 80, 60)

      expect(mockGetTailwindColor).toHaveBeenCalledWith(
        '--colors-surface-specific-charts-yellow',
        undefined,
        0.2
      )
      expect(result).toBe(yellowColorOpacity)
    })

    it('should return green color with opacity when percentage is below warningThreshold', () => {
      const greenColorOpacity = 'rgba(0,255,0,0.2)'
      mockGetTailwindColor.mockReturnValue(greenColorOpacity)

      const result = getStatusColorWithOpacity(50, 80, 60)

      expect(mockGetTailwindColor).toHaveBeenCalledWith(
        '--colors-surface-specific-charts-green',
        undefined,
        0.2
      )
      expect(result).toBe(greenColorOpacity)
    })

    it('should return green color with opacity when percentage equals warningThreshold', () => {
      const greenColorOpacity = 'rgba(0,255,0,0.2)'
      mockGetTailwindColor.mockReturnValue(greenColorOpacity)

      const result = getStatusColorWithOpacity(60, 80, 60)

      expect(mockGetTailwindColor).toHaveBeenCalledWith(
        '--colors-surface-specific-charts-green',
        undefined,
        0.2
      )
      expect(result).toBe(greenColorOpacity)
    })
  })
})
