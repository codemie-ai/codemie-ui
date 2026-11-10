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

import api from '@/utils/api'
import toaster from '@/utils/toaster'

// Any endpoint taking raw bytes; the client itself knows nothing about hosted applications.
const path = 'v1/files/aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa/content'

describe('binary PUT', () => {
  const originalBase = api.BASE_URL
  beforeEach(() => {
    api.BASE_URL = 'https://api.example.com'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"state":"stored"}', { status: 200 })
    )
  })
  afterEach(() => {
    api.BASE_URL = originalBase
    vi.restoreAllMocks()
  })

  const sent = () => vi.mocked(fetch).mock.calls[0]

  it('sends the bytes unchanged as octet-stream with caller headers and no redirects', async () => {
    const file = new File(['<html>Sample</html>'], 'sample.html', { type: 'text/html' })
    await api.putBinary(path, file, {
      headers: { 'If-Match': '"upload:id:1"', 'X-Upload-Generation': '1' },
    })
    const [url, options] = sent()
    expect(url).toBe(`https://api.example.com/${path}`)
    expect(options?.method).toBe('PUT')
    expect(options?.body).toBe(file)
    expect(options?.redirect).toBe('manual')
    const headers = new Headers(options?.headers)
    expect(headers.get('content-type')).toBe('application/octet-stream')
    expect(headers.get('if-match')).toBe('"upload:id:1"')
    expect(headers.get('x-upload-generation')).toBe('1')
  })

  it('lets the caller choose the content type', async () => {
    await api.putBinary(path, new Blob(['{}']), { headers: { 'Content-Type': 'application/json' } })
    expect(new Headers(sent()[1]?.headers).get('content-type')).toBe('application/json')
  })

  it('does not let a caller override the reserved identity headers', async () => {
    await expect(
      api.putBinary(path, new Blob(['x']), { headers: { Authorization: 'Bearer untrusted' } })
    ).rejects.toThrow('is managed by the API client')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reports a redirect instead of following it', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 307 }))
    await expect(api.putBinary(path, new Blob(['x']))).rejects.toThrow('redirected')
  })

  it('hands an expired single sign-on session to the session handler, as other requests do', async () => {
    const handler = vi.spyOn(api, 'redirectHandler').mockImplementation(() => undefined)
    vi.mocked(fetch).mockResolvedValue({ type: 'opaqueredirect', status: 0, ok: false } as Response)
    await expect(api.putBinary(path, new Blob(['x']))).rejects.toThrow('redirected')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('rejects with the parsed error and shows it unless the caller handles errors', async () => {
    const failure = () =>
      new Response(JSON.stringify({ error: { message: 'Precondition failed' } }), {
        status: 412,
        headers: { 'Content-Type': 'application/json' },
      })
    vi.mocked(fetch).mockResolvedValueOnce(failure()).mockResolvedValueOnce(failure())
    vi.mocked(toaster.error).mockClear()

    await expect(api.putBinary(path, new Blob(['x']))).rejects.toMatchObject({
      status: 412,
      parsedError: { message: 'Precondition failed' },
    })
    expect(toaster.error).toHaveBeenCalledOnce()

    vi.mocked(toaster.error).mockClear()
    await expect(
      api.putBinary(path, new Blob(['x']), { skipErrorHandling: true })
    ).rejects.toBeInstanceOf(Response)
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('passes the abort signal to the actual HTTP request', async () => {
    const controller = new AbortController()
    vi.mocked(fetch).mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Canceled', 'AbortError'))
          )
        })
    )
    const result = api.putBinary(path, new File(['x'], 'x.html'), { signal: controller.signal })
    controller.abort()
    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
    expect(sent()[1]?.signal).toBe(controller.signal)
  })

  it('does not start a request for a signal already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      api.putBinary(path, new File(['x'], 'x.html'), { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(fetch).not.toHaveBeenCalled()
  })
})
