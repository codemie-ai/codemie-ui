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

// Single source of truth for LLM-output HTML escaping used by the markdown
// rendering pipeline (Markdown.utils.ts) and the editor/diagram pipeline
// (messageHelpers.ts).

import DOMPurify from 'dompurify'
import { marked } from 'marked'

export const sanitizeMessage = (message: string): string => {
  // Per-call random token prevents LLM-controlled input from colliding with the
  // internal placeholders and bypassing the escaping logic.
  const token = crypto.randomUUID()
  const BR = `___BR_${token}___`
  const LT = `___LT_${token}___`
  const GT = `___GT_${token}___`

  // Preserve <br> tags which are used legitimately (raw \n breaks markdown parsing).
  let result = message.replace(/<br>/g, BR)
  // Protect already-encoded &lt;/&gt; entities with non-< placeholders so the
  // angle-bracket escaping below does not re-escape them, and so unSanitizeMessage
  // can distinguish "was already an entity" from "was a raw character".
  // NOTE: & is intentionally NOT pre-escaped here. marked already encodes bare &
  // to &amp; when generating HTML for text tokens; pre-escaping it would cause
  // marked to double-encode (&amp; → &amp;amp;) and produce visible "&amp;" in prose.
  result = result.replace(/&lt;/g, LT)
  result = result.replace(/&gt;/g, GT)
  // Escape raw angle brackets to prevent LLM content from creating HTML tags.
  result = result.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Restore protected entities as numeric character references.
  // These differ from the escaped forms (&lt;/&gt;) so unSanitizeMessage can
  // tell them apart.  split/join is used for literal-string replacement so the
  // token (which contains hyphens) does not need regex-escaping.
  result = result.split(LT).join('&#60;')
  result = result.split(GT).join('&#62;')
  result = result.split(BR).join('<br>')
  return result
}

export const unSanitizeMessage = (message = ''): string =>
  message
    .replace(/&lt;/g, '<') // Restore bare < that sanitizeMessage escaped
    .replace(/&gt;/g, '>') // Restore bare > that sanitizeMessage escaped
    .replace(/&#60;/g, '&lt;') // Restore originally-encoded &lt;
    .replace(/&#62;/g, '&gt;') // Restore originally-encoded &gt;

// Fixes double-encoding that marked introduces for numeric entity refs inside
// code spans (e.g. &#60; becomes &amp;#60; after the codespan renderer receives it).
export const normalizeCodespanEntities = (text: string): string =>
  text
    .replace(/&amp;lt;/g, '&lt;')
    .replace(/&amp;gt;/g, '&gt;')
    .replace(/&amp;#60;/g, '&#60;')
    .replace(/&amp;#62;/g, '&#62;')

export const getMarkdownRenderer = (): marked.Renderer => {
  const renderer = new marked.Renderer()
  const tableRenderer = renderer.table
  const codespanRenderer = renderer.codespan
  renderer.link = (href: string, title: string | null, text: string): string => {
    const titleAttr = title ? `title="${title}"` : ''
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" ${titleAttr}>${text}</a>`
  }
  // Wrap table in a scrollable container for wide tables.
  renderer.table = (...args: any[]): string =>
    `<div class="overflow-x-auto">${tableRenderer(...args)}</div>`
  // Almost any text containing ~ wraps in del. Removed it completely as agents don't seem to use it correctly anyway.
  renderer.del = (text: string): string => text
  renderer.codespan = (text: string): string => codespanRenderer(normalizeCodespanEntities(text))
  return renderer
}

export const markdown2html = (text: string): string =>
  marked.parse(DOMPurify.sanitize(text), { renderer: getMarkdownRenderer(), breaks: true }).trim()
