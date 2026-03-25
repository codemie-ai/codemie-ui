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

import { parseRgb, adjustLightness, generateChartColors, getStatusColors } from '../chartColors'
import * as tailwindColors from '../tailwindColors'

// Mock getTailwindColor
vi.mock('../tailwindColors', () => ({
  getTailwindColor: vi.fn(),
}))

describe('chartColors', () => {
  describe('parseRgb', () => {
    it('should parse rgb with spaces format', () => {
      expect(parseRgb('rgb(255 128 64)')).toEqual([255, 128, 64])
    })

    it('should parse rgb with commas format', () => {
      expect(parseRgb('rgb(255, 128, 64)')).toEqual([255, 128, 64])
      expect(parseRgb('rgb(255,128,64)')).toEqual([255, 128, 64])
    })

    it('should parse hex format', () => {
      expect(parseRgb('#ff8040')).toEqual([255, 128, 64])
      expect(parseRgb('#FF8040')).toEqual([255, 128, 64])
    })

    it('should return [0, 0, 0] for invalid color', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(parseRgb('invalid')).toEqual([0, 0, 0])
      expect(consoleSpy).toHaveBeenCalledWith('Could not parse color:', 'invalid')
      consoleSpy.mockRestore()
    })
  })

  describe('adjustLightness', () => {
    it('should lighten rgb color', () => {
      expect(adjustLightness('rgb(100 100 100)', 50)).toBe('rgb(150 150 150)')
    })

    it('should darken rgb color', () => {
      expect(adjustLightness('rgb(100 100 100)', -50)).toBe('rgb(50 50 50)')
    })

    it('should lighten hex color', () => {
      expect(adjustLightness('#646464', 50)).toBe('rgb(150 150 150)')
    })

    it('should darken hex color', () => {
      expect(adjustLightness('#646464', -50)).toBe('rgb(50 50 50)')
    })

    it('should clamp to 0-255 range', () => {
      expect(adjustLightness('rgb(10 10 10)', -50)).toBe('rgb(0 0 0)')
      expect(adjustLightness('rgb(240 240 240)', 50)).toBe('rgb(255 255 255)')
    })
  })

  describe('getStatusColors', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should retrieve all safe status colors', () => {
      const mockColors = ['rgb(34 151 246)', 'rgb(192 132 252)', 'rgb(6 182 212)', 'rgb(37 159 76)']

      vi.mocked(tailwindColors.getTailwindColor).mockImplementation((name) => {
        const index = [
          '--colors-surface-specific-charts-blue',
          '--colors-surface-specific-charts-purple',
          '--colors-surface-specific-charts-cyan',
          '--colors-surface-specific-charts-green',
        ].indexOf(name)
        return mockColors[index] || ''
      })

      const colors = getStatusColors()
      expect(colors).toEqual(mockColors)
      expect(tailwindColors.getTailwindColor).toHaveBeenCalledTimes(4)
    })

    it('should return black for missing colors and warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.mocked(tailwindColors.getTailwindColor).mockReturnValue('')

      const colors = getStatusColors()
      expect(colors).toEqual(['#000000', '#000000', '#000000', '#000000'])
      expect(consoleSpy).toHaveBeenCalledTimes(4)
      consoleSpy.mockRestore()
    })
  })

  describe('generateChartColors', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Mock status colors
      const mockColors = [
        'rgb(34 151 246)',
        'rgb(192 132 252)',
        'rgb(6 182 212)',
        'rgb(254 59 76)',
        'rgb(245 165 52)',
        'rgb(37 159 76)',
      ]

      vi.mocked(tailwindColors.getTailwindColor).mockImplementation((name) => {
        const index = [
          '--colors-surface-specific-charts-blue',
          '--colors-surface-specific-charts-purple',
          '--colors-surface-specific-charts-cyan',
          '--colors-surface-specific-charts-red',
          '--colors-surface-specific-charts-yellow',
          '--colors-surface-specific-charts-green',
        ].indexOf(name)
        return mockColors[index] || ''
      })
    })

    it('should return empty array for count 0', () => {
      expect(generateChartColors(0)).toEqual([])
    })

    it('should return base colors for count 1-4', () => {
      const colors = generateChartColors(3)
      expect(colors).toHaveLength(3)
      expect(colors[0]).toBe('rgb(34 151 246)') // in-progress
      expect(colors[1]).toBe('rgb(192 132 252)') // advanced
      expect(colors[2]).toBe('rgb(6 182 212)') // pending
    })

    it('should generate variations for count > 4', () => {
      const colors = generateChartColors(8)
      expect(colors).toHaveLength(8)
      // First 4 are base colors
      expect(colors[0]).toBe('rgb(34 151 246)')
      expect(colors[3]).toBe('rgb(37 159 76)')
      // Colors 5-8 are variations (darker) of first four colors
      expect(colors[4]).not.toBe('rgb(34 151 246)') // Should be darker version
      expect(colors[5]).not.toBe('rgb(192 132 252)') // Should be darker version
    })

    it('should cycle through colors with variations', () => {
      const colors = generateChartColors(14)
      expect(colors).toHaveLength(14)
      // Verify it cycles: colors[6] and colors[12] should be variations of same base color
      const base = parseRgb(colors[0])
      const firstCycle = parseRgb(colors[4])
      const secondCycle = parseRgb(colors[8])

      // First cycle should be darker
      expect(firstCycle[0]).toBeLessThan(base[0])
      // Second cycle should be lighter
      expect(secondCycle[0]).toBeGreaterThan(base[0])
    })
  })
})
