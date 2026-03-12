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

import { FC, useRef, useState } from 'react'

import EditSvg from '@/assets/icons/edit.svg?react'
import RunSvg from '@/assets/icons/run-alt.svg?react'
import Button from '@/components/Button'
import CodeBlock from '@/components/CodeBlock/CodeBlock'
import Popup from '@/components/Popup'
import { ButtonSize } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { workflowsStore } from '@/store/workflows'
import { Workflow, WorkflowExecution } from '@/types/entity/workflow'
import { canEdit } from '@/utils/entity'
import toaster from '@/utils/toaster'

import WorkflowForm, { WorkflowFormRef } from '../../components/WorkflowForm'
import WorkflowStartExecutionPopup from '../WorkflowStartExecutionPopup'

interface WorkflowExecutionConfigYamlProps {
  workflow: Workflow
  execution: WorkflowExecution
}

const WorkflowExecutionConfigYaml: FC<WorkflowExecutionConfigYamlProps> = ({
  workflow,
  execution,
}) => {
  const router = useVueRouter()
  const formRef = useRef<WorkflowFormRef>(null)

  const [isEditPopupVisible, setIsEditPopupVisible] = useState(false)
  const [isRunPopupVisible, setIsRunPopupVisible] = useState(false)

  const closeEditPopup = () => setIsEditPopupVisible(false)

  const handleSubmit = async (values: any) => {
    try {
      const response = await workflowsStore.updateWorkflow(workflow.id, values)
      if (response.error) throw new Error(response.error)
      toaster.info('Workflow has been updated successfully!')
      workflowExecutionsStore.getWorkflow(workflow.id)
    } catch (error) {
      console.error('Error updating workflow:', error)
      toaster.error('Error updating workflow')
    }
  }

  const handleUpdate = async () => {
    await formRef.current?.save(false)
    closePopups()
  }

  const handleUpdateAndRun = async () => {
    await formRef.current?.save(true)
    setIsRunPopupVisible(true)
  }

  const closePopups = () => {
    setIsEditPopupVisible(false)
    setIsRunPopupVisible(false)
    router.replace({
      name: 'workflow-execution',
      params: router.currentRoute.value.params,
      query: { updated: Date.now().toString() },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">Yaml configuration</h3>

        {canEdit(workflow) && (
          <Button
            type="secondary"
            size={ButtonSize.MEDIUM}
            onClick={() =>
              router.push({ name: 'edit-workflow', params: { id: String(workflow.id) } })
            }
          >
            <EditSvg />
            Edit
          </Button>
        )}
      </div>

      <CodeBlock language="yaml" text={workflow.yaml_config ?? ''} />

      <WorkflowStartExecutionPopup
        workflowId={workflow.id}
        initialPrompt={execution.prompt}
        initialFiles={[...(execution.file_name ? [execution.file_name] : [])]}
        isVisible={isRunPopupVisible}
        onStart={closePopups}
        onHide={() => setIsRunPopupVisible(false)}
      />

      <Popup
        hideFooter
        isFullWidth
        className="h-full"
        visible={isEditPopupVisible}
        onHide={closeEditPopup}
        headerContent={
          <div className="flex justify-between items-center">
            <h1>Edit Workflow</h1>

            <div className="flex gap-2">
              <Button type="secondary" onClick={closeEditPopup}>
                Cancel
              </Button>

              <Button type="secondary" onClick={handleUpdate}>
                Update
              </Button>

              <Button onClick={handleUpdateAndRun}>
                <RunSvg />
                Update and run
              </Button>
            </div>
          </div>
        }
      >
        <WorkflowForm
          isEditing
          onlyConfiguration
          ref={formRef}
          workflow={workflow}
          onSubmit={handleSubmit}
        />
      </Popup>
    </div>
  )
}

export default WorkflowExecutionConfigYaml
