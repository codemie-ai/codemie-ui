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

/* eslint-disable no-continue */
import * as yaml from 'js-yaml'
import isEqual from 'lodash/isEqual'

/** Filters disconnected nodes (excluding start/end) from meta_states */
const getDisconnectedNodes = (metaStates: any[]) => {
  return metaStates.filter(
    (node: any) => node.is_connected === false && node.type !== 'start' && node.type !== 'end'
  )
}

/** Checks if workflow was created from a template */
const hasTemplateContent = (data: any) => {
  return (
    (data.workflowFields?.description && data.workflowFields.description !== '') ||
    (data.workflowFields?.icon_url && data.workflowFields.icon_url !== '') ||
    (data.yamlConfig && data.yamlConfig !== 'states: []')
  )
}

/** Checks if user made any changes to an empty workflow */
const hasWorkflowChanges = (current: any) => {
  const currentName = current.workflowFields?.name || ''
  if (currentName !== '') {
    return true
  }

  const hasFieldContent =
    (current.workflowFields?.description && current.workflowFields.description !== '') ||
    (current.workflowFields?.icon_url && current.workflowFields.icon_url !== '')

  let hasYamlContent = false
  try {
    const parsed = yaml.load(current.yamlConfig || 'states: []') as any
    if (parsed && typeof parsed === 'object') {
      const hasStates = parsed.states && Array.isArray(parsed.states) && parsed.states.length > 0
      const hasAssistants =
        parsed.assistants && Array.isArray(parsed.assistants) && parsed.assistants.length > 0
      const hasConfig =
        parsed.enable_summarization_node !== undefined ||
        parsed.max_concurrency !== undefined ||
        parsed.recursion_limit !== undefined ||
        parsed.tokens_limit_before_summarization !== undefined

      // Check if user added nodes (they appear as disconnected in meta_states)
      const hasUserAddedNodes =
        parsed.meta_states &&
        Array.isArray(parsed.meta_states) &&
        getDisconnectedNodes(parsed.meta_states).length > 0

      hasYamlContent = hasStates || hasAssistants || hasConfig || hasUserAddedNodes
    }
  } catch (error) {
    hasYamlContent = false
  }

  return hasFieldContent || hasYamlContent
}

/** Converts null fields to empty strings (icon_url, description) */
const normalizeWorkflowFields = (data: any): any => {
  if (!data?.workflowFields) return data

  const result = { ...data }

  if (result.workflowFields.icon_url === null) {
    result.workflowFields = { ...result.workflowFields, icon_url: '' }
  }

  if (result.workflowFields.description === null) {
    result.workflowFields = { ...result.workflowFields, description: '' }
  }

  return result
}

/** Removes meta fields from state.next */
const cleanStateMetaFields = (state: any) => {
  if (state.next && (state.next.meta_iter_state_id || state.next.meta_next_state_id)) {
    const {
      meta_iter_state_id: _meta_iter_state_id,
      meta_next_state_id: _meta_next_state_id,
      ...rest
    } = state.next
    return { ...state, next: rest }
  }
  return state
}

/** Processes meta_states and tracks disconnected nodes */
const processMetaStates = (parsed: any) => {
  const disconnectedNodes = getDisconnectedNodes(parsed.meta_states)

  if (disconnectedNodes.length > 0) {
    parsed._has_disconnected_nodes = true
    parsed._disconnected_nodes_count = disconnectedNodes.length
  }

  delete parsed.meta_states
}

/** Removes UI metadata from YAML (meta fields, orphaned_states, empty tools) and tracks disconnected nodes */
const normalizeYamlConfig = (yamlString: string) => {
  try {
    const parsed = yaml.load(yamlString) as any

    if (!parsed || typeof parsed !== 'object') {
      return yamlString
    }

    if (parsed.states && Array.isArray(parsed.states)) {
      parsed.states = parsed.states.map(cleanStateMetaFields)
    }

    if (parsed.orphaned_states) {
      delete parsed.orphaned_states
    }

    if (parsed.meta_states) {
      processMetaStates(parsed)
    }

    // Remove empty tools array (UI removes it during rendering)
    if (parsed.tools && Array.isArray(parsed.tools) && parsed.tools.length === 0) {
      delete parsed.tools
    }

    return parsed
  } catch (error) {
    console.error('Error parsing YAML:', error)
  }

  return yamlString
}

/**
 * Compares workflow data to detect unsaved changes.
 * Returns true if there are differences (show modal), false otherwise.
 */
export const compareWorkflowData = (initial: any, current: any) => {
  if (!initial || !current) return false

  const isNewWorkflow = !initial.workflowFields?.name || initial.workflowFields.name === ''

  if (isNewWorkflow) {
    if (hasTemplateContent(initial)) {
      return true
    }

    return hasWorkflowChanges(current)
  }

  let normalizedInitial = {
    ...initial,
    yamlConfig: normalizeYamlConfig(initial.yamlConfig || ''),
  }
  let normalizedCurrent = {
    ...current,
    yamlConfig: normalizeYamlConfig(current.yamlConfig || ''),
  }

  normalizedInitial = normalizeWorkflowFields(normalizedInitial)
  normalizedCurrent = normalizeWorkflowFields(normalizedCurrent)

  if (!initial.workflowFields?.project || initial.workflowFields?.project === null) {
    normalizedInitial.workflowFields = {
      ...normalizedInitial.workflowFields,
      project: normalizedCurrent.workflowFields?.project,
    }
  }

  return !isEqual(normalizedInitial, normalizedCurrent)
}
