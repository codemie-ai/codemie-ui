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

import React, { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import DefaultIconPng from '@/assets/images/ai-avatar.png'
import { ONBOARDING_ASSISTANT_SLUG, CHATBOT_ASSISTANT_SLUG } from '@/constants/assistants'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'
import { assistantsStore } from '@/store/assistants'
import { generateAssistantAvatarDataUrl } from '@/utils/assistantAvatar'
import { cn } from '@/utils/utils'

interface NavigationAssistantsProps {
  isExpanded: boolean
}

interface AssistantItem {
  id: string
  name: string
  description: string
  link: string
  iconUrl: string
}

const NavigationAssistants: React.FC<NavigationAssistantsProps> = ({ isExpanded }) => {
  const router = useVueRouter()
  const { helpAssistants } = useSnapshot(assistantsStore)
  const [assistantItems, setAssistantItems] = useState<AssistantItem[]>([])
  const [isGeneratedAvatarsEnabled] = useFeatureFlag('features:generatedAssistantIcons')

  useEffect(() => {
    const items: AssistantItem[] = []

    const normalizeName = (name: string) => {
      return name.replace('AI/Run', '')
    }

    const onboardingAssistant = helpAssistants.find(
      (item) => item.slug === ONBOARDING_ASSISTANT_SLUG
    )
    if (onboardingAssistant) {
      items.push({
        id: onboardingAssistant.id,
        name: normalizeName(onboardingAssistant.name),
        description: onboardingAssistant.description,
        link:
          router.resolve({
            name: 'start-assistant-chat',
            params: { slug: onboardingAssistant.slug },
          })?.fullPath || '',
        iconUrl:
          onboardingAssistant.icon_url ||
          (isGeneratedAvatarsEnabled
            ? generateAssistantAvatarDataUrl(normalizeName(onboardingAssistant.name))
            : DefaultIconPng),
      })
    }

    const chatbotAssistant = helpAssistants.find((item) => item.slug === CHATBOT_ASSISTANT_SLUG)

    if (chatbotAssistant) {
      items.push({
        id: chatbotAssistant.id,
        name: normalizeName(chatbotAssistant.name),
        description: chatbotAssistant.description,
        link:
          router.resolve({
            name: 'start-assistant-chat',
            params: { slug: chatbotAssistant.slug },
          })?.fullPath || '',
        iconUrl:
          chatbotAssistant.icon_url ||
          (isGeneratedAvatarsEnabled
            ? generateAssistantAvatarDataUrl(normalizeName(chatbotAssistant.name))
            : DefaultIconPng),
      })
    }

    setAssistantItems(items)
  }, [helpAssistants, isGeneratedAvatarsEnabled])

  const getTooltipText = (assistant: AssistantItem) => {
    return isExpanded ? `${assistant.name} \n\n ${assistant.description}` : assistant.name
  }

  const handleClick = (e: React.MouseEvent, link: string) => {
    e.preventDefault()
    router.push(link)
  }
  if (assistantItems.length === 0) return null

  return (
    <>
      <div className="mt-2"></div>
      {assistantItems.map((assistant) => (
        <a
          key={assistant.id}
          href={assistant.link ? `/#${assistant.link}` : ''}
          data-tooltip-id="react-tooltip"
          data-tooltip-place="right"
          data-tooltip-content={getTooltipText(assistant)}
          onClick={(e) => handleClick(e, assistant.link)}
          className={cn(
            'flex flex-row gap-4 items-center cursor-pointer rounded-lg max-w-[196px] overflow-hidden',
            'px-2 py-1.5 transition hover:no-underline hover:bg-white/15',
            'text-text-specific-navigation-label'
          )}
        >
          <img
            alt={assistant.name}
            src={assistant.iconUrl}
            className="rounded-full min-w-6 w-6 min-h-6 h-6 flex-shrink-0 border-border-primary border"
          />

          <div
            className={cn(
              'text-sm whitespace-nowrap truncate overflow-hidden transition-opacity duration-200 ease-in-out transform-gpu',
              isExpanded ? 'opacity-100' : 'opacity-0'
            )}
          >
            {assistant.name}
          </div>
        </a>
      ))}
    </>
  )
}

export default NavigationAssistants
