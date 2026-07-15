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

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { APPEARANCE_KEY } from '@/constants'

import { DEFAULT_PRESET, PRESETS } from '../presets'
import { getStoredPreset, persistPreset } from '../storage'

import type { Preset } from '../presets'

describe('Code block font localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('persists codeBlockFontStack to localStorage', () => {
    const userPreset: Preset = {
      type: 'user',
      name: 'Test Theme',
      parentPreset: 'Clean White',
      values: {
        ...DEFAULT_PRESET.values,
        codeBlockFontStack: 'jetbrains-mono',
      },
    }

    // Persist
    persistPreset(userPreset)

    // Retrieve from localStorage
    const stored = localStorage.getItem(APPEARANCE_KEY)
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed.values.codeBlockFontStack).toBe('jetbrains-mono')
  })

  it('retrieves codeBlockFontStack from localStorage after reload', () => {
    const originalPreset: Preset = {
      type: 'user',
      name: 'Test Theme',
      parentPreset: 'Clean White',
      values: {
        ...DEFAULT_PRESET.values,
        codeBlockFontStack: 'ibm-plex-mono',
      },
    }

    // Persist
    persistPreset(originalPreset)

    // Simulate page reload by retrieving
    const retrieved = getStoredPreset()
    expect(retrieved?.type).toBe('user')
    if (retrieved?.type === 'user') {
      expect(retrieved.values.codeBlockFontStack).toBe('ibm-plex-mono')
    }
  })

  it('persists builtin preset reference with codeBlockFontStack default', () => {
    const builtinPreset: Preset = {
      type: 'builtin',
      name: 'Clean White',
      values: DEFAULT_PRESET.values,
    }

    // Persist
    persistPreset(builtinPreset)

    // Retrieve from localStorage
    const retrieved = getStoredPreset()
    expect(retrieved?.type).toBe('builtin')
    expect(retrieved?.name).toBe('Clean White')

    // Verify that values are not stored for builtin presets
    if (retrieved?.type === 'builtin') {
      expect((retrieved as any).values).toBeUndefined()
    }
  })

  it('maintains codeBlockFontStack across multiple persistence operations', () => {
    const preset1: Preset = {
      type: 'user',
      name: 'Theme 1',
      parentPreset: 'Clean White',
      values: {
        ...DEFAULT_PRESET.values,
        codeBlockFontStack: 'geist-mono',
      },
    }

    persistPreset(preset1)
    let retrieved = getStoredPreset()
    if (retrieved?.type === 'user') {
      expect(retrieved.values.codeBlockFontStack).toBe('geist-mono')
    }

    // Update to different font
    const preset2: Preset = {
      type: 'user',
      name: 'Theme 1',
      parentPreset: 'Clean White',
      values: {
        ...DEFAULT_PRESET.values,
        codeBlockFontStack: 'jetbrains-mono',
      },
    }

    persistPreset(preset2)
    retrieved = getStoredPreset()
    if (retrieved?.type === 'user') {
      expect(retrieved.values.codeBlockFontStack).toBe('jetbrains-mono')
    }
  })

  it('all builtin presets have codeBlockFontStack defined', () => {
    PRESETS.forEach((preset: any) => {
      expect(preset.values.codeBlockFontStack).toBeDefined()
      expect(['geist-mono', 'jetbrains-mono', 'ibm-plex-mono']).toContain(
        preset.values.codeBlockFontStack
      )
    })
  })
})
