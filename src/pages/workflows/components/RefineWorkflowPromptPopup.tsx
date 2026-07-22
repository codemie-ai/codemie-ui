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
import { useEffect, useRef, useState } from 'react'

import Button from '@/components/Button'
import InfoBox from '@/components/form/InfoBox'
import Textarea, { TextareaRef } from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { workflowsStore } from '@/store/workflows'
import { WorkflowAIRefineResponse } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

interface RefineWorkflowPromptPopupProps {
  isVisible: boolean
  workflowId: string
  currentYaml: string
  onHide: () => void
  onRefined: (result: WorkflowAIRefineResponse) => void
}

const RefineWorkflowPromptPopup = ({
  isVisible,
  workflowId,
  currentYaml,
  onHide,
  onRefined,
}: RefineWorkflowPromptPopupProps) => {
  const textareaRef = useRef<TextareaRef>(null)
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleHide = () => {
    setPrompt('')
    onHide()
  }

  const handleRefineClick = async () => {
    setIsLoading(true)
    try {
      const result = await workflowsStore.refineWorkflowWithAI(workflowId, {
        yaml_config: currentYaml,
        refine_prompt: prompt || undefined,
      })
      onRefined(result)
      handleHide()
    } catch (error: any) {
      handleHide()
      toaster.error(
        error?.parsedError?.error?.message ?? error?.message ?? 'Failed to refine workflow'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isVisible) return

    const focusTimeout = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)

    // eslint-disable-next-line consistent-return
    return () => clearTimeout(focusTimeout)
  }, [isVisible])

  return (
    <Popup
      hideFooter
      dismissableMask={false}
      visible={isVisible}
      onHide={handleHide}
      className="w-[600px]"
      header="Refine Workflow with AI"
    >
      {isLoading && (
        <div className="flex justify-center mt-4 mb-12">
          <Spinner inline />
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-col gap-4">
          <p className="text-text-quaternary">
            Optionally describe what you&apos;d like to improve or refine about this workflow. AI
            will analyze your configuration and suggest improvements.
          </p>

          <div>
            <p className="mb-2 mx-1">What would you like to improve? (Optional)</p>

            <InfoBox className="my-2 mx-1 items-center">
              Leave it empty or describe specific areas you&apos;d like to refine.
            </InfoBox>

            <Textarea
              ref={textareaRef}
              rows={6}
              placeholder="For example: Add retry logic to the LLM step and improve error handling throughout the workflow."
              aria-label="What would you like to improve? (Optional)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex gap-4 justify-end my-4">
        <Button variant={ButtonType.SECONDARY} onClick={handleHide} disabled={isLoading}>
          Cancel
        </Button>
        {!isLoading && (
          <Button variant={ButtonType.MAGICAL} onClick={handleRefineClick}>
            Refine with AI
          </Button>
        )}
      </div>
    </Popup>
  )
}

export default RefineWorkflowPromptPopup
