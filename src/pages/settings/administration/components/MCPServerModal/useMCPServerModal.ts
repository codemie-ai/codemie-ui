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
import toaster from '@/utils/toaster'
import { copyToClipboard } from '@/utils/utils'

import { mcpServerSchema, MCPServerFormData } from '../mcpServerValidation'
import {
  getDefaultFormValues,
  getFormValuesFromServer,
  transformFormDataToSubmit,
} from './modalHelpers'

interface UseMCPServerModalProps {
  visible: boolean
  mode: 'add' | 'edit' | 'clone'
  server: MCPConfig | null
  cloneSource?: MCPConfig | null
  onHide: () => void
  onSubmit: (data: Partial<MCPConfigRequest>) => Promise<void>
}

const getResetValuesForMode = (
  mode: 'add' | 'edit' | 'clone',
  server: MCPConfig | null,
  cloneSource: MCPConfig | null | undefined
) => {
  if (mode === 'edit' && server) {
    return getFormValuesFromServer(server)
  }
  if (mode === 'clone' && cloneSource) {
    return { ...getFormValuesFromServer(cloneSource), name: '' }
  }
  return getDefaultFormValues()
}

export const useMCPServerModal = ({
  visible,
  mode,
  server,
  cloneSource,
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
    if (!visible) return
    reset(getResetValuesForMode(mode, server, cloneSource))
  }, [visible, mode, server, cloneSource, reset])

  const onFormSubmit = async (data: MCPServerFormData) => {
    try {
      const submitData = transformFormDataToSubmit(data)
      await onSubmit(submitData)
      handleClose()
    } catch (error) {
      console.error('Failed to save MCP server:', error)
      // api.makeRequest already toasts the backend error for every non-2xx response
      // (rejected with a Response). A rejection that never reached the API layer's
      // response handling — a network/CORS/abort failure — gets no toast there, so
      // show a fallback here.
      if (!(error instanceof Response)) {
        toaster.error(error instanceof Error ? error.message : 'Failed to save MCP server')
      }
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
