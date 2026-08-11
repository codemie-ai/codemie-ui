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
import { dataSourceStore } from '@/store/dataSources'
import { workflowsStore } from '@/store/workflows'

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

  describe('project scoping', () => {
    it('passes project to assistant options store', async () => {
      renderHook(() => useResourceOptions('assistant', 'proj-x'))
      await act(async () => {})
      expect(vi.mocked(assistantsStore.getAssistantOptions)).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ project: 'proj-x' })
      )
    })

    it('passes project to workflow options store', async () => {
      renderHook(() => useResourceOptions('workflow', 'proj-x'))
      await act(async () => {})
      expect(vi.mocked(workflowsStore.getWorkflowOptions)).toHaveBeenCalledWith(
        expect.objectContaining({ project: 'proj-x' })
      )
    })

    it('passes project to datasource options store', async () => {
      renderHook(() => useResourceOptions('datasource', 'proj-x'))
      await act(async () => {})
      expect(vi.mocked(dataSourceStore.getDataSourceOptions)).toHaveBeenCalledWith(
        expect.objectContaining({ project: 'proj-x' })
      )
    })

    it('re-fetches and scopes to the new project when project changes', async () => {
      const { rerender } = renderHook(
        ({ rt, p }: { rt: string; p: string }) => useResourceOptions(rt, p),
        { initialProps: { rt: 'assistant', p: 'proj-a' } }
      )
      await act(async () => {})
      expect(vi.mocked(assistantsStore.getAssistantOptions)).toHaveBeenCalledTimes(1)

      rerender({ rt: 'assistant', p: 'proj-b' })
      await act(async () => {})
      expect(vi.mocked(assistantsStore.getAssistantOptions)).toHaveBeenCalledTimes(2)
      expect(vi.mocked(assistantsStore.getAssistantOptions)).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ project: 'proj-b' })
      )
    })
  })

  describe('search', () => {
    it('passes search term to assistant options store', async () => {
      renderHook(() => useResourceOptions('assistant', undefined, 'my query'))
      await act(async () => {})
      expect(vi.mocked(assistantsStore.getAssistantOptions)).toHaveBeenCalledWith(
        'my query',
        expect.anything()
      )
    })

    it('passes search term to workflow options store', async () => {
      renderHook(() => useResourceOptions('workflow', undefined, 'my query'))
      await act(async () => {})
      expect(vi.mocked(workflowsStore.getWorkflowOptions)).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'my query' })
      )
    })

    it('passes search term as query to datasource options store', async () => {
      renderHook(() => useResourceOptions('datasource', undefined, 'my query'))
      await act(async () => {})
      expect(vi.mocked(dataSourceStore.getDataSourceOptions)).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'my query' })
      )
    })

    it('re-fetches when search term changes', async () => {
      const { rerender } = renderHook(
        ({ rt, s }: { rt: string; s: string }) => useResourceOptions(rt, undefined, s),
        { initialProps: { rt: 'workflow', s: '' } }
      )
      await act(async () => {})
      expect(vi.mocked(workflowsStore.getWorkflowOptions)).toHaveBeenCalledTimes(1)

      rerender({ rt: 'workflow', s: 'deploy' })
      await act(async () => {})
      expect(vi.mocked(workflowsStore.getWorkflowOptions)).toHaveBeenCalledTimes(2)
      expect(vi.mocked(workflowsStore.getWorkflowOptions)).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'deploy' })
      )
    })
  })
})
