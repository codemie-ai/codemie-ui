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

import { FC, useRef } from 'react'

import Button from '@/components/Button'
import { useVueRouter } from '@/hooks/useVueRouter'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { workflowsStore } from '@/store/workflows'
import { Workflow } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

import WorkflowForm, { WorkflowFormRef } from '../../components/WorkflowForm'

interface WorkflowExecutionConfigFormProps {
  workflow: Workflow
  onCancel: () => void
}

const WorkflowExecutionConfigForm: FC<WorkflowExecutionConfigFormProps> = ({
  workflow,
  onCancel,
}) => {
  const router = useVueRouter()
  const formRef = useRef<WorkflowFormRef>(null)

  const handleSubmit = async (values: any) => {
    try {
      const response = await workflowsStore.updateWorkflow(workflow.id, values)
      if (response.error) throw new Error(response.error)

      onCancel()
      router.replace({
        name: 'workflow-execution',
        params: router.currentRoute.value.params,
        query: router.currentRoute.value.query,
      })
      workflowExecutionsStore.getWorkflow(workflow.id)
    } catch (error) {
      console.error('Error updating workflow:', error)
      toaster.error('Error updating workflow:')
    }
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h3 className="font-bold">Edit Workflow</h3>

        <div className="flex gap-3">
          <Button type="secondary" onClick={onCancel}>
            Cancel
          </Button>

          <Button type="primary" buttonType="submit" onClick={() => formRef.current?.save(false)}>
            Update
          </Button>
        </div>
      </div>

      <WorkflowForm
        isEditing
        hideConfiguration
        ref={formRef}
        workflow={workflow}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default WorkflowExecutionConfigForm
