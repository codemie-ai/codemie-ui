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

import { WorkflowIssue } from '@/types/entity'
import { WorkflowConfiguration, NodeType } from '@/types/workflowEditor'

import { hasPathChanged } from './pathUtils'
import { ISSUE_FIELD_MAP, NODE_TYPE_TO_CONFIG_ARRAY } from '../../constants'

/**
 * Retrieves the entity (assistant, tool, or custom_node) associated with a workflow state.
 *
 * Looks up the entity in the appropriate configuration array based on the state type.
 *
 * @param config - The workflow configuration containing entity arrays
 * @param stateType - The node type (assistant, tool, or transform)
 * @param entityId - The ID of the entity to find
 * @returns The entity object if found, null otherwise
 */
export const getEntityForState = (
  config: WorkflowConfiguration,
  stateType: NodeType,
  entityId: string
) => {
  const arrayKey = NODE_TYPE_TO_CONFIG_ARRAY[stateType]
  if (!arrayKey) return null

  const entities = config[arrayKey]
  if (!Array.isArray(entities)) return null

  return entities.find((e) => e.id === entityId) ?? null
}

const checkMissingEntityId = (state: any): boolean => {
  const hasAssistantId = !!state.assistant_id
  const hasToolId = !!state.tool_id
  const hasCustomNodeId = !!state.custom_node_id

  return hasAssistantId || hasToolId || hasCustomNodeId
}

const checkAssistantRequiredFields = (state: any, config: WorkflowConfiguration): boolean => {
  const assistantId = state.assistant_id
  if (!assistantId) return false

  const assistant = config.assistants?.find((a) => a.id === assistantId)
  if (!assistant) return true

  return !!assistant.assistant_id || !!assistant.system_prompt
}

const checkToolRequiredFields = (state: any, config: WorkflowConfiguration): boolean => {
  const toolId = state.tool_id
  if (!toolId) return false

  const tool = config.tools?.find((t) => t.id === toolId)
  if (!tool) return true

  return Object.keys(tool).length > 1
}

const isStateFieldIssue = (path: string, prevState: any, nextState: any): boolean => {
  const rootPath = path.split('.')[0].split('[')[0]
  return rootPath in prevState || rootPath in nextState
}

const checkEntityRelatedIssue = (
  issue: WorkflowIssue,
  prevState: any,
  nextState: any,
  prevConfig: WorkflowConfiguration,
  nextConfig: WorkflowConfiguration
): boolean => {
  const prevStateType = prevState?._meta?.type
  const nextStateType = nextState?._meta?.type

  if (prevStateType !== nextStateType || !prevStateType || !nextStateType) {
    return true
  }

  const stateType = prevStateType as NodeType
  const entityIdKey = ISSUE_FIELD_MAP[stateType]
  if (!entityIdKey) return false

  const entityId = String(prevState[entityIdKey]) ?? null
  if (!entityId) return false

  const prevEntityState = getEntityForState(prevConfig, stateType, entityId)
  const nextEntityState = getEntityForState(nextConfig, stateType, entityId)

  if (prevEntityState && !nextEntityState) {
    return true
  }

  if (!prevEntityState || !nextEntityState) {
    if (isStateFieldIssue(issue.path, prevState, nextState)) {
      return false
    }
    return true
  }

  if (hasPathChanged(nextEntityState, prevEntityState, issue.path)) {
    return true
  }

  return false
}

export const shouldResolveIssue = (
  issue: WorkflowIssue,
  prevConfig: WorkflowConfiguration,
  nextConfig: WorkflowConfiguration
): boolean => {
  if (!issue.stateId || issue.stateId === '') {
    return hasPathChanged(nextConfig, prevConfig, issue.path)
  }

  const prevState = prevConfig.states.find((s) => s.id === issue.stateId)
  const nextState = nextConfig.states.find((s) => s.id === issue.stateId)

  if (!nextState || !prevState) {
    return true
  }

  if (issue.path === 'states') {
    return checkMissingEntityId(nextState)
  }

  if (issue.path === 'assistants') {
    return checkAssistantRequiredFields(nextState, nextConfig)
  }

  if (issue.path === 'tools') {
    return checkToolRequiredFields(nextState, nextConfig)
  }

  if (hasPathChanged(nextState, prevState, issue.path)) {
    return true
  }

  return checkEntityRelatedIssue(issue, prevState, nextState, prevConfig, nextConfig)
}
