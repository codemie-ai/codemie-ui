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

import DOMPurify from 'dompurify'
import { marked } from 'marked'

import api from '@/utils/api'

import { FileExtension } from '../CodeBlock/fileExtensions'

export const TOKEN_TYPES = {
  space: 'space',
  code: 'code',
  blockquote: 'blockquote',
  html: 'html',
  heading: 'heading',
  hr: 'hr',
  list: 'list',
  listitem: 'listitem',
  checkbox: 'checkbox',
  paragraph: 'paragraph',
  table: 'table',
  tablerow: 'tablerow',
  tablecell: 'tablecell',
  strong: 'strong',
  em: 'em',
  codespan: 'codespan',
  br: 'br',
  del: 'del',
  link: 'link',
  image: 'image',
  text: 'text',
  escape: 'escape',
} as const

export type MarkdownTokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES]

export interface MarkdownListTokenItem {
  task: string
  checked: boolean
  tokens: MarkdownToken[]
}

export type MarkdownToken = {
  type: MarkdownTokenType
  raw: string
  text?: string
  tokens?: MarkdownToken | MarkdownToken[]
  lang: FileExtension
  ordered?: boolean
  start?: number
  items?: MarkdownListTokenItem[]
}

export const CHAT_MESSAGE_MARK = {
  CORRECT: 'correct',
  WRONG: 'wrong',
}

export const sanitizeMessage = (message: string) => {
  // We need to keep <br> as they are. <br> are used legitimately because \n breaks markdown parsing
  let result = message.replace(/<br>/g, '___BR_PLACEHOLDER___')
  result = result.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  result = result.replace(/___BR_PLACEHOLDER___/g, '<br>')

  return result
}

export const unSanitizeMessage = (message = '') => {
  return message.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

export const markedOptions = {
  async: false,
  baseUrl: null,
  breaks: true,
  extensions: null,
  gfm: true,
  headerIds: true,
  headerPrefix: '',
  highlight: null,
  hooks: null,
  langPrefix: 'language-',
  mangle: true,
  pedantic: false,
  renderer: null,
  sanitize: false,
  sanitizer: null,
  silent: false,
  smartypants: false,
  tokenizer: null,
  walkTokens: null,
  xhtml: false,
} as const

export const getMarkdownTokens = (message: string): MarkdownToken[] => {
  return marked.lexer(
    // @ts-expect-error: Property 'replaceAll' does not exist on type 'string'
    sanitizeMessage(message).replaceAll('sandbox:/v1/files/', `${api.BASE_URL}/v1/files/`),
    markedOptions
  )
}

export const markdown2html = (text) => {
  return marked
    .parse(DOMPurify.sanitize(text), { renderer: getMarkdownRenderer(), breaks: true })
    .trim()
}

export const getMarkdownRenderer = () => {
  const renderer = new marked.Renderer()
  const tableRenderer = renderer.table
  const codespanRenderer = renderer.codespan
  renderer.link = (href, title, text) => {
    const titleAttr = title ? `title="${title}"` : ''
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" ${titleAttr}>${text}</a>`
  }
  // Wrap table element to have horizontal scroll for tables
  renderer.table = (...args) => `<div class="overflow-x-auto">${tableRenderer(...args)}</div>`
  // Almost any text containing ~ wraps in del. Removed it completely as agents don't seem to use it correctly anyway.
  renderer.del = (text) => text
  renderer.codespan = (text) =>
    codespanRenderer(text.replace(/&amp;lt;/g, '&lt;').replace(/&amp;gt;/g, '&gt;'))

  return renderer
}
