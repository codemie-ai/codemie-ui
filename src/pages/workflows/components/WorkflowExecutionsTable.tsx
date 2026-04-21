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

import React, { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import DownloadSvg from '@/assets/icons/download.svg?react'
import ViewSvg from '@/assets/icons/view.svg?react'
import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import StatusBadge from '@/components/StatusBadge'
import Table from '@/components/Table'
import { DECIMAL_PAGINATION_OPTIONS, ButtonType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { WORKFLOW_STATUS_BADGE_MAPPING } from '@/pages/workflows/constants'
import { workflowsStore } from '@/store/workflows'
import { Workflow, WorkflowExecution } from '@/types/entity/workflow'
import { DefinitionTypes } from '@/types/table'
import toaster from '@/utils/toaster'
import { truncateInput } from '@/utils/utils'

import WorkflowExecutionExportPopup from './WorkflowExecutionExportPopup'

interface WorkflowExecutionsTableProps {
  workflow: Workflow
}

const WorkflowExecutionsTable: React.FC<WorkflowExecutionsTableProps> = ({ workflow }) => {
  const router = useVueRouter()
  const { workflowExecutions, workflowExecutionsPagination } = useSnapshot(workflowsStore)
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null)
  const [showExportPopup, setShowExportPopup] = useState(false)
  const [loading, setLoading] = useState(true)

  const definitions = [
    { label: 'Status', key: 'overall_status', type: DefinitionTypes.Custom },
    { label: 'Prompt', key: 'prompt', type: DefinitionTypes.Custom },
    { label: 'Triggered By', key: 'created_by', type: DefinitionTypes.User },
    { label: 'Updated', key: 'update_date', type: DefinitionTypes.Date },
    { label: 'Actions', key: 'actions', type: DefinitionTypes.Custom },
  ]

  const fetchWorkflowExecutions = async (page: number, perPage = 10) => {
    setLoading(true)
    await workflowsStore.loadWorkflowExecutions(workflow.id, page, perPage)
    setLoading(false)
  }

  const onPaginationUpdate = async (page: number, perPage = 10) => {
    await workflowsStore.loadWorkflowExecutions(workflow.id, page, perPage)
  }

  const executeExport = async ({
    type,
    shouldCombine,
  }: {
    type: string
    shouldCombine: boolean
  }) => {
    if (!selectedExecution) return

    try {
      await workflowsStore.exportWorkflowExecution(workflow, selectedExecution, {
        output_format: type,
        combined: shouldCombine,
      })
      setShowExportPopup(false)
    } catch (error) {
      toaster.error('Failed to export workflow execution.')
    }
  }

  useEffect(() => {
    fetchWorkflowExecutions(0)
  }, [])

  const customRenderColumns = {
    overall_status: (item: WorkflowExecution) => (
      <StatusBadge
        status={WORKFLOW_STATUS_BADGE_MAPPING[item.overall_status] || 'pending'}
        text={item.overall_status}
      />
    ),
    prompt: (item: WorkflowExecution) => truncateInput(item.prompt as string, 15),
    actions: (item: WorkflowExecution) => (
      <div className="flex flex-row gap-4">
        <Button
          variant={ButtonType.SECONDARY}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setSelectedExecution(item)
            setShowExportPopup(true)
          }}
        >
          <DownloadSvg className="h-5 w-5" />
        </Button>
        <Button
          variant={ButtonType.SECONDARY}
          onClick={() =>
            router.push({
              name: 'workflow-execution',
              params: {
                workflowId: String(workflow.id),
                executionId: item.execution_id,
              },
            })
          }
        >
          <ViewSvg />
          View
        </Button>
      </div>
    ),
  }

  if (loading) {
    return (
      <div className="flex justify-center mt-10">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <Table
        columnDefinitions={definitions}
        items={workflowExecutions}
        pagination={workflowExecutionsPagination}
        onPaginationChange={onPaginationUpdate}
        perPageOptions={DECIMAL_PAGINATION_OPTIONS}
        customRenderColumns={customRenderColumns}
      />
      <WorkflowExecutionExportPopup
        visible={showExportPopup}
        onHide={() => setShowExportPopup(false)}
        onExport={executeExport}
      />
    </>
  )
}

export default WorkflowExecutionsTable
