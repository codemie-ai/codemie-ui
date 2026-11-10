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
import { proxy } from 'valtio'

import { createSharingClient, type SharingClient } from '@/components/sharing/sharingClient'
import {
  type HostedProgressListener,
  clearHostedUploads,
  discardHostedUpload,
  hostedArtifactKind,
  hostedProtocolHeaders,
  hostedUploadLimits,
  resumeHostedUpload,
  uploadHostedArtifact,
} from '@/store/utils/hostedApplicationUpload'
import {
  HostedUserError,
  type HostedApplication,
  type HostedCapabilities,
  type HostedPage,
  type HostedVersion,
  type HostedScope,
  type HostedSharedFilter,
  type HostedStatusFilter,
  type HostedUsage,
  type HostedValidationReport,
} from '@/types/entity/hostedApplication'
import api from '@/utils/api'
import { isHostedApplicationsEnabled } from '@/utils/featureFlags'
import {
  HOSTED_UUID,
  validateHostedLaunch,
  type HostedLaunchResponse,
  type ValidatedHostedLaunch,
} from '@/utils/hostedApplicationLaunch'

const ROOT = 'v1/hosted-applications'
// What the API also reports while the feature is off: only Platform apps are shown.
const HOSTED_CAPABILITIES_OFF: HostedCapabilities = {
  create: false,
  view: false,
  disabled_reason: 'Custom applications are turned off',
  limits: {},
}
export const HOSTED_COVER_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const HOSTED_COVER_MAX_BYTES = 1024 * 1024
const CATALOG_PAGE_SIZE = 24
const GENERIC_ERROR = 'This action could not be completed. Please try again.'
const NETWORK_ERROR = 'Network error. Check your connection and try again.'
let catalogSequence = 0
let catalogController: AbortController | null = null
let capabilitiesSequence = 0
let capabilitiesRequest: Promise<void> | null = null
let sessionUserId: string | null = null
// Bumped by reset() (another user signed in): responses of the previous session are dropped.
let authenticationEpoch = 0
export const hostedAuthenticationGeneration = () => authenticationEpoch

function requireCurrentAuthentication(epoch: number) {
  if (epoch !== authenticationEpoch) throw new DOMException('Authentication changed', 'AbortError')
}

async function currentJson(response: Promise<Response>, epoch = authenticationEpoch) {
  const body = await (await response).json()
  requireCurrentAuthentication(epoch)
  return body
}

// A response that arrives after another user signed in is dropped.
async function inCurrentAuthentication<T>(run: () => Promise<T>): Promise<T> {
  const epoch = authenticationEpoch
  const result = await run()
  requireCurrentAuthentication(epoch)
  return result
}

/**
 * A message that is safe to show: the server's, one written for users (`HostedUserError`) or a
 * network hint. Internal and browser error texts become a generic message.
 */
export function hostedErrorMessage(error: unknown): string {
  if (error instanceof HostedUserError) return error.message
  if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))
    return NETWORK_ERROR
  const message = (error as { parsedError?: { message?: unknown } } | null)?.parsedError?.message
  return typeof message === 'string' &&
    message.length > 0 &&
    message.length <= 500 &&
    message !== 'Unknown error'
    ? message
    : GENERIC_ERROR
}

function protocol(etag?: string, key: string = crypto.randomUUID()) {
  if (!etag) throw new HostedUserError('Reload the current application before saving changes.')
  return {
    headers: hostedProtocolHeaders({ 'If-Match': etag, 'Idempotency-Key': key }),
    skipErrorHandling: true,
  }
}

function replaceItem(store: { items: HostedApplication[] }, updated: HostedApplication) {
  store.items = store.items.map((item) => (item.id === updated.id ? updated : item))
  return updated
}

const idempotent = (key: string) => ({
  headers: hostedProtocolHeaders({ 'Idempotency-Key': key }),
  skipErrorHandling: true,
})

function appPath(id: string) {
  requireCurrentAuthentication(authenticationEpoch)
  if (!HOSTED_UUID.test(id)) throw new Error('Invalid application identifier')
  return ROOT + '/' + id
}

export interface HostedShareLink {
  id: string
  token: string
  created_at: string
}

export interface CatalogFilters {
  scope: HostedScope
  q: string
  sort: 'updated_desc' | 'created_desc' | 'name_asc'
  /** Project names; sent as a repeated `project` parameter. */
  project?: string[]
  /** Creator display name, matched exactly (as in skills). */
  created_by?: string
  /** My apps only. */
  shared?: HostedSharedFilter
  /** My apps only. */
  status?: HostedStatusFilter
}

/** `idle` until requested (and again after a reset), then `loading` → `ready` or `failed`. */
export type HostedCapabilitiesStatus = 'idle' | 'loading' | 'ready' | 'failed'

const defaultFilters = (): CatalogFilters => ({ scope: 'mine', q: '', sort: 'updated_desc' })

/** Results belong to a scope; other filters only narrow them. */
const sameCatalogContext = (a: CatalogFilters, b: CatalogFilters) => a.scope === b.scope

interface HostedApplicationsStore {
  capabilities: HostedCapabilities | null
  capabilitiesStatus: HostedCapabilitiesStatus
  items: HostedApplication[]
  nextCursor: string | null
  filters: CatalogFilters
  loading: boolean
  error: string | null
  usage: HostedUsage | null
  reset(): void
  /** Hosted state belongs to one signed-in person: a different user starts over. */
  followUser(userId: string | null): void
  setFilters(next: CatalogFilters): void
  /**
   * Loads the capabilities once and shares that request with every caller; `reload` asks again.
   * While `features:hostedApplications` is off the hosted API is never called and `view` is false.
   */
  ensureCapabilities(reload?: boolean): Promise<void>
  loadUsage(): Promise<void>
  loadApplications(append?: boolean): Promise<void>
  getApplication(id: string, signal?: AbortSignal): Promise<HostedApplication>
  getThumbnail(id: string, signal: AbortSignal): Promise<Blob | null>
  getDeletionStatus(
    id: string
  ): Promise<{ state: string; remaining_prefixes: number; charged_bytes: number }>
  createApplication(
    body: { name: string; description: string; project: string; shared?: boolean },
    key?: string
  ): Promise<HostedApplication>
  updateApplication(
    app: HostedApplication,
    body: { name?: string; description?: string; project?: string; shared?: boolean },
    key?: string
  ): Promise<HostedApplication>
  /** Replaces the owner's custom card cover (PNG, JPEG or WebP up to 1 MiB). */
  uploadCover(app: HostedApplication, file: File, key?: string): Promise<HostedApplication>
  /** Removes the custom cover; the card falls back to its generated initials cover. */
  removeCover(app: HostedApplication, key?: string): Promise<HostedApplication>
  deleteApplication(app: HostedApplication, key?: string): Promise<void>
  /** Puts the application in the marketplace. */
  publish(app: HostedApplication, key?: string): Promise<HostedApplication>
  unpublish(app: HostedApplication, key?: string): Promise<HostedApplication>
  /**
   * Named sharing of hosted applications; the share popup and the details page use it as is.
   * A response that arrives after another user signed in is dropped.
   */
  sharing: SharingClient
  getShareLink(id: string): Promise<HostedShareLink | null>
  createShareLink(id: string): Promise<HostedShareLink>
  revokeShareLink(id: string): Promise<null>
  /**
   * Exchanges a share-link token for the application id. Errors are NOT shown as toasts
   * (`skipErrorHandling`), so the caller maps 403/404 itself; a 401 still sends the person to sign
   * in, because that redirect is not part of the toast handling.
   */
  openShareLink(token: string): Promise<string>
  /** Moderator action (admin API); `reason` is required by the backend. */
  security(
    app: HostedApplication,
    action: 'suspend' | 'reinstate',
    reason: string,
    key?: string
  ): Promise<HostedApplication>
  uploadArtifact(
    app: HostedApplication,
    file: File,
    routing: 'static' | 'spa_history',
    signal: AbortSignal,
    onProgress?: HostedProgressListener
  ): Promise<HostedVersion>
  getVersion(appId: string, versionId: string, signal?: AbortSignal): Promise<HostedVersion>
  listVersionPage(
    appId: string,
    cursor?: string,
    signal?: AbortSignal
  ): Promise<HostedPage<HostedVersion>>
  resumeUpload(
    appId: string,
    version: HostedVersion,
    file: File | null,
    signal: AbortSignal,
    onProgress?: HostedProgressListener
  ): Promise<HostedVersion>
  getValidation(appId: string, versionId: string, offset?: number): Promise<HostedValidationReport>
  configure(
    appId: string,
    version: HostedVersion,
    root: string,
    entry: string,
    routing: 'static' | 'spa_history'
  ): Promise<void>
  versionAction(
    app: HostedApplication,
    version: HostedVersion,
    action: 'select' | 'activate' | 'cancel' | 'retry'
  ): Promise<void>
  issueLaunch(
    appId: string,
    versionId?: string,
    signal?: AbortSignal
  ): Promise<ValidatedHostedLaunch>
}

export const hostedApplicationsStore = proxy<HostedApplicationsStore>({
  capabilities: null,
  capabilitiesStatus: 'idle',
  items: [],
  nextCursor: null,
  filters: defaultFilters(),
  loading: false,
  error: null,
  usage: null,

  reset() {
    clearHostedUploads()
    authenticationEpoch += 1
    catalogSequence += 1
    catalogController?.abort()
    capabilitiesSequence += 1
    capabilitiesRequest = null
    this.capabilities = null
    this.capabilitiesStatus = 'idle'
    this.items = []
    this.nextCursor = null
    this.filters = defaultFilters()
    this.loading = false
    this.error = null
    this.usage = null
  },

  followUser(userId) {
    if (userId === sessionUserId) return
    const previous = sessionUserId
    sessionUserId = userId
    // The first sign-in of this page has nothing to drop.
    if (previous !== null) this.reset()
  },

  setFilters(next) {
    const contextChanged = !sameCatalogContext(this.filters, next)
    this.filters = { ...next }
    if (!contextChanged) return
    // Never show results of the previous scope, even if its request is still in flight.
    catalogSequence += 1
    catalogController?.abort()
    catalogController = null
    this.items = []
    this.nextCursor = null
    this.error = null
    this.loading = true
  },

  ensureCapabilities(reload = false) {
    if (!isHostedApplicationsEnabled()) {
      // Turned off in customer config: the hosted API is never called, and a request still in
      // flight from before the switch is ignored.
      capabilitiesSequence += 1
      capabilitiesRequest = null
      if (this.capabilitiesStatus !== 'ready' || this.capabilities?.view !== false) {
        this.capabilities = { ...HOSTED_CAPABILITIES_OFF }
        this.capabilitiesStatus = 'ready'
      }
      return Promise.resolve()
    }
    if (capabilitiesRequest && !reload) return capabilitiesRequest
    capabilitiesSequence += 1
    const sequence = capabilitiesSequence
    const epoch = authenticationEpoch
    const current = () => sequence === capabilitiesSequence && epoch === authenticationEpoch
    this.capabilitiesStatus = 'loading'
    const request = api
      .get(ROOT + '/capabilities', { skipErrorHandling: true })
      .then((response) => response.json())
      .then(
        (capabilities: HostedCapabilities) => {
          if (!current()) return
          this.capabilities = capabilities
          this.capabilitiesStatus = 'ready'
        },
        () => {
          if (!current()) return
          // The next caller (Retry, another page) asks again.
          capabilitiesRequest = null
          this.capabilities = null
          this.capabilitiesStatus = 'failed'
        }
      )
    capabilitiesRequest = request
    return request
  },

  async loadUsage() {
    requireCurrentAuthentication(authenticationEpoch)
    const epoch = authenticationEpoch
    const response = await api.get(ROOT + '/usage', { skipErrorHandling: true })
    const usage = await response.json()
    if (epoch === authenticationEpoch) this.usage = usage
  },

  async loadApplications(append = false) {
    requireCurrentAuthentication(authenticationEpoch)
    if (append && !this.nextCursor) return
    catalogSequence += 1
    const sequence = catalogSequence
    catalogController?.abort()
    catalogController = new AbortController()
    this.loading = true
    this.error = null
    try {
      const response = await api.get(ROOT, {
        params: {
          ...this.filters,
          cursor: append ? this.nextCursor : undefined,
          limit: CATALOG_PAGE_SIZE,
        },
        signal: catalogController.signal,
        skipErrorHandling: true,
      })
      const page: HostedPage<HostedApplication> = await response.json()
      if (sequence !== catalogSequence) return
      this.items = append ? [...this.items, ...page.items] : page.items
      this.nextCursor = page.next_cursor
    } catch (error) {
      if (sequence === catalogSequence && (error as Error)?.name !== 'AbortError')
        this.error = hostedErrorMessage(error)
    } finally {
      if (sequence === catalogSequence) this.loading = false
    }
  },

  async getDeletionStatus(id) {
    return currentJson(api.get(appPath(id) + '/deletion-status', { skipErrorHandling: true }))
  },

  async getThumbnail(id, signal) {
    const epoch = authenticationEpoch
    requireCurrentAuthentication(epoch)
    if (signal.aborted) throw new DOMException('Canceled', 'AbortError')
    const response = await api.get(appPath(id) + '/thumbnail', { signal, skipErrorHandling: true })
    requireCurrentAuthentication(epoch)
    if (response.status === 204) return null
    const type = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!HOSTED_COVER_TYPES.includes(type)) throw new Error('Application preview is unavailable.')
    const blob = await response.blob()
    requireCurrentAuthentication(epoch)
    if (signal.aborted) throw new DOMException('Canceled', 'AbortError')
    if (blob.size > HOSTED_COVER_MAX_BYTES)
      throw new Error('Application preview exceeds its limit.')
    return blob
  },

  async getApplication(id, signal) {
    return currentJson(api.get(appPath(id), { skipErrorHandling: true, signal }))
  },

  async createApplication(body, key = crypto.randomUUID()) {
    requireCurrentAuthentication(authenticationEpoch)
    return currentJson(api.post(ROOT, body, idempotent(key)))
  },

  async updateApplication(app, body, key) {
    const epoch = authenticationEpoch
    const updated = await (await api.patch(appPath(app.id), body, protocol(app.etag, key))).json()
    requireCurrentAuthentication(epoch)
    this.items = this.items.map((item) => (item.id === updated.id ? updated : item))
    return updated
  },

  async uploadCover(app, file, key) {
    const epoch = authenticationEpoch
    requireCurrentAuthentication(epoch)
    if (!HOSTED_COVER_TYPES.includes(file.type) || !file.size || file.size > HOSTED_COVER_MAX_BYTES)
      throw new HostedUserError('Choose a PNG, JPEG, or WebP image up to 1 MiB.')
    const { headers, skipErrorHandling } = protocol(app.etag, key)
    const response = await api.putBinary(appPath(app.id) + '/cover', file, {
      headers: { ...headers, 'Content-Type': file.type },
      skipErrorHandling,
    })
    const updated: HostedApplication = await response.json()
    requireCurrentAuthentication(epoch)
    this.items = this.items.map((item) => (item.id === updated.id ? updated : item))
    return updated
  },

  async removeCover(app, key) {
    const epoch = authenticationEpoch
    const updated: HostedApplication = await currentJson(
      api.delete(appPath(app.id) + '/cover', undefined, protocol(app.etag, key)),
      epoch
    )
    this.items = this.items.map((item) => (item.id === updated.id ? updated : item))
    return updated
  },

  async deleteApplication(app, key) {
    const epoch = authenticationEpoch
    await api.delete(appPath(app.id), undefined, protocol(app.etag, key))
    requireCurrentAuthentication(epoch)
    this.items = this.items.filter((item) => item.id !== app.id)
  },

  async publish(app, key) {
    return replaceItem(
      this,
      await currentJson(
        api.post(appPath(app.id) + '/marketplace/publish', {}, protocol(app.etag, key))
      )
    )
  },

  async unpublish(app, key) {
    return replaceItem(
      this,
      await currentJson(
        api.post(appPath(app.id) + '/marketplace/unpublish', {}, protocol(app.etag, key))
      )
    )
  },

  sharing: createSharingClient(appPath, { guard: inCurrentAuthentication }),

  async getShareLink(id) {
    const body = await currentJson(
      api.get(appPath(id) + '/share-link', { skipErrorHandling: true })
    )
    return body.link ?? null
  },

  async createShareLink(id) {
    const body = await currentJson(
      api.post(appPath(id) + '/share-link', {}, { skipErrorHandling: true })
    )
    return body.link
  },

  async revokeShareLink(id) {
    const epoch = authenticationEpoch
    await api.delete(appPath(id) + '/share-link', undefined, { skipErrorHandling: true })
    requireCurrentAuthentication(epoch)
    return null
  },

  async openShareLink(token) {
    requireCurrentAuthentication(authenticationEpoch)
    const body = await currentJson(
      api.post(ROOT + '/share-links/open', { token }, { skipErrorHandling: true })
    )
    return body.app_id
  },

  async security(app, action, reason, key) {
    requireCurrentAuthentication(authenticationEpoch)
    if (!HOSTED_UUID.test(app.id)) throw new Error('Invalid application identifier')
    return replaceItem(
      this,
      await currentJson(
        api.post(
          `v1/admin/hosted-applications/${app.id}/security/${action}`,
          { reason },
          protocol(app.etag, key)
        )
      )
    )
  },

  async uploadArtifact(app, file, routing, signal, onProgress) {
    const epoch = authenticationEpoch
    const kind = hostedArtifactKind(file.name)
    const limits = hostedUploadLimits(this.capabilities)
    const maximum = kind === 'zip' ? limits.zipBytes : limits.htmlBytes
    if (!this.capabilities?.create)
      throw new HostedUserError('Uploads are unavailable right now. Reload the page and try again.')
    if (!kind || !file.size || file.size > maximum)
      throw new HostedUserError('Choose an HTML file or static ZIP within the upload limit.')
    return uploadHostedArtifact(
      app,
      file,
      routing,
      signal,
      () => requireCurrentAuthentication(epoch),
      onProgress,
      limits
    )
  },

  async resumeUpload(appId, version, file, signal, onProgress) {
    const epoch = authenticationEpoch
    return resumeHostedUpload(
      appId,
      version,
      file,
      signal,
      () => requireCurrentAuthentication(epoch),
      { onProgress, limits: hostedUploadLimits(this.capabilities) }
    )
  },

  async getVersion(appId, versionId, signal) {
    if (!HOSTED_UUID.test(versionId)) throw new Error('Invalid version identifier')
    return currentJson(
      api.get(appPath(appId) + '/versions/' + versionId, { signal, skipErrorHandling: true })
    )
  },

  async listVersionPage(appId, cursor, signal) {
    return currentJson(
      api.get(appPath(appId) + '/versions', { params: { cursor }, signal, skipErrorHandling: true })
    )
  },

  async getValidation(appId, versionId, offset = 0) {
    return currentJson(
      api.get(appPath(appId) + '/versions/' + versionId + '/validation', {
        params: { offset },
        skipErrorHandling: true,
      })
    )
  },

  async configure(appId, version, root, entry, routing) {
    await api.put(
      appPath(appId) + '/versions/' + version.id + '/configuration',
      {
        site_root: root,
        entrypoint_path: entry,
        routing_mode: routing,
        candidate_manifest_digest: version.candidate_manifest_digest,
        configuration_revision: version.configuration_revision,
      },
      protocol(version.etag)
    )
  },

  async versionAction(app, version, action) {
    if (action === 'select' || action === 'activate') {
      await api.post(
        appPath(app.id) + '/' + (action === 'select' ? 'select-version' : 'activate'),
        { version_id: version.id },
        protocol(app.etag)
      )
    } else {
      await api.post(
        appPath(app.id) + '/versions/' + version.id + '/' + action,
        {},
        protocol(version.etag)
      )
      if (action === 'cancel') discardHostedUpload(app.id, version.id)
    }
  },

  async issueLaunch(appId, versionId, signal) {
    const epoch = authenticationEpoch
    const response: HostedLaunchResponse = await (
      await api.post(
        appPath(appId) + '/launch',
        {
          purpose: versionId ? 'owner_preview' : 'published_view',
          version_id: versionId ?? null,
          path: null,
        },
        { skipErrorHandling: true, signal }
      )
    ).json()
    requireCurrentAuthentication(epoch)
    if (versionId && response.version_id !== versionId)
      throw new HostedUserError('The application version changed. Reload and try again.')
    return validateHostedLaunch(response, window.location.origin)
  },
})
