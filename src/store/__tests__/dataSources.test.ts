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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { dataSourceStore } from '@/store/dataSources'
import api from '@/utils/api'
import { HttpError } from '@/utils/handleMultipartError'

const mockPutMultipart = vi.fn()
const mockToasterError = vi.fn()
const mockToasterInfo = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    postMultipart: vi.fn(),
    putMultipart: (...args: unknown[]) => mockPutMultipart(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: (...args: unknown[]) => mockToasterError(...args),
    info: (...args: unknown[]) => mockToasterInfo(...args),
    success: vi.fn(),
  },
}))

describe('dataSourceStore.updateKBIndexFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls putMultipart with correct URL including full_reindex flag', async () => {
    mockPutMultipart.mockResolvedValue({
      json: async () => ({ message: 'ok' }),
    })

    await dataSourceStore.updateKBIndexFiles({
      name: 'my-ds',
      project_name: 'my-project',
      project_space_visible: true,
      description: 'A description',
      uploadedFiles: ['existing.pdf'],
      files: [],
      fullReindex: true,
    })

    expect(mockPutMultipart).toHaveBeenCalledWith(
      expect.stringContaining('full_reindex=true'),
      expect.any(FormData)
    )
  })

  it('passes required fields as URL query params', async () => {
    mockPutMultipart.mockResolvedValue({
      json: async () => ({ message: 'updated' }),
    })

    await dataSourceStore.updateKBIndexFiles({
      name: 'my-ds',
      project_name: 'my-project',
      project_space_visible: false,
      description: 'desc',
      uploadedFiles: ['a.pdf', 'b.csv'],
      files: [],
    })

    const calledUrl: string = mockPutMultipart.mock.calls[0][0]
    const searchParams = new URLSearchParams(calledUrl.split('?')[1])
    expect(searchParams.get('name')).toBe('my-ds')
    expect(searchParams.get('project_name')).toBe('my-project')
    expect(searchParams.get('uploaded_files')).toBe('["a.pdf","b.csv"]')
  })

  it('appends new File objects to FormData', async () => {
    mockPutMultipart.mockResolvedValue({
      json: async () => ({ message: 'updated' }),
    })

    const file = new File(['content'], 'new.pdf', { type: 'application/pdf' })

    await dataSourceStore.updateKBIndexFiles({
      name: 'my-ds',
      project_name: 'my-project',
      project_space_visible: true,
      description: 'desc',
      uploadedFiles: [],
      files: [file],
    })

    const calledUrl: string = mockPutMultipart.mock.calls[0][0]
    const formData: FormData = mockPutMultipart.mock.calls[0][1]
    const searchParams = new URLSearchParams(calledUrl.split('?')[1])
    expect(searchParams.get('uploaded_files')).toBe('[]')
    expect(formData.get('files')).toBe(file)
  })

  it('passes new_project_name as URL query param when provided', async () => {
    mockPutMultipart.mockResolvedValue({
      json: async () => ({ message: 'ok' }),
    })

    await dataSourceStore.updateKBIndexFiles({
      name: 'my-ds',
      project_name: 'old-project',
      project_space_visible: true,
      description: 'desc',
      uploadedFiles: ['a.pdf'],
      files: [],
      new_project_name: 'new-project',
    })

    const calledUrl: string = mockPutMultipart.mock.calls[0][0]
    const searchParams = new URLSearchParams(calledUrl.split('?')[1])
    expect(searchParams.get('new_project_name')).toBe('new-project')
  })

  it('serializes guardrail_assignments as JSON string in URL query params', async () => {
    mockPutMultipart.mockResolvedValue({
      json: async () => ({ message: 'ok' }),
    })

    const assignments = [{ guardrail_id: 'g1', level: 'warn' }]

    await dataSourceStore.updateKBIndexFiles({
      name: 'my-ds',
      project_name: 'my-project',
      project_space_visible: true,
      description: 'desc',
      uploadedFiles: [],
      files: [],
      guardrail_assignments: assignments as any,
    })

    const calledUrl: string = mockPutMultipart.mock.calls[0][0]
    const searchParams = new URLSearchParams(calledUrl.split('?')[1])
    expect(searchParams.get('guardrail_assignments')).toBe(JSON.stringify(assignments))
  })

  it('shows toaster.info on success', async () => {
    mockPutMultipart.mockResolvedValue({
      json: async () => ({ message: 'Datasource updated' }),
    })

    await dataSourceStore.updateKBIndexFiles({
      name: 'my-ds',
      project_name: 'my-project',
      project_space_visible: true,
      description: 'desc',
      uploadedFiles: [],
      files: [],
    })

    expect(mockToasterInfo).toHaveBeenCalledWith('Datasource updated')
  })

  it('shows toaster.error when response contains error', async () => {
    mockPutMultipart.mockResolvedValue({
      json: async () => ({ error: 'Something went wrong' }),
    })

    await dataSourceStore.updateKBIndexFiles({
      name: 'my-ds',
      project_name: 'my-project',
      project_space_visible: true,
      description: 'desc',
      uploadedFiles: [],
      files: [],
    })

    expect(mockToasterError).toHaveBeenCalledWith('Something went wrong')
  })

  it('shows toaster.error when response contains detail', async () => {
    mockPutMultipart.mockResolvedValue({
      json: async () => ({ detail: 'Validation failed' }),
    })

    await dataSourceStore.updateKBIndexFiles({
      name: 'my-ds',
      project_name: 'my-project',
      project_space_visible: true,
      description: 'desc',
      uploadedFiles: [],
      files: [],
    })

    expect(mockToasterError).toHaveBeenCalledWith('Validation failed')
  })

  it('shows toaster.error when putMultipart throws', async () => {
    const mockResponse = {
      json: vi.fn().mockResolvedValue({ detail: 'Failed to update file datasource' }),
    } as unknown as Response
    mockPutMultipart.mockRejectedValue(new HttpError(mockResponse))

    await dataSourceStore.updateKBIndexFiles({
      name: 'my-ds',
      project_name: 'my-project',
      project_space_visible: true,
      description: 'desc',
      uploadedFiles: [],
      files: [],
    })

    expect(mockToasterError).toHaveBeenCalledWith('Failed to update file datasource')
  })
})

describe('dataSourceStore.getIndexesStatuses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dataSourceStore.loading = false
    dataSourceStore.indexStatuses = []
    dataSourceStore.indexStatusesPagination = {
      page: 0,
      perPage: 10,
      totalPages: 0,
      totalCount: 0,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should throw AbortError on abort', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError')
    vi.spyOn(api, 'get').mockRejectedValue(abortError)

    const controller = new AbortController()
    controller.abort()

    await expect(
      dataSourceStore.getIndexesStatuses({
        page: 0,
        filters: {},
        perPage: 10,
        sortKey: 'date',
        sortOrder: 'desc',
        isRefresh: false,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({
      name: 'AbortError',
      message: 'The operation was aborted',
    })
  })

  it('should pass signal to api.get when provided', async () => {
    const mockResponse = {
      status: 200,
      json: async () => ({
        data: [{ id: '1', repo_name: 'test' }],
        pagination: { page: 0, per_page: 10, pages: 1, total: 1 },
      }),
    }
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue(mockResponse as any)

    const controller = new AbortController()
    await dataSourceStore.getIndexesStatuses({
      page: 0,
      filters: {},
      perPage: 10,
      sortKey: 'date',
      sortOrder: 'desc',
      isRefresh: false,
      signal: controller.signal,
    })

    expect(getSpy).toHaveBeenCalledWith(
      expect.stringContaining('v1/index?page=0'),
      expect.objectContaining({ signal: controller.signal })
    )
  })

  it('should work without signal parameter (backward compatibility)', async () => {
    const mockResponse = {
      status: 200,
      json: async () => ({
        data: [{ id: '1', repo_name: 'test' }],
        pagination: { page: 0, per_page: 10, pages: 1, total: 1 },
      }),
    }
    vi.spyOn(api, 'get').mockResolvedValue(mockResponse as any)

    await dataSourceStore.getIndexesStatuses({
      page: 0,
      filters: {},
      perPage: 10,
      sortKey: 'date',
      sortOrder: 'desc',
      isRefresh: false,
    })

    expect(dataSourceStore.indexStatuses).toHaveLength(1)
    expect(dataSourceStore.loading).toBe(false)
  })
})
