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

import { useState } from 'react'

import RunSvg from '@/assets/icons/run-wf-small.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'

import WorkflowStartExecutionPopup from '../details/popups/WorkflowStartExecutionPopup'

interface RunWorkflowButtonProps {
  workflowId: string
  variant?: ButtonType
  className?: string
  replaceRoute?: boolean
}

const RunWorkflowButton = ({
  workflowId,
  variant = ButtonType.PRIMARY,
  className,
  replaceRoute,
}: RunWorkflowButtonProps) => {
  const [showExecutionPopup, setShowExecutionPopup] = useState(false)

  return (
    <>
      <Button variant={variant} onClick={() => setShowExecutionPopup(true)} className={className}>
        <RunSvg />
        Run workflow
      </Button>

      <WorkflowStartExecutionPopup
        isVisible={showExecutionPopup}
        onHide={() => setShowExecutionPopup(false)}
        workflowId={workflowId}
        replaceRoute={replaceRoute}
      />
    </>
  )
}

export default RunWorkflowButton
