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

import { useEffect, useRef } from 'react'

interface UseFilePasteProps {
  onFilePaste: (files: File[]) => void
}

export const useFilePaste = ({ onFilePaste }: UseFilePasteProps) => {
  const editorInstanceRef = useRef<any>(null)

  const isImageFile = (file: File): boolean => {
    const imageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'image/svg+xml',
    ]
    return imageTypes.includes(file.type.toLowerCase())
  }

  const handlePaste = async (event: ClipboardEvent) => {
    const { clipboardData } = event
    if (!clipboardData) return

    const items = Array.from(clipboardData.items)
    const files = items
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)

    if (files.length === 0) return

    // Filter out image files since they are handled by imageDropAndPaste module
    const nonImageFiles = files.filter((file) => !isImageFile(file))

    if (nonImageFiles.length === 0) return

    // Prevent default paste behavior for non-image files
    event.preventDefault()

    // Call the callback with non-image files
    onFilePaste(nonImageFiles)
  }

  const setupPasteHandler = (quillInstance: any) => {
    if (!quillInstance?.root) return

    editorInstanceRef.current = quillInstance
    quillInstance.root.addEventListener('paste', handlePaste)
  }

  const removePasteHandler = () => {
    if (editorInstanceRef.current?.root) {
      editorInstanceRef.current.root.removeEventListener('paste', handlePaste)
    }
  }

  useEffect(() => {
    return () => {
      removePasteHandler()
    }
  }, [])

  return {
    setupPasteHandler,
    removePasteHandler,
  }
}
