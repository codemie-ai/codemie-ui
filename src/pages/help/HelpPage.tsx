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

import { ComponentType, FC, useEffect, useState } from 'react'
import { resolvePath } from 'react-router'
import { useSnapshot } from 'valtio'

import LearnSvg from '@/assets/icons/learn.svg?react'
import PaperSvg from '@/assets/icons/paper.svg?react'
import SheetSvg from '@/assets/icons/sheet.svg?react'
import VideoSvg from '@/assets/icons/video.svg?react'
import PageLayout from '@/components/Layouts/Layout'
import {
  ONBOARDING_ASSISTANT_SLUG,
  FEEDBACK_ASSISTANT_SLUG,
  CHATBOT_ASSISTANT_SLUG,
} from '@/constants/assistants'
import {
  CONFIG_FEEDBACK_ASST_KEY,
  ADDITIONAL_USER_MATERIALS,
  CONFIG_USER_SURVEY_KEY,
} from '@/constants/common'
import { userStore, assistantsStore } from '@/store'
import { appInfoStore } from '@/store/appInfo'
import { getConfigItemSettings, isConfigItemEnabled } from '@/utils/settings'

import HelpSection from './components/HelpSection'
import OnboardingToursSection from './components/OnboardingToursSection'

export interface HelpItemType {
  name: string
  description: string
  link: string
  type?: 'chat' | 'link'
  buttonText?: string
  iconUrl?: string
  icon?: ComponentType<React.SVGProps<SVGSVGElement>>
  isExternal?: boolean
}

export interface HelpSectionType {
  title: string
  description?: string
  items: HelpItemType[]
}

const HelpPage: FC = () => {
  const { user } = useSnapshot(userStore)
  const { helpAssistants } = useSnapshot(assistantsStore)
  const { configs } = useSnapshot(appInfoStore) as typeof appInfoStore

  const [sections, setSections] = useState<HelpSectionType[]>([])

  const addAssistantItem = (items: HelpItemType[], slug: string) => {
    const assistant = helpAssistants.find((item) => item.slug === slug)
    if (!assistant) return items

    items.push({
      name: assistant.name,
      description: assistant.description,
      type: 'chat',
      link: resolvePath(`assistants/${slug}/start`).pathname,
      iconUrl: assistant.icon_url,
    })

    return items
  }

  const isCustomerConfigItemEnabled = (id: string): boolean => {
    const configItem = configs.find((item) => item.id === id)
    return configItem?.settings?.enabled ?? false
  }

  useEffect(() => {
    const finalSections: HelpSectionType[] = []
    const assistantItems: HelpItemType[] = []
    const shareItems: HelpItemType[] = []

    addAssistantItem(assistantItems, ONBOARDING_ASSISTANT_SLUG)
    addAssistantItem(assistantItems, CHATBOT_ASSISTANT_SLUG)

    finalSections.push({
      title: 'AI Help',
      description: 'Get instant support from our smart tools.',
      items: assistantItems,
    })

    // Onboarding Tours section will be rendered separately
    // (not part of the sections array since it has custom rendering)

    if (isCustomerConfigItemEnabled(CONFIG_FEEDBACK_ASST_KEY)) {
      addAssistantItem(shareItems, FEEDBACK_ASSISTANT_SLUG)
    }
    const surveyUrl = getConfigItemSettings(configs, CONFIG_USER_SURVEY_KEY)?.url
    if (surveyUrl) {
      shareItems.push({
        name: 'Survey',
        description: 'Fill out a survey to share your experience using CodeMie.',
        type: 'link',
        icon: SheetSvg,
        link: surveyUrl,
        isExternal: true,
        buttonText: 'Open Survey',
      })
    }

    const resourcesToProps: Record<string, Partial<HelpItemType>> = {
      userGuide: {
        icon: SheetSvg,
        buttonText: 'View Docs',
        description:
          'A source for getting started, platform and deployment guides, help and contribution.',
      },
      videoPortal: {
        icon: VideoSvg,
        description: 'Short tutorials, walkthroughs, and product tips.',
      },
      youtubeChannel: {
        icon: VideoSvg,
        description: 'Watch tutorials and product guides on our YouTube channel.',
      },
      learningCourses: {
        icon: LearnSvg,
        buttonText: 'Open Courses',
        description:
          'Explore comprehensive courses to deepen your knowledge and skills with CodeMie.',
      },
    }

    const learningResourcesItems = Object.values(ADDITIONAL_USER_MATERIALS)
      .filter((id) => isConfigItemEnabled(configs, id))
      .map((id) => ({ id, ...getConfigItemSettings(configs, id) }))
      .map((config) => ({
        name: config.name!,
        description: config.description || '',
        link: config.url!,
        isExternal: true,
        ...resourcesToProps[config.id],
      }))

    finalSections.push({
      title: 'Learning Resources',
      description: 'Explore guides and videos to get the most out of the platform.',
      items: learningResourcesItems,
    })

    finalSections.push({
      title: 'Product Updates',
      description: "Track what's new, and what's improved!",
      items: [
        {
          name: 'Release Notes',
          description: 'View the latest changes, fixes, and enhancements.',
          type: 'link',
          icon: PaperSvg,
          link: resolvePath('release-notes').pathname,
          buttonText: "See What's New",
        },
      ],
    })

    if (shareItems.length) {
      finalSections.push({
        title: 'Share experience',
        items: shareItems,
      })
    }

    setSections(finalSections)
  }, [helpAssistants, user, configs])

  const getDataOnboardingAttribute = (title: string) => {
    switch (title) {
      case 'AI Help':
        return 'help-ai-section'
      case 'Learning Resources':
        return 'help-learning-section'
      case 'Product Updates':
        return 'help-updates-section'
      default:
        return ''
    }
  }

  return (
    <PageLayout>
      <div className="flex flex-col gap-y-2 pt-10">
        <h1 className="text-2xl font-semibold leading-6">Help Center</h1>
        <p className="text-text-secondary text-sm">
          Your go-to place for assistance, learning, and updates.
        </p>
      </div>
      <div className="grid lg:grid-cols-2 gap-x-14 gap-y-8 mt-12 z-10">
        {sections.map((section) => (
          <HelpSection
            key={section.title}
            title={section.title}
            description={section.description}
            items={section.items}
            data-onboarding={getDataOnboardingAttribute(section.title)}
          />
        ))}
      </div>

      <div className="mt-4">
        <OnboardingToursSection key="onboarding-tours" />
      </div>
    </PageLayout>
  )
}

export default HelpPage
