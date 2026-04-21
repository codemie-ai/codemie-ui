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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
import { usePolling } from '@/hooks/usePolling'
import { workflowExecutionsStore } from '@/store/workflowExecutions'

export const useWorkflowData = (workflowId: string, executionId?: string | null) => {
  const { workflow: originalWorkflow, execution } = useSnapshot(workflowExecutionsStore)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch single execution
  const fetchExecution = useCallback(async () => {
    try {
      if (!executionId || !workflowId) return
      await workflowExecutionsStore.getExecution(workflowId, executionId)
    } catch (error) {
      console.error('Error fetching workflow execution: ', error)
    }
  }, [workflowId, executionId])

  // Poll active execution
  usePolling({
    interval: 4000,
    enabled: useMemo(
      () => !!(execution && !WORKFLOW_FINAL_STATUSES.includes(execution.overall_status)),
      [execution]
    ),
    fetchFn: fetchExecution,
  })

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      if (!workflowId) return

      try {
        const isNewWorkflow = workflowId !== workflowExecutionsStore.workflow?.id
        if (isNewWorkflow) {
          setIsLoading(true)
          await Promise.all([
            workflowExecutionsStore.getWorkflow(workflowId),
            workflowExecutionsStore.loadWorkflowExecutions(workflowId, 0, 10),
          ])
        } else {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error loading workflow data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [workflowId])

  useEffect(() => {
    return () => {
      workflowExecutionsStore.executionStates = []
      workflowExecutionsStore.executions = []
      workflowExecutionsStore.execution = null
      workflowExecutionsStore.workflow = null
    }
  }, [])

  // Replace workflow config with selected execution config
  const config = useMemo(() => {
    if (!execution?.date || !originalWorkflow?.yaml_config_history) {
      return originalWorkflow?.yaml_config ?? null
    }

    const executionDate = new Date(execution.date)
    const history = [
      { yaml_config: originalWorkflow.yaml_config!, date: originalWorkflow.update_date },
      ...originalWorkflow.yaml_config_history,
    ]

    const historicalConfig = history.reduce<{
      date: Date
      yaml_config: string
    } | null>((closest, item) => {
      const itemDate = new Date(item.date)
      if (itemDate < executionDate) return closest

      if (!closest || itemDate < closest.date) {
        return { date: itemDate, yaml_config: item.yaml_config }
      }

      return closest
    }, null)

    return historicalConfig?.yaml_config ?? originalWorkflow?.yaml_config ?? null
  }, [
    originalWorkflow?.update_date,
    originalWorkflow?.yaml_config_history,
    originalWorkflow?.yaml_config,
    execution?.date,
  ])

  const workflow = useMemo(
    () => (originalWorkflow ? { ...originalWorkflow, yaml_config: config ?? undefined } : null),
    [config, originalWorkflow]
  )

  return { workflow, isLoading }
}
