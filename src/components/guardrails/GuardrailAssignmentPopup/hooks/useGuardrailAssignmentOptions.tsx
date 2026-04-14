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

import { useEffect, useState } from 'react'

import { AssistantContextOption } from '@/pages/assistants/components/AssistantForm/components/ContextSelector'
import { WorkflowSelectorOption } from '@/pages/workflows/components/WorkflowSelector'
import { dataSourceStore } from '@/store/dataSources'
import { workflowsStore } from '@/store/workflows'
import { AssistantContext, Workflow } from '@/types/entity'
import { GuardrailAssignmentResponse, GuardrailEntity } from '@/types/entity/guardrail'
import { getContextTypeLabel } from '@/utils/indexing'

const mapWorkflowToOption = (workflow: Workflow): WorkflowSelectorOption => ({
  id: workflow.id,
  name: workflow.name,
  iconUrl: workflow.icon_url ?? '',
})

const mapDatasourceToOption = (
  ds: AssistantContext & { repo_name: string; index_type: string }
): AssistantContextOption => ({
  id: ds.id,
  name: ds.repo_name,
  context_type: getContextTypeLabel(ds.index_type),
})

export type GuardrailAssignmentOptions = {
  [GuardrailEntity.KNOWLEDGEBASE]: AssistantContextOption[]
  [GuardrailEntity.WORKFLOW]: WorkflowSelectorOption[]
}

export const useGuardrailAssignmentOptions = ({
  assignments,
  setIsLoading,
}: {
  assignments: GuardrailAssignmentResponse | null
  setIsLoading: (isLoading: boolean) => void
}): { initialOptions: GuardrailAssignmentOptions } => {
  const [dataSourceOptions, setDataSourceOptions] = useState<AssistantContextOption[]>([])
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowSelectorOption[]>([])

  useEffect(() => {
    const loadOptions = async () => {
      if (!assignments) return

      try {
        const [allWorkflows, allDataSources] = await Promise.all([
          workflowsStore.getWorkflowOptions({ project: assignments.project_name }),
          dataSourceStore.getDataSourceOptions({ project: assignments.project_name }),
        ])

        setDataSourceOptions(allDataSources.map(mapDatasourceToOption))
        setWorkflowOptions(allWorkflows.map(mapWorkflowToOption))
      } finally {
        setIsLoading(false)
      }
    }

    loadOptions()
  }, [assignments?.project_name])

  return {
    initialOptions: {
      [GuardrailEntity.KNOWLEDGEBASE]: dataSourceOptions,
      [GuardrailEntity.WORKFLOW]: workflowOptions,
    },
  }
}
