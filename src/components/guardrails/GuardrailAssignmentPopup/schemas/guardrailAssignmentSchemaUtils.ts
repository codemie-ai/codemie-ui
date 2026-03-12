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

import * as Yup from 'yup'

import {
  EntityAssignmentFormItem,
  GuardrailAssignmentFormValues,
} from './guardrailAssignmentSchema'

const hasProjectLevelEnabled = (from: any) => {
  const rootValue = from?.[from.length - 1]?.value as GuardrailAssignmentFormValues | undefined

  const projectSettings = rootValue?.project?.settings
  return !!(Array.isArray(projectSettings) && projectSettings[0])
}

const hasEntityLevelEnabled = (path: string, from: any) => {
  const rootValue = from?.[from.length - 1]?.value as GuardrailAssignmentFormValues | undefined

  if (path.includes('assistants.items')) {
    const assistantSettings = rootValue?.assistants?.settings
    return !!(Array.isArray(assistantSettings) && assistantSettings[0])
  }

  if (path.includes('workflows.items')) {
    const workflowSettings = rootValue?.workflows?.settings
    return !!(Array.isArray(workflowSettings) && workflowSettings[0])
  }

  if (path.includes('datasources.items')) {
    const datasourceSettings = rootValue?.datasources?.settings
    return !!(Array.isArray(datasourceSettings) && datasourceSettings[0])
  }

  return false
}

export const isConnectionHeaderSettingSelected = function (
  this: Yup.TestContext<Yup.AnyObject>,
  value
) {
  const { path, from } = this

  if (!path.includes('project.settings') && hasProjectLevelEnabled(from)) {
    return true
  }

  if (!value || value.trim() === '') {
    return this.createError({
      path,
      message: 'Required field',
    })
  }

  return true
}

export const isConnectionSettingSelected = function (this: Yup.TestContext<Yup.AnyObject>, value) {
  const { path, from } = this

  if (hasProjectLevelEnabled(from) || hasEntityLevelEnabled(path, from)) return true

  if (!value || value.trim() === '') {
    return this.createError({
      path,
      message: 'Required field',
    })
  }

  return true
}

export const GUARDRAIL_DUPLICATE_TEST_TYPE = 'duplicate'
export const isDuplicateConnectionItem = function (this: Yup.TestContext<Yup.AnyObject>, value) {
  const { path, parent, from } = this
  const items = parent as EntityAssignmentFormItem[]

  if (hasProjectLevelEnabled(from) || hasEntityLevelEnabled(path, from)) return true

  // Skip duplicate check if ID is empty - let the 'is-required' error take priority
  if (!value.id || !value.settings.mode || !value.settings.source) {
    return true
  }

  const duplicates = items.filter(
    (item) =>
      item.id === value.id &&
      item.settings.mode === value.settings.mode &&
      item.settings.source === value.settings.source
  )

  if (duplicates.length > 1) {
    return this.createError({
      path,
      message: 'Connection with these parameters already exists',
    })
  }

  return true
}
