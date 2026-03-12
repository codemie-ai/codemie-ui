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

import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import * as settingsUtils from '@/utils/settings'

import { useCustomerSupport } from '../useCustomerSupport'

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    configs: [],
    isConfigFetched: false,
    fetchCustomerConfig: vi.fn(),
  },
}))

vi.mock('@/utils/settings', () => ({
  isConfigItemEnabled: vi.fn(),
  getConfigItemSettings: vi.fn(),
}))

describe('useCustomerSupport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appInfoStore.configs = []
    appInfoStore.isConfigFetched = false
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('should return loading state when config is not fetched', () => {
      appInfoStore.isConfigFetched = false
      appInfoStore.configs = []

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isEnabled).toBe(false)
      expect(result.current.settings).toBeNull()
    })

    it('should call fetchCustomerConfig when config is not fetched', () => {
      appInfoStore.isConfigFetched = false

      renderHook(() => useCustomerSupport())

      expect(appInfoStore.fetchCustomerConfig).toHaveBeenCalledTimes(1)
    })

    it('should not call fetchCustomerConfig when config is already fetched', () => {
      appInfoStore.isConfigFetched = true

      renderHook(() => useCustomerSupport())

      expect(appInfoStore.fetchCustomerConfig).not.toHaveBeenCalled()
    })
  })

  describe('When config is fetched', () => {
    it('should return isLoading false when config is fetched', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = []

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.isLoading).toBe(false)
    })

    it('should return isEnabled true when customer support is enabled', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: true,
            name: 'Support Center',
            url: 'https://support.example.com',
          },
        },
      ]

      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(true)
      vi.mocked(settingsUtils.getConfigItemSettings).mockReturnValue({
        enabled: true,
        name: 'Support Center',
        url: 'https://support.example.com',
      })

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.isEnabled).toBe(true)
      expect(result.current.settings).toEqual({
        enabled: true,
        name: 'Support Center',
        url: 'https://support.example.com',
      })
    })

    it('should return isEnabled false when customer support is disabled', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: false,
          },
        },
      ]

      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(false)

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.isEnabled).toBe(false)
      expect(result.current.settings).toBeNull()
    })

    it('should return null settings when configs array is empty', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = []

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.isEnabled).toBe(false)
      expect(result.current.settings).toBeNull()
    })
  })

  describe('Settings values', () => {
    it('should return settings with all properties when available', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: true,
            availableForExternal: false,
            name: 'Help Center',
            url: 'https://help.example.com',
          },
        },
      ]

      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(true)
      vi.mocked(settingsUtils.getConfigItemSettings).mockReturnValue({
        enabled: true,
        availableForExternal: false,
        name: 'Help Center',
        url: 'https://help.example.com',
      })

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.settings).toEqual({
        enabled: true,
        availableForExternal: false,
        name: 'Help Center',
        url: 'https://help.example.com',
      })
    })

    it('should return settings without optional properties', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: true,
          },
        },
      ]

      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(true)
      vi.mocked(settingsUtils.getConfigItemSettings).mockReturnValue({
        enabled: true,
      })

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.settings).toEqual({
        enabled: true,
      })
    })

    it('should return settings with availableForExternal true for external users', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: true,
            availableForExternal: true,
            name: 'External Support',
            url: 'https://external.example.com',
          },
        },
      ]

      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(true)
      vi.mocked(settingsUtils.getConfigItemSettings).mockReturnValue({
        enabled: true,
        availableForExternal: true,
        name: 'External Support',
        url: 'https://external.example.com',
      })

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.settings?.availableForExternal).toBe(true)
    })
  })

  describe('Memoization', () => {
    it('should not recompute isEnabled if configs do not change', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: true,
            name: 'Support',
          },
        },
      ]

      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(true)
      vi.mocked(settingsUtils.getConfigItemSettings).mockReturnValue({
        enabled: true,
        name: 'Support',
      })

      const { result, rerender } = renderHook(() => useCustomerSupport())

      const firstIsEnabled = result.current.isEnabled
      const firstSettings = result.current.settings

      // Force rerender without changing configs
      rerender()

      expect(result.current.isEnabled).toBe(firstIsEnabled)
      expect(result.current.settings).toBe(firstSettings)
      // isConfigItemEnabled should only be called once initially
      expect(settingsUtils.isConfigItemEnabled).toHaveBeenCalledTimes(1)
    })

    it('should recompute when configs change', async () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: true,
          },
        },
      ]

      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(true)
      vi.mocked(settingsUtils.getConfigItemSettings).mockReturnValue({
        enabled: true,
      })

      const { result, rerender } = renderHook(() => useCustomerSupport())

      expect(result.current.isEnabled).toBe(true)

      // Change configs
      appInfoStore.configs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: false,
          },
        },
      ]
      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(false)

      rerender()

      await waitFor(() => {
        expect(result.current.isEnabled).toBe(false)
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle null configs gracefully', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = null as any

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.isEnabled).toBe(false)
      expect(result.current.settings).toBeNull()
    })

    it('should handle undefined configs gracefully', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = undefined as any

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.isEnabled).toBe(false)
      expect(result.current.settings).toBeNull()
    })

    it('should return null settings when isEnabled is false even if configs exist', () => {
      appInfoStore.isConfigFetched = true
      appInfoStore.configs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: false,
            name: 'Support',
          },
        },
      ]

      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(false)

      const { result } = renderHook(() => useCustomerSupport())

      expect(result.current.isEnabled).toBe(false)
      expect(result.current.settings).toBeNull()
      // getConfigItemSettings should not be called when isEnabled is false
      expect(settingsUtils.getConfigItemSettings).not.toHaveBeenCalled()
    })
  })

  describe('Integration with isConfigItemEnabled', () => {
    it('should call isConfigItemEnabled with correct parameters', () => {
      const mockConfigs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: true,
          },
        },
      ]

      appInfoStore.isConfigFetched = true
      appInfoStore.configs = mockConfigs

      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(true)

      renderHook(() => useCustomerSupport())

      expect(settingsUtils.isConfigItemEnabled).toHaveBeenCalledWith(mockConfigs, 'customerSupport')
    })

    it('should call getConfigItemSettings with correct parameters when enabled', () => {
      const mockConfigs = [
        {
          id: 'customerSupport',
          settings: {
            enabled: true,
            name: 'Support',
          },
        },
      ]

      appInfoStore.isConfigFetched = true
      appInfoStore.configs = mockConfigs

      vi.mocked(settingsUtils.isConfigItemEnabled).mockReturnValue(true)
      vi.mocked(settingsUtils.getConfigItemSettings).mockReturnValue({
        enabled: true,
        name: 'Support',
      })

      renderHook(() => useCustomerSupport())

      expect(settingsUtils.getConfigItemSettings).toHaveBeenCalledWith(
        mockConfigs,
        'customerSupport'
      )
    })
  })
})
