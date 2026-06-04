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

import { FC, MouseEvent, useEffect, useRef, useState } from 'react'

import PlaySvg from '@/assets/icons/play.svg?react'
import Button from '@/components/Button'
import Editor, { EditorRef, EditorValue } from '@/components/Editor/Editor'
import Markdown from '@/components/markdown/Markdown'
import Popup from '@/components/Popup'
import { ButtonSize } from '@/constants'
import { WF_FILE_UPLOAD_MESSAGE } from '@/constants/chats'
import { FileMetadata, useFileUpload } from '@/hooks/useFileUpload'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import toaster from '@/utils/toaster'

import ChatPromptFileUpload from '../../../chat/components/ChatPrompt/ChatPromptFileUpload'

interface ContinueWithInputPopupProps {
  visible: boolean
  stateId: string
  workflowId: string
  executionId: string
  onHide: () => void
  onContinue: (message: string | undefined, fileNames: string[]) => void
  isSubmitting: boolean
}

const ContinueWithInputPopup: FC<ContinueWithInputPopupProps> = ({
  visible,
  stateId,
  workflowId,
  executionId,
  onHide,
  onContinue,
  isSubmitting,
}) => {
  const editorRef = useRef<EditorRef>(null)
  const [prompt, setPrompt] = useState<EditorValue>({ message: '', messageRaw: '' })
  const [stateOutput, setStateOutput] = useState<string | null>(null)
  const [files, setFiles] = useState<FileMetadata[]>([])

  const fileUpload = useFileUpload({
    files,
    setFiles,
    handleErrors: (errors) => {
      errors.forEach(({ message: msg }) => toaster.error(msg))
    },
  })

  useEffect(() => {
    let cancelled = false
    if (visible) {
      setPrompt({ message: '', messageRaw: '' })
      setFiles([])
      workflowExecutionsStore
        .getWorkflowExecutionStateOutput(workflowId, executionId, stateId)
        .then((output) => {
          if (!cancelled) setStateOutput(output)
        })
        .catch(() => {
          if (!cancelled) setStateOutput(null)
        })
    }
    return () => {
      cancelled = true
    }
  }, [visible, workflowId, executionId, stateId])

  useEffect(() => {
    if (visible) editorRef.current?.focus()
  }, [visible])

  const handleHide = () => {
    setPrompt({ message: '', messageRaw: '' })
    setFiles([])
    onHide()
  }

  const handleContinue = () => {
    const fileNames = files.flatMap((f) => (f.fileId ? [f.fileId] : []))
    onContinue(prompt.message.trim() || undefined, fileNames)
    setPrompt({ message: '', messageRaw: '' })
    setFiles([])
  }

  const isDisabled = isSubmitting || fileUpload.hasActiveUploads

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) e.preventDefault()
  }

  const focusEditor = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) editorRef.current?.focus()
  }

  return (
    <Popup
      headerContent={
        <div className="flex flex-col gap-1">
          <h4 className="text-base font-semibold mb-0">Workflow interrupted</h4>
          <p className="text-xs font-normal text-text-quaternary">
            Review the output, add a message if needed, then continue the workflow.
          </p>
        </div>
      }
      visible={visible}
      onHide={handleHide}
      hideFooter
      className="w-[1083px] max-w-[90vw]"
      bodyClassName="p-4"
    >
      <div className="h-[620px] p-8 rounded-lg border border-border-primary bg-surface-base-secondary flex flex-col gap-4">
        {stateOutput && (
          <div className="w-full max-w-[731px] flex-1 overflow-y-auto text-base font-normal text-text-primary">
            <Markdown content={stateOutput} />
          </div>
        )}

        <div className="p-px rounded-xl bg-interrupted-primary">
          <div
            onClick={focusEditor}
            onMouseDown={handleMouseDown}
            className="flex flex-col gap-2 p-2 rounded-xl bg-surface-elevated min-h-32 max-h-40 cursor-text"
          >
            <Editor
              ref={editorRef}
              value={prompt}
              withMentions={false}
              onChange={setPrompt}
              onAddFiles={fileUpload.addFiles}
              disabled={isDisabled}
              onSubmit={handleContinue}
              placeholder="Leave empty or type a message for the next step"
            />

            <div
              onClick={focusEditor}
              onMouseDown={handleMouseDown}
              className="flex items-center justify-between pl-2"
            >
              <ChatPromptFileUpload
                {...fileUpload}
                files={files}
                tooltipContent={WF_FILE_UPLOAD_MESSAGE}
              />

              <Button size={ButtonSize.LARGE} disabled={isDisabled} onClick={handleContinue}>
                <PlaySvg />
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Popup>
  )
}

export default ContinueWithInputPopup
