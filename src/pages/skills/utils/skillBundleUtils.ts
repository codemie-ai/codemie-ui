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

import { SkillCompanionFile } from '@/types/entity/skill'

export const formatFileSize = (sizeBytes?: number): string => {
  if (sizeBytes == null) return 'Unknown size'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

const TEXT_FILE_EXTENSIONS = new Set([
  'css',
  'csv',
  'html',
  'js',
  'json',
  'jsx',
  'md',
  'mjs',
  'py',
  'sh',
  'sql',
  'svg',
  'ts',
  'tsx',
  'txt',
  'xml',
  'yaml',
  'yml',
])

const WINDOWS_ABSOLUTE_PATH_REGEXP = /^[a-zA-Z]:/

const trimPathSeparators = (input: string): string => {
  let start = 0
  let end = input.length

  while (start < end && input[start] === '/') {
    start += 1
  }

  while (end > start && input[end - 1] === '/') {
    end -= 1
  }

  return input.slice(start, end)
}

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

const isTextFile = (file: File): boolean => {
  const mimeType = file.type.toLowerCase()

  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('json') ||
    mimeType.includes('xml') ||
    mimeType.includes('javascript') ||
    mimeType.includes('svg') ||
    mimeType.includes('yaml')
  ) {
    return true
  }

  return TEXT_FILE_EXTENSIONS.has(getFileExtension(file.name))
}

export const normalizeBundleFolderPath = (input: string): string => {
  const normalizedInput = input.trim().replace(/\\+/g, '/')

  if (!normalizedInput) return ''
  if (normalizedInput.startsWith('/') || WINDOWS_ABSOLUTE_PATH_REGEXP.test(normalizedInput)) {
    throw new Error('Folder path must be relative')
  }

  const trimmedInput = trimPathSeparators(normalizedInput)

  const segments = trimmedInput.split('/').filter(Boolean)

  if (segments.length === 0) return ''
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('Folder path cannot contain . or .. segments')
  }

  return segments.join('/')
}

export const buildBundleFilePath = (folderPath: string, fileName: string): string => {
  const normalizedFolderPath = normalizeBundleFolderPath(folderPath)
  const normalizedFileName = fileName.trim().replace(/\\+/g, '/').split('/').filter(Boolean).pop()

  if (!normalizedFileName) {
    throw new Error('File name is required')
  }

  const fullPath = normalizedFolderPath
    ? `${normalizedFolderPath}/${normalizedFileName}`
    : normalizedFileName

  if (fullPath.toLowerCase() === 'skill.md') {
    throw new Error('SKILL.md is reserved for the main skill instructions')
  }

  return fullPath
}

export const getBundleFolderPath = (filePath: string): string => {
  const normalizedPath = filePath.replace(/\\+/g, '/')
  const segments = normalizedPath.split('/').filter(Boolean)

  return segments.slice(0, -1).join('/')
}

export const getBundleFileName = (filePath: string): string => {
  const normalizedPath = filePath.replace(/\\+/g, '/')
  return normalizedPath.split('/').filter(Boolean).pop() ?? filePath
}

export const collectBundleFolders = (
  companionFiles: SkillCompanionFile[],
  folders: string[] = []
): string[] => {
  const allFolders = new Set<string>([''])

  folders.forEach((folder) => {
    const normalizedFolder = normalizeBundleFolderPath(folder)

    if (!normalizedFolder) {
      allFolders.add('')
      return
    }

    const segments = normalizedFolder.split('/')
    segments.forEach((_, index) => {
      allFolders.add(segments.slice(0, index + 1).join('/'))
    })
  })

  companionFiles.forEach((file) => {
    const folderPath = getBundleFolderPath(file.path)

    if (!folderPath) {
      allFolders.add('')
      return
    }

    const segments = folderPath.split('/')
    segments.forEach((_, index) => {
      allFolders.add(segments.slice(0, index + 1).join('/'))
    })
  })

  return Array.from(allFolders).sort((left, right) => {
    if (!left) return -1
    if (!right) return 1
    return left.localeCompare(right)
  })
}

export const fileToSkillCompanionFile = async (
  file: File,
  folderPath: string
): Promise<SkillCompanionFile> => {
  const path = buildBundleFilePath(folderPath, file.name)
  const encoding = isTextFile(file) ? 'text' : 'base64'
  const content =
    encoding === 'text' ? await file.text() : arrayBufferToBase64(await file.arrayBuffer())

  return {
    path,
    content,
    encoding,
    mime_type: file.type || undefined,
    size_bytes: file.size,
  }
}

export const getBundleTotals = (
  companionFiles: SkillCompanionFile[]
): { totalSizeBytes: number; fileCount: number } => {
  const totalSizeBytes = companionFiles.reduce((sum, file) => sum + (file.size_bytes ?? 0), 0)

  return { totalSizeBytes, fileCount: companionFiles.length }
}

export interface BundleSeedLimits {
  maxCount: number
  maxFileSize: number
  maxTotalSize: number
}

type BundleSkipReason = 'too_large' | 'count_exceeded' | 'total_exceeded'

const KB = 1024
const MB = 1024 * 1024
const MAX_LISTED_PATHS = 5

// Mirrors the backend bundle-seed rules and warning text, so a locally computed warning matches
// the server `bundle_warning`. Keep in sync with the backend implementation.
export const formatSeedLimitSize = (bytes: number): string => {
  const trim = (value: number) => value.toFixed(1).replace(/\.0$/, '')
  if (bytes >= MB) return `${trim(bytes / MB)} MB`
  if (bytes >= KB) return `${trim(bytes / KB)} KB`
  return `${bytes} byte${bytes === 1 ? '' : 's'}`
}

// Files are taken in path order; a skipped file never counts toward the total.
export const planBundleSeed = (
  companionFiles: SkillCompanionFile[],
  limits: BundleSeedLimits
): { path: string; reason: BundleSkipReason }[] => {
  const skipped: { path: string; reason: BundleSkipReason }[] = []
  let seededCount = 0
  let totalSize = 0

  const sorted = [...companionFiles].sort((a, b) => {
    if (a.path < b.path) return -1
    return a.path > b.path ? 1 : 0
  })

  sorted.forEach((file) => {
    const size = file.size_bytes ?? 0

    if (size > limits.maxFileSize) {
      skipped.push({ path: file.path, reason: 'too_large' })
    } else if (seededCount >= limits.maxCount) {
      skipped.push({ path: file.path, reason: 'count_exceeded' })
    } else if (totalSize + size > limits.maxTotalSize) {
      skipped.push({ path: file.path, reason: 'total_exceeded' })
    } else {
      seededCount += 1
      totalSize += size
    }
  })

  return skipped
}

const formatSkippedPaths = (paths: string[]): string => {
  const extra = paths.length - MAX_LISTED_PATHS
  const listed = paths.slice(0, MAX_LISTED_PATHS).join(', ')
  const overflow = extra > 0 ? `, ... and ${extra} more` : ''

  return ` (${listed}${overflow})`
}

export const buildBundleWarning = (
  companionFiles: SkillCompanionFile[],
  limits: BundleSeedLimits
): string | null => {
  const skipped = planBundleSeed(companionFiles, limits)

  // Order matters: it is the order the sentences appear in.
  const templates: [BundleSkipReason, (count: number) => string][] = [
    [
      'too_large',
      (count) =>
        `${count} file(s) exceed the ${formatSeedLimitSize(limits.maxFileSize)} per-file limit`,
    ],
    ['count_exceeded', (count) => `${count} file(s) exceed the ${limits.maxCount}-file limit`],
    [
      'total_exceeded',
      (count) =>
        `${count} file(s) exceed the ${formatSeedLimitSize(limits.maxTotalSize)} total size limit`,
    ],
  ]

  const sentences = templates.flatMap(([reason, text]) => {
    const paths = skipped.filter((entry) => entry.reason === reason).map((entry) => entry.path)

    return paths.length ? [`${text(paths.length)}${formatSkippedPaths(paths)}.`] : []
  })

  return sentences.length
    ? `${sentences.join(' ')} These files will not be available in an assistant workspace.`
    : null
}
