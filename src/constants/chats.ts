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

import { SUPPORTED_FILE_FORMATS_MESSAGE_CHAT } from '@/constants/common'

export const AVATAR_CHAT_FOLDER = 'avatar'
export const DEFAULT_CHAT_FOLDER = 'Chats section'
export const DECIMAL_PLACES = 4

export const TOKEN_TYPE = {
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
} as const

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

export const CHAT_MESSAGE_MARK = {
  CORRECT: 'correct',
  WRONG: 'wrong',
} as const

export const CHAT_FILE_UPLOAD_MESSAGE = `Attach a file to the chat. You can upload files multiple times, and the most recent will be used as context. Use @filename to reference an already attached file. ${SUPPORTED_FILE_FORMATS_MESSAGE_CHAT} Max size: 50MB."`
export const CHAT_FILE_MULTIUPLOAD_MESSAGE = `Attach up to 10 files to the chat (max 100MB each). You can upload files multiple times, and the most recent ones will be used as context. Use @filename to reference an already attached file. ${SUPPORTED_FILE_FORMATS_MESSAGE_CHAT}`
export const WF_FILE_UPLOAD_MESSAGE = `Attach a file to workflow execution. The file will be included in the context of each step, accessible for execution logic. ${SUPPORTED_FILE_FORMATS_MESSAGE_CHAT} Max size: 50MB.`
