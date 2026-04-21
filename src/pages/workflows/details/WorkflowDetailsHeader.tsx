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

import EditSvg from '@/assets/icons/edit.svg?react'
import SidebarSvg from '@/assets/icons/sidebar.svg?react'
import SweepSvg from '@/assets/icons/sweep.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import InfoWarning from '@/components/InfoWarning'
import { VIEW_WORKFLOW } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { Workflow } from '@/types/entity'
import { canEdit } from '@/utils/entity'

import useExecutionsContext from './hooks/useExecutionsContext'

interface WorkflowDetailsHeaderProps {
  workflow?: Workflow | null
  isConfigExpanded: boolean
  onToggleConfig: () => void
}

const WorkflowDetailsHeader = ({
  isConfigExpanded,
  onToggleConfig,
  workflow,
}: WorkflowDetailsHeaderProps) => {
  const { workflowId } = useExecutionsContext()
  const router = useVueRouter()
  const [isPopupVisible, setIsPopupVisible] = useState(false)

  const onEdit = () => {
    if (workflow) {
      router.push({ name: 'edit-workflow', params: { id: String(workflow.id) } })
    }
  }

  const handleConfirmClear = async () => {
    if (!workflowId) return

    try {
      await workflowExecutionsStore.clearWorkflowExecutions(workflowId)
      router.replace({ name: VIEW_WORKFLOW, params: { workflowId } })
    } finally {
      setIsPopupVisible(false)
    }
  }

  return (
    <>
      <div className="flex gap-2 items-center">
        <Button
          type="secondary"
          onClick={() => setIsPopupVisible(true)}
          data-tooltip-id="react-tooltip"
          data-tooltip-content="Clear all executions"
        >
          <SweepSvg />
        </Button>

        {workflow && canEdit(workflow) && (
          <Button type="secondary" onClick={onEdit}>
            <EditSvg />
            Edit
          </Button>
        )}

        <Button type="secondary" onClick={onToggleConfig}>
          <SidebarSvg className={isConfigExpanded ? 'rotate-180' : ''} />
          Configuration
        </Button>
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

export default WorkflowDetailsHeader
