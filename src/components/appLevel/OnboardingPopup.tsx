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

import { FC, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import {
  CHATBOT_ASSISTANT_SLUG,
  FEEDBACK_ASSISTANT_SLUG,
  ONBOARDING_ASSISTANT_SLUG,
} from '@/constants/assistants'
import { ADDITIONAL_USER_MATERIALS } from '@/constants/common'
import { useVueRouter } from '@/hooks/useVueRouter'
import { assistantsStore, userStore } from '@/store'
import { appInfoStore } from '@/store/appInfo'
import { ConfigItem } from '@/types/entity/configuration'
import { getConfigItem } from '@/utils/settings'

import Link from '../Link'

const ONBOARDING_PROMPT = 'What are the simplest usecases I can try with CodeMie?'

const isAssistantEnabled = async (config: ConfigItem[], slug: string): Promise<boolean> => {
  const configItem = getConfigItem(config, slug)
  if (!configItem?.settings?.enabled) return false
  return assistantsStore.doesAssistantBySlugExist(slug)
}

interface MaterialLink {
  id?: string
  enabled: boolean
  name?: string
  url?: string
}

const OnboardingPopup: FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const { configs, isOnboardingCompleted } = useSnapshot(appInfoStore) as typeof appInfoStore
  const [isFeedbackAssistantEnabled, setIsFeedbackAssistantEnabled] = useState(false)
  const router = useVueRouter()

  useEffect(() => {
    const loadConfig = async () => {
      if (!isOnboardingCompleted() && userStore.isSSOUser()) {
        setIsVisible(true)
      }

      const feedbackEnabled = await isAssistantEnabled(configs, FEEDBACK_ASSISTANT_SLUG)
      setIsFeedbackAssistantEnabled(feedbackEnabled)
    }

    loadConfig()
  }, [])

  const materialLinks = useMemo(() => {
    if (!configs.length) return []

    return Object.values(ADDITIONAL_USER_MATERIALS)
      .map((id) => {
        const item = getConfigItem(configs, id)
        return item?.settings
      })
      .filter((settings): settings is MaterialLink => settings?.enabled === true)
  }, [configs])

  const closePopup = () => {
    setIsVisible(false)
  }

  const completeOnboarding = () => {
    appInfoStore.completeOnboarding()
    closePopup()
    router.push({
      name: 'start-assistant-chat',
      params: { slug: ONBOARDING_ASSISTANT_SLUG },
      query: { prompt: ONBOARDING_PROMPT },
    })
  }

  const navigateToAssistant = (slug: string) => {
    closePopup()
    router.push({
      name: 'start-assistant-chat',
      params: { slug },
    })
  }

  const assistants = [
    {
      label: 'AI/Run Feedback:',
      slug: ONBOARDING_ASSISTANT_SLUG,
      isEnabled: true,
      description: 'Guides you through initial setup and familiarisation.',
    },
    {
      label: 'AI/Run Feedback:',
      slug: FEEDBACK_ASSISTANT_SLUG,
      isEnabled: isFeedbackAssistantEnabled,
      description: 'Helps report bugs and features efficiently to CodeMie team.',
    },
    {
      label: 'AI/Run Chatbot:',
      slug: CHATBOT_ASSISTANT_SLUG,
      isEnabled: true,
      description:
        'Assists with real-time conversations and generates instant responses for general inquiries and support',
    },
  ]

  return (
    <Popup limitWidth hideFooter header="Onboarding" visible={isVisible} onHide={closePopup}>
      <div className="mt-3">
        To start using AI/Run, navigate to Explore Assistants and select one of the below:
        <br />
        <ul className="px-2 py-2">
          {assistants
            .filter((assistant) => assistant.isEnabled)
            .map((assistant) => (
              <li key={assistant.slug}>
                <Link
                  label={assistant.label}
                  className="font-bold mr-1"
                  onClick={() => navigateToAssistant(assistant.slug)}
                />
                {assistant.description}
                <br />
              </li>
            ))}
        </ul>
        {materialLinks.length > 0 && (
          <>
            In addition, please familiarise yourself with the following materials:
            <br />
            <ul className="px-2 py-2 text-text-accent-status">
              {materialLinks.map((link) => (
                <li key={link.id ?? link.name}>
                  <Link url={link.url} label={link.name} className="font-bold" />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Button className="w-32 my-5 mx-auto" onClick={completeOnboarding}>
        Got It, Thanks!
      </Button>
    </Popup>
  )
}

export default OnboardingPopup
