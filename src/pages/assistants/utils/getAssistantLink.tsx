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

import { ASSISTANT_DETAILS } from '@/constants/routes'
import type { Assistant } from '@/types/entity/assistant'
import { getRootPath } from '@/utils/utils'

type AssistantRouteRef = Pick<Assistant, 'id' | 'slug' | 'project'>
type AssistantRouteTarget = { name: string; params: Record<string, string> }

/**
 * Encode a URL path segment but keep RFC 3986 `pchar` characters literal, so email-named
 * projects stay readable (`@` instead of `%40`). Only forbidden chars (`/ ? # [ ] %`, space,
 * non-ASCII) are percent-encoded; the router decodes the param back on the way in.
 */
const PCHAR_ALLOWED = /[A-Za-z0-9\-._~!$&'()*+,;=:@]/
const encodeSegment = (value: string): string =>
  Array.from(value)
    .map((ch) => (PCHAR_ALLOWED.test(ch) ? ch : encodeURIComponent(ch)))
    .join('')

// Project/slug values that would collide with a more-specific static route under /assistants
// (templates/:id, :id/edit, :slug/start, …) — those rank higher, so we keep such assistants on
// the GUID URL instead of generating a readable link that would resolve to the wrong page.
const RESERVED_PROJECTS = new Set([
  'project',
  'marketplace',
  'templates',
  'new',
  'remote',
  'from-template',
  'favorites',
])
const RESERVED_SLUGS = new Set(['clone', 'edit', 'start'])

// A segment is unsafe in a path if it is a relative reference (`.`/`..`, which the browser
// resolves away before routing) or contains `/` (encodes to %2F, but proxies like nginx with
// merge_slashes decode it back and split the segment) — such values would break or hijack the URL.
const isUnsafeSegment = (value: string): boolean =>
  value === '.' || value === '..' || value.includes('/')

/**
 * Build the human-readable app path `/assistants/{project}/{slug}` (optionally
 * with a suffix like `/edit`), or `null` when project/slug are unavailable or would
 * collide with a reserved static route (caller then falls back to the GUID URL).
 */
const buildReadablePath = (assistant: AssistantRouteRef, suffix = ''): string | null => {
  if (!assistant.project || !assistant.slug) return null
  if (isUnsafeSegment(assistant.project) || isUnsafeSegment(assistant.slug)) return null
  if (RESERVED_PROJECTS.has(assistant.project) || RESERVED_SLUGS.has(assistant.slug)) return null
  return `/assistants/${encodeSegment(assistant.project)}/${encodeSegment(assistant.slug)}${suffix}`
}

/**
 * Build a shareable link to an assistant.
 *
 * Prefers the human-readable `/assistants/{project}/{slug}` form when project and
 * slug are available; otherwise falls back to the GUID-based `/assistants/{id}`
 * form. Both URL shapes are served by the router, so older links keep resolving.
 */
export const getAssistantLink = (assistant: AssistantRouteRef): string => {
  const root = getRootPath()
  const readable = buildReadablePath(assistant)

  return readable ? `${root}${readable}` : `${root}/assistants/${encodeURIComponent(assistant.id)}`
}

/**
 * Navigation target for viewing an assistant. Returns a plain path string for the readable
 * case (pushed directly so `generatePath` doesn't re-encode `@`→`%40`), else the GUID route.
 */
export const getAssistantRoute = (assistant: AssistantRouteRef): string | AssistantRouteTarget => {
  return buildReadablePath(assistant) ?? { name: ASSISTANT_DETAILS, params: { id: assistant.id } }
}

/**
 * Navigation target for editing an assistant. Mirrors {@link getAssistantRoute}
 * but targets the edit URL.
 */
export const getAssistantEditRoute = (
  assistant: AssistantRouteRef
): string | AssistantRouteTarget => {
  return buildReadablePath(assistant, '/edit') ?? { name: 'edit-assistant', params: { id: assistant.id } }
}
