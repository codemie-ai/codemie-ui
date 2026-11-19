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
 * Recognising downloadable assistant artifacts at the markdown token seam.
 *
 * `getMarkdownTokens` rewrites `sandbox:/v1/files/` to `${api.BASE_URL}/v1/files/` before
 * lexing, so by the time a token reaches the renderer an artifact link is an ordinary
 * absolute URL under the API base. These predicates are pure so the render seam stays
 * testable without React, and so no network request is needed to decide what a link is.
 */

import api, { artifactFileName } from '@/utils/api'

import { MarkdownToken, TOKEN_TYPES } from './Markdown.utils'

// Schemes DOMPurify keeps by default. Mirrored here rather than widened in SANITIZE_CONFIG —
// Markdown.artifactLinks.test.ts pins this predicate and DOMPurify's default in agreement.
const ALLOWED_LINK_SCHEME = /^(?:https?|mailto|tel|ftp|callto|sms|cid|xmpp):/i
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i

// The id is concatenated into an authenticated URL (`v1/files/${id}` at store/files.ts), so it is
// a trust boundary, not a path: anything outside the shape the back end emits is rejected rather
// than repaired. That shape is base64 (`artifact_storage.py:67`), so the alphabet must include
// `+`, `/` and `=` — excluding them dropped every artifact whose payload used them. The bare token
// still excludes `\`, `?`, `#`, `%` and control characters — EPMCDME-12556. The only query
// permitted after it is a single `share_token=<alnum>` grant, kept verbatim on `fileId` so
// `downloadFile` sends it.
const SAFE_FILE_ID_PATTERN = /^[A-Za-z0-9+/=._~-]+$/

// `/` is legal base64 and so can no longer be refused wholesale; traversal and absolute paths,
// which base64 never produces, are refused explicitly so widening the alphabet cannot reopen
// EPMCDME-12556.
const PATH_ESCAPE_PATTERN = /(?:^\/)|(?:\.\.\/)/

// The only query the seam lets through to the authenticated download URL: the share grant
// `resolveSandboxFileUrls` appends. Alphabet of the back end's generate_share_token.
const SHARE_TOKEN_QUERY = /^share_token=[A-Za-z0-9]+$/

type LinkToken = MarkdownToken & { href?: string }

export interface ArtifactLink {
  /** The raw path segment, i.e. what `filesStore.downloadFile` expects */
  fileId: string
  /** Display-only name: the original name decoded out of `fileId`, then sanitized */
  fileName: string
  /** The MIME type decoded out of `fileId`; display only */
  mimeType?: string
  /** A file a turn published: a `workspace-*` owner and an `artifacts/` name */
  isTurnArtifact: boolean
}

// No leading zero: the back end reads `08~` as a 1-digit head and slices one character short
const SEGMENT_HEAD = /^(0|[1-9]\d*)~/

/**
 * `[mimeType, owner, name]` decoded out of a bare file id, or `null` for anything the back end's
 * `StringSerializer.deserialize` would not read as exactly those three parts. Stricter than
 * `helpers.decodeFileName`, which falls back to the legacy format midway and accepts any count,
 * so a model-invented token decodes to a plausible name the back end then refuses with a 400.
 */
export const decodeArtifactId = (bareId: string): [string, string, string] | null => {
  // `atob` tolerates missing `=` padding; Python's b64decode refuses it, so the download would 400
  if (bareId.length % 4 !== 0) return null

  let data: string
  try {
    const bytes = Uint8Array.from(atob(bareId), (char) => char.charCodeAt(0))
    data = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }

  let parts: string[]
  if (SEGMENT_HEAD.test(data)) {
    parts = []
    // `len` counts code points (Python `len()`), so walk code points, not UTF-16 units
    let rest = Array.from(data)
    while (rest.length > 0) {
      const head = SEGMENT_HEAD.exec(rest.join(''))
      if (!head) return null
      const length = Number(head[1])
      rest = rest.slice(head[0].length)
      if (rest.length < length) return null
      parts.push(rest.slice(0, length).join(''))
      rest = rest.slice(length)
    }
  } else {
    parts = data.split('_')
  }

  return parts.length === 3 ? (parts as [string, string, string]) : null
}

const filesPrefix = () => `${api.BASE_URL}/v1/files/`

/**
 * The `{ fileId, fileName }` for a file id as the back end emits it (the segment after
 * `/v1/files/`, optionally with the share grant), or `null` when it is not a usable artifact id.
 * The one place the id is validated, for markdown links and for a message's `file_names` alike.
 */
export const getArtifactFile = (rawId: string): ArtifactLink | null => {
  const queryAt = rawId.indexOf('?')
  const bareId = queryAt === -1 ? rawId : rawId.slice(0, queryAt)
  if (queryAt !== -1 && !SHARE_TOKEN_QUERY.test(rawId.slice(queryAt + 1))) return null
  // Validated before it is returned, because this is the value that reaches the download URL
  if (!SAFE_FILE_ID_PATTERN.test(bareId) || /^\.+$/.test(bareId)) return null
  if (PATH_ESCAPE_PATTERN.test(bareId)) return null

  // The segment is base64 of `[mime_type, owner, name]`, so the name a user recognises — and the
  // extension the chip badges — only exist after decoding. Display only: `fileId` stays raw,
  // because the encoded form is what the server resolves. A token the back end could not read
  // gives no chip, rather than one whose download fails.
  // The decoded name may be a workspace path; only its last segment is shown (D1). The guard
  // above still runs on the encoded id.
  const decoded = decodeArtifactId(bareId)
  if (!decoded) return null
  const [mimeType, owner, originalFileName] = decoded
  const fileName = artifactFileName(originalFileName)
  if (!fileName) return null

  return {
    fileId: rawId,
    fileName,
    mimeType: mimeType || undefined,
    isTurnArtifact: owner.startsWith('workspace-') && originalFileName.startsWith('artifacts/'),
  }
}

/**
 * The `{ fileId, fileName }` for an artifact link token, or `null` for anything else —
 * a non-link token, a link to another origin, or a link with no usable file segment.
 */
export const getArtifactLink = (token: MarkdownToken): ArtifactLink | null => {
  if (token.type !== TOKEN_TYPES.link) return null

  const { href } = token as LinkToken
  const prefix = filesPrefix()
  if (!href?.startsWith(prefix)) return null

  return getArtifactFile(href.slice(prefix.length))
}

/**
 * True when the link would leave an `<a>` that looks clickable and does nothing: DOMPurify strips
 * its href, or it points at `/v1/files/` with a token the back end cannot serve, so a plain
 * navigation would fail. Such a link renders as plain text instead, so the UI never offers a dead
 * affordance.
 */
export const isDisarmedLink = (token: MarkdownToken): boolean => {
  if (token.type !== TOKEN_TYPES.link) return false

  const rawHref = (token as LinkToken).href ?? ''
  const prefix = filesPrefix()
  if (rawHref.startsWith(prefix)) return getArtifactFile(rawHref.slice(prefix.length)) === null

  const href = rawHref.trim()
  // Relative and fragment hrefs carry no scheme and are kept by DOMPurify
  if (!ANY_SCHEME.test(href)) return false

  return !ALLOWED_LINK_SCHEME.test(href)
}

/**
 * True when a container holds a link the seam renders itself — an artifact chip or a disarmed
 * link — at any depth. Such a container must recurse into its children, because the default
 * rendering collapses it to a single HTML blob and the link token inside is never dispatched.
 *
 * The search is recursive because `**[Download](...)**` nests the link under a `strong` token,
 * so a direct-children check would miss it. Every container with no such link keeps its
 * single-blob rendering, which is what bounds the blast radius.
 */
export const hasSeamRenderedLink = (token: MarkdownToken): boolean => {
  const children = token.tokens
  if (!children) return false

  const list = Array.isArray(children) ? children : [children]
  return list.some(
    (child) =>
      getArtifactLink(child) !== null || isDisarmedLink(child) || hasSeamRenderedLink(child)
  )
}
