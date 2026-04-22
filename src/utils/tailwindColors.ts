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
 * Utility to extract Tailwind theme colors from CSS custom properties
 * Reads colors from the :root element where tailwindcss-themer exposes them
 */

/**
 * Get a Tailwind color value from CSS custom properties
 * @param propertyName - CSS custom property name (e.g., '--colors-neutral-925')
 * @param fallback - Fallback color if property is not found (optional)
 * @param opacity - Optional opacity value (0-1) to apply to the color
 * @returns Color value as string, or fallback if provided and not found
 */
export const getTailwindColor = (
  propertyName: string,
  fallback?: string,
  opacity?: number
): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback ?? ''
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(propertyName).trim()

  let color = ''

  if (!value) {
    color = fallback ?? ''
  } else if (
    value.startsWith('#') ||
    value.startsWith('rgb') ||
    value.startsWith('hsl') ||
    value.startsWith('rgba') ||
    value.startsWith('hsla')
  ) {
    color = value
  } else if (/^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/.test(value)) {
    // If value is space-separated RGB values (e.g., "255 255 255"), wrap in rgb()
    color = `rgb(${value.replace(/\s+/g, ', ')})`
  } else if (/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(value)) {
    // If value is comma-separated RGB values (e.g., "255, 255, 255"), wrap in rgb()
    color = `rgb(${value})`
  } else {
    color = value
  }

  // Apply opacity if provided
  if (opacity !== undefined && opacity >= 0 && opacity <= 1) {
    return addOpacityToColor(color, opacity)
  }

  return color
}

/**
 * Helper to add opacity to a color string
 * @param color - Color string (hex, rgb, or rgba)
 * @param opacity - Opacity value (0-1)
 * @returns Color with opacity applied
 */
function addOpacityToColor(color: string, opacity: number): string {
  if (!color) return `rgba(0, 0, 0, ${opacity})` // Fallback

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  // Handle rgb(r, g, b) format
  if (color.startsWith('rgb(')) {
    // Limit to 1-3 digits per component to prevent ReDoS
    const match = color.match(/rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)/)
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`
    }
  }

  // Handle rgba(r, g, b, a) format - replace alpha
  if (color.startsWith('rgba(')) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${opacity})`)
  }

  // Fallback
  return color
}

/**
 * Debug utility to log all CSS custom properties containing a search term
 * Useful for finding the correct property names
 * @param searchTerm - Term to search for in property names (e.g., 'progress')
 */
export const debugTailwindColors = (searchTerm?: string): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.log('Window or document not available')
    return
  }

  const styles = getComputedStyle(document.documentElement)
  const properties: Record<string, string> = {}

  // Get all CSS custom properties
  Array.from(styles).forEach((prop) => {
    if (prop.startsWith('--')) {
      const value = styles.getPropertyValue(prop).trim()
      if (!searchTerm || prop.includes(searchTerm)) {
        properties[prop] = value
      }
    }
  })

  if (searchTerm) {
    console.log('CSS custom properties containing:', searchTerm, properties)
  } else {
    console.log('All CSS custom properties:', properties)
  }
}
