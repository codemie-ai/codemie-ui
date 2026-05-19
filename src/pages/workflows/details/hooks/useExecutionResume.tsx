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

import { useCallback, useState } from 'react'

import { workflowExecutionsStore } from '@/store/workflowExecutions'
import toaster from '@/utils/toaster'

interface UseExecutionResumeParams {
  workflowId: string | null
  executionId: string | null
}

type UseExecutionResumeReturn = {
  isResuming: boolean
  resume: () => void
  resumeWithMessage: (message: string) => void
  refreshOutputKey: number
  refreshOutput: () => void
}

const useExecutionResume = ({
  workflowId,
  executionId,
}: UseExecutionResumeParams): UseExecutionResumeReturn => {
  const [isResuming, setIsResuming] = useState(false)
  const [refreshOutputKey, setOutputRefreshKey] = useState(0)

  const resume = useCallback(async () => {
    if (!executionId || !workflowId) return

    setIsResuming(true)
    try {
      await workflowExecutionsStore.resumeWorkflowExecution(workflowId, executionId)
    } catch (error) {
      toaster.error('Failed to resume workflow execution')
    } finally {
      setIsResuming(false)
    }
  }, [workflowId, executionId])

  const resumeWithMessage = useCallback(
    async (message: string) => {
      if (!executionId || !workflowId) return

      setIsResuming(true)
      try {
        await workflowExecutionsStore.resumeWorkflowExecution(workflowId, executionId, message)
      } catch (error) {
        toaster.error('Failed to resume workflow execution')
      } finally {
        setIsResuming(false)
      }
    },
    [workflowId, executionId]
  )

  const refreshOutput = useCallback(() => setOutputRefreshKey((prev) => prev + 1), [])

  return { isResuming, resume, resumeWithMessage, refreshOutputKey, refreshOutput }
}

export default useExecutionResume
