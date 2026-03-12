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

import unionBy from 'lodash/unionBy'
import { useState, useEffect, useMemo } from 'react'

import EditSvg from '@/assets/icons/edit.svg?react'
import RevertSvg from '@/assets/icons/revert.svg?react'
import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table/Table'
import TooltipButton from '@/components/TooltipButton'
import { ButtonSize, SENSITIVE_VALUE_MASK } from '@/constants'
import VariablePill from '@/pages/assistants/components/AssistantForm/components/SystemPrompt/ManageVariablesPopup/VariablePill'
import { assistantsStore } from '@/store/assistants'
import { AssistantPromptVariable, AssistantPromptVariableMeta } from '@/types/entity/assistant'
import { ColumnDefinition } from '@/types/table'
import toaster from '@/utils/toaster'

import AssistantPromptVariableForm from './AssistantPromptVariableForm'

interface AssistantPromptVariablesProps {
  assistantID: string
  promptVariables: AssistantPromptVariable[]
}

const UPDATE_SUCCESS_MSG = 'Variable value has been saved'
const CLEAR_SUCCESS_MSG = 'Variable value has been reset'

const normalizeUserVariable = (userVariable, assistantVariables) => {
  const assistantVar = assistantVariables.find(
    (variable) => variable.key === userVariable.variable_key
  )
  return {
    key: userVariable.variable_key,
    default_value: userVariable.variable_value,
    description: assistantVar?.description,
    is_sensitive: assistantVar?.is_sensitive,
    _meta: { userDefined: true },
  }
}

const AssistantPromptVariables = ({
  promptVariables,
  assistantID,
}: AssistantPromptVariablesProps) => {
  const [variables, setVariables] = useState<AssistantPromptVariable[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const getVariable = (key: string) => {
    return variables.find((item) => item.key === key)
  }

  const isVariableInAssistantList = (
    item: AssistantPromptVariable,
    assistantVariables: AssistantPromptVariable[]
  ) => {
    return assistantVariables.some((asstVariable) => asstVariable.key === item.key)
  }

  const mergeAndSortVariables = (
    userVariables: any[],
    currentVariables: AssistantPromptVariable[]
  ): AssistantPromptVariable[] => {
    const normalizedVariables: AssistantPromptVariable[] = userVariables
      .map((item) => normalizeUserVariable(item, currentVariables))
      .filter((item) => isVariableInAssistantList(item, currentVariables))

    return unionBy(normalizedVariables, currentVariables, 'key').sort((a, b) =>
      a.key.localeCompare(b.key)
    )
  }

  const fetchVariables = async () => {
    const userVariables = await assistantsStore.getAssistantUserPromptVars(assistantID)

    setVariables((currentVariables: AssistantPromptVariable[]) => {
      return mergeAndSortVariables(userVariables, currentVariables)
    })

    setIsLoading(false)
  }

  const applyVariable = (key: string, value?: string, meta: AssistantPromptVariableMeta = {}) => {
    setVariables((currentVariables) => {
      return currentVariables.map((currentVariable) => {
        if (currentVariable.key !== key) return { ...currentVariable }

        const newValue = value === null ? currentVariable.default_value : value
        const newMeta = { ...currentVariable._meta, ...meta }

        return { ...currentVariable, default_value: newValue, _meta: newMeta }
      })
    })
  }

  const renderVariableForm = (key: string, variable: AssistantPromptVariable) => {
    return (
      <AssistantPromptVariableForm
        key={`form-${key}`}
        variable={variable}
        onCancel={() => onCancelEditVariable(key)}
        onUpdate={(value: string) => onUpdateVariable(key, value)}
      />
    )
  }

  const onEditVariable = (key: string) => {
    const variable = getVariable(key)
    if (!variable) return

    applyVariable(key, variable.default_value, {
      customRender: () => renderVariableForm(key, variable),
    })
  }

  const onCancelEditVariable = (key: string) => {
    const variable = getVariable(key)
    if (!variable) return

    applyVariable(key, variable.default_value, { customRender: undefined })
  }

  const onUpdateVariable = (key: string, value: string) => {
    const variable = getVariable(key)
    if (!variable) return

    assistantsStore.updateAssistantUserPromptVariables(
      assistantID,
      unionBy(
        [{ key, default_value: value, is_sensitive: variable.is_sensitive }],
        variables.filter((item) => item._meta?.userDefined),
        'key'
      )
    )

    // For sensitive variables, use masked placeholder instead of actual value
    const maskedValue = variable.is_sensitive ? SENSITIVE_VALUE_MASK : value

    applyVariable(key, maskedValue, { userDefined: true, customRender: undefined })

    toaster.info(UPDATE_SUCCESS_MSG)
  }

  const onClearVariable = (key: string) => {
    const variable = getVariable(key)
    if (!variable) return

    const originalValue = promptVariables.find((v) => v.key === key)?.default_value || ''

    assistantsStore.updateAssistantUserPromptVariables(
      assistantID,
      variables.filter((item) => item._meta?.userDefined && item.key !== key)
    )

    applyVariable(key, originalValue, { userDefined: false })

    toaster.info(CLEAR_SUCCESS_MSG)
  }

  const tableColumns: ColumnDefinition[] = useMemo(
    () => [
      {
        label: 'Key',
        key: 'key',
        type: 'custom',
        shrink: true,
        semiBold: true,
        headClassNames: 'w-[40%]',
      },
      {
        label: 'Value',
        key: 'default_value',
        type: 'custom',
        shrink: true,
        headClassNames: 'w-[40%]',
      },
      { label: '', key: 'actions', type: 'custom' },
    ],
    []
  )

  const renderDesriptionColumn = (item) => {
    return (
      <div className="flex gap-2 items-center">
        <VariablePill value={item.key} userDefined={item._meta?.userDefined} />
        {item.description && <TooltipButton content={item.description} className="mt-0.5" />}
      </div>
    )
  }

  const renderValueColumn = (item) => {
    if (item.is_sensitive && item.default_value) {
      return <span className="text-sm">••••••••••</span>
    }
    return <span className="text-sm">{item.default_value || ''}</span>
  }

  const renderActionsColumn = (item) => {
    return (
      <div className="flex gap-2 justify-end">
        {item._meta?.userDefined && (
          <Button
            type="secondary"
            size={ButtonSize.MEDIUM}
            onClick={() => onClearVariable(item.key)}
          >
            <RevertSvg />
          </Button>
        )}

        <Button type="secondary" size={ButtonSize.MEDIUM} onClick={() => onEditVariable(item.key)}>
          <EditSvg />
        </Button>
      </div>
    )
  }

  const customRenderColumns = useMemo(
    () => ({
      key: (variable) => renderDesriptionColumn(variable),
      default_value: (variable) => renderValueColumn(variable),
      actions: (variable) => renderActionsColumn(variable),
    }),
    [variables]
  )

  useEffect(() => {
    setVariables(promptVariables)
  }, [promptVariables])

  useEffect(() => {
    fetchVariables()
  }, [])

  return isLoading ? (
    <Spinner inline />
  ) : (
    <div className="max-w-full overflow-x-scroll">
      <h3 className="text-xs font-medium">Prompt Variables</h3>

      <Table
        items={variables}
        columnDefinitions={tableColumns}
        customRenderColumns={customRenderColumns}
        embedded={true}
      />
    </div>
  )
}

export default AssistantPromptVariables
