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

import { FC, useState, useEffect } from 'react'

import AttachmentSvg from '@/assets/icons/attachment.svg?react'
import Editor, { EditorValue } from '@/components/Editor/Editor'
import File from '@/components/File'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { WF_FILE_UPLOAD_MESSAGE } from '@/constants/chats'
import { FormIDs } from '@/constants/formIds'
import { useFileUpload, FileMetadata, createFileMetadata } from '@/hooks/useFileUpload'
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import { useVueRouter } from '@/hooks/useVueRouter'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'
import './WorkflowStartExecutionPopup.scss'

interface WorkflowStartExecutionPopupProps {
  workflowId: string
  initialPrompt?: string | null
  initialFiles?: string[] | null
  isVisible: boolean
  onHide: () => void
  onStart?: () => void
  replaceRoute?: boolean
}

const WorkflowStartExecutionPopup: FC<WorkflowStartExecutionPopupProps> = ({
  workflowId,
  initialPrompt,
  initialFiles,
  isVisible,
  onHide,
  onStart,
  replaceRoute,
}) => {
  const router = useVueRouter()
  const { unblockTransition, blockTransition } = useUnsavedChanges({
    formId: FormIDs.WORKFLOW_FORM,
  })

  const initialPromptState = {
    message: initialPrompt ?? '',
    messageRaw: initialPrompt ?? '',
  }

  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [prompt, setPrompt] = useState<EditorValue>(initialPromptState)

  const { inputProps, removeFile, openFilePicker, addFiles } = useFileUpload({
    files,
    setFiles,
    handleErrors: (errors) => {
      errors.forEach(({ message }) => toaster.error(message))
    },
  })

  useEffect(() => {
    if (isVisible) {
      if (initialFiles) setFiles(initialFiles.map((f) => createFileMetadata(f)))
      setPrompt(initialPromptState)
    }
  }, [isVisible])

  async function handleSubmit() {
    setIsLoading(true)
    try {
      const fileNames = files.map((f) => f.fileId).filter(Boolean) as string[]
      const execution = await workflowExecutionsStore.createWorkflowExecution(
        workflowId,
        prompt.message,
        fileNames
      )

      unblockTransition()

      router[replaceRoute ? 'replace' : 'push']({
        name: 'workflow-execution',
        params: { workflowId: execution.workflow_id, executionId: execution.execution_id },
      })

      blockTransition()

      onHide()
      onStart?.()
    } catch (error) {
      console.error('Error creating workflow execution:', error)
      toaster.error('Error creating workflow execution:')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Popup
      limitWidth
      dismissableMask={false}
      visible={isVisible}
      withBorderBottom={false}
      submitDisabled={isLoading}
      header="New Workflow Execution"
      submitText="Create"
      onHide={onHide}
      onSubmit={handleSubmit}
    >
      {isLoading ? (
        <Spinner inline />
      ) : (
        <div>
          <div className="pt-1 mb-2 relative">
            <Editor
              value={prompt}
              withMentions={false}
              className="workflow-execution-editor"
              placeholder="Enter a starting prompt"
              onChange={setPrompt}
              onAddFiles={addFiles}
              onSubmit={handleSubmit}
            />

            <button
              type="button"
              onClick={openFilePicker}
              data-tooltip-id="react-tooltip"
              data-tooltip-content={WF_FILE_UPLOAD_MESSAGE}
              className={cn(
                'absolute top-[54%] right-[6px] transform -translate-x-1/2 -translate-y-1/2',
                'hover:opacity-80 transition-opacity'
              )}
            >
              <AttachmentSvg />
            </button>
          </div>

          <input {...inputProps} />

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file, i) => (
                <File
                  file={file}
                  withDelete
                  withPreview
                  withDownload
                  key={file.fileName}
                  onRemove={() => removeFile(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Popup>
  )
}

export default WorkflowStartExecutionPopup
