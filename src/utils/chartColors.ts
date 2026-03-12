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

/**
 * Utility functions for generating chart colors from Tailwind theme
 */

import { getTailwindColor } from './tailwindColors'

/**
 * Parse RGB string to RGB components
 * @param color - Color string in rgb() or hex format
 * @returns Tuple of [r, g, b] values
 */
export const parseRgb = (color: string): [number, number, number] => {
  // Handle rgb(r g b) or rgb(r, g, b) format
  // Limit to 1-3 digits per component to prevent ReDoS
  const match =
    color.match(/rgb\((\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\)/) ||
    color.match(/rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)/)
  if (match) {
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)]
  }

  // Handle hex format
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ]
  }

  console.error('Could not parse color:', color)
  return [0, 0, 0]
}

/**
 * Adjust color lightness by adding/subtracting from RGB components
 * @param color - Color string in rgb() or hex format
 * @param adjustment - Amount to adjust (-255 to 255, negative = darker, positive = lighter)
 * @returns Adjusted color in rgb() format
 */
export const adjustLightness = (color: string, adjustment: number): string => {
  const [r, g, b] = parseRgb(color)

  // Adjust each component by the adjustment factor
  const newR = Math.max(0, Math.min(255, Math.round(r + adjustment)))
  const newG = Math.max(0, Math.min(255, Math.round(g + adjustment)))
  const newB = Math.max(0, Math.min(255, Math.round(b + adjustment)))

  return `rgb(${newR} ${newG} ${newB})`
}

/**
 * Get status colors from Tailwind theme
 * @returns Array of 6 status colors from Tailwind theme
 */
export const getStatusColors = (): string[] => {
  const colorTokens = ['blue', 'purple', 'cyan', 'red', 'yellow', 'green']

  return colorTokens.map((name) => {
    const color = getTailwindColor(`--colors-surface-specific-charts-${name}`, '')
    if (!color) {
      console.warn(`Could not find Tailwind color: --colors-surface-specific-charts-${name}`)
    }
    return color || '#000000'
  })
}

/**
 * Generate background colors for chart slices using status colors with variations
 * First 6 slices use base status colors, additional slices cycle through with lightness variations
 * @param count - Number of colors to generate
 * @returns Array of color strings in rgb() format
 */
export const generateChartColors = (count: number): string[] => {
  if (count === 0) return []

  const statusColors = getStatusColors()

  return Array.from({ length: count }, (_, i) => {
    // Use status colors directly for first 6 slices
    if (i < statusColors.length) {
      return statusColors[i]
    }

    // For additional slices, cycle through colors with lightness variations
    const baseColorIndex = (i - statusColors.length) % statusColors.length
    const baseColor = statusColors[baseColorIndex]

    // Calculate which "cycle" we're in (0, 1, 2, ...)
    const cycle = Math.floor((i - statusColors.length) / statusColors.length)

    // Alternate between lighter and darker variations
    // cycle 0: slightly darker, cycle 1: slightly lighter, cycle 2: darker, etc.
    const adjustment = cycle % 2 === 0 ? -30 - cycle * 10 : 30 + cycle * 10

    return adjustLightness(baseColor, adjustment)
  })
}
