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

import { filesStore } from '@/store/files'
import api from '@/utils/api'

// setupTests.unit.ts already mocks @/utils/api globally — api.get/post/etc are
// vi.fn(), but downloadFileStream is bound to the real implementation. We spy
// on the shared mock object so both the test and filesStore.ts see the same spy.

describe('filesStore.downloadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls downloadFileStream when fileId is a UUID', async () => {
    const downloadSpy = vi.spyOn(api, 'downloadFileStream').mockResolvedValue(true)

    await filesStore.downloadFile('a1b2c3d4-e5f6-7890-abcd-ef1234567890')

    expect(downloadSpy).toHaveBeenCalledWith('v1/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    expect(api.get).not.toHaveBeenCalled()
  })

  it('uses the anchor approach when fileId is base64-encoded with a decodable name', async () => {
    // legacy format: mimeType_user_originalFileName encoded as base64
    const encoded = btoa('application/xlsx_user_report.xlsx')
    vi.mocked(api.get).mockResolvedValueOnce({
      blob: async () => new Blob(['data'], { type: 'application/xlsx' }),
    } as any)
    const downloadSpy = vi.spyOn(api, 'downloadFileStream')

    await filesStore.downloadFile(encoded)

    expect(api.get).toHaveBeenCalledWith(`v1/files/${encoded}`)
    expect(downloadSpy).not.toHaveBeenCalled()
  })

  it('calls downloadFileStream with the full URL when fileId is a UUID with a share_token query', async () => {
    const downloadSpy = vi.spyOn(api, 'downloadFileStream').mockResolvedValue(true)
    const fileUrl = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890?share_token=abc123'

    await filesStore.downloadFile(fileUrl)

    expect(downloadSpy).toHaveBeenCalledWith(`v1/files/${fileUrl}`)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('uses the anchor approach with the full URL when fileId is base64-encoded with a share_token query', async () => {
    const encoded = btoa('application/xlsx_user_report.xlsx')
    const fileUrl = `${encoded}?share_token=abc123`
    vi.mocked(api.get).mockResolvedValueOnce({
      blob: async () => new Blob(['data'], { type: 'application/xlsx' }),
    } as any)
    const downloadSpy = vi.spyOn(api, 'downloadFileStream')

    await filesStore.downloadFile(fileUrl)

    expect(api.get).toHaveBeenCalledWith(`v1/files/${fileUrl}`)
    expect(downloadSpy).not.toHaveBeenCalled()
  })
})

describe('filesStore.getMermaidFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    filesStore.clearMermaidCache()
  })

  const mockDiagramResponse = (fileUrl: string) => {
    vi.mocked(api.post).mockResolvedValueOnce({
      json: async () => ({ file_url: fileUrl }),
    } as any)
    vi.mocked(api.get).mockResolvedValueOnce({
      text: async () => '<svg>diagram</svg>',
    } as any)
  }

  it('loads the SVG through the API client, ignoring the host in file_url', async () => {
    // Behind the standalone nginx the backend returns a URL with the wrong scheme,
    // no port and no /api prefix.
    mockDiagramResponse('https://localhost/v1/files/ABC123+def==')

    const svg = await filesStore.getMermaidFile('graph TD; A-->B')

    expect(api.get).toHaveBeenCalledWith('v1/files/ABC123+def==', { skipErrorHandling: true })
    expect(svg).toBe('<svg>diagram</svg>')
  })

  it('keeps the path when file_url carries an API root path', async () => {
    mockDiagramResponse('https://codemie.example.com/code-assistant-api/v1/files/XYZ')

    await filesStore.getMermaidFile('graph TD; C-->D')

    expect(api.get).toHaveBeenCalledWith('v1/files/XYZ', { skipErrorHandling: true })
  })

  it('falls back to fetching file_url directly when it has no /v1/files/ segment', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      json: async () => ({ file_url: 'https://cdn.example.com/diagram.svg' }),
    } as any)
    // The global api mock has no authHeaders; stub it for the direct-fetch path.
    ;(api as any).authHeaders = vi.fn().mockReturnValue({ Authorization: 'Bearer test' })
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ text: async () => '<svg>external</svg>' } as any)

    const svg = await filesStore.getMermaidFile('graph TD; G-->H')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cdn.example.com/diagram.svg',
      expect.objectContaining({ credentials: 'include' })
    )
    expect(api.get).not.toHaveBeenCalled()
    expect(svg).toBe('<svg>external</svg>')
    fetchSpy.mockRestore()
  })

  it('returns the cached SVG without new requests for the same code', async () => {
    mockDiagramResponse('https://localhost/v1/files/CACHED')

    await filesStore.getMermaidFile('graph TD; E-->F')
    const second = await filesStore.getMermaidFile('graph TD; E-->F')

    expect(second).toBe('<svg>diagram</svg>')
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledTimes(1)
  })
})
