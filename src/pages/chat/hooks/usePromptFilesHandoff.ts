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

import { useCallback, useEffect, useRef } from 'react'

import { FileMetadata } from '@/hooks/useFileUpload'

/**
 * Switching between the desktop and the mobile layout remounts the chat area, prompt included.
 * The prompt reports its attachments here and gets the uploaded ones back when it remounts
 * because of such a switch — not when the chat changes or the page is opened again.
 */
export const usePromptFilesHandoff = (chatId: string | undefined, isMobileLayout: boolean) => {
  const handoffRef = useRef<{ chatId?: string; files: FileMetadata[] }>({ files: [] })
  const chatIdRef = useRef(chatId)
  chatIdRef.current = chatId

  const layoutRef = useRef(isMobileLayout)
  const isLayoutSwitch = layoutRef.current !== isMobileLayout

  useEffect(() => {
    layoutRef.current = isMobileLayout
  }, [isMobileLayout])

  const onFilesChange = useCallback((files: FileMetadata[]) => {
    handoffRef.current = { chatId: chatIdRef.current, files }
  }, [])

  // Uploads still in progress belonged to the unmounted prompt, so only finished ones carry over.
  const initialFiles =
    isLayoutSwitch && handoffRef.current.chatId === chatId
      ? handoffRef.current.files.filter((file) => file.fileId)
      : undefined

  return { initialFiles, onFilesChange }
}
