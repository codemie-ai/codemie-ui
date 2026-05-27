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

import React from 'react'

import AssistantsSvg from '@/assets/icons/assistant.svg?react'
import MarketplaceSvg from '@/assets/icons/explore.svg?react'
import StarFilledSvg from '@/assets/icons/star-filled.svg?react'
import TemplatesSvg from '@/assets/icons/templates.svg?react'
import SidebarNavigation from '@/components/SidebarNavigation'
import { AssistantTab } from '@/constants'
import { useFavoritesEnabled } from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'

interface AssistantsNavigationProps {
  activeTabID?: string
}

const AssistantsNavigation = ({ activeTabID }: AssistantsNavigationProps) => {
  const router = useVueRouter()
  const [isFavoritesEnabled] = useFavoritesEnabled()
  const NONE_TAB = 'none'
  const NavigationTabs = React.useMemo(() => {
    const tabs = [
      {
        id: AssistantTab.ALL,
        name: 'Project Assistants',
        icon: <AssistantsSvg />,
        section: 'Categories',
        url: router.resolve({ name: 'assistants-project' }).path,
      },
      {
        id: AssistantTab.MARKETPLACE,
        name: 'Marketplace',
        section: 'Categories',
        icon: <MarketplaceSvg />,
        url: router.resolve({ name: 'assistants-marketplace' }).path,
      },
      {
        id: AssistantTab.TEMPLATES,
        name: 'Templates',
        section: 'Categories',
        icon: <TemplatesSvg />,
        url: router.resolve({ name: 'assistants-templates' }).path,
      },
    ]
    if (isFavoritesEnabled) {
      tabs.push({
        id: AssistantTab.FAVORITES,
        name: 'Favorites',
        section: 'Categories',
        icon: <StarFilledSvg />,
        url: router.resolve({ name: 'assistants-favorites' }).path,
      })
    }
    return tabs
  }, [router, isFavoritesEnabled])

  return <SidebarNavigation activeId={activeTabID ?? NONE_TAB} tabs={NavigationTabs} />
}

export default AssistantsNavigation
