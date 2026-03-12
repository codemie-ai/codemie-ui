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

import InfoSvg from '@/assets/icons/info.svg?react'
import Button from '@/components/Button'
import CodeBlock from '@/components/CodeBlock/CodeBlock'
import Popup from '@/components/Popup'

const EMPTY_PROMPT_PLACEHOLDER = '<empty prompt>'

interface WorkflowExecutionPromptProps {
  prompt: string | null | undefined
}

const WorkflowExecutionPrompt: FC<WorkflowExecutionPromptProps> = ({ prompt }) => {
  const [isPopupVisible, setIsPopupVisible] = useState(false)

  return (
    <div className="px-5">
      <CodeBlock
        title="Prompt"
        language="txt"
        downloadFilename="prompt"
        className="mt-1"
        headerClassName="border-border-primary"
        contentClassName="!border-border-primary"
        text={prompt ?? EMPTY_PROMPT_PLACEHOLDER}
        headerActionsTemplate={
          <Button
            type="secondary"
            data-tooltip-id="react-tooltip"
            data-tooltip-content="View full prompt"
            onClick={() => setIsPopupVisible(true)}
          >
            <InfoSvg />
          </Button>
        }
      />

      <Popup
        limitWidth
        hideFooter
        header="Prompt"
        className="pb-5"
        onHide={() => setIsPopupVisible(false)}
        visible={isPopupVisible}
      >
        {prompt}
      </Popup>
    </div>
  )
}

export default WorkflowExecutionPrompt
