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

import { useState, useEffect, useMemo, useCallback } from 'react'

import DeleteDangerSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import Popup from '@/components/Popup'
import Table from '@/components/Table/Table'
import { ButtonSize } from '@/constants'
import { AssistantPromptVariable, AssistantPromptVariableMeta } from '@/types/entity/assistant'
import { ColumnDefinition } from '@/types/table'

import EditVariableFormRow from './ManageVariablesPopup/EditVariableFormRow'
import NewVariableForm from './ManageVariablesPopup/NewVariableForm'
import VariablePill from './ManageVariablesPopup/VariablePill'

interface ManagePromptVariablesPopupProps {
  isVisible: boolean
  promptVariables: AssistantPromptVariable[]
  onHide: () => void
  onSave: (vars: AssistantPromptVariable[], updatedKeys: { [key: string]: string }) => void
}

const VARIABLE_TEMPLATE_TEXT = '{{your_variable}}'

const ManagePromptVariablesPopup = ({
  promptVariables,
  isVisible,
  onHide,
  onSave,
}: ManagePromptVariablesPopupProps) => {
  const [variables, setVariables] = useState<AssistantPromptVariable[]>([])
  const [showNewVariableForm, setShowNewVariableForm] = useState(false)
  const [updatedKeysMapping, setUpdatedKeysMapping] = useState({})

  const getVariable = (key: string) => {
    return variables.find((item) => item.key === key)
  }

  const applyVariable = (
    key: string,
    values?: AssistantPromptVariable,
    meta: AssistantPromptVariableMeta = {}
  ) => {
    setVariables((currentVariables) => {
      return currentVariables.map((currentVariable) => {
        if (currentVariable.key !== key) return { ...currentVariable }

        const newMeta = { ...currentVariable._meta, ...meta }
        return { ...currentVariable, ...values, _meta: newMeta }
      })
    })
  }

  const renderEditForm = (variable: AssistantPromptVariable, key: string) => {
    return (
      <EditVariableFormRow
        key={`form-${key}`}
        variable={variable}
        existingVariables={variables}
        onCancel={() => onCancelEditVariable(key)}
        onSubmit={(values: AssistantPromptVariable) => onUpdateVariable(key, values)}
      />
    )
  }

  const handleNew = (value: AssistantPromptVariable) => {
    setVariables((vars) => [...vars, value])
    setShowNewVariableForm(false)
  }

  const handleSave = () => {
    setShowNewVariableForm(false)
    onSave(variables, updatedKeysMapping)
  }

  const handleCancelNew = () => {
    setVariables(promptVariables)
    setShowNewVariableForm(false)
    onHide()
  }

  const onRemoveVariable = useCallback((key: string) => {
    setVariables((vars) => vars.filter((variable) => variable.key !== key))
  }, [])

  const onEditVariable = (key: string) => {
    const variable = getVariable(key)
    if (!variable) return

    applyVariable(key, undefined, { customRender: () => renderEditForm(variable, key) })
  }

  const onCancelEditVariable = (key: string) => {
    const variable = getVariable(key)
    if (!variable) return

    applyVariable(key, undefined, { customRender: undefined })
  }

  const onUpdateVariable = (key: string, values: AssistantPromptVariable) => {
    applyVariable(key, values, { customRender: undefined })

    if (key !== values.key) {
      setUpdatedKeysMapping((mapping) => {
        return { ...mapping, [key]: values.key }
      })
    }
  }

  const tableColumns: ColumnDefinition[] = useMemo(
    () => [
      { label: 'Key', key: 'key', type: 'custom', shrink: true, semiBold: true },
      { label: 'Default Value', key: 'default_value', type: 'custom', shrink: true },
      { label: 'Description', key: 'description', type: 'string', shrink: true },
      { label: 'Sensitive', key: 'is_sensitive', type: 'custom', shrink: true },
      { label: '', key: 'actions', type: 'custom' },
    ],
    []
  )

  const customRenderColumns = useMemo(
    () => ({
      key: (item) => <VariablePill value={item.key} />,
      default_value: (item) => (
        <span className="text-sm">
          {item.is_sensitive && item.default_value ? '••••••••••' : item.default_value || ''}
        </span>
      ),
      is_sensitive: (item) => (
        <div className="flex items-center justify-start pointer-events-none">
          <Checkbox checked={!!item.is_sensitive} onChange={() => {}} label="" />
        </div>
      ),
      actions: (variable, _) => (
        <div className="flex gap-2 justify-end">
          <Button
            type="secondary"
            size={ButtonSize.MEDIUM}
            onClick={() => onEditVariable(variable.key)}
          >
            <EditSvg />
          </Button>
          <Button
            type="delete"
            size={ButtonSize.MEDIUM}
            onClick={() => onRemoveVariable(variable.key)}
          >
            <DeleteDangerSvg />
          </Button>
        </div>
      ),
    }),
    [variables]
  )

  useEffect(() => {
    setVariables(promptVariables)
  }, [promptVariables, isVisible])

  return (
    <Popup
      hideFooter
      visible={isVisible}
      submitText={'Save'}
      header="Manage Prompt Variables"
      className="w-[965px]"
      onHide={handleCancelNew}
    >
      <div>
        <p className="text-sm text-text-quaternary mb-4 leading-6">
          Define custom prompt variables that can be used in system instructions. These variables
          can be inserted as <code>{VARIABLE_TEMPLATE_TEXT}</code> in the system prompt.
        </p>

        <div className="flex justify-between mt-10">
          <h3>Variables</h3>

          <Button
            type="secondary"
            disabled={showNewVariableForm}
            onClick={() => setShowNewVariableForm(true)}
          >
            <PlusSvg />
            Add variable
          </Button>
        </div>

        {showNewVariableForm && (
          <NewVariableForm
            existingVariables={variables}
            onSubmit={handleNew}
            onCancel={() => setShowNewVariableForm(false)}
          />
        )}

        <Table
          items={variables}
          columnDefinitions={tableColumns}
          customRenderColumns={customRenderColumns}
          embedded={true}
        />

        <div className="flex justify-end gap-4 mt-6 mb-4">
          <Button type="secondary" onClick={handleCancelNew}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSave} disabled={showNewVariableForm}>
            Save
          </Button>
        </div>
      </div>
    </Popup>
  )
}

export default ManagePromptVariablesPopup
