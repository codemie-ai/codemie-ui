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

import { useCallback, useState } from 'react'

import ProcessingStatusSvg from '@/assets/icons/processing-status.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import WorkflowExecutionStateControls from '@/pages/workflows/details/states/WorkflowExecutionStateControls'
import { WorkflowExecutionState } from '@/types/entity'

import WorkflowExecutionTransitionsPopup from './WorkflowExecutionTransitionsPopup'
import WorkflowStateCallHistory from './WorkflowStateCallHistory'
import useExecutionsContext from '../../hooks/useExecutionsContext'

export type WorkflowDrawerPopupId = 'transition' | 'call-history'

interface WorkflowDrawerHeaderProps {
  state?: WorkflowExecutionState | null
  showActions: boolean
}

const WorkflowDrawerHeader = ({ state, showActions }: WorkflowDrawerHeaderProps) => {
  const { workflowId, executionId, interruptedStateId } = useExecutionsContext()

  const [activePopup, setActivePopup] = useState<WorkflowDrawerPopupId | null>(null)
  const closePopup = useCallback(() => setActivePopup(null), [])

  return (
    <div className="flex gap-2 grow">
      <div className="max-w-sm w-full" />
      <div className="flex gap-2 justify-between grow pl-2">
        {interruptedStateId === state?.id && (
          <WorkflowExecutionStateControls stateId={state?.id ?? ''} />
        )}
        <div className="flex gap-2 ml-auto">
          {showActions && (
            <Button variant="secondary" onClick={() => setActivePopup('transition')}>
              See transition
            </Button>
          )}
          {showActions && (
            <Button variant="secondary" onClick={() => setActivePopup('call-history')}>
              <ProcessingStatusSvg />
              Call history
            </Button>
          )}
        </div>
      </div>

      {state && workflowId && executionId && (
        <>
          <Popup
            hideFooter
            onHide={closePopup}
            visible={activePopup === 'call-history'}
            className="max-w-6xl w-full h-full"
            header={`Calls history for ${state.name}`}
          >
            <WorkflowStateCallHistory workflowId={workflowId} state={state} />
          </Popup>

          <WorkflowExecutionTransitionsPopup
            visible={activePopup === 'transition'}
            onHide={closePopup}
            workflowId={workflowId}
            executionId={executionId}
            stateId={state.id}
            stateName={state.name}
          />
        </>
      )}
    </div>
  )
}

export default WorkflowDrawerHeader
