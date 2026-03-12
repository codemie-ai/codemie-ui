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

import {
  useFloating,
  offset,
  shift,
  useHover,
  useDismiss,
  useInteractions,
  FloatingPortal,
  useRole,
  autoUpdate,
} from '@floating-ui/react'
import { FC, useState } from 'react'

import AttachmentSvg from '@/assets/icons/attachment.svg?react'
import File from '@/components/File'
import { CHAT_FILE_MULTIUPLOAD_MESSAGE } from '@/constants/chats'
import { FileMetadata, UseFileUploadReturn } from '@/hooks/useFileUpload'

type ChatPromptFileUploadProps = UseFileUploadReturn & {
  files: FileMetadata[]
}

const ChatPromptFileUpload: FC<ChatPromptFileUploadProps> = ({
  files,
  inputProps,
  removeFile,
  openFilePicker,
}) => {
  const displayedFiles = files.slice(0, 2)
  const [isOpen, setIsOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [offset(8), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const hover = useHover(context, {
    delay: { open: 200, close: 100 },
  })
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss, role])

  return (
    <div className="flex h-fit gap-3 cursor-auto">
      <button
        type="button"
        onClick={openFilePicker}
        aria-label="Attach files"
        data-tooltip-id="react-tooltip"
        data-tooltip-content={CHAT_FILE_MULTIUPLOAD_MESSAGE}
        className="text-text-quaternary hover:text-text-primary hover:scale-110 transform duration-75"
      >
        <AttachmentSvg className="w-4 h-4" aria-hidden="true" />
      </button>

      <div className="flex flex-wrap gap-2">
        <input {...inputProps} />

        {displayedFiles.map((file, index) => (
          <File
            key={index}
            file={file}
            withDelete
            withDownload
            onRemove={() => removeFile(index)}
          />
        ))}

        {files.length > 2 && (
          <>
            <div
              ref={refs.setReference}
              {...getReferenceProps()}
              className="flex justify-center items-center h-8 px-2 rounded-lg bg-surface-base-primary border border-border-structural hover:border-border-specific-interactive-outline text-xs cursor-default"
            >
              +{files.length - 2}
            </div>

            {isOpen && (
              <FloatingPortal>
                <div
                  ref={refs.setFloating}
                  style={floatingStyles}
                  {...getFloatingProps()}
                  className="flex flex-col-reverse gap-1 bg-surface-base-secondary border border-border-structural rounded-lg shadow-lg p-2"
                >
                  {files.slice(2).map((file, index) => (
                    <File
                      key={index + 2}
                      file={file}
                      withDelete
                      withDownload
                      onRemove={() => removeFile(index + 2)}
                    />
                  ))}
                </div>
              </FloatingPortal>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ChatPromptFileUpload
