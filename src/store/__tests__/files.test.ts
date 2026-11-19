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

import { getArtifactLink } from '@/components/markdown/artifactLink'
import { filesStore } from '@/store/files'
import api, { artifactFileName } from '@/utils/api'
import toaster from '@/utils/toaster'

// setupTests.unit.ts already mocks @/utils/api globally — api.get/post/etc are
// vi.fn(), but downloadFileStream is bound to the real implementation. We spy
// on the shared mock object so both the test and filesStore.ts see the same spy.
// postMultipart isn't part of that global mock, so uploadWorkflowIcon's own
// describe block below adds it locally for this file only.
vi.mock('@/utils/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/utils/api')>()
  return {
    ...mod,
    default: {
      ...mod.default,
      get: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve([]) }),
      post: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      put: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      delete: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      patch: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      postMultipart: vi.fn(),
      handleError: mod.default.handleError,
      downloadFileStream: mod.default.downloadFileStream.bind(mod.default),
    },
  }
})

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

  it('strips the storage uuid prefix from the saved file name, not from the request id', async () => {
    // The id the back end actually emits: base64 of the `<len>~<value>` triple
    // `[mime_type, owner, name]`. The legacy `_`-joined form would shatter a
    // `{uuid}_name` on its underscores and never reproduce the bug.
    const UUID = '3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'
    const part = (value: string) => `${value.length}~${value}`
    const fileId = btoa(part('application/xlsx') + part(UUID) + part(`${UUID}_report.xlsx`))
    vi.mocked(api.get).mockResolvedValueOnce({
      blob: async () => new Blob(['data'], { type: 'application/xlsx' }),
    } as any)
    const anchor = document.createElement('a')
    anchor.click = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    await filesStore.downloadFile(fileId)

    expect(anchor.download).toBe('report.xlsx')
    expect(api.get).toHaveBeenCalledWith(`v1/files/${fileId}`)
  })

  it('sanitizes the saved file name the same way the chip label is sanitized', async () => {
    // Acceptance criterion 8: the chip and the saved file must agree. `artifactLink`
    // runs artifactFileName(name); the download anchor must match.
    const UUID = '3f1a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'
    const part = (value: string) => `${value.length}~${value}`
    const decodedName = `${UUID}_../etc/passwd.txt`
    const fileId = btoa(part('text/plain') + part(UUID) + part(decodedName))
    vi.mocked(api.get).mockResolvedValueOnce({
      blob: async () => new Blob(['data'], { type: 'text/plain' }),
    } as any)
    const anchor = document.createElement('a')
    anchor.click = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    await filesStore.downloadFile(fileId)

    expect(anchor.download).toBe(artifactFileName(decodedName))
    expect(anchor.download).toBe('pas_swd.txt')
    expect(api.get).toHaveBeenCalledWith(`v1/files/${fileId}`)
  })

  const encodedName = (name: string) => {
    const part = (value: string) => `${value.length}~${value}`
    return btoa(part('text/csv') + part('owner') + part(name))
  }

  const downloadAnchorFor = async (name: string) => {
    const fileId = encodedName(name)
    vi.mocked(api.get).mockResolvedValueOnce({
      blob: async () => new Blob(['data'], { type: 'text/csv' }),
    } as any)
    const anchor = document.createElement('a')
    anchor.click = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    await filesStore.downloadFile(fileId)

    expect(api.get).toHaveBeenCalledWith(`v1/files/${fileId}`)
    return anchor
  }

  it('saves a workspace artifact under the last segment of its path (D1)', async () => {
    const anchor = await downloadAnchorFor('artifacts/t1/closed_positions_analysis.xlsx')

    expect(anchor.download).toBe('closed_positions_analysis.xlsx')
  })

  it('saves a renamed duplicate workspace artifact under its own name', async () => {
    const anchor = await downloadAnchorFor('artifacts/t1/report (2).csv')

    expect(anchor.download).toBe('report (2).csv')
  })

  // The chip label (getArtifactLink) and the saved file (downloadFile) must agree, not just
  // each match an expected value.
  it.each(['artifacts/t1/closed_positions_analysis.xlsx', 'artifacts/t1/report (2).csv'])(
    'labels the chip and saves the file %j under the same name',
    async (name) => {
      const href = `${api.BASE_URL}/v1/files/${encodedName(name)}`
      const chip = getArtifactLink({ type: 'link', raw: href, href } as any)
      const anchor = await downloadAnchorFor(name)

      expect(chip?.fileName).toBe(anchor.download)
    }
  )

  it('falls back to "download" for a workspace path with no file name', async () => {
    const anchor = await downloadAnchorFor('artifacts/t1/')

    expect(anchor.download).toBe('download')
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

describe('filesStore.uploadWorkflowIcon', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts a single-file FormData under the "file" key and resolves to the bare file token', async () => {
    vi.mocked(api.postMultipart).mockResolvedValue({
      json: () => Promise.resolve({ file_url: 'MTB+aW1h' }),
    } as any)
    const file = new File(['data'], 'icon.png', { type: 'image/png' })

    const result = await filesStore.uploadWorkflowIcon(file)

    expect(api.postMultipart).toHaveBeenCalledWith('v1/workflows/icon', expect.any(FormData))
    const [, body] = vi.mocked(api.postMultipart).mock.calls[0]
    expect((body as FormData).get('file')).toBe(file)
    expect((body as FormData).get('files')).toBeNull()
    expect(result).toBe('MTB+aW1h')
  })

  it('shows the backend details alone when the error has no message', async () => {
    vi.mocked(api.postMultipart).mockRejectedValue({
      message: 'HTTP error 400',
      parsedError: { details: 'Allowed types: image/png' },
    })
    const file = new File(['data'], 'icon.gif', { type: 'image/gif' })

    await expect(filesStore.uploadWorkflowIcon(file)).rejects.toThrow('Allowed types: image/png')
    await expect(filesStore.uploadWorkflowIcon(file)).rejects.not.toThrow('undefined')
  })

  it('falls back to the transport message when the error carries no backend body', async () => {
    vi.mocked(api.postMultipart).mockRejectedValue({ message: 'Request failed' })
    const file = new File(['data'], 'icon.png', { type: 'image/png' })

    await expect(filesStore.uploadWorkflowIcon(file)).rejects.toThrow('Request failed')
    expect(toaster.error).toHaveBeenCalled()
  })

  it('surfaces an error and does not resolve when file_url is missing from the response', async () => {
    vi.mocked(api.postMultipart).mockResolvedValue({
      json: () => Promise.resolve({}),
    } as any)
    const file = new File(['data'], 'icon.png', { type: 'image/png' })

    await expect(filesStore.uploadWorkflowIcon(file)).rejects.toThrow('uploading file')
    expect(toaster.error).toHaveBeenCalled()
  })

  it('surfaces the backend detail via toaster.error and rethrows on failure', async () => {
    const error = {
      message: 'HTTP error 400',
      parsedError: { message: 'Unsupported icon file type', details: 'Allowed types: image/png' },
    }
    vi.mocked(api.postMultipart).mockRejectedValue(error)
    const file = new File(['data'], 'icon.exe', { type: 'application/octet-stream' })

    await expect(filesStore.uploadWorkflowIcon(file)).rejects.toThrow('Unsupported icon file type')
    expect(toaster.error).toHaveBeenCalledWith(
      expect.stringContaining('Unsupported icon file type')
    )
  })
})
