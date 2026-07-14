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

import { FC, useState } from 'react'

import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import InfoBox from '@/components/form/InfoBox/InfoBox'
import Textarea from '@/components/form/Textarea/Textarea'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { workflowsStore } from '@/store/workflows'
import { GenerateWorkflowResponse } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

interface GenerateWorkflowPopupProps {
  visible: boolean
  onHide: () => void
  onGenerated: (data: GenerateWorkflowResponse) => void
}

const GenerateWorkflowPopup: FC<GenerateWorkflowPopupProps> = ({
  visible,
  onHide,
  onGenerated,
}) => {
  const [text, setText] = useState('')
  const [doNotShow, setDoNotShow] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleHide = () => {
    if (doNotShow) workflowsStore.setShowNewWorkflowAIPopup(false)
    setText('')
    setDoNotShow(false)
    onHide()
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const data = await workflowsStore.generateWorkflow(text, false)
      onGenerated(data)
      handleHide()
    } catch (error) {
      toaster.error(error instanceof Error ? error.message : 'Failed to generate workflow')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Popup
      hideFooter
      dismissableMask={false}
      visible={visible}
      header="Generate Workflow with AI"
      onHide={handleHide}
      className="w-[500px]"
    >
      {isLoading && (
        <div className="flex justify-center mt-4 mb-12">
          <Spinner inline />
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-col gap-4">
          <p>
            Describe your ideal workflow, and AI will generate it for you with the most suitable
            steps and structure for your needs.
          </p>

          <div>
            <p>What should your workflow do?</p>
            <Textarea
              className="mt-2"
              value={text}
              placeholder="For example: I need a workflow that processes incoming support tickets, categorizes them by priority, and routes them to the appropriate team..."
              rows={8}
              aria-label="What should your workflow do?"
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <InfoBox>
            For best results, describe: what needs to be done, the steps involved, and what data is
            used or produced.
          </InfoBox>
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-col gap-3 my-4">
          <Checkbox
            label="Do not show again"
            checked={doNotShow}
            onChange={setDoNotShow}
            rootClassName="ml-auto"
          />
          <div className="flex gap-4 ml-auto">
            <Button variant={ButtonType.SECONDARY} onClick={handleHide}>
              Cancel
            </Button>
            <Button variant={ButtonType.MAGICAL} disabled={!text.trim()} onClick={handleSubmit}>
              Generate with AI
            </Button>
          </div>
        </div>
      )}
    </Popup>
  )
}

export default GenerateWorkflowPopup
