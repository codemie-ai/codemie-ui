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

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'

import { ActorTypes } from '@/types/workflowEditor/base'
import {
  CustomNodeConfiguration,
  CustomNodeStateConfiguration,
  WorkflowConfiguration,
} from '@/types/workflowEditor/configuration'
import { ConfigurationUpdate } from '@/utils/workflowEditor'
import { generateActorID, shouldReuseActorId } from '@/utils/workflowEditor/helpers/states'

import CommonStateFields, { CommonStateFieldsRef } from './CommonStateFields'
import ConfigAccordion from './components/ConfigAccordion'
import CustomNodeForm, { CustomNodeFormRef } from './components/CustomNodeForm'
import TabFooter from './components/TabFooter'
import ValidationError from './components/ValidationError'
import { buildCommonStateConfig } from './utils/formUtils'

interface CustomTabProps {
  project: string
  stateId: string
  config: WorkflowConfiguration
  onConfigChange: (updates: ConfigurationUpdate) => void
  onClose: (skipDirtyCheck?: boolean) => void
  onDelete: () => void
  onDuplicate?: () => void
  validationError?: string
  onClearStateError?: (stateId: string) => void
}

export interface CustomTabRef {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

const getCustomNodeActorConfig = (
  config: WorkflowConfiguration,
  state: CustomNodeStateConfiguration
) => {
  const result = config.custom_nodes?.find(
    (cn) => cn.id === state?.custom_node_id
  ) as CustomNodeConfiguration
  if (!result) {
    return {
      id: state.id,
    }
  }
  return result
}

const CustomTab = forwardRef<CustomTabRef, CustomTabProps>(
  (
    {
      stateId,
      project,
      config,
      onConfigChange,
      onClose,
      onDelete,
      onDuplicate,
      validationError,
      onClearStateError,
    },
    ref
  ) => {
    const state = config.states?.find((s) => s.id === stateId) as CustomNodeStateConfiguration
    const [customNodeActorConfig, setCustomNodeActorConfig] = useState<CustomNodeConfiguration>(
      () => getCustomNodeActorConfig(config, state)
    )

    const commonStateFieldsRef = useRef<CommonStateFieldsRef>(null)
    const customNodeFormRef = useRef<CustomNodeFormRef>(null)

    useEffect(() => {
      if (!state) return

      const customNodeActorConfig = getCustomNodeActorConfig(config, state)
      if (!customNodeActorConfig) return

      setCustomNodeActorConfig(customNodeActorConfig)
    }, [state?.custom_node_id, config, state])

    const saveData = async (): Promise<boolean> => {
      if (validationError && onClearStateError) {
        onClearStateError(stateId)
      }

      if (!commonStateFieldsRef.current) return false
      const isCommonFieldsValid = await commonStateFieldsRef.current.validate()
      if (!isCommonFieldsValid) return false

      const commonValues = commonStateFieldsRef.current.getValues()

      const canReuseId = shouldReuseActorId(
        config,
        ActorTypes.CustomNode,
        state.custom_node_id,
        stateId
      )
      const customNodeId =
        canReuseId && state.custom_node_id
          ? state.custom_node_id
          : generateActorID(ActorTypes.CustomNode, config)

      // Validate and get custom node form values
      if (!customNodeFormRef.current) return false
      const isValid = await customNodeFormRef.current.validate()
      if (!isValid) return false

      const customNodeFormValues = customNodeFormRef.current.getValues()

      // Build final custom node configuration
      const finalCustomNodeConfig: CustomNodeConfiguration = {
        id: customNodeId,
        custom_node_id: customNodeFormValues.custom_node_id,
        name: customNodeFormValues.name,
        model: customNodeFormValues.model,
        system_prompt: customNodeFormValues.system_prompt,
        config: customNodeFormValues.config,
      }

      const updatedStateConfig: CustomNodeStateConfiguration = {
        ...buildCommonStateConfig(commonValues, state),
        custom_node_id: finalCustomNodeConfig.id,
      }

      commonStateFieldsRef.current?.reset()
      customNodeFormRef.current?.reset()

      onConfigChange({
        state: { id: stateId, data: updatedStateConfig },
        actors: {
          customNodes: [finalCustomNodeConfig],
        },
      })

      return true
    }

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => {
          const commonFieldsDirty = commonStateFieldsRef.current?.isDirty() ?? false
          const customNodeFormDirty = customNodeFormRef.current?.isDirty() ?? false

          return commonFieldsDirty || customNodeFormDirty
        },
        save: saveData,
      }),
      [state, stateId, config, onConfigChange]
    )

    const handleSave = async () => {
      const success = await saveData()
      if (success) {
        onClose?.(true)
      }
    }

    if (!state) return null

    return (
      <>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <ValidationError message={validationError} />

          <ConfigAccordion title="Custom Node Configuration" defaultExpanded={true}>
            <CustomNodeForm
              ref={customNodeFormRef}
              project={project}
              customNodeConfig={customNodeActorConfig}
            />
          </ConfigAccordion>

          <CommonStateFields ref={commonStateFieldsRef} state={state} />
        </form>

        <TabFooter
          onCancel={() => onClose(true)}
          onSave={handleSave}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      </>
    )
  }
)

CustomTab.displayName = 'CustomTab'

export default CustomTab
