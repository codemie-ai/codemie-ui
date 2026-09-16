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
 * The single sanitizer every LLM/assistant render path goes through.
 *
 * Image blocking is a DOMPurify hook rather than a `marked` renderer override, so markdown
 * images and raw HTML tags are gated by the same code. The hook lives on a dedicated
 * DOMPurify instance registered once at module load: the global `DOMPurify` used elsewhere
 * for user-authored content (chat editor, toasts, mermaid SVG) keeps its default behaviour.
 */

import DOMPurify from 'dompurify'

import eyeOffIconMarkup from '@/assets/icons/eye-off.svg?raw'
import {
  BLOCKED_IMAGE_BADGE_CLASS_NAME,
  BLOCKED_IMAGE_BADGE_TITLE,
  BLOCKED_IMAGE_ICON_CLASS,
  getBlockedImageLabel,
} from '@/components/BlockedImageBadge/BlockedImageBadge'
import { extractHostname, isImageAllowed } from '@/utils/imageAllowList'

// Attributes that make the browser fetch an image. DOMPurify allows all of them by default,
// so raw HTML in LLM output could otherwise reach the network through any of them.
const IMAGE_URL_ATTRIBUTES = ['src', 'srcset', 'poster', 'background'] as const

// `target` is added by the link renderer and stripped by DOMPurify's defaults
const SANITIZE_CONFIG = { ADD_ATTR: ['target'] }

// srcset is a comma-separated candidate list, each entry `<url> [descriptor]`
function parseSrcsetUrls(value: string): string[] {
  return value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean)
}

function findBlockedAttributeUrl(name: string, value: string): string | undefined {
  const urls = name === 'srcset' ? parseSrcsetUrls(value) : [value]
  return urls.find((url) => !isImageAllowed(url))
}

// Every blocked URL the element carries, in IMAGE_URL_ATTRIBUTES order; empty when it is clean
function findBlockedImageUrls(node: Element): string[] {
  return IMAGE_URL_ATTRIBUTES.flatMap((name) => {
    const value = node.getAttribute(name)
    const blocked = value === null ? undefined : findBlockedAttributeUrl(name, value)
    return blocked === undefined ? [] : [blocked]
  })
}

// The same eye-off asset BlockedImageBadge renders through SVGR, parsed once. Build-time markup
// from our own assets, never user or LLM input, and parsed as image/svg+xml rather than assigned to
// innerHTML so no HTML sink is involved.
//
// The asset must keep its `xmlns` declaration: without it the parsed root lands in the null
// namespace and DOMPurify drops the icon as an invalid-namespace element. The drift test in
// Markdown.sanitize.test.tsx fails if that ever regresses.
const eyeOffIconNode = (() => {
  const root = new DOMParser().parseFromString(eyeOffIconMarkup, 'image/svg+xml').documentElement
  // The asset is pretty-printed, and SVGR drops that indentation while the XML parser keeps it.
  // Left in place it would land in the badge's textContent and read as stray spaces in the label.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)
  textNodes.forEach((textNode) => textNode.remove())
  // Same class the React path puts on the icon, so both badges stay pixel-identical
  root.setAttribute('class', BLOCKED_IMAGE_ICON_CLASS)
  return root
})()

function createBlockedImageBadgeNode(doc: Document, src: string): HTMLSpanElement | null {
  if (!src.trim()) return null
  const hostname = extractHostname(src)
  const badge = doc.createElement('span')
  badge.className = BLOCKED_IMAGE_BADGE_CLASS_NAME
  if (hostname) badge.setAttribute('data-blocked-image-hostname', hostname)
  badge.setAttribute('title', BLOCKED_IMAGE_BADGE_TITLE)
  // Decorative, like the React path: the label text carries the meaning for screen readers
  badge.append(doc.importNode(eyeOffIconNode, true), getBlockedImageLabel(hostname))
  return badge
}

function removeBlockedImageAttributes(node: Element): void {
  for (const name of IMAGE_URL_ATTRIBUTES) {
    const value = node.getAttribute(name)
    if (value !== null && findBlockedAttributeUrl(name, value) !== undefined) {
      node.removeAttribute(name)
    }
  }
}

function applyImageAllowListToNode(node: Element): void {
  const [blockedUrl] = findBlockedImageUrls(node)
  if (blockedUrl === undefined) return
  // <img> becomes a badge, so a blocked image is visible to the user instead of silently gone
  if (node.tagName === 'IMG') {
    const badge = createBlockedImageBadgeNode(node.ownerDocument, blockedUrl)
    if (badge) node.replaceWith(badge)
    else node.remove()
    return
  }
  // A <source> has no standalone rendering — drop it and let the <img> fallback apply
  if (node.tagName === 'SOURCE') {
    node.remove()
    return
  }
  removeBlockedImageAttributes(node)
}

const llmHtmlPurifier = DOMPurify(window)
llmHtmlPurifier.addHook('afterSanitizeAttributes', applyImageAllowListToNode)

/**
 * Sanitize HTML rendered from LLM/assistant output, applying the image allow-list.
 *
 * Call this on the HTML `marked` produced — never on the markdown source — so both the
 * `<img>` tags marked emits and any raw HTML passed through are gated.
 */
export function sanitizeHtmlWithImageAllowList(html: string): string {
  return llmHtmlPurifier.sanitize(html, SANITIZE_CONFIG)
}
