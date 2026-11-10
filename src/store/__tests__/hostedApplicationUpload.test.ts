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

import {
  HOSTED_DEFAULT_UPLOAD_LIMITS,
  clearHostedUploads,
  hostedArtifactKind,
  hostedArtifactPath,
  hostedProtocolHeaders,
  hostedUploadLimits,
  resumeHostedUpload,
  uploadHostedArtifact,
} from '@/store/utils/hostedApplicationUpload'

const boundary = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), putBinary: vi.fn() }))
vi.mock('@/utils/api', () => ({ default: boundary }))

const MiB = 1024 * 1024
const appId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const versionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const response = (value: unknown) => new Response(JSON.stringify(value))
const version = (state: string, expectedBytes = 3) => ({
  id: versionId,
  filename: 'visual.html',
  expected_bytes: expectedBytes,
  validation_state: 'uploading',
  etag: 'version:1',
  upload: {
    state,
    received_bytes: state === 'stored' ? expectedBytes : 0,
    upload_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    generation: 2,
    etag: '"upload:1"',
    sha256: state === 'stored' ? 'a'.repeat(64) : null,
    can_reset: false,
  },
})

beforeEach(() => {
  Object.values(boundary).forEach((mock) => mock.mockReset())
  clearHostedUploads()
})
afterEach(clearHostedUploads)

describe('hostedUploadLimits', () => {
  it('uses the limits published in the capabilities', () => {
    expect(hostedUploadLimits({ limits: { html_bytes: 5 * MiB, zip_bytes: 250 * MiB } })).toEqual({
      htmlBytes: 5 * MiB,
      zipBytes: 250 * MiB,
    })
  })

  it.each([
    ['no capabilities', null],
    ['capabilities without limits', {}],
    ['unusable values', { limits: { html_bytes: 0, zip_bytes: Number.NaN } }],
    ['negative values', { limits: { html_bytes: -1, zip_bytes: -1 } }],
  ])('falls back to 20 MiB / 100 MiB for %s', (_case, capabilities) => {
    expect(hostedUploadLimits(capabilities)).toEqual({ htmlBytes: 20 * MiB, zipBytes: 100 * MiB })
    expect(hostedUploadLimits(capabilities)).toEqual(HOSTED_DEFAULT_UPLOAD_LIMITS)
  })
})

describe('hostedArtifactKind', () => {
  it.each([
    ['index.html', 'html'],
    ['INDEX.HTM', 'html'],
    ['site.ZIP', 'zip'],
    ['server.js', null],
    ['archive.zip.exe', null],
  ])('classifies %s as %s', (name, kind) => {
    expect(hostedArtifactKind(name)).toBe(kind)
  })
})

describe('hostedProtocolHeaders', () => {
  it('allows the hosted concurrency and idempotency headers', () => {
    const headers = { 'If-Match': '"app:1"', 'Idempotency-Key': 'key', 'X-Upload-Generation': '1' }
    expect(hostedProtocolHeaders(headers)).toBe(headers)
  })

  it.each<Record<string, string>>([
    { 'X-Request-Id': 'abc' },
    { Authorization: 'Bearer x' },
    { 'If-Match': 'x'.repeat(4097) },
  ])('refuses anything else or an oversized value: %o', (headers) => {
    expect(() => hostedProtocolHeaders(headers)).toThrow('Unsupported request header')
  })
})

describe('hostedArtifactPath', () => {
  it('is the version artifact endpoint of the application', () => {
    expect(hostedArtifactPath(appId, versionId)).toBe(
      `v1/hosted-applications/${appId}/versions/${versionId}/artifact`
    )
  })

  it.each([
    ['another application path', '../another', versionId],
    ['an absolute URL', 'https://attacker.test/file', versionId],
    ['a query string', appId, versionId + '?redirect=evil'],
    ['an upper-case identifier', appId.toUpperCase(), versionId],
  ])('refuses %s', (_case, application, version) => {
    expect(() => hostedArtifactPath(application, version)).toThrow('Invalid artifact upload path')
  })
})

describe('resumeHostedUpload', () => {
  it('sends the bytes only to the version artifact endpoint with its protocol headers', async () => {
    const created = version('created')
    const stored = version('stored')
    boundary.get
      .mockResolvedValueOnce(response(created))
      .mockResolvedValueOnce(response(stored))
      .mockResolvedValue(response({ ...stored, validation_state: 'queued' }))
    boundary.putBinary.mockResolvedValue(response({}))
    boundary.post.mockResolvedValue(response({}))
    const file = new File(['abc'], 'visual.html')

    await resumeHostedUpload(appId, created as never, file, new AbortController().signal, () => {})

    expect(boundary.putBinary).toHaveBeenCalledOnce()
    const [url, body, options] = boundary.putBinary.mock.calls[0]
    expect(url).toBe(hostedArtifactPath(appId, versionId))
    expect(body).toBe(file)
    expect(options.headers).toEqual({ 'If-Match': '"upload:1"', 'X-Upload-Generation': '2' })
  })

  it('never hashes a reselected file above the published limits', async () => {
    const stored = version('stored', 4096)
    boundary.get.mockResolvedValue(response(stored))
    const arrayBuffer = vi.fn()
    const file = { name: 'visual.html', size: 4096, arrayBuffer } as unknown as File

    await expect(
      resumeHostedUpload(appId, stored as never, file, new AbortController().signal, () => {}, {
        limits: { htmlBytes: 1024, zipBytes: 2048 },
      })
    ).rejects.toThrow('Artifact exceeds the upload limit.')
    expect(arrayBuffer).not.toHaveBeenCalled()
    expect(boundary.post).not.toHaveBeenCalled()
  })
})

describe('upload recovery messages', () => {
  it.each(['expired', 'canceled'])(
    'tells the user to start over when the transfer is %s and cannot be reset',
    async (state) => {
      const stale = version(state)
      boundary.get.mockResolvedValue(response(stale))
      const file = new File(['abc'], 'visual.html')
      await expect(
        resumeHostedUpload(appId, stale as never, file, new AbortController().signal, () => {})
      ).rejects.toThrow('This upload expired. Cancel the version and upload again.')
      expect(boundary.putBinary).not.toHaveBeenCalled()
    }
  )

  it('still asks to wait while a transfer is stopping', async () => {
    const receiving = version('receiving')
    boundary.get.mockResolvedValue(response(receiving))
    const file = new File(['abc'], 'visual.html')
    await expect(
      resumeHostedUpload(appId, receiving as never, file, new AbortController().signal, () => {})
    ).rejects.toThrow('The previous transfer is still stopping.')
  })

  it('asks for a reload instead of starting an upload without the application etag', async () => {
    const file = new File(['abc'], 'visual.html')
    await expect(
      uploadHostedArtifact(
        { id: appId } as never,
        file,
        'static',
        new AbortController().signal,
        () => {}
      )
    ).rejects.toThrow('Reload the current application before saving changes.')
    expect(boundary.post).not.toHaveBeenCalled()
  })
})
