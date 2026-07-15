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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { APPEARANCE_KEY } from '@/constants'

import { DEFAULT_PRESET } from '../presets'
import { getStoredPreset, persistPreset, validateImportedPreset } from '../storage'

import type { BuiltinPreset, UserPreset } from '../presets'

const builtinPreset: BuiltinPreset = {
  type: 'builtin',
  name: 'Clean White',
  values: { ...DEFAULT_PRESET.values },
}

const userPreset: UserPreset = {
  type: 'user',
  name: 'My Theme',
  parentPreset: 'Clean White',
  values: { ...DEFAULT_PRESET.values },
}

const readRaw = () => JSON.parse(localStorage.getItem(APPEARANCE_KEY) as string)

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('persistPreset', () => {
    it('stores only a type/name reference for builtin presets', () => {
      persistPreset(builtinPreset)
      expect(readRaw()).toEqual({ type: 'builtin', name: 'Clean White' })
      expect(readRaw().values).toBeUndefined()
    })

    it('stores the full object for user presets', () => {
      persistPreset(userPreset)
      expect(readRaw()).toEqual(userPreset)
    })

    it('does not throw when localStorage.setItem fails', () => {
      vi.spyOn(global.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded')
      })
      expect(() => persistPreset(userPreset)).not.toThrow()
    })
  })

  describe('getStoredPreset', () => {
    it('returns null when nothing is stored', () => {
      expect(getStoredPreset()).toBeNull()
    })

    it('returns a builtin reference', () => {
      persistPreset(builtinPreset)
      expect(getStoredPreset()).toEqual({ type: 'builtin', name: 'Clean White' })
    })

    it('returns the full user preset', () => {
      persistPreset(userPreset)
      expect(getStoredPreset()).toEqual(userPreset)
    })

    it('returns null and logs on invalid JSON', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      localStorage.setItem(APPEARANCE_KEY, 'not-json{')

      expect(getStoredPreset()).toBeNull()
      expect(errorSpy).toHaveBeenCalled()
    })

    it('returns null and logs when the stored preset fails schema validation', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      localStorage.setItem(
        APPEARANCE_KEY,
        JSON.stringify({ ...userPreset, values: { ...userPreset.values, accentColor: 'red' } })
      )

      expect(getStoredPreset()).toBeNull()
      expect(errorSpy).toHaveBeenCalled()
    })

    it('returns null and logs when the stored type is unknown', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ type: 'mystery', name: 'x' }))

      expect(getStoredPreset()).toBeNull()
      expect(errorSpy).toHaveBeenCalled()
    })

    it('returns null when localStorage.getItem throws', () => {
      vi.spyOn(global.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('unavailable')
      })
      expect(getStoredPreset()).toBeNull()
    })
  })

  describe('validateImportedPreset', () => {
    it('returns a valid user preset unchanged', () => {
      expect(validateImportedPreset(userPreset)).toEqual(userPreset)
    })

    it('throws when a required field is missing', () => {
      const withoutParent = {
        type: userPreset.type,
        name: userPreset.name,
        values: userPreset.values,
      }
      expect(() => validateImportedPreset(withoutParent)).toThrow()
    })

    it('throws on an invalid color value', () => {
      expect(() =>
        validateImportedPreset({
          ...userPreset,
          values: { ...userPreset.values, primaryTextColor: '#zzz' },
        })
      ).toThrow()
    })

    it('throws when the preset type is wrong', () => {
      expect(() => validateImportedPreset({ ...userPreset, type: 'builtin' })).toThrow()
    })
  })

  describe('codeBlockFontStack validation', () => {
    it.each([['geist-mono'], ['jetbrains-mono'], ['ibm-plex-mono']])(
      'accepts valid codeBlockFontStack: %s',
      (fontStack) => {
        const preset = {
          ...userPreset,
          values: { ...userPreset.values, codeBlockFontStack: fontStack },
        }
        expect(() => validateImportedPreset(preset)).not.toThrow()
      }
    )

    it('rejects invalid codeBlockFontStack value', () => {
      const preset = {
        ...userPreset,
        values: { ...userPreset.values, codeBlockFontStack: 'courier-new' },
      }
      expect(() => validateImportedPreset(preset)).toThrow()
    })

    it('backfills a default when a pre-existing stored preset predates this field', () => {
      const { codeBlockFontStack: _omit, ...legacyValues } = userPreset.values
      const legacyPreset = { ...userPreset, values: legacyValues }
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(legacyPreset))

      const retrieved = getStoredPreset()

      expect(retrieved).not.toBeNull()
      if (retrieved?.type === 'user') {
        expect(retrieved.values.codeBlockFontStack).toBe('geist-mono')
      }
    })
  })
})
