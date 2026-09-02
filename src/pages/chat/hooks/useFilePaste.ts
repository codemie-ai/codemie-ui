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

interface UseFilePasteProps {
  onFilePaste: (files: File[]) => void
}

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
])

export const useFilePaste = ({ onFilePaste }: UseFilePasteProps) => {
  const editorInstanceRef = useRef<{ root: HTMLElement } | null>(null)
  const onFilePasteRef = useRef(onFilePaste)
  onFilePasteRef.current = onFilePaste

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const { clipboardData } = event
    if (!clipboardData) return

    const items = Array.from(clipboardData.items)
    const files = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)

    if (files.length === 0) return

    const nonImageFiles = files.filter((file) => !IMAGE_TYPES.has(file.type.toLowerCase()))

    if (nonImageFiles.length === 0) return

    event.preventDefault()
    onFilePasteRef.current(nonImageFiles)
  }, [])

  const setupPasteHandler = useCallback(
    (quillInstance: { root?: HTMLElement } | null | undefined) => {
      if (!quillInstance?.root) return

      if (editorInstanceRef.current?.root) {
        editorInstanceRef.current.root.removeEventListener('paste', handlePaste)
      }

      editorInstanceRef.current = quillInstance as { root: HTMLElement }
      quillInstance.root.addEventListener('paste', handlePaste)
    },
    [handlePaste]
  )

  const removePasteHandler = useCallback(() => {
    if (editorInstanceRef.current?.root) {
      editorInstanceRef.current.root.removeEventListener('paste', handlePaste)
    }
  }, [handlePaste])

  useEffect(() => {
    return () => {
      removePasteHandler()
    }
  }, [removePasteHandler])

  return {
    setupPasteHandler,
    removePasteHandler,
  }
}
