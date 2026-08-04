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

import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { assistantsStore } from '@/store/assistants'

import { useResourceOptions } from '../hooks/useResourceOptions'

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    getAssistantOptions: vi.fn().mockResolvedValue([
      { id: '1', name: 'My Assistant' },
      { id: '2', name: 'Other Assistant' },
    ]),
  },
}))
vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    getWorkflowOptions: vi.fn().mockResolvedValue([{ id: '10', name: 'Deploy Flow' }]),
  },
}))
vi.mock('@/store/dataSources', () => ({
  dataSourceStore: {
    getDataSourceOptions: vi.fn().mockResolvedValue([{ id: '20', repo_name: 'my-repo' }]),
  },
}))

describe('useResourceOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty options and loading=false when resourceType is empty', () => {
    const { result } = renderHook(() => useResourceOptions(''))
    expect(result.current.options).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('returns empty options for an unknown resourceType', async () => {
    const { result } = renderHook(() => useResourceOptions('unknown'))
    await act(async () => {})
    expect(result.current.options).toEqual([])
  })

  it('fetches and maps assistant options with label=name, value=id', async () => {
    const { result } = renderHook(() => useResourceOptions('assistant'))
    await act(async () => {})
    expect(result.current.options).toEqual([
      { label: 'My Assistant', value: '1' },
      { label: 'Other Assistant', value: '2' },
    ])
    expect(result.current.loading).toBe(false)
  })

  it('fetches and maps workflow options with label=name, value=id', async () => {
    const { result } = renderHook(() => useResourceOptions('workflow'))
    await act(async () => {})
    expect(result.current.options).toEqual([{ label: 'Deploy Flow', value: '10' }])
  })

  it('fetches datasource options using repo_name as label', async () => {
    const { result } = renderHook(() => useResourceOptions('datasource'))
    await act(async () => {})
    expect(result.current.options).toEqual([{ label: 'my-repo', value: '20' }])
  })

  it('resets to empty options and loading=false when the store rejects', async () => {
    vi.mocked(assistantsStore.getAssistantOptions).mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useResourceOptions('assistant'))
    await act(async () => {})
    expect(result.current.options).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('re-fetches when resourceType changes', async () => {
    const { result, rerender } = renderHook(({ rt }: { rt: string }) => useResourceOptions(rt), {
      initialProps: { rt: 'assistant' },
    })
    await act(async () => {})
    expect(result.current.options[0].label).toBe('My Assistant')

    rerender({ rt: 'workflow' })
    await act(async () => {})
    expect(result.current.options[0].label).toBe('Deploy Flow')
  })
})
