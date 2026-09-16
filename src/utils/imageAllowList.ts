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

/**
 * Decides whether an image URL coming out of an LLM/assistant may be rendered.
 *
 * The allow-list itself is customer configuration served by the backend
 * (`GET /v1/config` -> `allowedImageDomains`), so it is managed per deployment
 * without rebuilding or re-templating the UI.
 */

import { appInfoStore } from '@/store/appInfo'
import api from '@/utils/api'

function parseImageUrl(src: string): URL | undefined {
  let result: URL | undefined
  try {
    result = new URL(src, window.location.href)
  } catch {
    // URL failed to parse
  }
  return result
}

function parseAllowList(): Set<string> {
  return new Set(
    appInfoStore
      .getAllowedImageDomains()
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
      .filter((entry) => entry.replace(/^\./, '').split('.').length >= 2)
  )
}

function getBackendOrigin(): string | null {
  return parseImageUrl(api.BASE_URL)?.origin ?? null
}

function isHttpSafeFromPage(): boolean {
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

function matchesAllowListEntry(hostname: string, entry: string): boolean {
  if (entry.startsWith('.')) {
    // Leading-dot wildcard: matches apex and all subdomains
    // 'evil-example.com'.endsWith('-example.com') ≠ '.example.com' — safe
    return hostname === entry.slice(1) || hostname.endsWith(entry)
  }
  return hostname === entry
}

// Tiers 4-5: only https: is accepted outright; http: is safe just on a local page
function isProtocolAcceptable(url: URL): boolean {
  if (url.protocol === 'https:') return true
  return url.protocol === 'http:' && isHttpSafeFromPage()
}

// Tiers 8-9: empty allow-list means default-deny, otherwise match the hostname
function isHostnameOnAllowList(hostname: string): boolean {
  const allowList = parseAllowList()
  if (allowList.size === 0) return false
  for (const entry of allowList) {
    if (matchesAllowListEntry(hostname, entry)) return true
  }
  return false
}

export function extractHostname(src: string): string | undefined {
  return src.trim() ? parseImageUrl(src)?.hostname || undefined : undefined
}

export function isImageAllowed(src: string): boolean {
  const trimmed = src.trim()
  // Tier 1: blank src — browser re-requests current page; never render
  if (!trimmed) return false
  // Tier 2: data:image/* issues no network request and is always safe
  if (/^data:image\//i.test(trimmed)) return true
  // Tier 3: unparseable URL — no safe interpretation
  const url = parseImageUrl(trimmed)
  if (!url) return false
  if (!isProtocolAcceptable(url)) return false
  // Tier 6: same-origin (covers /api/v1/files/ in local dev)
  if (url.origin === window.location.origin) return true
  // Tier 7: backend origin (covers absolute VITE_API_URL in production)
  if (url.origin === getBackendOrigin()) return true
  return isHostnameOnAllowList(url.hostname)
}
