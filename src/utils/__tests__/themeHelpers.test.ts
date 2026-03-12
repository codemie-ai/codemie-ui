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

/* eslint-disable dot-notation */
import { describe, it, expect } from 'vitest'

import { generateThemes } from '@/utils/themeHelpers'

describe('generateThemes', () => {
  describe('Array-based tokens (different values for dark and light themes)', () => {
    it('should extract dark theme value (index 0) for array tokens', () => {
      const tokens = {
        surface: {
          elevated: ['#2E2E2E', '#FFFFFF'],
        },
      }

      const result = generateThemes(tokens)

      expect(result.dark).toEqual({
        surface: {
          elevated: '#2E2E2E',
        },
      })
    })

    it('should extract light theme value (index 1) for array tokens', () => {
      const tokens = {
        surface: {
          elevated: ['#2E2E2E', '#FFFFFF'],
        },
      }

      const result = generateThemes(tokens)

      expect(result.light).toEqual({
        surface: {
          elevated: '#FFFFFF',
        },
      })
    })

    it('should handle multiple array tokens at same level', () => {
      const tokens = {
        surface: {
          primary: ['#1A1A1A', '#FAFAFC'],
          secondary: ['#212224', '#FFFFFF'],
          tertiary: ['#2E3033', '#FBFBFB'],
        },
      }

      const result = generateThemes(tokens)

      expect(result.dark).toEqual({
        surface: {
          primary: '#1A1A1A',
          secondary: '#212224',
          tertiary: '#2E3033',
        },
      })

      expect(result.light).toEqual({
        surface: {
          primary: '#FAFAFC',
          secondary: '#FFFFFF',
          tertiary: '#FBFBFB',
        },
      })
    })

    it('should handle deeply nested array tokens', () => {
      const tokens = {
        surface: {
          specific: {
            button: {
              primary: ['#20222E', '#D9EBFF'],
              secondary: ['#212224', '#FFFFFF'],
            },
          },
        },
      }

      const result = generateThemes(tokens)

      expect(result.dark).toEqual({
        surface: {
          specific: {
            button: {
              primary: '#20222E',
              secondary: '#212224',
            },
          },
        },
      })

      expect(result.light).toEqual({
        surface: {
          specific: {
            button: {
              primary: '#D9EBFF',
              secondary: '#FFFFFF',
            },
          },
        },
      })
    })
  })

  describe('Single-value tokens (same value for both themes)', () => {
    it('should apply single string value to both themes', () => {
      const tokens = {
        surface: {
          neutral: '#808080',
        },
      }

      const result = generateThemes(tokens)

      expect(result.dark).toEqual({
        surface: {
          neutral: '#808080',
        },
      })

      expect(result.light).toEqual({
        surface: {
          neutral: '#808080',
        },
      })
    })

    it('should handle color palette reference as single value', () => {
      // Simulating: primary: c['neutral']['925']
      const c = {
        neutral: { '925': '#1A1A1A' },
        blue: { '400': '#007AFF' },
      }

      const tokens = {
        surface: {
          primary: c['neutral']['925'], // Single value - same for both themes
        },
        text: {
          accent: c['blue']['400'], // Single value - same for both themes
        },
      }

      const result = generateThemes(tokens)

      // Both dark and light themes should have the same values
      expect(result.dark).toEqual({
        surface: {
          primary: '#1A1A1A',
        },
        text: {
          accent: '#007AFF',
        },
      })

      expect(result.light).toEqual({
        surface: {
          primary: '#1A1A1A',
        },
        text: {
          accent: '#007AFF',
        },
      })
    })

    it('should handle multiple single-value string tokens', () => {
      const tokens = {
        colors: {
          primary: '#1A1A1A',
          secondary: '#808080',
          tertiary: '#CCCCCC',
        },
      }

      const result = generateThemes(tokens)

      expect(result.dark).toEqual({
        colors: {
          primary: '#1A1A1A',
          secondary: '#808080',
          tertiary: '#CCCCCC',
        },
      })

      expect(result.light).toEqual({
        colors: {
          primary: '#1A1A1A',
          secondary: '#808080',
          tertiary: '#CCCCCC',
        },
      })
    })
  })

  describe('Mixed tokens (arrays and single values)', () => {
    it('should handle mix of array and single-value tokens', () => {
      const tokens = {
        colors: {
          surface: ['#1A1A1A', '#FFFFFF'], // Array: different for each theme
          accent: '#007AFF', // Single: same for both themes
          border: ['#333436', '#E5E5E5'], // Array: different for each theme
          error: '#FF0000', // Single: same for both themes
        },
      }

      const result = generateThemes(tokens)

      expect(result.dark).toEqual({
        colors: {
          surface: '#1A1A1A',
          accent: '#007AFF',
          border: '#333436',
          error: '#FF0000',
        },
      })

      expect(result.light).toEqual({
        colors: {
          surface: '#FFFFFF',
          accent: '#007AFF',
          border: '#E5E5E5',
          error: '#FF0000',
        },
      })
    })

    it('should handle complex nested structure with mixed tokens', () => {
      const tokens = {
        surface: {
          base: {
            primary: ['#1A1A1A', '#FAFAFC'],
            secondary: ['#212224', '#FFFFFF'],
          },
          interactive: {
            hover: ['#333', '#F0F0F0'],
          },
        },
        status: {
          success: '#00A902', // Same for both
          failed: '#FE3B4C', // Same for both
        },
        border: {
          primary: ['#333436', '#CCCCCC'],
          accent: '#007AFF', // Same for both
        },
      }

      const result = generateThemes(tokens)

      expect(result.dark).toEqual({
        surface: {
          base: {
            primary: '#1A1A1A',
            secondary: '#212224',
          },
          interactive: {
            hover: '#333',
          },
        },
        status: {
          success: '#00A902',
          failed: '#FE3B4C',
        },
        border: {
          primary: '#333436',
          accent: '#007AFF',
        },
      })

      expect(result.light).toEqual({
        surface: {
          base: {
            primary: '#FAFAFC',
            secondary: '#FFFFFF',
          },
          interactive: {
            hover: '#F0F0F0',
          },
        },
        status: {
          success: '#00A902',
          failed: '#FE3B4C',
        },
        border: {
          primary: '#CCCCCC',
          accent: '#007AFF',
        },
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle empty object', () => {
      const tokens = {}

      const result = generateThemes(tokens)

      expect(result.dark).toEqual({})
      expect(result.light).toEqual({})
    })
  })

  describe('Error handling - array validation', () => {
    it('should throw Error when array token has more than 2 elements', () => {
      const tokens = {
        colors: {
          gradient: ['#000', '#FFF', '#CCC'], // Has 3 elements
        },
      }

      expect(() => generateThemes(tokens)).toThrow(Error)
      expect(() => generateThemes(tokens)).toThrow(
        'Array token at "colors.gradient" must have exactly 2 elements [darkValue, lightValue], received 3 elements'
      )
    })

    it('should throw Error when array token has only 1 element', () => {
      const tokens = {
        colors: {
          single: ['#000'],
        },
      }

      expect(() => generateThemes(tokens)).toThrow(Error)
      expect(() => generateThemes(tokens)).toThrow(
        'Array token at "colors.single" must have exactly 2 elements [darkValue, lightValue], received 1 element'
      )
    })

    it('should throw Error when array token is empty', () => {
      const tokens = {
        colors: {
          empty: [],
        },
      }

      expect(() => generateThemes(tokens)).toThrow(Error)
      expect(() => generateThemes(tokens)).toThrow(
        'Array token at "colors.empty" must have exactly 2 elements [darkValue, lightValue], received 0 elements'
      )
    })

    it('should throw Error with correct path for nested array tokens', () => {
      const tokens = {
        surface: {
          base: {
            primary: ['#000'], // Only 1 element
          },
        },
      }

      expect(() => generateThemes(tokens)).toThrow(
        'Array token at "surface.base.primary" must have exactly 2 elements [darkValue, lightValue], received 1 element'
      )
    })

    it('should throw Error with correct path for deeply nested array tokens', () => {
      const tokens = {
        colors: {
          surface: {
            specific: {
              button: {
                hover: ['#A', '#B', '#C', '#D'], // 4 elements
              },
            },
          },
        },
      }

      expect(() => generateThemes(tokens)).toThrow(
        'Array token at "colors.surface.specific.button.hover" must have exactly 2 elements [darkValue, lightValue], received 4 elements'
      )
    })
  })

  describe('Error handling - invalid types', () => {
    it('should throw Error when token value is null', () => {
      const tokens = {
        surface: {
          primary: null,
        },
      }

      expect(() => generateThemes(tokens)).toThrow(Error)
      expect(() => generateThemes(tokens)).toThrow(
        'Invalid token value at "surface.primary". Expected string, array [darkValue, lightValue], or object, received null'
      )
    })

    it('should throw Error when token value is undefined', () => {
      const tokens = {
        surface: {
          primary: undefined,
        },
      }

      expect(() => generateThemes(tokens)).toThrow(Error)
      expect(() => generateThemes(tokens)).toThrow(
        'Invalid token value at "surface.primary". Expected string, array [darkValue, lightValue], or object, received undefined'
      )
    })

    it('should throw Error when token value is a number', () => {
      const tokens = {
        surface: {
          primary: 123,
        },
      }

      expect(() => generateThemes(tokens)).toThrow(Error)
      expect(() => generateThemes(tokens)).toThrow(
        'Invalid token value at "surface.primary". Expected string, array [darkValue, lightValue], or object, received number'
      )
    })

    it('should throw Error when token value is a boolean', () => {
      const tokens = {
        surface: {
          primary: true,
        },
      }

      expect(() => generateThemes(tokens)).toThrow(Error)
      expect(() => generateThemes(tokens)).toThrow(
        'Invalid token value at "surface.primary". Expected string, array [darkValue, lightValue], or object, received boolean'
      )
    })
  })

  describe('Real-world usage scenario', () => {
    it('should correctly generate themes for actual tailwind config structure', () => {
      const tokens = {
        surface: {
          elevated: ['#2E2E2E', '#FFFFFF'],
          base: {
            primary: ['#1A1A1A', '#FAFAFC'],
            secondary: ['#212224', '#FFFFFF'],
          },
        },
        border: {
          primary: ['#333436', '#CCCCCC'],
          accent: ['#FFFFFF', '#007AFF'],
        },
        text: {
          primary: ['#FFFFFF', '#333333'],
          inverse: '#FFFFFF', // Same for both themes
        },
        'in-progress': {
          primary: '#2297F6', // Status colors - same for both themes
          secondary: ['#003A69', '#C9E7FF'],
        },
      }

      const result = generateThemes(tokens)

      // Verify dark theme
      expect(result.dark.surface.elevated).toBe('#2E2E2E')
      expect(result.dark.surface.base.primary).toBe('#1A1A1A')
      expect(result.dark.border.primary).toBe('#333436')
      expect(result.dark.text.primary).toBe('#FFFFFF')
      expect(result.dark.text.inverse).toBe('#FFFFFF') // Single value
      expect(result.dark['in-progress'].primary).toBe('#2297F6') // Single value

      // Verify light theme
      expect(result.light.surface.elevated).toBe('#FFFFFF')
      expect(result.light.surface.base.primary).toBe('#FAFAFC')
      expect(result.light.border.primary).toBe('#CCCCCC')
      expect(result.light.text.primary).toBe('#333333')
      expect(result.light.text.inverse).toBe('#FFFFFF') // Same single value
      expect(result.light['in-progress'].primary).toBe('#2297F6') // Same single value
    })

    it('should handle typical tailwind extension pattern with color references', () => {
      // Simulating how it would be used in tailwind.config.ts
      const c = {
        neutral: { '0': '#FFFFFF', '800': '#2E2E2E', '925': '#1A1A1A' },
        blue: { '400': '#007AFF', '300': '#2297F6' },
        red: { '500': '#FF0000' },
      }

      const themeTokens = {
        surface: {
          elevated: [c['neutral']['800'], c['neutral']['0']], // Array: different per theme
          primary: c['neutral']['925'], // Single: same for both themes
        },
        border: {
          accent: c['blue']['400'], // Single: same for both themes
        },
        text: {
          error: c['red']['500'], // Single: same for both themes
        },
        'in-progress': {
          primary: c['blue']['300'], // Single: same for both themes
        },
      }

      const themes = generateThemes(themeTokens)

      // Dark theme
      expect(themes.dark.surface.elevated).toBe('#2E2E2E')
      expect(themes.dark.surface.primary).toBe('#1A1A1A') // Same in both themes
      expect(themes.dark.border.accent).toBe('#007AFF') // Same in both themes
      expect(themes.dark.text.error).toBe('#FF0000') // Same in both themes
      expect(themes.dark['in-progress'].primary).toBe('#2297F6') // Same in both themes

      // Light theme
      expect(themes.light.surface.elevated).toBe('#FFFFFF')
      expect(themes.light.surface.primary).toBe('#1A1A1A') // Same value as dark
      expect(themes.light.border.accent).toBe('#007AFF') // Same value as dark
      expect(themes.light.text.error).toBe('#FF0000') // Same value as dark
      expect(themes.light['in-progress'].primary).toBe('#2297F6') // Same value as dark
    })

    it('should handle complex mix of arrays and single color references', () => {
      const c = {
        neutral: {
          '0': '#FFFFFF',
          '925': '#1A1A1A',
          '800': '#2E2E2E',
          '100': '#EEEEEE',
        },
        blue: { '300': '#2297F6' },
      }

      const themeTokens = {
        surface: {
          base: {
            primary: [c['neutral']['925'], c['neutral']['0']], // Array
            secondary: c['neutral']['800'], // Single - same for both
          },
          interactive: {
            hover: [c['neutral']['800'], c['neutral']['100']], // Array
          },
        },
        text: {
          primary: [c['neutral']['0'], c['neutral']['925']], // Array
          accent: c['blue']['300'], // Single - same for both
        },
      }

      const themes = generateThemes(themeTokens)

      // Verify dark theme
      expect(themes.dark.surface.base.primary).toBe('#1A1A1A')
      expect(themes.dark.surface.base.secondary).toBe('#2E2E2E')
      expect(themes.dark.surface.interactive.hover).toBe('#2E2E2E')
      expect(themes.dark.text.primary).toBe('#FFFFFF')
      expect(themes.dark.text.accent).toBe('#2297F6')

      // Verify light theme
      expect(themes.light.surface.base.primary).toBe('#FFFFFF')
      expect(themes.light.surface.base.secondary).toBe('#2E2E2E') // Same as dark
      expect(themes.light.surface.interactive.hover).toBe('#EEEEEE')
      expect(themes.light.text.primary).toBe('#1A1A1A')
      expect(themes.light.text.accent).toBe('#2297F6') // Same as dark
    })
  })
})
