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

import { filesStore } from '@/store/files'
import { decodeFileName } from '@/utils/utils'

export const WORKFLOW_ICON_NAME_PREFIX = 'workflow-icons/'

export const WORKFLOW_ICON_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
export const WORKFLOW_ICON_HINT = 'Must be PNG, JPEG, WebP or GIF and max size 500kb'

const ABSOLUTE_OR_INLINE_URL = /^(https?:\/\/|\/|data:)/

export const decodeIconName = (value: string): string | null => {
  if (ABSOLUTE_OR_INLINE_URL.test(value)) return null
  try {
    const name = decodeFileName(value)?.originalFileName
    return name?.startsWith(WORKFLOW_ICON_NAME_PREFIX) ? name : null
  } catch {
    return null
  }
}

const MAX_LOCAL_ICON_PREVIEWS = 20
const localIconPreviews = new Map<string, string>()

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(reader.error?.message ?? 'Failed to read file'))
    reader.readAsDataURL(file)
  })

// Keyed by token so the preview survives the upload widget unmounting, e.g. when the editor panel closes before save.
// Data URLs need no revocation, so evicting an entry cannot break an image that is already on screen.
export const registerLocalIconPreview = async (token: string, file: File) => {
  const dataUrl = await readAsDataUrl(file).catch(() => null)
  if (!dataUrl) return

  localIconPreviews.delete(token)
  localIconPreviews.set(token, dataUrl)
  if (localIconPreviews.size > MAX_LOCAL_ICON_PREVIEWS) {
    localIconPreviews.delete(localIconPreviews.keys().next().value!)
  }
}

// Workflow icons are stored as bare file tokens; assistant icons are already full URLs.
export const resolveIconUrl = (value: string | null | undefined): string | null | undefined => {
  if (!value) return value
  const localPreview = localIconPreviews.get(value)
  if (localPreview) return localPreview
  if (ABSOLUTE_OR_INLINE_URL.test(value)) return value
  return decodeIconName(value) ? filesStore.getFileURL(value) : value
}
