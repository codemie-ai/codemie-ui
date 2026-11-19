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

// Covers the Content-Type carried onto the saved blob. Unlike the downloadFileStream block in
// api.test.ts, this suite does not stub `global.Response` — the blob under assertion has to be
// the one downloadFileStream actually builds, otherwise the type assertion is vacuous.

import { saveAs } from 'file-saver'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import api from '@/utils/api'

vi.mock('file-saver', () => ({ saveAs: vi.fn() }))

const mockFetch = (headers: Record<string, string> = {}) => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]))
      controller.close()
    },
  })

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    body: stream,
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null },
  })
}

const savedBlob = () => vi.mocked(saveAs).mock.calls[0][0] as Blob
const savedName = () => vi.mocked(saveAs).mock.calls[0][1]

describe('downloadFileStream — Content-Type', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gives the saved blob the response Content-Type', async () => {
    mockFetch({
      'content-type': 'text/csv',
      'content-disposition': 'attachment; filename="report.csv"',
    })

    await api.downloadFileStream('v1/files/abc')

    expect(savedBlob().type).toBe('text/csv')
    expect(savedName()).toBe('report.csv')
  })

  it('preserves the downloaded bytes', async () => {
    mockFetch({ 'content-type': 'text/csv' })

    await api.downloadFileStream('v1/files/abc')

    expect(savedBlob().size).toBe(3)
  })

  it('degrades gracefully when Content-Type is absent', async () => {
    mockFetch({ 'content-disposition': 'attachment; filename="report.csv"' })

    await expect(api.downloadFileStream('v1/files/abc')).resolves.toBe(true)

    expect(savedName()).toBe('report.csv')
    expect(savedBlob().type).toBe('')
  })

  it('falls back to the caller-supplied type when the header is absent', async () => {
    mockFetch({})

    await api.downloadFileStream('v1/index/1/export', 'text/markdown', 'notes.md')

    expect(savedBlob().type).toBe('text/markdown')
  })

  it('leaves an explicitly passed fileName untouched (existing callers)', async () => {
    mockFetch({ 'content-type': 'application/pdf' })

    await api.downloadFileStream('v1/files/abc', undefined, 'caller-chosen.pdf')

    expect(savedName()).toBe('caller-chosen.pdf')
  })
})
