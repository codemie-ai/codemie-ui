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

import { MCPServerConfig } from '@/types/entity/mcp'

export const jsonValidator = (value?: string): boolean => {
  if (!value || value.trim() === '') return true

  try {
    JSON.parse(value)
    return true
  } catch (error) {
    if (error instanceof SyntaxError) return false
    throw error
  }
}

export const commandOrUrlXorValidator = (value?: string): boolean => {
  if (!value || value.trim() === '') return true

  try {
    const config = JSON.parse(value)
    const hasCommand = config.command && String(config.command).trim() !== ''
    const hasUrl = config.url && String(config.url).trim() !== ''
    return (hasCommand && !hasUrl) || (!hasCommand && hasUrl)
  } catch (error) {
    if (error instanceof SyntaxError) return false
    throw error
  }
}

export const streamableHttpValidator = (value?: string): boolean => {
  if (!value || value.trim() === '') return true

  try {
    const config = JSON.parse(value)
    if (config.type === 'streamable-http') {
      return config.url && String(config.url).trim() !== ''
    }

    return true
  } catch (error) {
    if (error instanceof SyntaxError) return false
    throw error
  }
}

export const formatJson = (configJson?: string, setValue?: any): void => {
  try {
    if (configJson && configJson !== '{}' && jsonValidator(configJson) && setValue) {
      const parsedJson = JSON.parse(configJson)
      setValue('configJson', JSON.stringify(parsedJson, null, 2))
    }
  } catch (error) {
    if (error instanceof SyntaxError) console.error('Error formatting JSON:', error)
    else throw error
  }
}

export const parseConfigJson = (configJson?: string): MCPServerConfig => {
  let config: MCPServerConfig
  try {
    config = JSON.parse(configJson ?? '')
  } catch (error) {
    if (error instanceof SyntaxError) config = {}
    else throw error
  }
  return config
}
