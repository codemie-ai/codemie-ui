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

import {
  CHATS,
  WORKFLOWS_ALL,
  WORKFLOWS_MY,
  WORKFLOWS_TEMPLATES,
  VIEW_WORKFLOW,
  VIEW_WORKFLOW_TEMPLATE,
  WOKRFLOW_EXECUTIONS,
  EDIT_WORKFLOW,
} from '@/constants/routes'
import { history } from '@/hooks/appLevel/useHistoryStack'
import { RouteOptions, RouterState } from '@/hooks/useVueRouter'
import { navigateBack } from '@/utils/helpers'

export const goBackWorkflows = (
  defaultPath: string | (Partial<RouteOptions> & { name: string }) = WORKFLOWS_ALL
) => {
  navigateBack(
    defaultPath,
    CHATS,
    WORKFLOWS_ALL,
    WORKFLOWS_MY,
    WORKFLOWS_TEMPLATES,
    VIEW_WORKFLOW,
    VIEW_WORKFLOW_TEMPLATE
  )
}

export const goBackFromWorkflowExecutions = ({
  route,
  executionId,
  workflowId,
}: {
  workflowId: string
  executionId: string | null
  route: RouterState
}) => {
  const { currentIndex } = history
  const prevRoute = history.stack[currentIndex - 1]

  // Case 1: Navigating between different workflows (parent/child relationship)
  if (
    (prevRoute?.name === VIEW_WORKFLOW || prevRoute?.name === WOKRFLOW_EXECUTIONS) &&
    prevRoute?.params?.workflowId &&
    prevRoute.params.workflowId !== workflowId
  ) {
    route.back()
    return
  }

  // Case 2: When on an execution, find the first history entry that is NOT
  // a VIEW_WORKFLOW, WOKRFLOW_EXECUTIONS or EDIT_WORKFLOW with the same workflowId
  // This prevents navigating back to routes that would trigger auto-redirect
  if (executionId) {
    for (let i = currentIndex - 1; i >= 0; i -= 1) {
      const historyRoute = history.stack[i]

      // Skip routes that are the same workflow (would cause redirect loop)
      const isSameWorkflowRoute =
        ((historyRoute?.name === VIEW_WORKFLOW || historyRoute?.name === WOKRFLOW_EXECUTIONS) &&
          historyRoute?.params?.workflowId === workflowId) ||
        (historyRoute.name === EDIT_WORKFLOW && historyRoute.params.id === workflowId)

      if (!isSameWorkflowRoute && historyRoute?.name) {
        const { name, params, query } = historyRoute
        route.push({ name, params, query })
        return
      }
    }

    // If no safe route found in history, fall back to workflows list
    route.push({ name: 'workflows-all' })
    return
  }

  goBackWorkflows()
}
