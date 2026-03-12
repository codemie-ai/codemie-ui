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

import { DARK_THEME_KEY, LIGHT_THEME_KEY, THEME_KEY } from '@/constants'

type ThemeCallback = (theme: string) => void

class ThemeService {
  THEME_KEY: string

  listeners: Set<ThemeCallback>

  currentTheme: string

  constructor() {
    this.THEME_KEY = THEME_KEY
    this.listeners = new Set()
    this.currentTheme = DARK_THEME_KEY
    this.init()
  }

  init(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY)
    const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
      ? DARK_THEME_KEY
      : LIGHT_THEME_KEY

    this.currentTheme = savedTheme || systemTheme
    this.applyTheme(this.currentTheme)
  }

  applyTheme(theme: string): void {
    const html = document.documentElement

    if (theme === DARK_THEME_KEY) {
      html.classList.remove(LIGHT_THEME_KEY)
      html.classList.add(DARK_THEME_KEY)
    } else {
      html.classList.remove(DARK_THEME_KEY)
      html.classList.add(LIGHT_THEME_KEY)
    }

    this.currentTheme = theme
    localStorage.setItem(this.THEME_KEY, theme)

    this.listeners.forEach((callback) => callback(theme))
  }

  setTheme(theme: string): void {
    this.applyTheme(theme)
  }

  getTheme(): string {
    return this.currentTheme
  }

  isDark(): boolean {
    return this.currentTheme === DARK_THEME_KEY
  }

  subscribe(callback: ThemeCallback): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  watchSystemTheme(): void {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')

    mediaQuery?.addEventListener('change', (e) => {
      if (!localStorage.getItem(this.THEME_KEY)) {
        const systemTheme = e.matches ? DARK_THEME_KEY : LIGHT_THEME_KEY
        this.applyTheme(systemTheme)
      }
    })
  }
}

export const themeService = new ThemeService()
