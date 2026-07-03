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

import { useCustomAppearance } from '../useCustomAppearance'

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

type Preset = { type: string; name: string; values: { accentColor: string } }
type ThemeCallback = (theme: string, preset: Preset) => void

let capturedCallback: ThemeCallback

const presetA: Preset = { type: 'builtin', name: 'Clean White', values: { accentColor: '#525252' } }
const presetB: Preset = { type: 'user', name: 'My Theme', values: { accentColor: '#ff8040' } }

describe('useCustomAppearance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockThemeService.getActivePreset.mockReturnValue(presetA)
    mockThemeService.getPresets.mockReturnValue([presetA])
    mockThemeService.subscribe.mockImplementation((cb: ThemeCallback) => {
      capturedCallback = cb

      return () => {}
    })
  })

  it('exposes presets, the active preset and its values as appearance', () => {
    const { result } = renderHook(() => useCustomAppearance())

    expect(result.current.presets).toEqual([presetA])
    expect(result.current.activePreset).toBe(presetA)
    expect(result.current.appearance).toBe(presetA.values)
  })

  it('delegates its actions to the service', () => {
    const { result } = renderHook(() => useCustomAppearance())

    act(() => result.current.setAppearance({ accentColor: '#000000' }))
    act(() => result.current.selectPreset('Dracula'))
    act(() => result.current.resetActivePreset())
    act(() => result.current.importPreset({ foo: 'bar' }))

    expect(mockThemeService.setAppearance).toHaveBeenCalledWith({ accentColor: '#000000' })
    expect(mockThemeService.selectPreset).toHaveBeenCalledWith('Dracula')
    expect(mockThemeService.resetActivePreset).toHaveBeenCalled()
    expect(mockThemeService.importPreset).toHaveBeenCalledWith({ foo: 'bar' })
  })

  it('refreshes the active preset and presets when the service notifies', () => {
    const { result } = renderHook(() => useCustomAppearance())
    mockThemeService.getPresets.mockReturnValue([presetA, presetB])

    act(() => capturedCallback('codemieCustom', presetB))

    expect(result.current.activePreset).toBe(presetB)
    expect(result.current.presets).toEqual([presetA, presetB])
  })
})
