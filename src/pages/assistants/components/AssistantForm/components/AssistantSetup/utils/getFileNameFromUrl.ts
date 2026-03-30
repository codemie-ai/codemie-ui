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

import { decodeFileName } from '@/utils/utils'

const FILE_URL_SEGMENT = '/v1/files/'

const tryDecodeFileName = (encodedId: string): string | null => {
  try {
    const decoded = decodeFileName(encodedId)
    return decoded?.originalFileName ?? null
  } catch {
    return null
  }
}

const extractFileId = (url: string): string | null => {
  const segmentIndex = url?.indexOf(FILE_URL_SEGMENT) ?? -1
  if (segmentIndex === -1) return null
  return url.slice(segmentIndex + FILE_URL_SEGMENT.length)
}

export const isBackendFileUrl = (url: string): boolean => {
  const fileId = extractFileId(url)
  return fileId !== null && tryDecodeFileName(fileId) !== null
}

export const getFileNameFromUrl = (url: string): string => {
  if (!url) return ''
  const fileId = extractFileId(url)
  if (fileId !== null) {
    return tryDecodeFileName(fileId) || fileId
  }
  return url
}
