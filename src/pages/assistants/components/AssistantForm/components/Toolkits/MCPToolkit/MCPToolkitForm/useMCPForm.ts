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
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import { MCPServerDetails } from '@/types/entity/mcp'

import { createFormSchema } from '../formSchema'
import { MCPFormValues } from '../formTypes'
import { formatJson } from '../validators'

interface UseMCPFormParams {
  mcpServer?: MCPServerDetails
  mcpServerNames: string[]
}

const getInitialValues = (mcpServer?: MCPServerDetails): MCPFormValues => ({
  name: mcpServer?.name ?? '',
  description: mcpServer?.description ?? '',
  tokensSizeLimit: mcpServer?.tools_tokens_size_limit ?? null,
  connectUrl: mcpServer?.mcp_connect_url ?? '',
  configJson: mcpServer?.config ? JSON.stringify(mcpServer?.config) : '{}',
  command: mcpServer?.command ?? '',
  arguments: mcpServer?.arguments ?? '',
})

const checkConfigHasEnv = (configJson: string): boolean => {
  try {
    const config = JSON.parse(configJson ?? '')
    return !!config.env
  } catch (error) {
    if (error instanceof SyntaxError) return false
    throw error
  }
}

export const useMCPForm = ({ mcpServer, mcpServerNames }: UseMCPFormParams) => {
  const nameUniqueValidator = (value: string) => {
    if (mcpServer) return true
    return !mcpServerNames.includes(value)
  }

  const formSchema = useMemo(
    () => createFormSchema({ nameUniqueValidator }),
    [mcpServerNames, mcpServer]
  )

  const form = useForm<MCPFormValues>({
    mode: 'all',
    resolver: yupResolver(formSchema) as any,
    defaultValues: getInitialValues(mcpServer),
  })

  const { setValue, reset } = form
  const configJson = form.watch('configJson')
  const configHasEnv = useMemo(() => checkConfigHasEnv(configJson), [configJson])

  useEffect(() => {
    const initValues = getInitialValues(mcpServer)
    reset(initValues)
    formatJson(initValues.configJson, setValue)
  }, [mcpServer, reset, setValue])

  return {
    form,
    configHasEnv,
    isEditing: !!mcpServer,
  }
}
