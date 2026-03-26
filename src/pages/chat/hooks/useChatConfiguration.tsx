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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import { assistantsStore } from '@/store'
import { chatsStore } from '@/store/chats'
import { userStore } from '@/store/user'
import { DynamicToolsConfig } from '@/types/chatGeneration'
import { Assistant } from '@/types/entity/assistant'
import storage from '@/utils/storage'

import { SkillOption } from '../components/ChatConfiguration/ChatConfigSkillsSelector'

const CHAT_TOOLS_CONFIG_KEY = 'chat-tools-config'
const CHAT_SKILLS_KEY = 'chat-skills'

const saveChatTools = (userId: string, chatId: string, config: DynamicToolsConfig) => {
  storage.put(userId, `${CHAT_TOOLS_CONFIG_KEY}-${chatId}`, config)
}

const loadChatTools = (userId: string, chatId: string): DynamicToolsConfig => {
  return storage.getObject<DynamicToolsConfig>(userId, `${CHAT_TOOLS_CONFIG_KEY}-${chatId}`, {
    enableWebSearch: null,
    enableCodeInterpreter: null,
  })
}

const saveChatSkills = (userId: string, chatId: string, skills: SkillOption[]) => {
  storage.put(userId, `${CHAT_SKILLS_KEY}-${chatId}`, skills)
}

const loadChatSkills = (userId: string, chatId: string): SkillOption[] => {
  return storage.get<SkillOption>(userId, `${CHAT_SKILLS_KEY}-${chatId}`)
}

export type UseChatConfigReturn = {
  selectedAssistant: Assistant | null
  isLoading: boolean
  isConfigVisible: boolean
  isConfigFormVisible: boolean

  // Skills state (selected skills are shared across components)
  selectedSkills: SkillOption[]
  setSelectedSkills: (skills: SkillOption[]) => void

  // Dynamic tools state (Web Search, Code Interpreter)
  dynamicToolsConfig: DynamicToolsConfig
  setDynamicToolsConfig: (config: DynamicToolsConfig) => void

  closeConfig: () => void
  toggleConfigVisibility: () => void
  attemptToggleConfigVisibility: () => void

  openConfigForm: (assistantId: string) => void
  closeConfigForm: () => void
}

export const useChatConfiguration = (): UseChatConfigReturn => {
  const { currentChat } = useSnapshot(chatsStore)

  const [isConfigVisible, setIsConfigVisible] = useState(false)
  const [isConfigFormVisible, setIsConfigFormVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(null)

  const [selectedSkills, setSelectedSkills] = useState<SkillOption[]>([])

  // Dynamic tools state - Web Search and Code Interpreter
  const [dynamicToolsConfig, setDynamicToolsConfig] = useState<DynamicToolsConfig>({
    enableWebSearch: null,
    enableCodeInterpreter: null,
  })

  const handleSetDynamicToolsConfig = useCallback(
    (config: DynamicToolsConfig) => {
      setDynamicToolsConfig(config)
      const chatId = currentChat?.id
      const userId = userStore.user?.user_id
      if (chatId && userId) {
        saveChatTools(userId, chatId, config)
      }
    },
    [currentChat?.id]
  )

  const handleSetSelectedSkills = useCallback(
    (skills: SkillOption[]) => {
      setSelectedSkills(skills)
      const chatId = currentChat?.id
      const userId = userStore.user?.user_id
      if (chatId && userId) {
        saveChatSkills(userId, chatId, skills)
      }
    },
    [currentChat?.id]
  )

  const fetchAssistant = async (assistantId: string) => {
    setIsLoading(true)
    try {
      setSelectedAssistant(await assistantsStore.getAssistant(assistantId))
    } catch (error) {
      console.error('Error fetching assistant: ', error)
    } finally {
      setIsLoading(false)
    }
  }

  const closeConfigForm = useCallback(() => {
    setIsConfigFormVisible(false)
    setSelectedAssistant(null)
  }, [])

  const openConfigForm = useCallback((assistantId: string) => {
    setIsConfigVisible(true)
    setIsConfigFormVisible(true)
    setIsLoading(true)
    fetchAssistant(assistantId)
  }, [])

  const closeConfig = useCallback(() => {
    setIsConfigVisible(false)
    closeConfigForm()
  }, [closeConfigForm])

  const toggleConfigVisibility = useCallback(() => {
    setIsConfigVisible((prev) => {
      if (prev) {
        setIsConfigFormVisible(false)
        setSelectedAssistant(null)
      }
      return !prev
    })
  }, [])

  const attemptToggleConfigVisibility = useCallback(() => {
    toggleConfigVisibility()
  }, [toggleConfigVisibility])

  useEffect(() => {
    // Close config sidebar immediately when switching to a workflow chat
    if (currentChat?.isWorkflow) {
      if (isConfigVisible || isConfigFormVisible) {
        setIsConfigVisible(false)
        setIsConfigFormVisible(false)
        setSelectedAssistant(null)
        setIsLoading(false)
      }
    } else if (isConfigFormVisible) {
      closeConfigForm()
    }

    const chatId = currentChat?.id
    const userId = userStore.user?.user_id

    if (chatId && userId) {
      // Restore persisted tools config for this chat
      setDynamicToolsConfig(loadChatTools(userId, chatId))
      // Restore persisted skills for this chat
      setSelectedSkills(loadChatSkills(userId, chatId))
    } else {
      setDynamicToolsConfig({ enableWebSearch: null, enableCodeInterpreter: null })
      setSelectedSkills([])
    }
  }, [currentChat?.id, currentChat?.isWorkflow, closeConfigForm])

  return useMemo(
    () => ({
      selectedAssistant,
      isLoading,
      isConfigVisible,
      isConfigFormVisible,
      // Skills state
      selectedSkills,
      setSelectedSkills: handleSetSelectedSkills,
      // Dynamic tools state
      dynamicToolsConfig,
      setDynamicToolsConfig: handleSetDynamicToolsConfig,
      closeConfig,
      toggleConfigVisibility,
      attemptToggleConfigVisibility,
      openConfigForm,
      closeConfigForm,
    }),
    [
      isLoading,
      isConfigVisible,
      isConfigFormVisible,
      selectedAssistant?.id,
      selectedSkills,
      dynamicToolsConfig,
      handleSetSelectedSkills,
      handleSetDynamicToolsConfig,
      closeConfig,
      toggleConfigVisibility,
      attemptToggleConfigVisibility,
      openConfigForm,
      closeConfigForm,
    ]
  )
}
