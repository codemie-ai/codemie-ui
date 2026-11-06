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

import { FILE_EXTENSIONS } from '@/components/CodeBlock/fileExtensions'

export enum PreviewKind {
  MARKDOWN = 'markdown',
  JSON = 'json',
  TEXT = 'text',
}

const MARKDOWN_EXTENSIONS = ['md', 'markdown']
const TEXT_EXTENSIONS = new Set<string>(Object.values(FILE_EXTENSIONS))

const FRONT_MATTER_REGEX = /^\uFEFF?---\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/

// Dockerfile, Makefile, .gitignore, .env have no extension: their whole name is used instead
export const getPathExtension = (path: string) => {
  const name = path.split('/').pop() ?? path
  return name.slice(name.lastIndexOf('.') + 1).toLowerCase()
}

export const getPreviewKind = (path: string): PreviewKind | null => {
  const extension = getPathExtension(path)
  if (MARKDOWN_EXTENSIONS.includes(extension)) return PreviewKind.MARKDOWN
  if (extension === FILE_EXTENSIONS.json) return PreviewKind.JSON
  if (TEXT_EXTENSIONS.has(extension)) return PreviewKind.TEXT
  return null
}

export const splitFrontMatter = (text: string): { frontMatter: string | null; body: string } => {
  const match = FRONT_MATTER_REGEX.exec(text)
  if (!match) return { frontMatter: null, body: text }

  return { frontMatter: match[1] ?? '', body: text.slice(match[0].length) }
}

const UNSAFE_INTEGER_REGEX = /(?<![\w.])-?\d{16,}(?![\w.])/

const hasUnsafeInteger = (text: string) =>
  UNSAFE_INTEGER_REGEX.test(text.replace(/"(?:[^"\\]|\\.)*"/g, '""'))

export const formatJson = (text: string): string => {
  try {
    if (hasUnsafeInteger(text)) return text
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

export interface TextPreview {
  kind: PreviewKind
  frontMatter: string | null
  body: string
}

export const buildTextPreview = (
  kind: PreviewKind | null,
  content: string | null | undefined
): TextPreview | null => {
  if (!kind || typeof content !== 'string') return null
  if (kind === PreviewKind.MARKDOWN) return { kind, ...splitFrontMatter(content) }
  if (kind === PreviewKind.JSON) return { kind, frontMatter: null, body: formatJson(content) }
  return { kind, frontMatter: null, body: content }
}

const IMAGE_PREVIEWABLE_EXTENSIONS = [
  'apng',
  'avif',
  'bmp',
  'gif',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
] as const

const IMAGE_MIME_TYPES_BY_EXTENSION: Record<(typeof IMAGE_PREVIEWABLE_EXTENSIONS)[number], string> =
  {
    apng: 'image/apng',
    avif: 'image/avif',
    bmp: 'image/bmp',
    gif: 'image/gif',
    ico: 'image/x-icon',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  }

const isImageMimeType = (mimeType?: string | null) => {
  return mimeType?.toLowerCase().startsWith('image/') ?? false
}

export const canPreviewAsImage = ({
  path,
  hasData,
  mimeType,
}: {
  path?: string | null
  hasData: boolean
  mimeType?: string | null
}) => {
  if (!path || !hasData) return false
  if (isImageMimeType(mimeType)) return true

  return IMAGE_PREVIEWABLE_EXTENSIONS.includes(
    getPathExtension(path) as (typeof IMAGE_PREVIEWABLE_EXTENSIONS)[number]
  )
}

const getNormalizedImageMimeType = (path: string, mimeType?: string | null) => {
  const normalizedMimeType = mimeType?.toLowerCase()

  if (normalizedMimeType?.startsWith('image/')) return normalizedMimeType

  const extension = getPathExtension(path) as keyof typeof IMAGE_MIME_TYPES_BY_EXTENSION

  return IMAGE_MIME_TYPES_BY_EXTENSION[extension] ?? 'image/*'
}

export const getImagePreviewSrc = ({
  path,
  content,
  mimeType,
  isBinary,
}: {
  path: string
  content: string
  mimeType?: string | null
  isBinary: boolean
}) => {
  if (content.startsWith('data:')) return content

  const normalizedMimeType = getNormalizedImageMimeType(path, mimeType)
  const normalizedContent = isBinary ? content.replace(/\s+/g, '') : content

  if (normalizedMimeType === 'image/svg+xml' && !isBinary) {
    return `data:${normalizedMimeType};charset=utf-8,${encodeURIComponent(normalizedContent)}`
  }

  return `data:${normalizedMimeType};base64,${normalizedContent}`
}

export const formatFileSize = (size?: number) => {
  if (size == null) return 'Unknown size'
  return `${size.toLocaleString()} bytes`
}
