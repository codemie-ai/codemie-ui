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

export const chatSkillsKey = (chatId: string): string => `${CHAT_SKILLS_KEY}-${chatId}`
export const chatToolsConfigKey = (chatId: string): string => `${CHAT_TOOLS_CONFIG_KEY}-${chatId}`

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
      if (isUserSkills || isUserTools) {
        const chatId = isUserSkills ? key.slice(skillsPrefix.length) : key.slice(toolsPrefix.length)
        if (!validChatIds.includes(chatId)) {
          localStorage.removeItem(key)
          return
        }
      }
    }

    // Empty-value sweep: all users' chat keys (including other users)
    const isChatKey =
      key.includes(`_${chatSkillsKey('')}`) || key.includes(`_${chatToolsConfigKey('')}`)
    if (isChatKey && isEmptyChatValue(key)) localStorage.removeItem(key)
  })
}
