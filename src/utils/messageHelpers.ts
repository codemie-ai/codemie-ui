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
import {
  getMarkdownRenderer,
  markdown2html,
  sanitizeMessage,
  unSanitizeMessage,
} from '@/utils/htmlEscape'

export { getMarkdownRenderer, markdown2html, sanitizeMessage, unSanitizeMessage }

export const getMarkdownTokens = (message: string): marked.Token[] => {
  return marked.lexer(
    // @ts-expect-error: Property 'replaceAll' does not exist on type 'string'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later
    sanitizeMessage(message).replaceAll('sandbox:/v1/files/', `${api.BASE_URL}/v1/files/`),
    markedOptions
  )
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
