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

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useProjectLLMModels } from '@/hooks/useProjectLLMModels'
import type { ModelOption } from '@/types/entity/configuration'

const { mockAppInfoStore } = vi.hoisted(() => ({
  mockAppInfoStore: {
    llmModels: [] as ModelOption[],
    llmRouters: [] as any[],
    projectLlmModels: {} as Record<string, ModelOption[]>,
    getLLMModels: vi.fn(),
    getProjectLLMModels: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))

const PLATFORM: ModelOption[] = [{ label: 'A', value: 'a', isDefault: true }]
const PROJECT: ModelOption[] = [{ label: 'B', value: 'b', isDefault: true }]

describe('useProjectLLMModels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.llmModels = PLATFORM
    mockAppInfoStore.llmRouters = []
    mockAppInfoStore.projectLlmModels = {}
  })

  it('returns the platform list without a project', () => {
    const { result } = renderHook(() => useProjectLLMModels(null))

    expect(result.current).toEqual(PLATFORM)
    expect(mockAppInfoStore.getLLMModels).toHaveBeenCalled()
    expect(mockAppInfoStore.getProjectLLMModels).not.toHaveBeenCalled()
  })

  it('appends platform routers flagged as routers without a project', () => {
    mockAppInfoStore.llmRouters = [{ value: 'auto', label: 'Auto', isDefault: false, tiers: {} }]

    const { result } = renderHook(() => useProjectLLMModels(null))

    expect(result.current).toEqual([
      ...PLATFORM,
      expect.objectContaining({ value: 'auto', label: 'Auto', isRouter: true }),
    ])
  })

  it('fetches a project list once and returns nothing until it arrives', () => {
    const { result } = renderHook(() => useProjectLLMModels('p'))

    expect(result.current).toEqual([])
    expect(mockAppInfoStore.getProjectLLMModels).toHaveBeenCalledWith('p')
  })

  it('uses the cached project list without refetching', () => {
    mockAppInfoStore.projectLlmModels = { p: PROJECT }

    const { result } = renderHook(() => useProjectLLMModels('p'))

    expect(result.current).toBe(PROJECT)
    expect(mockAppInfoStore.getProjectLLMModels).not.toHaveBeenCalled()
  })
})
