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

import './reviewRegressionSetup'
import { File as NativeFile } from 'node:buffer'
import { createHash, webcrypto } from 'node:crypto'

import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import {
  clearHostedUploads,
  resumeHostedUpload,
  uploadHostedArtifact,
} from '@/store/utils/hostedApplicationUpload'

const boundary = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), putBinary: vi.fn() } }))
vi.mock('@/utils/api', () => ({ default: boundary.api }))
const appId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const versionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const app = { id: appId, etag: 'app:1' }
const file = (bytes: string) => new NativeFile([bytes], 'visual.html') as unknown as File
const digest = (bytes: string) => createHash('sha256').update(bytes).digest('hex')
const version = (state = 'stored') => ({
  id: versionId,
  filename: 'visual.html',
  expected_bytes: 3,
  validation_state: 'uploading',
  etag: 'version:1',
  upload: {
    state,
    received_bytes: state === 'stored' ? 3 : 0,
    upload_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    generation: 1,
    etag: 'upload:1',
    sha256: state === 'stored' ? digest('old') : null,
    can_reset: false,
  },
})
const response = (value: unknown) => new Response(JSON.stringify(value))
beforeEach(() => {
  vi.clearAllMocks()
  clearHostedUploads()
  vi.stubGlobal('crypto', webcrypto)
})
afterEach(() => {
  clearHostedUploads()
  vi.unstubAllGlobals()
})

async function createUnknownStoredAttempt() {
  const original = file('old')
  const created = version('created')
  const stored = version('stored')
  let completed = false
  boundary.api.post.mockImplementation(async (url: string) => {
    if (url.endsWith('/complete')) {
      completed = true
      return response({})
    }
    return response({
      version_id: versionId,
      upload_path: `v1/hosted-applications/${appId}/versions/${versionId}/artifact`,
    })
  })
  boundary.api.get.mockImplementation(async () =>
    response(
      completed
        ? {
            ...stored,
            validation_state: 'queued',
            upload: { ...stored.upload, state: 'completed' },
          }
        : stored
    )
  )
  boundary.api.get
    .mockResolvedValueOnce(response(created))
    .mockResolvedValueOnce(response(created))
    .mockRejectedValueOnce(new Error('Receipt lookup connection lost'))
  boundary.api.putBinary.mockRejectedValueOnce(new Error('PUT response connection lost'))
  await expect(
    uploadHostedArtifact(
      app as never,
      original,
      'static',
      new AbortController().signal,
      () => undefined
    )
  ).rejects.toThrow('Receipt lookup connection lost')
  return original
}

it('rejects changed bytes of the same filename and size after an unknown stored upload outcome', async () => {
  await createUnknownStoredAttempt()
  const changed = file('new')
  await expect(
    uploadHostedArtifact(
      app as never,
      changed,
      'static',
      new AbortController().signal,
      () => undefined
    )
  ).rejects.toThrow(/differs from the interrupted artifact/)
  expect(boundary.api.post.mock.calls.filter((call) => call[0].endsWith('/complete'))).toHaveLength(
    0
  )
  expect(boundary.api.putBinary).toHaveBeenCalledOnce()
})

it('allows a fresh File object with identical bytes to recover the original stored version without creating another version', async () => {
  await createUnknownStoredAttempt()
  const identical = file('old')
  const result = await uploadHostedArtifact(
    app as never,
    identical,
    'static',
    new AbortController().signal,
    () => undefined
  )
  expect(result.id).toBe(versionId)
  expect(result.validation_state).toBe('queued')
  expect(
    boundary.api.post.mock.calls.filter((call) => !call[0].endsWith('/complete'))
  ).toHaveLength(1)
  expect(boundary.api.putBinary).toHaveBeenCalledOnce()
  expect(
    boundary.api.post.mock.calls.find((call) => call[0].endsWith('/complete'))?.[1].sha256
  ).toBe(digest('old'))
})

it('blocks different chosen bytes when resuming a stored receipt even after page reload removed the in-memory attempt', async () => {
  const stored = version()
  boundary.api.get.mockResolvedValue(response(stored))
  await expect(
    resumeHostedUpload(
      appId,
      stored as never,
      file('new'),
      new AbortController().signal,
      () => undefined
    )
  ).rejects.toThrow(/differs from the stored artifact/)
  expect(boundary.api.post).not.toHaveBeenCalled()
  expect(boundary.api.putBinary).not.toHaveBeenCalled()
})

it('can queue an already stored version without reselecting a file', async () => {
  const stored = version()
  const completed = {
    ...stored,
    validation_state: 'queued',
    upload: { ...stored.upload, state: 'completed' },
  }
  boundary.api.get
    .mockResolvedValueOnce(response(stored))
    .mockResolvedValueOnce(response(completed))
  boundary.api.post.mockResolvedValue(response({}))
  const result = await resumeHostedUpload(
    appId,
    stored as never,
    null,
    new AbortController().signal,
    () => undefined
  )
  expect(result.validation_state).toBe('queued')
  expect(boundary.api.post).toHaveBeenCalledOnce()
  expect(boundary.api.putBinary).not.toHaveBeenCalled()
})

it('rejects a wrongly sized chosen file before reading its bytes for a stored receipt', async () => {
  const stored = version()
  boundary.api.get.mockResolvedValue(response(stored))
  const arrayBuffer = vi.fn().mockRejectedValue(new Error('Oversized file must not be read'))
  const oversized = { name: 'visual.html', size: 1024 ** 3, arrayBuffer } as unknown as File
  await expect(
    resumeHostedUpload(
      appId,
      stored as never,
      oversized,
      new AbortController().signal,
      () => undefined
    )
  ).rejects.toThrow()
  expect(arrayBuffer).not.toHaveBeenCalled()
  expect(boundary.api.post).not.toHaveBeenCalled()
})

it('keeps transfer indeterminate after PUT resolves until the server receipt confirms accepted bytes', async () => {
  const created = version('created')
  const stored = version()
  const queued = {
    ...stored,
    validation_state: 'queued',
    upload: { ...stored.upload, state: 'completed' },
  }
  let finishReceipt: (value: Response) => void = () => undefined
  let putFinished: () => void = () => undefined
  const putObserved = new Promise<void>((resolve) => {
    putFinished = resolve
  })
  boundary.api.get
    .mockResolvedValueOnce(response(created))
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finishReceipt = resolve
      })
    )
    .mockResolvedValueOnce(response(queued))
  boundary.api.putBinary.mockImplementation(async () => {
    putFinished()
    return response({})
  })
  boundary.api.post.mockResolvedValue(response({}))
  const progress = vi.fn()
  const pending = resumeHostedUpload(
    appId,
    created as never,
    file('old'),
    new AbortController().signal,
    () => undefined,
    { onProgress: progress }
  )
  await putObserved
  // API success alone does not mean a durable, verified upload receipt was observed.
  expect(progress.mock.calls.map((call) => call[0])).toEqual([{ total: 3, confirmed: 0 }])
  finishReceipt(response(stored))
  await pending
  expect(progress.mock.calls.map((call) => call[0])).toEqual([
    { total: 3, confirmed: 0 },
    { total: 3, confirmed: 3 },
  ])
})

it('does not emit confirmed bytes from a late receipt after the authentication guard invalidates', async () => {
  const created = version('created')
  const stored = version()
  let finishReceipt: (value: Response) => void = () => undefined
  let putFinished: () => void = () => undefined
  let current = true
  const putObserved = new Promise<void>((resolve) => {
    putFinished = resolve
  })
  boundary.api.get
    .mockResolvedValueOnce(response(created))
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finishReceipt = resolve
      })
    )
    .mockResolvedValue(response(stored))
  boundary.api.putBinary.mockImplementation(async () => {
    putFinished()
    return response({})
  })
  const progress = vi.fn()
  const guard = () => {
    if (!current) throw new DOMException('Authentication changed', 'AbortError')
  }
  const pending = resumeHostedUpload(
    appId,
    created as never,
    file('old'),
    new AbortController().signal,
    guard,
    { onProgress: progress }
  )
  await putObserved
  current = false
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  finishReceipt(response(stored))
  await rejected
  expect(progress.mock.calls.map((call) => call[0])).toEqual([{ total: 3, confirmed: 0 }])
  expect(boundary.api.post).not.toHaveBeenCalled()
})
