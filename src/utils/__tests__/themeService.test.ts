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

import {
  THEME_KEY,
  APPEARANCE_KEY,
  DARK_THEME_KEY,
  LIGHT_THEME_KEY,
  CUSTOM_THEME_KEY,
} from '@/constants'
import type { themeService as ThemeServiceType } from '@/utils/themeService'

type ThemeService = typeof ThemeServiceType

interface Seed {
  theme?: string
  preset?: unknown
}

// themeService is a singleton built (and initialised) at import time, so each test
// resets the module registry and seeds localStorage before importing a fresh instance.
const freshService = async (seed: Seed = {}): Promise<ThemeService> => {
  localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.style.cssText = ''
  if (seed.theme) localStorage.setItem(THEME_KEY, seed.theme)
  if (seed.preset) localStorage.setItem(APPEARANCE_KEY, JSON.stringify(seed.preset))

  vi.resetModules()
  const mod = await import('@/utils/themeService')

  return mod.themeService
}

const html = () => document.documentElement

describe('themeService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('init', () => {
    it('defaults to the first builtin preset and the system theme when nothing is stored', async () => {
      const service = await freshService()

      expect(service.getActivePreset().type).toBe('builtin')
      expect(service.getActivePreset().name).toBe('Clean White')
      // matchMedia mock reports matches:false -> light system theme
      expect(service.getTheme()).toBe(LIGHT_THEME_KEY)
      expect(html().classList.contains(LIGHT_THEME_KEY)).toBe(true)
    })

    it('resolves a stored builtin reference by name', async () => {
      const service = await freshService({ preset: { type: 'builtin', name: 'Dracula' } })

      expect(service.getActivePreset().name).toBe('Dracula')
    })

    it('restores a stored user preset and exposes it in getPresets', async () => {
      const service = await freshService()
      const userPreset = {
        type: 'user',
        name: 'My Theme',
        parentPreset: 'Clean White',
        values: service.getAppearance(),
      }
      const restored = await freshService({ preset: userPreset })

      expect(restored.getActivePreset().type).toBe('user')
      expect(restored.getActivePreset().name).toBe('My Theme')
      expect(restored.getPresets().some((p) => p.name === 'My Theme')).toBe(true)
    })

    it('uses the saved theme over the system theme', async () => {
      const service = await freshService({ theme: DARK_THEME_KEY })

      expect(service.getTheme()).toBe(DARK_THEME_KEY)
      expect(html().classList.contains(DARK_THEME_KEY)).toBe(true)
    })
  })

  describe('applyTheme / setTheme', () => {
    let service: ThemeService

    beforeEach(async () => {
      service = await freshService()
    })

    it('applies the dark theme and clears custom overrides', () => {
      service.setTheme(DARK_THEME_KEY)

      expect(html().classList.contains(DARK_THEME_KEY)).toBe(true)
      expect(html().classList.contains(LIGHT_THEME_KEY)).toBe(false)
      expect(html().classList.contains(CUSTOM_THEME_KEY)).toBe(false)
      expect(html().style.getPropertyValue('--colors-text-accent')).toBe('')
      expect(localStorage.getItem(THEME_KEY)).toBe(DARK_THEME_KEY)
    })

    it('applies the light theme', () => {
      service.setTheme(DARK_THEME_KEY)
      service.setTheme(LIGHT_THEME_KEY)

      expect(html().classList.contains(LIGHT_THEME_KEY)).toBe(true)
      expect(html().classList.contains(DARK_THEME_KEY)).toBe(false)
      expect(html().classList.contains(CUSTOM_THEME_KEY)).toBe(false)
    })

    it('applies the custom theme with the preset base class and CSS overrides', () => {
      service.setTheme(CUSTOM_THEME_KEY)

      expect(html().classList.contains(CUSTOM_THEME_KEY)).toBe(true)
      // Clean White has a light base theme
      expect(html().classList.contains(LIGHT_THEME_KEY)).toBe(true)
      expect(html().style.getPropertyValue('--colors-text-accent')).not.toBe('')
    })
  })

  describe('setAppearance', () => {
    let service: ThemeService

    beforeEach(async () => {
      service = await freshService()
    })

    it('forks a builtin preset into a user "(custom)" preset', () => {
      service.setAppearance({ accentColor: '#ff8040' })

      const active = service.getActivePreset()
      expect(active.type).toBe('user')
      expect(active.name).toBe('Clean White (custom)')
      expect(active.values.accentColor).toBe('#ff8040')
      expect(service.getPresets().filter((p) => p.name === 'Clean White (custom)')).toHaveLength(1)
    })

    it('does not duplicate the custom preset on repeated edits', () => {
      service.setAppearance({ accentColor: '#ff8040' })
      service.setAppearance({ accentColor: '#102030' })

      expect(service.getPresets().filter((p) => p.name === 'Clean White (custom)')).toHaveLength(1)
      expect(service.getActivePreset().values.accentColor).toBe('#102030')
    })

    it('reapplies CSS overrides immediately when the custom theme is active', () => {
      service.setTheme(CUSTOM_THEME_KEY)
      service.setAppearance({ accentColor: '#ff8040' })

      expect(html().style.getPropertyValue('--colors-text-accent')).toBe('255 128 64')
    })

    it('notifies listeners when not on the custom theme', () => {
      const listener = vi.fn()
      service.subscribe(listener)

      service.setAppearance({ accentColor: '#ff8040' })

      expect(listener).toHaveBeenCalled()
    })
  })

  describe('selectPreset', () => {
    let service: ThemeService

    beforeEach(async () => {
      service = await freshService()
    })

    it('switches to another builtin preset', () => {
      service.selectPreset('Dracula')
      expect(service.getActivePreset().name).toBe('Dracula')
    })

    it('is a no-op when selecting the already active preset', () => {
      const listener = vi.fn()
      service.subscribe(listener)

      service.selectPreset('Clean White')

      expect(listener).not.toHaveBeenCalled()
      expect(service.getActivePreset().name).toBe('Clean White')
    })

    it('switches to a user preset by name', () => {
      service.setAppearance({ accentColor: '#ff8040' })
      service.selectPreset('Dracula')
      service.selectPreset('Clean White (custom)')

      expect(service.getActivePreset().name).toBe('Clean White (custom)')
    })
  })

  describe('resetActivePreset', () => {
    let service: ThemeService

    beforeEach(async () => {
      service = await freshService()
    })

    it('reverts a user preset to its parent builtin and drops it', () => {
      service.setAppearance({ accentColor: '#ff8040' })
      service.resetActivePreset()

      const active = service.getActivePreset()
      expect(active.type).toBe('builtin')
      expect(active.name).toBe('Clean White')
      expect(service.getPresets().some((p) => p.name === 'Clean White (custom)')).toBe(false)
    })

    it('is a no-op when the active preset is a builtin', () => {
      service.resetActivePreset()
      expect(service.getActivePreset().name).toBe('Clean White')
    })
  })

  describe('importPreset', () => {
    let service: ThemeService

    beforeEach(async () => {
      service = await freshService()
    })

    it('imports, activates and stores a valid preset', () => {
      const raw = {
        type: 'user',
        name: 'Imported',
        parentPreset: 'Clean White',
        values: service.getAppearance(),
      }

      const ok = service.importPreset(raw)

      expect(ok).toBe(true)
      expect(service.getActivePreset().name).toBe('Imported')
      expect(service.getPresets().some((p) => p.name === 'Imported')).toBe(true)
    })

    it('returns false and logs on an invalid preset without changing state', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const ok = service.importPreset({ type: 'user' })

      expect(ok).toBe(false)
      expect(errorSpy).toHaveBeenCalled()
      expect(service.getActivePreset().name).toBe('Clean White')
    })
  })

  describe('getPresets and subscribe', () => {
    let service: ThemeService

    beforeEach(async () => {
      service = await freshService()
    })

    it('returns builtin presets followed by user presets', () => {
      const before = service.getPresets().length
      service.setAppearance({ accentColor: '#ff8040' })

      expect(service.getPresets().length).toBe(before + 1)
      expect(service.getPresets()[0].type).toBe('builtin')
    })

    it('invokes subscribers on change and stops after unsubscribe', () => {
      const listener = vi.fn()
      const unsubscribe = service.subscribe(listener)

      service.setTheme(DARK_THEME_KEY)
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      service.setTheme(LIGHT_THEME_KEY)
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })
})
