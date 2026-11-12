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

import { LoaderFunction, matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'

import {
  APPLICATION_FEDERATION,
  APPLICATION_IFRAME,
  APPLICATIONS,
  HOSTED_APPLICATION,
  HOSTED_APPLICATION_EDIT,
  HOSTED_APPLICATION_MANAGE,
  HOSTED_APPLICATION_PREVIEW,
  HOSTED_APPLICATIONS,
  HOSTED_APPLICATION_SHARE,
  HOSTED_APPLICATION_VIEW,
  HOSTED_APPLICATIONS_MARKETPLACE,
  HOSTED_APPLICATIONS_NEW,
  HOSTED_APPLICATIONS_PLATFORM,
  HOSTED_APPLICATIONS_PROJECT,
  HOSTED_APPLICATIONS_SHARED,
} from '@/constants/routes'
import { routes } from '@/router'

const appId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const versionId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const leafRoute = (path: string) => matchRoutes(routes, path)?.at(-1)

describe('Applications area routes', () => {
  it.each([
    ['/apps', HOSTED_APPLICATIONS],
    ['/apps/project', HOSTED_APPLICATIONS_PROJECT],
    ['/apps/marketplace', HOSTED_APPLICATIONS_MARKETPLACE],
    ['/apps/shared', HOSTED_APPLICATIONS_SHARED],
    ['/apps/platform', HOSTED_APPLICATIONS_PLATFORM],
    ['/apps/new', HOSTED_APPLICATIONS_NEW],
    ['/apps/share/some-token', HOSTED_APPLICATION_SHARE],
    [`/apps/${appId}`, HOSTED_APPLICATION],
    [`/apps/${appId}/view`, HOSTED_APPLICATION_VIEW],
    [`/apps/${appId}/manage`, HOSTED_APPLICATION_MANAGE],
    [`/apps/${appId}/edit`, HOSTED_APPLICATION_EDIT],
    [`/apps/${appId}/preview/${versionId}`, HOSTED_APPLICATION_PREVIEW],
    ['/applications/sales-dashboard', APPLICATION_FEDERATION],
    ['/applications/iframe/sales-dashboard', APPLICATION_IFRAME],
  ])('%s is served by %s', (path, routeId) => {
    expect(leafRoute(path)?.route.id).toBe(routeId)
  })

  it('serves /apps/:id with the details page and /apps/:id/view with the viewer', () => {
    const details = leafRoute(`/apps/${appId}`)?.route.Component
    const viewer = leafRoute(`/apps/${appId}/view`)?.route.Component
    expect(details?.name).toBe('HostedApplicationDetails')
    expect(viewer?.name).toBe('HostedApplicationViewer')
    expect(leafRoute(`/apps/${appId}/preview/${versionId}`)?.route.Component).toBe(viewer)
  })

  it('redirects the former details path /apps/:id/manage to /apps/:id', async () => {
    const match = matchRoutes(routes, `/apps/${appId}/manage`)?.at(-1)
    expect(match?.route.Component).toBeUndefined()

    const result = await (match?.route.loader as LoaderFunction)({
      params: match?.params,
    } as Parameters<LoaderFunction>[0])

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(302)
    expect((result as Response).headers.get('Location')).toBe(`/apps/${appId}`)
  })

  it('redirects the former standalone path /apps/:id/standalone to the viewer', async () => {
    const match = matchRoutes(routes, `/apps/${appId}/standalone`)?.at(-1)
    expect(match?.route.Component).toBeUndefined()

    const result = await (match?.route.loader as LoaderFunction)({
      params: match?.params,
    } as Parameters<LoaderFunction>[0])

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(302)
    expect((result as Response).headers.get('Location')).toBe(`/apps/${appId}/view`)
  })

  it('reads the share token from the route param', () => {
    expect(leafRoute('/apps/share/some-token')?.params.token).toBe('some-token')
  })

  it('keeps the slug of platform application routes', () => {
    expect(leafRoute('/applications/iframe/sales-dashboard')?.params.slug).toBe('sales-dashboard')
    expect(leafRoute('/applications/sales-dashboard')?.params.slug).toBe('sales-dashboard')
  })

  it('redirects the former Applications list to the /apps catalog', async () => {
    const route = leafRoute('/applications')?.route
    expect(route?.id).toBe(APPLICATIONS)

    const result = await (route?.loader as LoaderFunction)({} as Parameters<LoaderFunction>[0])

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(302)
    expect((result as Response).headers.get('Location')).toBe('/apps')
  })
})
