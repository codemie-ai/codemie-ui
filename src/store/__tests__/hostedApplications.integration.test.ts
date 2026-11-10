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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import {
  hostedApplicationsStore as store,
  hostedAuthenticationGeneration,
  hostedErrorMessage,
} from '@/store/hostedApplications'
import { hostedUploadLimits } from '@/store/utils/hostedApplicationUpload'
import { HostedUserError } from '@/types/entity/hostedApplication'
import api from '@/utils/api'

const app = {
  id: 'fbe4b0a1-a708-4f5e-83be-cc8f93178183',
  name: 'Delivery map',
  description: 'A visual',
  shared: false,
  revision: 1,
  etag: '"app:fbe4b0a1-a708-4f5e-83be-cc8f93178183:1"',
  capabilities: { can_launch: false, can_manage: true },
}

const turnHostedApplications = (enabled: boolean) => {
  appInfoStore.configs = [{ id: 'features:hostedApplications', settings: { enabled } }]
  appInfoStore.isConfigFetched = true
}

beforeEach(() => {
  vi.restoreAllMocks()
  store.reset()
  turnHostedApplications(true)
})

describe('hosted application store at the API boundary', () => {
  it('ignores a slow response from a previous filter', async () => {
    let finishFirst: (value: Response) => void = () => undefined
    vi.spyOn(api, 'get')
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishFirst = resolve
        })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [app], next_cursor: null })))
    store.filters.q = 'old'
    const first = store.loadApplications()
    store.filters.q = 'new'
    await store.loadApplications()
    finishFirst(new Response(JSON.stringify({ items: [], next_cursor: null })))
    await first
    expect(store.items[0].name).toBe('Delivery map')
    expect(store.loading).toBe(false)
  })

  it('retains loaded items when a refresh fails and exposes a retryable error', async () => {
    store.items = [app as never]
    vi.spyOn(api, 'get').mockRejectedValue(new Error('Disconnected'))
    await store.loadApplications()
    expect(store.items).toHaveLength(1)
    expect(store.error).toBeTruthy()
    expect(store.loading).toBe(false)
  })

  it('sends the current revision and a stable request key when changing metadata', async () => {
    const patch = vi
      .spyOn(api, 'patch')
      .mockResolvedValue(new Response(JSON.stringify({ ...app, name: 'Updated', revision: 2 })))
    const key = '10000000-0000-0000-0000-000000000001'
    await store.updateApplication(app as never, { name: 'Updated' }, key)
    const headers = new Headers(patch.mock.calls[0][2]?.headers)
    expect(headers.get('If-Match')).toBe(app.etag)
    expect(headers.get('Idempotency-Key')).toBe(key)
  })

  it('requests a normal published view when launching, with no preview mode', async () => {
    const content = 'https://v-' + 'a'.repeat(32) + '.content.test'
    const post = vi.spyOn(api, 'post').mockResolvedValue(
      new Response(
        JSON.stringify({
          version_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          content_origin: content,
          action: content + '/_platform/launch',
          ticket: 'test-only-ticket',
        })
      )
    )
    await store.issueLaunch(app.id)
    expect(post).toHaveBeenCalledWith(
      'v1/hosted-applications/' + app.id + '/launch',
      { purpose: 'published_view', version_id: null, path: null },
      expect.objectContaining({ skipErrorHandling: true })
    )
  })

  it('does not send artifact bytes to an upload path for another application', async () => {
    store.capabilities = {
      create: true,
      limits: { html_bytes: 20971520, zip_bytes: 104857600 },
    } as never
    vi.spyOn(api, 'post').mockResolvedValue(
      new Response(
        JSON.stringify({
          version_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          upload_path: 'v1/hosted-applications/another/versions/other/artifact',
        })
      )
    )
    const upload = vi.spyOn(api, 'putBinary')
    await expect(
      store.uploadArtifact(
        app as never,
        new File(['<html>Test</html>'], 'test.html'),
        'static',
        new AbortController().signal
      )
    ).rejects.toThrow('Upload destination')
    expect(upload).not.toHaveBeenCalled()
  })
})

describe('hosted authentication lifetime', () => {
  it.each(['capabilities', 'usage'] as const)(
    'does not restore prior-user %s after reset',
    async (kind) => {
      let respond: (response: Response) => void = () => undefined
      vi.spyOn(api, 'get').mockReturnValue(
        new Promise((resolve) => {
          respond = resolve
        })
      )
      const loaders = {
        capabilities: () => store.ensureCapabilities(),
        usage: () => store.loadUsage(),
      }
      const payloads = {
        capabilities: { view: true },
        usage: { stored_bytes: 99 },
      }
      const pending = loaders[kind]()
      store.reset()
      respond(new Response(JSON.stringify(payloads[kind])))
      await pending
      expect(store.capabilities).toBeNull()
      expect(store.usage).toBeNull()
    }
  )
})

describe('hosted upload receipt recovery', () => {
  it('resumes an interrupted version and permits the next different artifact', async () => {
    store.capabilities = {
      create: true,
      limits: { html_bytes: 20971520, zip_bytes: 104857600 },
    } as never
    const first = new File(['<html>Safe</html>'], 'first.html')
    const second = new File(['<html>Next</html>'], 'second.html')
    let count = 0
    let failed = false
    let version: any
    const body = (value: unknown) => new Response(JSON.stringify(value))
    vi.spyOn(api, 'post').mockImplementation(async (path, request: any) => {
      if (path.endsWith('/complete')) {
        version.upload.state = 'completed'
        version.validation_state = 'queued'
        return body({ state: 'queued' })
      }
      count += 1
      const id =
        count === 1
          ? 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
          : 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      version = {
        id,
        filename: request.filename,
        expected_bytes: request.byte_size,
        validation_state: 'uploading',
        etag: '"version:1"',
        upload: {
          state: 'created',
          upload_id: id,
          generation: 1,
          etag: '"upload:1"',
          sha256: 'a'.repeat(64),
          can_reset: false,
        },
      }
      return body({
        version_id: id,
        upload_path: `v1/hosted-applications/${app.id}/versions/${id}/artifact`,
      })
    })
    vi.spyOn(api, 'get').mockImplementation(async () => body(version))
    vi.spyOn(api, 'putBinary').mockImplementation(async () => {
      if (!failed) {
        failed = true
        throw new Error('Disconnected')
      }
      version.upload.state = 'stored'
      return body({ state: 'stored' })
    })
    await expect(
      store.uploadArtifact(app as never, first, 'static', new AbortController().signal)
    ).rejects.toThrow('Disconnected')
    const receipt = await store.getVersion(app.id, version.id)
    await store.resumeUpload(
      app.id,
      receipt,
      new File(['<html>Safe</html>'], 'first.html'),
      new AbortController().signal
    )
    await store.uploadArtifact(app as never, second, 'static', new AbortController().signal)
    expect(count).toBe(2)
  })
})

describe('definitive upload admission recovery', () => {
  it.each([409, 412, 413, 428])(
    'uses the fresh revision after a definitive %s rejection',
    async (status) => {
      store.capabilities = {
        create: true,
        limits: { html_bytes: 20971520, zip_bytes: 104857600 },
      } as never
      const post = vi
        .spyOn(api, 'post')
        .mockRejectedValueOnce(new Response('{}', { status }))
        .mockRejectedValueOnce(new Error('Unknown transport outcome'))
      const file = new File(['<html>Safe</html>'], 'safe.html')
      await expect(
        store.uploadArtifact(app as never, file, 'static', new AbortController().signal)
      ).rejects.toBeInstanceOf(Response)
      await expect(
        store.uploadArtifact(
          { ...app, etag: '"app:2"' } as never,
          file,
          'static',
          new AbortController().signal
        )
      ).rejects.toThrow('Unknown transport outcome')
      expect(new Headers(post.mock.calls[1][2]?.headers).get('If-Match')).toBe('"app:2"')
      expect(new Headers(post.mock.calls[1][2]?.headers).get('Idempotency-Key')).not.toBe(
        new Headers(post.mock.calls[0][2]?.headers).get('Idempotency-Key')
      )
    }
  )
})

const pending = () => {
  let respond: (response: Response) => void = () => undefined
  let fail: (error: unknown) => void = () => undefined
  const promise = new Promise<Response>((resolve, reject) => {
    respond = resolve
    fail = reject
  })
  return { promise, respond, fail }
}

describe('capabilities', () => {
  const capabilitiesResponse = (value: unknown) =>
    vi.spyOn(api, 'get').mockImplementation(async () => new Response(JSON.stringify(value)))

  it('is idle until requested, loading while in flight and ready once loaded', async () => {
    const request = pending()
    vi.spyOn(api, 'get').mockReturnValue(request.promise)
    expect(store.capabilitiesStatus).toBe('idle')
    const loading = store.ensureCapabilities()
    expect(store.capabilitiesStatus).toBe('loading')
    request.respond(new Response(JSON.stringify({ view: true, create: false })))
    await loading
    expect(store.capabilitiesStatus).toBe('ready')
    expect(store.capabilities).toEqual({ view: true, create: false })
  })

  it('shares one request between callers and reuses what it loaded', async () => {
    const get = capabilitiesResponse({ view: true })
    const first = store.ensureCapabilities()
    expect(store.ensureCapabilities()).toBe(first)
    await first
    await store.ensureCapabilities()
    expect(get).toHaveBeenCalledOnce()
  })

  it('reports a failed request, clears capabilities and asks again on the next call', async () => {
    store.capabilities = { view: true } as never
    const get = vi
      .spyOn(api, 'get')
      .mockRejectedValueOnce(new Error('Disconnected'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ view: true })))
    await store.ensureCapabilities()
    expect(store.capabilitiesStatus).toBe('failed')
    expect(store.capabilities).toBeNull()
    await store.ensureCapabilities()
    expect(get).toHaveBeenCalledTimes(2)
    expect(store.capabilities).toEqual({ view: true })
  })

  it('returns to idle on reset and ignores the response of the previous session', async () => {
    const request = pending()
    vi.spyOn(api, 'get').mockReturnValue(request.promise)
    const loading = store.ensureCapabilities()
    store.reset()
    expect(store.capabilitiesStatus).toBe('idle')
    request.respond(new Response(JSON.stringify({ view: true })))
    await loading
    expect(store.capabilitiesStatus).toBe('idle')
    expect(store.capabilities).toBeNull()
  })

  it('never calls the hosted API while custom applications are off in customer config', async () => {
    turnHostedApplications(false)
    const get = vi.spyOn(api, 'get')
    await store.ensureCapabilities()
    expect(get).not.toHaveBeenCalled()
    expect(store.capabilitiesStatus).toBe('ready')
    expect(store.capabilities).toMatchObject({ view: false, create: false })
  })

  it('treats customer config that has not loaded as off', async () => {
    appInfoStore.isConfigFetched = false
    const get = vi.spyOn(api, 'get')
    await store.ensureCapabilities()
    expect(get).not.toHaveBeenCalled()
    expect(store.capabilities?.view).toBe(false)
  })

  it('follows the customer-config switch after capabilities were loaded', async () => {
    const get = capabilitiesResponse({ view: true, create: true })
    await store.ensureCapabilities()
    expect(store.capabilities?.view).toBe(true)
    turnHostedApplications(false)
    await store.ensureCapabilities()
    expect(store.capabilities?.view).toBe(false)
    turnHostedApplications(true)
    await store.ensureCapabilities()
    expect(store.capabilities?.view).toBe(true)
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('discards an earlier in-flight request once custom applications are off', async () => {
    const request = pending()
    vi.spyOn(api, 'get').mockReturnValue(request.promise)
    const earlier = store.ensureCapabilities()
    turnHostedApplications(false)
    await store.ensureCapabilities()
    request.respond(new Response(JSON.stringify({ view: true })))
    await earlier
    expect(store.capabilities?.view).toBe(false)
  })

  it('applies only the latest request when asked to reload', async () => {
    const first = pending()
    const second = pending()
    vi.spyOn(api, 'get').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const older = store.ensureCapabilities()
    const newer = store.ensureCapabilities(true)
    second.respond(new Response(JSON.stringify({ view: true })))
    await newer
    first.fail(new Error('Late failure'))
    await older
    expect(store.capabilitiesStatus).toBe('ready')
    expect(store.capabilities).toEqual({ view: true })
  })
})

describe('signed-in user', () => {
  it('starts over for another person, but not on the first sign-in or for the same person', () => {
    store.followUser(null)
    store.capabilities = { view: true } as never
    store.items = [app as never]
    store.followUser('alice')
    store.followUser('alice')
    expect(store.items).toHaveLength(1)
    const epoch = hostedAuthenticationGeneration()
    store.followUser('bob')
    expect(store.items).toEqual([])
    expect(store.capabilities).toBeNull()
    expect(hostedAuthenticationGeneration()).toBe(epoch + 1)
  })
})

describe('error messages shown to people', () => {
  const generic = 'This action could not be completed. Please try again.'
  const serverError = (message: string) =>
    Object.assign(new Response('{}', { status: 409 }), { parsedError: { message } })

  it.each([
    [
      'a network failure',
      new TypeError('Failed to fetch'),
      'Network error. Check your connection and try again.',
    ],
    [
      'a message written for users',
      new HostedUserError('Application not found.'),
      'Application not found.',
    ],
    [
      'the server message',
      serverError('This item changed in another tab'),
      'This item changed in another tab',
    ],
    ['an internal error', new Error('Invalid application identifier'), generic],
    ['a canceled request', new DOMException('Authentication changed', 'AbortError'), generic],
    [
      'a programming error',
      new TypeError("Cannot read properties of undefined (reading 'id')"),
      generic,
    ],
    ['an unreadable server error', serverError('Unknown error'), generic],
  ])('maps %s', (_case, error, message) => {
    expect(hostedErrorMessage(error)).toBe(message)
  })
})

describe('catalog filters', () => {
  it('keeps the current results when only the query or narrowing filters change', () => {
    store.setFilters({ scope: 'mine', q: '', sort: 'updated_desc' })
    store.items = [app as never]
    store.nextCursor = 'next'
    store.setFilters({
      scope: 'mine',
      q: 'map',
      sort: 'name_asc',
    })
    expect(store.filters).toEqual({
      scope: 'mine',
      q: 'map',
      sort: 'name_asc',
    })
    expect(store.items).toHaveLength(1)
    expect(store.nextCursor).toBe('next')
  })

  it('clears stale results and shows loading when the scope changes', () => {
    const next = { scope: 'project' as const, q: '', sort: 'updated_desc' as const }
    store.items = [app as never]
    store.nextCursor = 'next'
    store.error = 'Previous failure'
    store.setFilters(next)
    expect(store.filters).toEqual(next)
    expect(store.items).toEqual([])
    expect(store.nextCursor).toBeNull()
    expect(store.error).toBeNull()
    expect(store.loading).toBe(true)
  })

  it('never shows a slow response for the previous scope after the context changed', async () => {
    const request = pending()
    vi.spyOn(api, 'get').mockReturnValue(request.promise)
    const previous = store.loadApplications()
    store.setFilters({ scope: 'marketplace', q: '', sort: 'updated_desc' })
    request.respond(new Response(JSON.stringify({ items: [app], next_cursor: 'next' })))
    await previous
    expect(store.items).toEqual([])
    expect(store.nextCursor).toBeNull()
    expect(store.loading).toBe(true)
  })
})

describe('catalog filter parameters', () => {
  it('repeats the project parameter and sends the narrowing filters', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ items: [], next_cursor: null })))
    store.setFilters({
      scope: 'mine',
      q: '',
      sort: 'updated_desc',
      project: ['alpha', 'beta'],
      created_by: 'Jane Doe',
      shared: 'people',
      status: 'draft',
    })
    await store.loadApplications()
    const url = new URL(String(fetchSpy.mock.calls[0][0]), 'http://localhost')
    expect(url.pathname).toMatch(/v1\/hosted-applications$/)
    expect(url.searchParams.getAll('project')).toEqual(['alpha', 'beta'])
    expect(url.searchParams.get('created_by')).toBe('Jane Doe')
    expect(url.searchParams.get('shared')).toBe('people')
    expect(url.searchParams.get('status')).toBe('draft')
  })
})

describe('upload limits from capabilities', () => {
  const MiB = 1024 * 1024

  it('rejects an HTML file above the published HTML limit', async () => {
    store.capabilities = { create: true, limits: { html_bytes: 8, zip_bytes: 16 } } as never
    const post = vi.spyOn(api, 'post')
    await expect(
      store.uploadArtifact(
        app as never,
        new File(['<html>Too large</html>'], 'large.html'),
        'static',
        new AbortController().signal
      )
    ).rejects.toThrow('within the upload limit')
    expect(post).not.toHaveBeenCalled()
  })

  it('accepts a ZIP above the default limit when the server publishes a higher one', async () => {
    store.capabilities = {
      create: true,
      limits: { html_bytes: 20 * MiB, zip_bytes: 200 * MiB },
    } as never
    const post = vi.spyOn(api, 'post').mockRejectedValue(new Error('Stop after admission'))
    const zip = { name: 'site.zip', size: 150 * MiB } as File
    await expect(
      store.uploadArtifact(app as never, zip, 'static', new AbortController().signal)
    ).rejects.toThrow('Stop after admission')
    expect(post.mock.calls[0][1]).toMatchObject({ artifact_kind: 'zip', byte_size: 150 * MiB })
  })

  it.each([
    ['capabilities are not loaded', null],
    [
      'creating is not allowed',
      { create: false, limits: { html_bytes: 20 * MiB, zip_bytes: 100 * MiB } },
    ],
  ])(
    'says uploads are unavailable, not that the file is too large, when %s',
    async (_case, capabilities) => {
      store.capabilities = capabilities as never
      const post = vi.spyOn(api, 'post')
      const upload = store.uploadArtifact(
        app as never,
        new File(['<html>Small</html>'], 'small.html'),
        'static',
        new AbortController().signal
      )
      await expect(upload).rejects.toThrow('Uploads are unavailable right now')
      await expect(upload).rejects.not.toThrow('within the upload limit')
      expect(post).not.toHaveBeenCalled()
    }
  )

  it('exposes the limits with safe fallbacks', () => {
    expect(hostedUploadLimits(null)).toEqual({ htmlBytes: 20 * MiB, zipBytes: 100 * MiB })
    expect(hostedUploadLimits({ limits: { html_bytes: 5 * MiB, zip_bytes: 0 } })).toEqual({
      htmlBytes: 5 * MiB,
      zipBytes: 100 * MiB,
    })
  })
})

describe('application covers', () => {
  it.each(['image/png; charset=binary', 'IMAGE/JPEG', ' image/webp '])(
    'accepts a cover served as %s',
    async (type) => {
      vi.spyOn(api, 'get').mockResolvedValue(
        new Response('cover', { headers: { 'content-type': type } })
      )
      const cover = await store.getThumbnail(app.id, new AbortController().signal)
      expect(cover).not.toBeNull()
      expect(cover!.size).toBe(5)
    }
  )

  it('still refuses a cover of another type', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(
      new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } })
    )
    await expect(store.getThumbnail(app.id, new AbortController().signal)).rejects.toThrow(
      'Application preview is unavailable.'
    )
  })
})

describe('access contract calls', () => {
  const { id } = app
  const root = 'v1/hosted-applications/' + id
  const json = (value: unknown) => new Response(JSON.stringify(value))

  it('lists the project scope with the scope query parameter', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(json({ items: [], next_cursor: null }))
    store.setFilters({ scope: 'project', q: '', sort: 'updated_desc' })
    await store.loadApplications()
    expect(get.mock.calls[0][0]).toBe('v1/hosted-applications')
    expect(get.mock.calls[0][1]?.params).toMatchObject({ scope: 'project' })
  })

  it('creates an application with its project', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue(json(app))
    const body = { name: 'Map', description: 'A map', project: 'demo' }
    await store.createApplication(body, '10000000-0000-0000-0000-000000000001')
    expect(post.mock.calls[0][0]).toBe('v1/hosted-applications')
    expect(post.mock.calls[0][1]).toEqual(body)
  })

  it('sends exactly the given partial body when toggling shared', async () => {
    const patch = vi.spyOn(api, 'patch').mockResolvedValue(json({ ...app, shared: true }))
    await store.updateApplication(app as never, { shared: true })
    expect(patch.mock.calls[0][0]).toBe(root)
    expect(patch.mock.calls[0][1]).toEqual({ shared: true })
    expect(new Headers(patch.mock.calls[0][2]?.headers).get('If-Match')).toBe(app.etag)
  })

  it('deletes with the current etag', async () => {
    store.items = [app as never]
    const del = vi.spyOn(api, 'delete').mockResolvedValue(new Response(null, { status: 204 }))
    await store.deleteApplication(app as never)
    expect(del.mock.calls[0][0]).toBe(root)
    expect(new Headers(del.mock.calls[0][2]?.headers).get('If-Match')).toBe(app.etag)
    expect(store.items).toEqual([])
  })

  it.each(['publish', 'unpublish'] as const)(
    '%s calls the marketplace endpoint',
    async (action) => {
      const post = vi.spyOn(api, 'post').mockResolvedValue(json({ ...app }))
      await store[action](app as never)
      expect(post.mock.calls[0][0]).toBe(`${root}/marketplace/${action}`)
      expect(new Headers(post.mock.calls[0][2]?.headers).get('If-Match')).toBe(app.etag)
    }
  )

  it('reads who the application is shared with', async () => {
    const get = vi
      .spyOn(api, 'get')
      .mockResolvedValue(
        json({ shared_with: [{ id: 'u1', name: 'A', email: 'a@x', grant_source: 'link' }] })
      )
    const users = await store.sharing.loadSharedWith(id)
    expect(get.mock.calls[0][0]).toBe(`${root}/shared-with`)
    expect(users[0].grant_source).toBe('link')
  })

  it('shares and unshares with user ids', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue(json({}))
    const del = vi.spyOn(api, 'delete').mockResolvedValue(json({}))
    await store.sharing.share(id, ['u1'])
    await store.sharing.unshare(id, ['u1'])
    expect(post.mock.calls[0][0]).toBe(`${root}/share`)
    expect(post.mock.calls[0][1]).toEqual({ user_ids: ['u1'] })
    expect(del.mock.calls[0][0]).toBe(`${root}/share`)
    expect(del.mock.calls[0][1]).toEqual({ user_ids: ['u1'] })
  })

  it('searches sharable users by query', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue(json({ users: [{ id: 'u2' }] }))
    const users = await store.sharing.searchUsers(id, 'a b')
    expect(get.mock.calls[0][0]).toBe(`${root}/sharable-users`)
    expect(get.mock.calls[0][1]?.params).toEqual({ q: 'a b' })
    expect(users).toEqual([{ id: 'u2' }])
  })

  it('reads, creates and revokes the share link', async () => {
    const link = { id: 'l1', token: 't', created_at: '2026-01-01' }
    const get = vi.spyOn(api, 'get').mockResolvedValue(json({ link }))
    const post = vi.spyOn(api, 'post').mockResolvedValue(json({ link }))
    const del = vi.spyOn(api, 'delete').mockResolvedValue(json({ link: null }))
    expect(await store.getShareLink(id)).toEqual(link)
    expect(await store.createShareLink(id)).toEqual(link)
    expect(await store.revokeShareLink(id)).toBeNull()
    expect(get.mock.calls[0][0]).toBe(`${root}/share-link`)
    expect(post.mock.calls[0][0]).toBe(`${root}/share-link`)
    expect(del.mock.calls[0][0]).toBe(`${root}/share-link`)
  })

  it('opens a share link by posting the token in the body and returns the app id', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue(json({ app_id: id }))
    expect(await store.openShareLink('tok')).toBe(id)
    expect(post.mock.calls[0][0]).toBe('v1/hosted-applications/share-links/open')
    expect(post.mock.calls[0][1]).toEqual({ token: 'tok' })
    expect(post.mock.calls[0][2]?.skipErrorHandling).toBe(true)
  })

  it('posts the moderation reason to the admin security path', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue(json({ ...app }))
    await store.security(app as never, 'suspend', 'abuse')
    expect(post.mock.calls[0][0]).toBe(`v1/admin/hosted-applications/${id}/security/suspend`)
    expect(post.mock.calls[0][1]).toEqual({ reason: 'abuse' })
    expect(new Headers(post.mock.calls[0][2]?.headers).get('If-Match')).toBe(app.etag)
  })
})
