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

import React, { useState, useEffect } from 'react'

import ChatBubblesSVG from '@/assets/icons/chat.svg?react'
import ChevronRightSVG from '@/assets/icons/chevron-right.svg?react'
import QuestionCircleSVG from '@/assets/icons/question-circle.svg?react'
import { ONBOARDING_ASSISTANT_SLUG, FEEDBACK_ASSISTANT_SLUG } from '@/constants/assistants'
import { appInfoStore } from '@/store/appInfo'
import { assistantsStore } from '@/store/assistants'
import { isConfigItemEnabled } from '@/utils/settings'

const QuickActions: React.FC = () => {
  const getInitialCollapsedState = () => {
    const storedState = localStorage.getItem('quickActionsCollapsed')
    return storedState ? JSON.parse(storedState) : false
  }

  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsedState())
  const [isFeedbackAssistantQuickActionEnabled, setIsFeedbackAssistantQuickActionEnabled] =
    useState<boolean>(false)

  const toggleCollapse = () => {
    const newState = !collapsed
    setCollapsed(newState)
    localStorage.setItem('quickActionsCollapsed', JSON.stringify(newState))
  }

  const checkFeedbackAssistant = async () => {
    try {
      const customerEnabledComponents = await appInfoStore.fetchCustomerConfig()
      const feedbackAssistantEnabled = isConfigItemEnabled(
        customerEnabledComponents,
        'feedbackAssistant'
      )

      if (feedbackAssistantEnabled) {
        const feedbackAssistantExists = await assistantsStore.doesAssistantBySlugExist(
          FEEDBACK_ASSISTANT_SLUG
        )
        setIsFeedbackAssistantQuickActionEnabled(feedbackAssistantExists)
      }
    } catch (error) {
      console.error('Error checking feedback assistant:', error)
    }
  }

  useEffect(() => {
    checkFeedbackAssistant()
  }, [])

  return (
    <div className="quick-actions absolute bottom-2 right-2 flex flex-col gap-2">
      {!collapsed && (
        <a
          href={`/#/assistants/${ONBOARDING_ASSISTANT_SLUG}/start`}
          className="action action-faq rounded-full w-[42px] h-[42px] flex flex-col justify-center items-center bg-white shadow-md text-text-accent-hover border-text-accent-hover border-2 opacity-80 duration-150 cursor-pointer hover:opacity-100 hover:scale-105"
        >
          <QuestionCircleSVG />
        </a>
      )}

      {!collapsed && isFeedbackAssistantQuickActionEnabled && (
        <a
          href={`/#/assistants/${FEEDBACK_ASSISTANT_SLUG}/start`}
          className="action action-feedback rounded-full w-[42px] h-[42px] flex flex-col justify-center items-center bg-white shadow-md text-text-accent-hover border-text-accent-hover border-2 opacity-80 duration-150 cursor-pointer hover:opacity-100 hover:scale-105"
        >
          <ChatBubblesSVG className="w-[30px] h-[30px]" />
        </a>
      )}

      <button
        className={`collapse-btn cursor-pointer self-end pr-[12px] transition-all transform duration-150 ${
          collapsed ? 'rotate-180' : ''
        }`}
        onClick={toggleCollapse}
      >
        <ChevronRightSVG className="scale-x-110 hover:fill-text-accent-hover hover:scale-125" />
      </button>
    </div>
  )
}

export default QuickActions
