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
import { useSnapshot } from 'valtio'

import { WOKRFLOW_EXECUTIONS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { workflowExecutionsStore } from '@/store/workflowExecutions'

/**
 * Hook to manage execution selection from route params
 * Handles automatic selection of first execution if none specified
 */
export const useExecutionSelection = (workflowId: string, routeExecutionId: string | null) => {
  const route = useVueRouter()
  const { executions } = useSnapshot(workflowExecutionsStore)
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)

  useEffect(() => {
    const selectExecution = () => {
      let executionToSelect: string | null = null

      if (routeExecutionId) {
        executionToSelect = routeExecutionId
      } else if (executions.length > 0) {
        executionToSelect = executions[0].execution_id
        route.replace({
          name: WOKRFLOW_EXECUTIONS,
          params: { workflowId, executionId: executionToSelect },
        })
      }

      setSelectedExecutionId(executionToSelect)
    }

    selectExecution()
  }, [workflowId, routeExecutionId, executions])

  return selectedExecutionId
}
