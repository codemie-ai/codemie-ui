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

import { createContext, useContext } from 'react'

import { WorkflowExecutionStatus } from '@/types/entity'

export interface ExecutionContextValue {
  workflowId: string | null
  executionId: string | null
  executionStatus: WorkflowExecutionStatus | null
  interruptedStateId: string | null
  isResuming: boolean
  resume: () => void
  refreshOutput: () => void
}

export const ExecutionContext = createContext<ExecutionContextValue | null>(null)

const useExecutionsContext = () => {
  const ctx = useContext(ExecutionContext)
  if (!ctx) {
    throw new Error('useExecutionContext must be used within ExecutionContext provider')
  }

  return ctx
}

export default useExecutionsContext
