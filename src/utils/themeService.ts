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

import { CUSTOM_THEME_KEY, DARK_THEME_KEY, LIGHT_THEME_KEY, THEME_KEY } from '@/constants'

import {
  applyOverrides,
  clearOverrides,
  PRESETS,
  DEFAULT_PRESET,
  getBuiltinPreset,
  runRules,
} from './customAppearance'
import { getStoredPreset, persistPreset, validateImportedPreset } from './customAppearance/storage'

import type { BuiltinPreset, Preset, UserPreset } from './customAppearance/presets'
import type { PresetValues } from './customAppearance/schema'

export type { PresetValues as CustomAppearance } from './customAppearance/schema'

type ThemeCallback = (theme: string, activePreset: Preset) => void

class ThemeService {
  THEME_KEY: string

  listeners: Set<ThemeCallback>

  currentTheme: string

  activePreset: Preset

  presets: UserPreset[]

  constructor() {
    this.THEME_KEY = THEME_KEY
    this.listeners = new Set()
    this.currentTheme = DARK_THEME_KEY
    this.activePreset = DEFAULT_PRESET
    this.presets = []
    this.init()
  }

  init(): void {
    let savedTheme: string | null = null
    try {
      savedTheme = localStorage.getItem(this.THEME_KEY)
    } catch {
      // localStorage may be unavailable
    }
    const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
      ? DARK_THEME_KEY
      : LIGHT_THEME_KEY

    const stored = getStoredPreset()

    if (!stored) {
      this.activePreset = DEFAULT_PRESET
    } else if (stored.type === 'builtin') {
      this.activePreset = getBuiltinPreset(stored.name) ?? DEFAULT_PRESET
    } else {
      this.activePreset = stored
      this.presets = [stored]
    }

    this.currentTheme = savedTheme || systemTheme
    this.applyTheme(this.currentTheme)
  }

  applyTheme(theme: string): void {
    const html = document.documentElement
    const { values } = this.activePreset
    const effectiveTheme = theme === CUSTOM_THEME_KEY ? values.baseTheme : theme

    if (effectiveTheme === DARK_THEME_KEY) {
      html.classList.remove(LIGHT_THEME_KEY)
      html.classList.add(DARK_THEME_KEY)
    } else {
      html.classList.remove(DARK_THEME_KEY)
      html.classList.add(LIGHT_THEME_KEY)
    }

    if (theme === CUSTOM_THEME_KEY) {
      html.classList.add(CUSTOM_THEME_KEY)
      applyOverrides(html, runRules(values))
    } else {
      html.classList.remove(CUSTOM_THEME_KEY)
      clearOverrides(html)
    }

    this.currentTheme = theme
    try {
      localStorage.setItem(this.THEME_KEY, theme)
    } catch {
      // localStorage may be unavailable
    }
    this.listeners.forEach((callback) => callback(theme, this.activePreset))
  }

  setTheme(theme: string): void {
    this.applyTheme(theme)
  }

  getTheme(): string {
    return this.currentTheme
  }

  getAppearance(): PresetValues {
    return this.activePreset.values
  }

  getActivePreset(): Preset {
    return this.activePreset
  }

  getPresets(): Preset[] {
    return [...PRESETS, ...this.presets]
  }

  setAppearance(partial: Partial<PresetValues>): void {
    if (this.activePreset.type === 'builtin') {
      const customName = `${this.activePreset.name} (custom)`
      const originalPreset: BuiltinPreset = this.activePreset

      this.presets = this.presets.filter((p) => p.name !== customName)

      const newUserPreset: UserPreset = {
        type: 'user',
        name: customName,
        parentPreset: originalPreset.name,
        values: { ...originalPreset.values, ...partial },
      }
      this.presets.push(newUserPreset)
      this.activePreset = newUserPreset
    } else {
      const updatedPreset: UserPreset = {
        ...this.activePreset,
        values: { ...this.activePreset.values, ...partial },
      }
      const idx = this.presets.findIndex((p) => p.name === this.activePreset.name)
      if (idx !== -1) this.presets[idx] = updatedPreset
      this.activePreset = updatedPreset
    }

    persistPreset(this.activePreset)

    if (this.currentTheme === CUSTOM_THEME_KEY) {
      this.applyTheme(CUSTOM_THEME_KEY)

      return
    }

    this.listeners.forEach((callback) => callback(this.currentTheme, this.activePreset))
  }

  selectPreset(name: string): void {
    if (name === this.activePreset.name) return

    const builtin = getBuiltinPreset(name)
    if (builtin) {
      this.activePreset = builtin
      persistPreset(this.activePreset)
      this.notifyOrApply()

      return
    }

    const userPreset = this.presets.find((p) => p.name === name)
    if (userPreset) {
      this.activePreset = userPreset
      persistPreset(this.activePreset)
      this.notifyOrApply()
    }
  }

  resetActivePreset(): void {
    if (this.activePreset.type !== 'user') return

    const parentName = this.activePreset.parentPreset
    this.presets = this.presets.filter((p) => p.name !== this.activePreset.name)

    this.activePreset = getBuiltinPreset(parentName) ?? DEFAULT_PRESET
    persistPreset(this.activePreset)
    this.notifyOrApply()
  }

  importPreset(raw: unknown): boolean {
    let preset: UserPreset
    try {
      preset = validateImportedPreset(raw)
    } catch (err) {
      console.error('Preset import failed: schema validation error.', err)

      return false
    }

    this.presets = this.presets.filter((p) => p.name !== preset.name)
    this.presets.push(preset)
    this.activePreset = preset
    persistPreset(this.activePreset)
    this.notifyOrApply()

    return true
  }

  subscribe(callback: ThemeCallback): () => void {
    this.listeners.add(callback)

    return () => this.listeners.delete(callback)
  }

  watchSystemTheme(): void {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')

    mediaQuery?.addEventListener('change', (e) => {
      let savedTheme: string | null = null
      try {
        savedTheme = localStorage.getItem(this.THEME_KEY)
      } catch {
        // localStorage may be unavailable
      }
      if (!savedTheme) {
        this.applyTheme(e.matches ? DARK_THEME_KEY : LIGHT_THEME_KEY)
      }
    })
  }

  private notifyOrApply(): void {
    if (this.currentTheme === CUSTOM_THEME_KEY) {
      this.applyTheme(CUSTOM_THEME_KEY)

      return
    }

    this.listeners.forEach((callback) => callback(this.currentTheme, this.activePreset))
  }
}

export const themeService = new ThemeService()
