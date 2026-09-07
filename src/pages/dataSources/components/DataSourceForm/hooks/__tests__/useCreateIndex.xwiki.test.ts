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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { INDEX_TYPES } from '@/constants/dataSources'
import { dataSourceStore } from '@/store/dataSources'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'

import { useIndexCreation } from '../useCreateIndex'
import { FormValues } from '../useEditPopupForm'

vi.mock('@/store/dataSources', () => ({
  dataSourceStore: {
    healthCheckDatasource: vi.fn().mockResolvedValue({ implemented: false }),
    createKBIndexXWiki: vi.fn().mockResolvedValue({}),
    updateKBIndex: vi.fn().mockResolvedValue({}),
  },
}))

const baseValues = {
  indexType: INDEX_TYPES.XWIKI,
  name: 'my-xwiki-source',
  description: 'An xWiki datasource',
  projectName: 'test-project',
  projectSpaceVisible: true,
  isEditing: false,
  setting_id: 'xwiki-setting-1',
  embeddingsModel: '',
  guardrail_assignments: [],
  cronExpression: '',
  timezone: 'UTC',
  xwikiSpace: 'KB',
  xwikiWiki: '',
} as unknown as FormValues

const storedIndex = {
  id: 'ds-xwiki-1',
  repo_name: 'my-xwiki-source',
  project_name: 'test-project',
  index_type: 'knowledge_base_xwiki',
  xwiki: { space: 'KB', wiki: 'teamwiki' },
} as unknown as DataSourceDetailsResponse

// updateKBIndex types its body as {}, so narrow it for assertions.
const updateBody = (): Record<string, unknown> =>
  vi.mocked(dataSourceStore.updateKBIndex).mock.calls[0][1] as Record<string, unknown>

const renderCreation = (index?: DataSourceDetailsResponse, setError?: ReturnType<typeof vi.fn>) =>
  renderHook(() =>
    useIndexCreation({ setIsSubmitting: vi.fn(), index, setError: setError as never })
  ).result.current

describe('useIndexCreation — xWiki create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('omits the wiki key when the field is empty so the backend default applies', async () => {
    const { createIndex } = renderCreation()
    await createIndex(baseValues)

    // undefined rather than absent: JSON.stringify drops the key on the wire,
    // which is what the API contract cares about (minLength 1 when present).
    const request = vi.mocked(dataSourceStore.createKBIndexXWiki).mock.calls[0][0]
    expect(request.wiki).toBeUndefined()
    expect(JSON.parse(JSON.stringify(request))).not.toHaveProperty('wiki')
    expect(request.space).toBe('KB')
  })

  it('sends the wiki when the field is filled in', async () => {
    const { createIndex } = renderCreation()
    await createIndex({ ...baseValues, xwikiWiki: 'teamwiki' })

    expect(vi.mocked(dataSourceStore.createKBIndexXWiki).mock.calls[0][0].wiki).toBe('teamwiki')
  })

  it('omits the wiki from the health check too, matching the create request', async () => {
    const { createIndex } = renderCreation()
    await createIndex(baseValues)

    const [, , , options] = vi.mocked(dataSourceStore.healthCheckDatasource).mock.calls[0]
    expect(options).toMatchObject({ space: 'KB' })
    expect(options?.wiki).toBeUndefined()
  })
})

describe('useIndexCreation — xWiki update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends the space on update', async () => {
    const { createIndex } = renderCreation(storedIndex)
    await createIndex({ ...baseValues, isEditing: true, xwikiSpace: 'DOCS' } as FormValues)

    expect(vi.mocked(dataSourceStore.updateKBIndex).mock.calls[0][0]).toBe(INDEX_TYPES.XWIKI)
    expect(updateBody().space).toBe('DOCS')
  })

  // Omitting wiki on PUT means "keep the stored value" server-side, so clearing
  // the field must send the default explicitly or the change is silently dropped.
  it('sends the default wiki explicitly when the field is cleared', async () => {
    const { createIndex } = renderCreation(storedIndex)
    await createIndex({ ...baseValues, isEditing: true, xwikiWiki: '' } as FormValues)

    expect(updateBody().wiki).toBe('xwiki')
  })

  it('sends the entered wiki when the field is filled in', async () => {
    const { createIndex } = renderCreation(storedIndex)
    await createIndex({ ...baseValues, isEditing: true, xwikiWiki: 'teamwiki' } as FormValues)

    expect(updateBody().wiki).toBe('teamwiki')
  })
})

describe('useIndexCreation — xWiki health check field errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const respondWith = (error: Record<string, string>) => {
    vi.mocked(dataSourceStore.healthCheckDatasource).mockResolvedValueOnce({
      implemented: true,
      error,
    })
  }

  it('does not create the datasource while a health check error is outstanding', async () => {
    respondWith({ field_error: 'url', message: 'Connection failed' })

    const { createIndex } = renderCreation(undefined, vi.fn())
    await createIndex(baseValues)

    expect(dataSourceStore.createKBIndexXWiki).not.toHaveBeenCalled()
  })

  // Reviewer asked to assert that a backend field_error of 'space' reaches
  // xwikiSpace. It does not, and this test pins why: ab912895e removed the
  // xWiki field-error map, so the hook forwards the backend field name verbatim
  // to setError ('space', not the form's 'xwikiSpace') and with a placeholder
  // ' ' rather than the backend text. The human-readable message travels
  // separately, via healthCheckResult -> HealthCheckMessage banner.
  it('forwards the raw backend field name to setError and surfaces the message via the banner, not on xwikiSpace', async () => {
    respondWith({
      field_error: 'space',
      message: 'Space "KB" was not found',
      help: 'Check the space key',
    })

    const setError = vi.fn()
    const { result } = renderHook(() =>
      useIndexCreation({ setIsSubmitting: vi.fn(), index: undefined, setError: setError as never })
    )

    await act(async () => {
      await result.current.createIndex(baseValues)
    })

    // Raw backend field name, not remapped to the form field 'xwikiSpace',
    // and a placeholder message rather than the backend text.
    expect(setError).toHaveBeenCalledWith('space', { message: ' ' })
    expect(setError).not.toHaveBeenCalledWith('xwikiSpace', expect.anything())

    // The message the user actually sees comes through the banner's data source.
    expect(result.current.healthCheckResult).toMatchObject({
      error: { message: 'Space "KB" was not found', help: 'Check the space key' },
    })

    // A field error still blocks creation.
    expect(dataSourceStore.createKBIndexXWiki).not.toHaveBeenCalled()
  })
})
