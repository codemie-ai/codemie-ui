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

import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'

import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useFocusOnVisible } from '@/hooks/useFocusOnVisible'
import { MCPConfig, MCPConfigRequest } from '@/types/entity/mcp'
import { copyToClipboard } from '@/utils/utils'

import { mcpServerSchema, MCPServerFormData } from '../mcpServerValidation'
import {
  getDefaultFormValues,
  getFormValuesFromServer,
  transformFormDataToSubmit,
} from './modalHelpers'

interface UseMCPServerModalProps {
  visible: boolean
  server: MCPConfig | null
  onHide: () => void
  onSubmit: (data: Partial<MCPConfigRequest>) => Promise<void>
}

export const useMCPServerModal = ({
  visible,
  server,
  onHide,
  onSubmit,
}: UseMCPServerModalProps) => {
  const firstInputRef = useRef<HTMLInputElement>(null)

  const form = useForm({
    resolver: yupResolver(mcpServerSchema),
    defaultValues: getDefaultFormValues(),
  })

  const { reset, handleSubmit, watch, setValue } = form
  const serverConfig = watch('serverConfig')
  const variables = watch('required_env_vars') || []

  useFocusOnVisible(firstInputRef, visible)

  const handleClose = () => {
    reset()
    onHide()
  }

  useEscapeKey(handleClose, visible)

  useEffect(() => {
    if (visible && server) {
      reset(getFormValuesFromServer(server))
    } else if (visible) {
      reset(getDefaultFormValues())
    }
  }, [visible, server, reset])

  const onFormSubmit = async (data: MCPServerFormData) => {
    try {
      const submitData = transformFormDataToSubmit(data)
      await onSubmit(submitData)
      handleClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handlePrettifyConfig = () => {
    try {
      const parsed = JSON.parse(serverConfig || '{}')
      setValue('serverConfig', JSON.stringify(parsed, null, 2))
    } catch (error) {
      // Invalid JSON - ignore
    }
  }

  const handleCopyConfig = () => {
    copyToClipboard(serverConfig || '', 'Configuration copied!')
  }

  const handleAddVariable = () => {
    setValue('required_env_vars', [...variables, { name: '', description: '', required: true }])
  }

  const handleVariableChange = (index: number, field: string, value: any) => {
    const updated = [...variables]
    updated[index] = { ...updated[index], [field]: value }
    setValue('required_env_vars', updated)
  }

  const handleRemoveVariable = (index: number) => {
    setValue(
      'required_env_vars',
      variables.filter((_, i) => i !== index)
    )
  }

  return {
    form,
    firstInputRef,
    serverConfig,
    variables,
    handleClose,
    handlePrettifyConfig,
    handleCopyConfig,
    handleAddVariable,
    handleVariableChange,
    handleRemoveVariable,
    onFormSubmit: handleSubmit(onFormSubmit),
  }
}
