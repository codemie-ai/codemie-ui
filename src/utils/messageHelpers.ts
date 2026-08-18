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

import { markedOptions } from '@/constants/chats'
import api from '@/utils/api'

export const sanitizeMessage = (message: string): string => {
  // We need to keep <br> as they are. <br> are used legitimately because \n breaks markdown parsing
  let result = message.replace(/<br>/g, '___BR_PLACEHOLDER___')
  result = result.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  result = result.replace(/___BR_PLACEHOLDER___/g, '<br>')

  return result
}

export const unSanitizeMessage = (message = ''): string => {
  return message.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

export const getMarkdownTokens = (message: string): marked.Token[] => {
  return marked.lexer(
    // @ts-expect-error: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later
    sanitizeMessage(message).replaceAll('sandbox:/v1/files/', `${api.BASE_URL}/v1/files/`),
    markedOptions
  )
}

export const markdown2html = (text: string): string => {
  return marked
    .parse(DOMPurify.sanitize(text), { renderer: getMarkdownRenderer(), breaks: true })
    .trim()
}

export const getMarkdownRenderer = (): marked.Renderer => {
  const renderer = new marked.Renderer()
  const tableRenderer = renderer.table
  const codespanRenderer = renderer.codespan
  renderer.link = (href: string, title: string | null, text: string): string => {
    const titleAttr = title ? `title="${title}"` : ''
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" ${titleAttr}>${text}</a>`
  }
  // Wrap table element to have horizontal scroll for tables
  renderer.table = (...args: any[]): string =>
    `<div class="overflow-x-auto">${tableRenderer(...args)}</div>`
  // Almost any text containing ~ wraps in del. Removed it completely as agents don't seem to use it correctly anyway.
  renderer.del = (text: string): string => text
  renderer.codespan = (text: string): string =>
    codespanRenderer(text.replace(/&amp;lt;/g, '&lt;').replace(/&amp;gt;/g, '&gt;'))

  return renderer
}

export const getAssistantMentions = (rawText: string): (string | null)[] => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = DOMPurify.sanitize(rawText)

  // Select all elements with the class 'mention'
  const mentions = tempDiv.querySelectorAll('.mention')
  // Extract the value of the data-id attribute from each element that has data-type='assistant'
  return Array.from(mentions)
    .filter((mention) => mention.getAttribute('data-type') === 'assistant')
    .map((mention) => mention.getAttribute('data-id'))
}

export const getAnyMentions = (rawText: string): (string | null)[] => {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = DOMPurify.sanitize(rawText)

  // Select all elements with the class 'mention'
  const mentions = tempDiv.querySelectorAll('.mention')
  return Array.from(mentions).map((mention) => mention.getAttribute('data-id'))
}
