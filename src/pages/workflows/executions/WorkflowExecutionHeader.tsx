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

import ArrowLeftIcon from '@/assets/icons/arrow-left.svg?react'
import SidebarSvg from '@/assets/icons/sidebar.svg?react'
import SweepSvg from '@/assets/icons/sweep.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import InfoWarning from '@/components/InfoWarning'
import { useVueRouter } from '@/hooks/useVueRouter'
import { goBackWorkflows } from '@/pages/workflows/utils/goBackWorkflows'
import { workflowExecutionsStore } from '@/store/workflowExecutions'

interface WorkflowExecutionHeaderProps {
  worfklowId?: string
  workflowName?: string
  isConfigExpanded: boolean
  onToggleConfig: () => void
}

const WorkflowExecutionHeader: React.FC<WorkflowExecutionHeaderProps> = ({
  workflowName,
  worfklowId,
  isConfigExpanded,
  onToggleConfig,
}) => {
  const router = useVueRouter()
  const [isPopupVisible, setIsPopupVisible] = useState(false)

  const handleBack = () => {
    goBackWorkflows()
  }

  const handleConfirmClear = async () => {
    if (!worfklowId) return

    try {
      await workflowExecutionsStore.clearWorkflowExecutions(worfklowId)
      router.push({ name: 'workflows' })
    } finally {
      setIsPopupVisible(false)
    }
  }

  return (
    <>
      <div className="min-h-layout-header max-h-layout-header bg-surface-base-primary border-b border-border-primary p-3 px-6 flex items-center justify-between gap-3">
        <div className="flex gap-6 items-center min-w-0">
          <Button variant="secondary" onClick={handleBack} className="flex items-center gap-2">
            <ArrowLeftIcon />
          </Button>

          <h1 className="truncate font-semibold">{workflowName}</h1>
        </div>

        <div className="flex gap-4 items-center">
          <Button
            type="secondary"
            onClick={() => setIsPopupVisible(true)}
            data-tooltip-id="react-tooltip"
            data-tooltip-content="Clear all executions"
          >
            <SweepSvg />
          </Button>

          <div className="mx-1 bg-border-primary h-3 w-px" />

          <Button type="secondary" onClick={onToggleConfig}>
            <SidebarSvg className={isConfigExpanded ? 'rotate-180' : ''} />
            Configuration
          </Button>
        </div>
      </div>

      <ConfirmationModal
        visible={isPopupVisible}
        header="Confirm Deletion"
        message="Are you sure you want to delete all executions for current workflow?"
        onConfirm={handleConfirmClear}
        onCancel={() => setIsPopupVisible(false)}
      >
        <InfoWarning
          message="If an execution is part of a Chat it will unaffected by this action. Such executions are controlled only from the Chat interface."
          className="mt-4 max-w-[550px]"
        />
      </ConfirmationModal>
    </>
  )
}

export default WorkflowExecutionHeader
