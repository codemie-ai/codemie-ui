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


import type { A2uiDataModel } from './types'

/**
 * Small helpers with no dependencies on the renderer.
 *
 * Two jobs that are unrelated to each other but alike in kind: turning an agent-authored
 * URL into one that is safe to request, and turning a submitted data model into the line
 * of text the chat shows in its place. Neither is big enough to be its own module.
 */

/** Schemes agent-authored media URLs are allowed to use. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

/**
 * Sanitizes an agent-authored URL for use in media components.
 *
 * Only absolute http(s) URLs pass; everything else — javascript:, data:,
 * vbscript:, relative or malformed URLs, non-string values — returns null so
 * the caller can render a safe placeholder without firing a network request.
 *
 * Pure function: no DOM, no side effects.
 */
export function sanitizeAgentUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null

  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  let parsed: URL
  try {
    // No base URL on purpose: relative references must fail here.
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null

  return parsed.href
}

/**
 * The host (with port, when non-default) a media element would contact for the
 * given URL — shown to the user before any media request is made, so the
 * decision to load agent-authored media is informed.
 *
 * Returns an empty string when the value is not a parsable URL.
 */
export function agentUrlHost(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') return ''
  try {
    return new URL(rawUrl.trim()).host
  } catch {
    return ''
  }
}


const MAX_VALUE_LENGTH = 60

const truncate = (value: string): string =>
  value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value

/** Formats one data-model value for the chip; null means "skip this entry". */
const formatValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() ? truncate(value.trim()) : null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const parts = value
      .filter(
        (item): item is string | number | boolean =>
          typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
      )
      .map(String)
    return parts.length ? truncate(parts.join(', ')) : null
  }
  return null
}

/**
 * Compact one-line summary for the user "chip" of an A2UI answer, mirroring the
 * old InteractiveSurface.buildDisplayText: each top-level data-model field
 * contributes "field: value"; the (humanized) action name appears only when the
 * data model adds nothing — a pure Approve/Reject click.
 */
export function buildA2uiDisplayText(
  actionName: string,
  dataModel?: A2uiDataModel | null
): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(dataModel ?? {})) {
    const formatted = formatValue(value)
    if (formatted !== null) parts.push(`${key}: ${formatted}`)
  }
  if (parts.length === 0 && actionName) {
    parts.push(actionName.replace(/[_-]+/g, ' ').trim())
  }
  return parts.length ? parts.join(' · ') : 'Submitted'
}
