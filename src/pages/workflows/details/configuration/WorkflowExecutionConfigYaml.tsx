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

import { FC } from 'react'

import EditSvg from '@/assets/icons/edit.svg?react'
import Button from '@/components/Button'
import CodeBlock from '@/components/CodeBlock/CodeBlock'
import { ButtonSize } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { Workflow } from '@/types/entity/workflow'
import { canEdit } from '@/utils/entity'

interface WorkflowExecutionConfigYamlProps {
  workflow: Workflow
}

const WorkflowExecutionConfigYaml: FC<WorkflowExecutionConfigYamlProps> = ({ workflow }) => {
  const router = useVueRouter()

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

      <CodeBlock
        expandable
        expandTitle="Configuration"
        language="yaml"
        text={workflow.yaml_config ?? ''}
      />
    </div>
  )
}

export default WorkflowExecutionConfigYaml
