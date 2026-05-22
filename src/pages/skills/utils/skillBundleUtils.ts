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
