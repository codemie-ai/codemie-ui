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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { filesStore } from '@/store/files'
import { resolveIconUrl } from '@/utils/iconUrl'

import { useFileUpload } from '../useFileUpload'

vi.mock('@/store/files', () => ({
  filesStore: {
    pendingIconUploads: 0,
    uploadFiles: vi.fn(),
    getFileURL: vi.fn(),
  },
}))

const createMockImageFile = () => new File(['data'], 'icon.png', { type: 'image/png' })

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the injected uploadFile and passes its resolved URL straight to onChange', async () => {
    const uploadFile = vi.fn().mockResolvedValue('https://cdn.example.com/icon.png')
    const onChange = vi.fn()
    const { result } = renderHook(() => useFileUpload({ maxSizeMB: 0.5, onChange, uploadFile }))

    await act(async () => {
      await result.current.handleFileUpload(createMockImageFile())
    })

    expect(uploadFile).toHaveBeenCalledWith(expect.any(File))
    expect(filesStore.uploadFiles).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/icon.png')
  })

  it('registers a local preview of an injected upload so it renders before the server can serve the file', async () => {
    const uploadFile = vi.fn().mockResolvedValue('MTB+aW1h')
    const { result } = renderHook(() =>
      useFileUpload({ maxSizeMB: 0.5, onChange: vi.fn(), uploadFile })
    )

    await act(async () => {
      await result.current.handleFileUpload(createMockImageFile())
    })

    expect(resolveIconUrl('MTB+aW1h')).toBe('data:image/png;base64,ZGF0YQ==')
  })

  it('shows an error when the upload returns no file URL instead of clearing the loader silently', async () => {
    const uploadFile = vi.fn().mockResolvedValue('')
    const onChange = vi.fn()
    const { result } = renderHook(() => useFileUpload({ maxSizeMB: 0.5, onChange, uploadFile }))

    await act(async () => {
      await result.current.handleFileUpload(createMockImageFile())
    })

    expect(onChange).not.toHaveBeenCalled()
    expect(result.current.uploadError).toBe('upload returned no file URL')
  })

  it('gives up on an upload that never settles and frees the uploader', async () => {
    vi.useFakeTimers()
    const uploadFile = vi.fn(() => new Promise<string>(() => {}))
    const { result } = renderHook(() =>
      useFileUpload({ maxSizeMB: 0.5, onChange: vi.fn(), uploadFile })
    )

    await act(async () => {
      const pending = result.current.handleFileUpload(createMockImageFile())
      vi.advanceTimersByTime(60_001)
      await pending
    })

    expect(result.current.isUploading).toBe(false)
    expect(result.current.uploadError).toBe('The upload timed out. Try again.')
    vi.useRealTimers()
  })

  it('counts a workflow icon upload as pending until it finishes', async () => {
    let finish: (url: string) => void = () => {}
    const uploadFile = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve
        })
    )
    const { result } = renderHook(() =>
      useFileUpload({ maxSizeMB: 0.5, onChange: vi.fn(), uploadFile })
    )

    let pending: Promise<void> = Promise.resolve()
    await act(async () => {
      pending = result.current.handleFileUpload(createMockImageFile())
    })
    expect(filesStore.pendingIconUploads).toBe(1)

    await act(async () => {
      finish('MTB+ZG9uZQ==')
      await pending
    })
    expect(filesStore.pendingIconUploads).toBe(0)
  })

  it('ignores a second file while an upload is still in flight', async () => {
    const uploadFile = vi.fn().mockResolvedValue('MTB+Zmlyc3Q=')
    const { result } = renderHook(() =>
      useFileUpload({ maxSizeMB: 0.5, onChange: vi.fn(), uploadFile })
    )

    await act(async () => {
      const first = result.current.handleFileUpload(createMockImageFile())
      const second = result.current.handleFileUpload(createMockImageFile())
      await Promise.all([first, second])
    })

    expect(uploadFile).toHaveBeenCalledTimes(1)
  })

  it('accepts a workflow icon whose browser reports a generic MIME type, by its extension', async () => {
    const uploadFile = vi.fn().mockResolvedValue('MTB+Z2lm')
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useFileUpload({
        maxSizeMB: 0.5,
        onChange,
        uploadFile,
        accept: 'image/png,image/jpeg,image/webp,image/gif',
      })
    )

    await act(async () => {
      await result.current.handleFileUpload(
        new File(['x'], 'icon.gif', { type: 'application/octet-stream' })
      )
    })

    expect(onChange).toHaveBeenCalledWith('MTB+Z2lm')
  })

  it('accepts a workflow icon whose browser reports no MIME type, by its extension', async () => {
    const uploadFile = vi.fn().mockResolvedValue('MTB+d2VicA==')
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useFileUpload({
        maxSizeMB: 0.5,
        onChange,
        uploadFile,
        accept: 'image/png,image/jpeg,image/webp,image/gif',
      })
    )

    await act(async () => {
      await result.current.handleFileUpload(new File(['x'], 'icon.webp', { type: '' }))
    })

    expect(uploadFile).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('MTB+d2VicA==')
  })

  it('rejects a dropped file whose type is outside the accept list, before uploading', async () => {
    const uploadFile = vi.fn()
    const svg = new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' })
    const { result } = renderHook(() =>
      useFileUpload({
        maxSizeMB: 0.5,
        onChange: vi.fn(),
        uploadFile,
        accept: 'image/png,image/jpeg,image/webp,image/gif',
      })
    )

    await act(async () => {
      await result.current.handleFileUpload(svg)
    })

    expect(uploadFile).not.toHaveBeenCalled()
    expect(result.current.uploadError).toBe(
      'Your logo cannot be uploaded. Make sure it meets the requirements and try again.'
    )
  })

  it('shows the injected uploadFile error message so the user sees why the upload was rejected', async () => {
    const uploadFile = vi
      .fn()
      .mockRejectedValue(
        new Error('An error occured while uploading file: Unsupported icon file type')
      )
    const { result } = renderHook(() =>
      useFileUpload({ maxSizeMB: 0.5, onChange: vi.fn(), uploadFile })
    )

    await act(async () => {
      await result.current.handleFileUpload(createMockImageFile())
    })

    expect(result.current.uploadError).toBe(
      'An error occured while uploading file: Unsupported icon file type'
    )
  })

  it('keeps the assistant path silent when the upload returns no URL (AC8 regression guard)', async () => {
    vi.mocked(filesStore.uploadFiles).mockResolvedValue({ files: [], failed_files: null })
    const onChange = vi.fn()
    const { result } = renderHook(() => useFileUpload({ maxSizeMB: 0.5, onChange }))

    await act(async () => {
      await result.current.handleFileUpload(createMockImageFile())
    })

    expect(onChange).not.toHaveBeenCalled()
    expect(result.current.uploadError).toBe('')
  })

  it('defaults to filesStore.uploadFiles + getFileURL when no uploadFile is given (AC8 regression guard)', async () => {
    vi.mocked(filesStore.uploadFiles).mockResolvedValue({
      files: [{ file_url: 'abc123' }],
      failed_files: null,
    })
    vi.mocked(filesStore.getFileURL).mockReturnValue('https://cdn.example.com/v1/files/abc123')
    const onChange = vi.fn()
    const { result } = renderHook(() => useFileUpload({ maxSizeMB: 0.5, onChange }))

    await act(async () => {
      await result.current.handleFileUpload(createMockImageFile())
    })

    expect(filesStore.uploadFiles).toHaveBeenCalledWith([expect.any(File)])
    expect(filesStore.getFileURL).toHaveBeenCalledWith('abc123')
    expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/v1/files/abc123')
  })
})
