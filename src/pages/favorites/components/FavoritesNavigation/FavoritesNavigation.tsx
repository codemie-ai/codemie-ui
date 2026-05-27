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

import AssistantSvg from '@/assets/icons/assistant.svg?react'
import SkillSvg from '@/assets/icons/lightning-duotone.svg?react'
import WorkflowSvg from '@/assets/icons/workflow.svg?react'
import SidebarNavigation from '@/components/SidebarNavigation'
import { FavoriteFilter } from '@/types/entity/favorites'

interface FavoritesNavigationProps {
  activeFilter: FavoriteFilter
}

const FavoritesNavigation = ({ activeFilter }: FavoritesNavigationProps) => {
  const navigationTabs = React.useMemo(
    () => [
      {
        id: 'all' as FavoriteFilter,
        name: 'All',
        url: '/favorites',
      },
      {
        id: 'assistant' as FavoriteFilter,
        name: 'Assistants',
        icon: <AssistantSvg />,
        url: '/favorites/assistants',
      },
      {
        id: 'skill' as FavoriteFilter,
        name: 'Skills',
        icon: <SkillSvg />,
        url: '/favorites/skills',
      },
      {
        id: 'workflow' as FavoriteFilter,
        name: 'Workflows',
        icon: <WorkflowSvg />,
        url: '/favorites/workflows',
      },
    ],
    []
  )

  return <SidebarNavigation activeId={activeFilter} tabs={navigationTabs} />
}

export default FavoritesNavigation
