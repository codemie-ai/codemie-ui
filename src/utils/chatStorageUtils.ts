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

import { DynamicToolsConfig } from '@/types/chatGeneration'
import storage from '@/utils/storage'
import toaster from '@/utils/toaster'

const CHAT_SKILLS_KEY = 'chat-skills'
const CHAT_TOOLS_CONFIG_KEY = 'chat-tools-config'
const CHAT_HIDE_TOOL_OUTPUTS_KEY = 'chat-hide-tool-outputs'

export const chatSkillsKey = (chatId: string): string => `${CHAT_SKILLS_KEY}-${chatId}`
export const chatToolsConfigKey = (chatId: string): string => `${CHAT_TOOLS_CONFIG_KEY}-${chatId}`
export const chatHideToolOutputsKey = (chatId: string): string =>
  `${CHAT_HIDE_TOOL_OUTPUTS_KEY}-${chatId}`

export const DEFAULT_TOOLS_CONFIG: DynamicToolsConfig = {
  enableWebSearch: null,
  enableCodeInterpreter: null,
}

const isDefaultToolsConfig = (value: unknown): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const cfg = value as Record<string, unknown>
  return cfg.enableWebSearch === null && cfg.enableCodeInterpreter === null
}

export const saveChatTools = (userId: string, chatId: string, config: DynamicToolsConfig): void => {
  if (isDefaultToolsConfig(config)) return
  try {
    storage.put(userId, chatToolsConfigKey(chatId), config)
  } catch {
    toaster.error('Failed to save chat tools configuration')
  }
}

export const saveChatSkills = (userId: string, chatId: string, skills: unknown[]): void => {
  if (skills.length === 0) return
  try {
    storage.put(userId, chatSkillsKey(chatId), skills)
  } catch {
    toaster.error('Failed to save chat skills')
  }
}

export const saveChatHideToolOutputs = (userId: string, chatId: string, value: boolean): void => {
  if (!value) {
    localStorage.removeItem(`${userId}_${chatHideToolOutputsKey(chatId)}`)
    return
  }
  try {
    localStorage.setItem(`${userId}_${chatHideToolOutputsKey(chatId)}`, JSON.stringify(value))
  } catch {
    toaster.error('Failed to save chat tool outputs setting')
  }
}

export const loadChatHideToolOutputs = (userId: string, chatId: string): boolean => {
  const raw = localStorage.getItem(`${userId}_${chatHideToolOutputsKey(chatId)}`)
  if (!raw) return false
  try {
    return JSON.parse(raw) as boolean
  } catch {
    return false
  }
}

export const removeChatStorage = (userId: string | undefined, chatId: string): void => {
  if (!userId) return
  storage.remove(userId, chatSkillsKey(chatId))
  storage.remove(userId, chatToolsConfigKey(chatId))
}

const isEmptyChatValue = (key: string): boolean => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return true
    const parsed: unknown = JSON.parse(raw)
    return (Array.isArray(parsed) && parsed.length === 0) || isDefaultToolsConfig(parsed)
  } catch (e) {
    console.warn('chatStorageUtils: could not parse localStorage entry', key, e)
    return false
  }
}

export const sweepOrphanedChatKeys = (userId: string, validChatIds?: string[]): void => {
  const skillsPrefix = `${userId}_${chatSkillsKey('')}`
  const toolsPrefix = `${userId}_${chatToolsConfigKey('')}`
  const hideToolOutputsPrefix = `${userId}_${chatHideToolOutputsKey('')}`

  const allKeys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i)
    if (k) allKeys.push(k)
  }

  allKeys.forEach((key) => {
    // Existence sweep: current user's keys only, when validChatIds is provided
    if (validChatIds !== undefined) {
      const isUserSkills = key.startsWith(skillsPrefix)
      const isUserTools = key.startsWith(toolsPrefix)
      const isUserHideToolOutputs = key.startsWith(hideToolOutputsPrefix)
      if (isUserSkills || isUserTools || isUserHideToolOutputs) {
        let chatId: string
        if (isUserSkills) chatId = key.slice(skillsPrefix.length)
        else if (isUserTools) chatId = key.slice(toolsPrefix.length)
        else chatId = key.slice(hideToolOutputsPrefix.length)
        if (!validChatIds.includes(chatId)) {
          localStorage.removeItem(key)
          return
        }
      }
    }

    // Empty-value sweep: all users' chat keys (including other users)
    const isChatKey =
      key.includes(`_${chatSkillsKey('')}`) ||
      key.includes(`_${chatToolsConfigKey('')}`) ||
      key.includes(`_${chatHideToolOutputsKey('')}`)
    if (isChatKey && isEmptyChatValue(key)) localStorage.removeItem(key)
  })
}
