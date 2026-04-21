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
import { useSnapshot } from 'valtio'

import Spinner from '@/components/Spinner'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { Workflow, WorkflowExecution } from '@/types/entity/workflow'
import { cn } from '@/utils/utils'

import WorkflowExecutionConfigDetails from './WorkflowExecutionConfigDetails'
import WorkflowExecutionConfigForm from './WorkflowExecutionConfigForm'
import WorkflowExecutionConfigYaml from './WorkflowExecutionConfigYaml'

interface WorkflowExecutionConfigurationProps {
  workflow: Workflow | null
  execution: WorkflowExecution | null
  isExpanded: boolean
}

const WorkflowExecutionConfiguration: FC<WorkflowExecutionConfigurationProps> = ({
  isExpanded,
  workflow,
  execution,
}) => {
  const { isWorkflowLoading } = useSnapshot(
    workflowExecutionsStore
  ) as typeof workflowExecutionsStore

  const [isEditFormVisible, setIsEditFormVisible] = useState(false)
  if (!workflow) return null

  return (
    <aside
      className={cn(
        'flex flex-col shrink-0 overflow-x-hidden bg-surface-base-sidebar shadow-surface-base-sidebar border-l border-border-specific-panel-outline transition-all duration-150 ease-in-out',
        isExpanded ? 'w-96 max-w-96' : 'w-0'
      )}
    >
      {isExpanded && isWorkflowLoading && <Spinner inline />}
      {isExpanded && (
        <div className="w-96 px-7 pt-7 pb-3.5 h-full overflow-y-auto show-scroll">
          {isEditFormVisible ? (
            <WorkflowExecutionConfigForm
              workflow={workflow}
              onCancel={() => setIsEditFormVisible(false)}
            />
          ) : (
            <div className="flex flex-col gap-5">
              <h2 className="font-bold">Configure Workflow</h2>
              <WorkflowExecutionConfigDetails
                workflow={workflow}
                onConfigureClick={() => setIsEditFormVisible(true)}
              />
              {execution && (
                <WorkflowExecutionConfigYaml workflow={workflow} execution={execution} />
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

export default WorkflowExecutionConfiguration
