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

import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CUSTOM_THEME_KEY, DARK_THEME_KEY, LIGHT_THEME_KEY } from '@/constants'

import { useTheme } from '../useTheme'

const mockThemeService = vi.hoisted(() => ({
  getTheme: vi.fn(),
  getActivePreset: vi.fn(),
  getPresets: vi.fn(),
  setTheme: vi.fn(),
  setAppearance: vi.fn(),
  selectPreset: vi.fn(),
  resetActivePreset: vi.fn(),
  importPreset: vi.fn(),
  subscribe: vi.fn(),
}))

vi.mock('@/utils/themeService', () => ({ themeService: mockThemeService }))

type ThemeCallback = (theme: string, preset: { values: { baseTheme: string } }) => void

let capturedCallback: ThemeCallback

const lightPreset = { type: 'builtin', name: 'Clean White', values: { baseTheme: LIGHT_THEME_KEY } }
const darkPreset = { type: 'builtin', name: 'Dracula', values: { baseTheme: DARK_THEME_KEY } }

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockThemeService.getTheme.mockReturnValue(LIGHT_THEME_KEY)
    mockThemeService.getActivePreset.mockReturnValue(lightPreset)
    mockThemeService.subscribe.mockImplementation((cb: ThemeCallback) => {
      capturedCallback = cb

      return () => {}
    })
  })

  it('returns the current theme from the service', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe(LIGHT_THEME_KEY)
  })

  it('derives isDark from the plain theme when not custom', () => {
    mockThemeService.getTheme.mockReturnValue(DARK_THEME_KEY)
    const { result } = renderHook(() => useTheme())

    expect(result.current.isDark).toBe(true)
    expect(result.current.appearance).toBeNull()
  })

  it('derives isDark and appearance from the active preset when custom', () => {
    mockThemeService.getTheme.mockReturnValue(CUSTOM_THEME_KEY)
    mockThemeService.getActivePreset.mockReturnValue(darkPreset)
    const { result } = renderHook(() => useTheme())

    expect(result.current.isDark).toBe(true)
    expect(result.current.appearance).toBe(darkPreset.values)
  })

  it('delegates setTheme to the service', () => {
    const { result } = renderHook(() => useTheme())

    act(() => result.current.setTheme(DARK_THEME_KEY))

    expect(mockThemeService.setTheme).toHaveBeenCalledWith(DARK_THEME_KEY)
  })

  it('updates when the service notifies of a theme change', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.isDark).toBe(false)

    act(() => capturedCallback(DARK_THEME_KEY, lightPreset))

    expect(result.current.theme).toBe(DARK_THEME_KEY)
    expect(result.current.isDark).toBe(true)
  })
})
