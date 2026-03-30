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
  TransformStateConfiguration,
  WorkflowConfiguration,
  TransformConfig,
  TransformInputSource,
  TransformErrorStrategy,
  CustomNodeType,
} from '@/types/workflowEditor/configuration'
import { cleanObject } from '@/utils/helpers'
import { ConfigurationUpdate } from '@/utils/workflowEditor'
import { generateActorID, shouldReuseActorId } from '@/utils/workflowEditor/helpers/states'

import CommonStateFields, { CommonStateFieldsRef } from './CommonStateFields'
import ConfigAccordion from './components/ConfigAccordion'
import TabFooter from './components/TabFooter'
import TransformForm, { TransformFormRef } from './components/TransformForm'
import ValidationError from './components/ValidationError'
import { buildCommonStateConfig } from './utils/formUtils'

interface TransformTabProps {
  stateId: string
  config: WorkflowConfiguration
  onConfigChange: (updates: ConfigurationUpdate) => void
  onClose: (skipDirtyCheck?: boolean) => void
  onDelete: () => void
  onDuplicate?: () => void
  validationError?: string
  onClearStateError?: (stateId: string) => void
}

export interface TransformTabRef {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

const getTransformActorConfig = (
  config: WorkflowConfiguration,
  state: TransformStateConfiguration
): CustomNodeConfiguration => {
  const result = config.custom_nodes?.find(
    (cn) => cn.id === state?.custom_node_id && cn.custom_node_id === CustomNodeType.TRANSFORM
  )
  if (!result) {
    return {
      id: state.id,
      custom_node_id: CustomNodeType.TRANSFORM,
      config: {
        input_source: TransformInputSource.CONTEXT_STORE,
        on_error: TransformErrorStrategy.FAIL,
        mappings: [],
      },
    }
  }
  return result
}

const TransformTab = forwardRef<TransformTabRef, TransformTabProps>(
  (
    {
      stateId,
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
    const state = config.states?.find((s) => s.id === stateId) as TransformStateConfiguration
    const [transformActorConfig, setTransformActorConfig] = useState<CustomNodeConfiguration>(() =>
      getTransformActorConfig(config, state)
    )

    const commonStateFieldsRef = useRef<CommonStateFieldsRef>(null)
    const transformFormRef = useRef<TransformFormRef>(null)

    // Extract TransformConfig from CustomNodeConfiguration.config
    const transformConfig: TransformConfig = transformActorConfig.config as TransformConfig

    useEffect(() => {
      if (!state) return

      const transformActorConfig = getTransformActorConfig(config, state)
      if (!transformActorConfig) return

      setTransformActorConfig(transformActorConfig)
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

      if (!transformFormRef.current) return false
      const isValid = await transformFormRef.current.validate()
      if (!isValid) return false

      const transformFormValues = transformFormRef.current.getValues()
      const cleanedTransformConfig = cleanObject(transformFormValues) as TransformConfig

      // Build final transform custom node configuration
      const finalTransformConfig: CustomNodeConfiguration = {
        id: customNodeId,
        custom_node_id: CustomNodeType.TRANSFORM,
        config: cleanedTransformConfig,
      }

      const updatedStateConfig: TransformStateConfiguration = {
        ...buildCommonStateConfig(commonValues, state),
        custom_node_id: finalTransformConfig.id,
      }

      commonStateFieldsRef.current?.reset()
      transformFormRef.current?.reset()

      onConfigChange({
        state: { id: stateId, data: updatedStateConfig },
        actors: {
          customNodes: [finalTransformConfig],
        },
      })

      return true
    }

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => {
          const commonFieldsDirty = commonStateFieldsRef.current?.isDirty() ?? false
          const transformFormDirty = transformFormRef.current?.isDirty() ?? false

          return commonFieldsDirty || transformFormDirty
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

          <ConfigAccordion title="Transform Configuration" defaultExpanded={true}>
            <TransformForm
              stateId={stateId}
              ref={transformFormRef}
              transformConfig={transformConfig}
            />
          </ConfigAccordion>

          <CommonStateFields ref={commonStateFieldsRef} state={state} showAllFields={false} />
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

TransformTab.displayName = 'TransformTab'

export default TransformTab
