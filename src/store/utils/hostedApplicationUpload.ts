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
import {
  HostedUserError,
  type HostedApplication,
  type HostedVersion,
  type HostedUpload,
} from '@/types/entity/hostedApplication'
import api from '@/utils/api'
import { HOSTED_UUID } from '@/utils/hostedApplicationLaunch'

const MEBIBYTE = 1024 * 1024
const ROOT = 'v1/hosted-applications'

export interface HostedUploadLimits {
  htmlBytes: number
  zipBytes: number
}

/** Used only until the server publishes `capabilities.limits` (or when a value is unusable). */
export const HOSTED_DEFAULT_UPLOAD_LIMITS: Readonly<HostedUploadLimits> = Object.freeze({
  htmlBytes: 20 * MEBIBYTE,
  zipBytes: 100 * MEBIBYTE,
})

type HostedLimitsSource =
  | { limits?: { html_bytes?: number | null; zip_bytes?: number | null } | null }
  | null
  | undefined

const positiveOr = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback

/** Upload size limits published in the hosting capabilities, with safe fallbacks. */
export function hostedUploadLimits(capabilities: HostedLimitsSource): HostedUploadLimits {
  return {
    htmlBytes: positiveOr(capabilities?.limits?.html_bytes, HOSTED_DEFAULT_UPLOAD_LIMITS.htmlBytes),
    zipBytes: positiveOr(capabilities?.limits?.zip_bytes, HOSTED_DEFAULT_UPLOAD_LIMITS.zipBytes),
  }
}

/** The artifact kind implied by a file name, or `null` for an unsupported file. */
export function hostedArtifactKind(fileName: string): 'html' | 'zip' | null {
  if (/\.zip$/i.test(fileName)) return 'zip'
  if (/\.html?$/i.test(fileName)) return 'html'
  return null
}

// Hosted calls only ever send these concurrency/idempotency headers, built from server ETags and
// generated keys. Anything else, or an oversized value, is refused before it reaches the API client.
const PROTOCOL_HEADERS = new Set(['if-match', 'idempotency-key', 'x-upload-generation'])
const MAX_PROTOCOL_HEADER_LENGTH = 4096

export function hostedProtocolHeaders(headers: Record<string, string>): Record<string, string> {
  Object.entries(headers).forEach(([name, value]) => {
    if (!PROTOCOL_HEADERS.has(name.toLowerCase()) || value.length > MAX_PROTOCOL_HEADER_LENGTH)
      throw new Error('Unsupported request header')
  })
  return headers
}

export type HostedTransferProgress = { total: number; confirmed: number }
export type HostedProgressListener = (progress: HostedTransferProgress) => void
type Attempt = {
  file: File
  routing: string
  beginKey: string
  completeKey: string
  etag: string
  staged?: HostedUpload
  busy: boolean
}
const attempts = new Map<string, Attempt>()
export const clearHostedUploads = () => attempts.clear()
export function discardHostedUpload(appId: string, versionId?: string) {
  const attempt = attempts.get(appId)
  if (!versionId || attempt?.staged?.version_id === versionId) attempts.delete(appId)
}
const headers = (etag: string, key: string) => ({
  skipErrorHandling: true,
  headers: hostedProtocolHeaders({ 'If-Match': etag, 'Idempotency-Key': key }),
})
const path = (appId: string, versionId?: string) => {
  if (!HOSTED_UUID.test(appId) || (versionId && !HOSTED_UUID.test(versionId)))
    throw new Error('Invalid application version')
  return ROOT + '/' + appId + '/versions' + (versionId ? '/' + versionId : '')
}

/** The only destination artifact bytes are ever sent to: the version's own artifact endpoint. */
export function hostedArtifactPath(appId: string, versionId: string): string {
  if (!HOSTED_UUID.test(appId) || !HOSTED_UUID.test(versionId))
    throw new Error('Invalid artifact upload path')
  return `${ROOT}/${appId}/versions/${versionId}/artifact`
}

async function fingerprint(file: File, limits: HostedUploadLimits) {
  // Hashing reads the whole file into memory; never do that for more than the server accepts.
  if (file.size > Math.max(limits.htmlBytes, limits.zipBytes))
    throw new HostedUserError('Artifact exceeds the upload limit.')
  const bytes = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
async function verifyStoredFile(
  file: File | null,
  receipt: string | null | undefined,
  guard: () => void,
  signal: AbortSignal,
  expectedSize: number,
  limits: HostedUploadLimits
) {
  if (file && file.size !== expectedSize)
    throw new HostedUserError('Reselect the original file with the same name and size.')
  if (file && receipt && (await fingerprint(file, limits)) !== receipt)
    throw new HostedUserError(
      'This file differs from the stored artifact. Complete that version, then upload the changed file as a new version.'
    )
  guard()
  if (signal.aborted) throw new DOMException('Canceled', 'AbortError')
}
async function verifyReselection(
  attempt: Attempt,
  file: File,
  guard: () => void,
  signal: AbortSignal,
  limits: HostedUploadLimits
) {
  if (
    attempt.file !== file &&
    (await fingerprint(attempt.file, limits)) !== (await fingerprint(file, limits))
  )
    throw new HostedUserError(
      'This file differs from the interrupted artifact. Manage the existing version before uploading changed bytes.'
    )
  guard()
  if (signal.aborted) throw new DOMException('Canceled', 'AbortError')
}
async function json(response: Promise<Response>, guard: () => void) {
  const body = await (await response).json()
  guard()
  return body
}
export async function completeHostedUpload(
  appId: string,
  version: HostedVersion,
  guard: () => void,
  key: string | undefined,
  signal?: AbortSignal
) {
  if (version.upload.state === 'completed' || version.validation_state !== 'uploading') {
    discardHostedUpload(appId, version.id)
    return version
  }
  if (version.upload.state !== 'stored' || !version.upload.sha256)
    throw new HostedUserError('Wait for the upload receipt before validation.')
  try {
    await api.post(
      path(appId, version.id) + '/complete',
      {
        upload_id: version.upload.upload_id,
        generation: version.upload.generation,
        sha256: version.upload.sha256,
      },
      { ...headers(version.etag, key ?? crypto.randomUUID()), signal }
    )
    guard()
  } catch (error) {
    if (signal?.aborted) throw error
    const current: HostedVersion = await json(
      api.get(path(appId, version.id), { skipErrorHandling: true, signal }),
      guard
    )
    if (current.upload.state !== 'completed') throw error
    discardHostedUpload(appId, version.id)
    return current
  }
  discardHostedUpload(appId, version.id)
  return json(api.get(path(appId, version.id), { skipErrorHandling: true, signal }), guard)
}
export async function resumeHostedUpload(
  appId: string,
  version: HostedVersion,
  file: File | null,
  signal: AbortSignal,
  guard: () => void,
  {
    completeKey,
    onProgress,
    limits = HOSTED_DEFAULT_UPLOAD_LIMITS,
  }: {
    completeKey?: string
    onProgress?: HostedProgressListener
    limits?: HostedUploadLimits
  } = {}
) {
  const completionKey = completeKey ?? crypto.randomUUID()
  let current: HostedVersion = await json(
    api.get(path(appId, version.id), { skipErrorHandling: true, signal }),
    guard
  )
  if (current.upload.state === 'stored' || current.upload.state === 'completed') {
    await verifyStoredFile(
      file,
      current.upload.sha256,
      guard,
      signal,
      current.expected_bytes,
      limits
    )
    onProgress?.({ total: current.expected_bytes, confirmed: current.upload.received_bytes })
    return completeHostedUpload(appId, current, guard, completionKey, signal)
  }
  if (!file || file.size !== current.expected_bytes || file.name !== current.filename)
    throw new HostedUserError('Reselect the original file with the same name and size.')
  if (current.validation_state !== 'uploading') return current
  if (current.upload.state !== 'created') {
    if (
      (current.upload.state === 'expired' || current.upload.state === 'canceled') &&
      !current.upload.can_reset
    )
      throw new HostedUserError('This upload expired. Cancel the version and upload again.')
    if (!current.upload.can_reset)
      throw new HostedUserError(
        'The previous transfer is still stopping. Wait and retry this version.'
      )
    await api.post(
      path(appId, current.id) + '/reset-upload',
      { generation: current.upload.generation },
      { ...headers(current.upload.etag, crypto.randomUUID()), signal }
    )
    guard()
    current = await json(
      api.get(path(appId, current.id), { skipErrorHandling: true, signal }),
      guard
    )
  }
  onProgress?.({ total: file.size, confirmed: 0 })
  try {
    await api.putBinary(hostedArtifactPath(appId, current.id), file, {
      signal,
      skipErrorHandling: true,
      headers: hostedProtocolHeaders({
        'If-Match': current.upload.etag,
        'X-Upload-Generation': String(current.upload.generation),
      }),
    })
    guard()
  } catch (error) {
    if (signal.aborted) throw error
    const receipt = await json(
      api.get(path(appId, current.id), { skipErrorHandling: true, signal }),
      guard
    )
    if (receipt.upload.state !== 'stored') throw error
  }
  current = await json(api.get(path(appId, current.id), { skipErrorHandling: true, signal }), guard)
  onProgress?.({ total: current.expected_bytes, confirmed: current.upload.received_bytes })
  return completeHostedUpload(appId, current, guard, completionKey, signal)
}
function startAttempt(
  app: HostedApplication,
  file: File,
  routing: 'static' | 'spa_history'
): Attempt {
  if (!app.etag) throw new HostedUserError('Reload the current application before saving changes.')
  const attempt = {
    file,
    routing,
    beginKey: crypto.randomUUID(),
    completeKey: crypto.randomUUID(),
    etag: app.etag,
    busy: false,
  }
  attempts.set(app.id, attempt)
  return attempt
}

// These responses prove that begin did not commit (412/428: the cached etag is stale).
const BEGIN_REFUSED = [400, 409, 412, 413, 422, 428]

export async function uploadHostedArtifact(
  app: HostedApplication,
  file: File,
  routing: 'static' | 'spa_history',
  signal: AbortSignal,
  guard: () => void,
  onProgress?: HostedProgressListener,
  limits: HostedUploadLimits = HOSTED_DEFAULT_UPLOAD_LIMITS
) {
  guard()
  let attempt = attempts.get(app.id)
  if (attempt?.staged) {
    const existing: HostedVersion = await json(
      api.get(path(app.id, attempt.staged.version_id), { skipErrorHandling: true, signal }),
      guard
    )
    if (existing.upload.state === 'completed' || existing.validation_state !== 'uploading') {
      discardHostedUpload(app.id, existing.id)
      attempt = undefined
    }
  }
  if (
    attempt &&
    (attempt.file.name !== file.name ||
      attempt.file.size !== file.size ||
      attempt.routing !== routing)
  )
    throw new HostedUserError(
      'Check the interrupted version in Versions before starting a different upload.'
    )
  if (!attempt) attempt = startAttempt(app, file, routing)
  await verifyReselection(attempt, file, guard, signal, limits)
  if (attempt.busy) throw new HostedUserError('This upload is already in progress.')
  attempt.busy = true
  try {
    if (!attempt.staged)
      attempt.staged = await json(
        api.post(
          path(app.id),
          {
            filename: file.name,
            artifact_kind: hostedArtifactKind(file.name) === 'zip' ? 'zip' : 'html',
            byte_size: file.size,
            routing_mode: routing,
          },
          { ...headers(attempt.etag, attempt.beginKey), signal }
        ),
        guard
      )
    if (attempt.staged!.upload_path !== path(app.id, attempt.staged!.version_id) + '/artifact')
      throw new Error('Upload destination could not be verified.')
    const version: HostedVersion = await json(
      api.get(path(app.id, attempt.staged!.version_id), { skipErrorHandling: true, signal }),
      guard
    )
    const result = await resumeHostedUpload(app.id, version, file, signal, guard, {
      completeKey: attempt.completeKey,
      onProgress,
      limits,
    })
    attempts.delete(app.id)
    return result
  } catch (error) {
    // A refused begin is safe to start over. Unknown transport outcomes retain the original
    // payload/key so a retry can recover its durable receipt.
    if (!attempt.staged && error instanceof Response && BEGIN_REFUSED.includes(error.status))
      attempts.delete(app.id)
    throw error
  } finally {
    attempt.busy = false
  }
}
