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
  EDIT_WORKFLOW,
  FAVORITES,
  FAVORITES_WORKFLOWS,
  NEW_WORKFLOW,
  WORKFLOWS_MARKETPLACE,
  VIEW_WORKFLOW,
  VIEW_WORKFLOW_TEMPLATE,
  WOKRFLOW_EXECUTIONS,
  WORKFLOWS_ALL,
  WORKFLOWS_MY,
  WORKFLOWS_TEMPLATES,
} from '@/constants/routes'
import { history } from '@/hooks/appLevel/useHistoryStack'
import { RouteOptions, RouterState } from '@/hooks/useVueRouter'
import { navigateBack } from '@/utils/helpers'

// Walks history backward and returns the first entry that is NOT a VIEW_WORKFLOW,
// WOKRFLOW_EXECUTIONS, or EDIT_WORKFLOW for the given workflowId.
// Used to skip routes that would trigger an auto-redirect back into the same workflow.
const findFirstNonWorkflowRoute = (workflowId: string) => {
  const { currentIndex } = history

  for (let i = currentIndex - 1; i >= 0; i -= 1) {
    const historyRoute = history.stack[i]

    const isSameWorkflowRoute =
      ((historyRoute?.name === VIEW_WORKFLOW || historyRoute?.name === WOKRFLOW_EXECUTIONS) &&
        historyRoute?.params?.workflowId === workflowId) ||
      (historyRoute?.name === EDIT_WORKFLOW && historyRoute?.params?.id === workflowId)

    if (!isSameWorkflowRoute && historyRoute?.name) {
      return historyRoute
    }
  }

  return null
}

export const goBackWorkflows = (
  defaultPath: string | (Partial<RouteOptions> & { name: string }) = WORKFLOWS_ALL
) => {
  navigateBack(
    defaultPath,
    CHATS,
    WORKFLOWS_ALL,
    WORKFLOWS_MY,
    WORKFLOWS_TEMPLATES,
    FAVORITES,
    FAVORITES_WORKFLOWS,
    WORKFLOWS_MARKETPLACE,
    VIEW_WORKFLOW,
    VIEW_WORKFLOW_TEMPLATE
  )
}

export const goBackFromWorkflowEdit = ({ workflowId }: { workflowId: string }) => {
  const safeRoute = findFirstNonWorkflowRoute(workflowId)

  if (safeRoute?.name === NEW_WORKFLOW) {
    // Came from create→execute flow: skip the execution page to avoid a back-loop
    goBackWorkflows()
    return
  }

  goBackWorkflows({ name: WOKRFLOW_EXECUTIONS, params: { id: workflowId } })
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
  const prevRoute = history.stack[history.currentIndex - 1]

  // Navigating between different workflows (parent/child relationship)
  if (
    (prevRoute?.name === VIEW_WORKFLOW || prevRoute?.name === WOKRFLOW_EXECUTIONS) &&
    prevRoute?.params?.workflowId &&
    prevRoute.params.workflowId !== workflowId
  ) {
    route.back()
    return
  }

  if (executionId) {
    const safeRoute = findFirstNonWorkflowRoute(workflowId)

    if (safeRoute?.name === NEW_WORKFLOW) {
      // Came from create→execute flow: go to edit, not back to the empty create form
      route.push({ name: EDIT_WORKFLOW, params: { id: workflowId } })
      return
    }

    if (safeRoute) {
      const { name, params, query } = safeRoute
      route.push({ name, params, query })
      return
    }

    // If no safe route found in history, fall back to workflows list
    route.push({ name: WORKFLOWS_ALL })
    return
  }

  goBackWorkflows()
}
