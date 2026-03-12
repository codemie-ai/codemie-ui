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

import LeaderboardSvg from '@/assets/icons/assistant-alt.svg?react'
import AllKatasSvg from '@/assets/icons/diagram.svg?react'
import InProgressSvg from '@/assets/icons/play.svg?react'
import CompletedSvg from '@/assets/icons/processing-status.svg?react'
import SidebarNavigation from '@/components/SidebarNavigation'
import { useVueRouter } from '@/hooks/useVueRouter'

import { KatasCategory } from '../KatasPage'

interface KatasNavigationProps {
  activeCategory?: KatasCategory
}

const KatasNavigation = ({ activeCategory }: KatasNavigationProps) => {
  const router = useVueRouter()
  const NONE_TAB = 'none'

  const navigationTabs = React.useMemo(
    () => [
      {
        id: KatasCategory.ALL_KATAS,
        name: 'All Katas',
        icon: <AllKatasSvg />,
        section: 'Categories',
        url: router.resolve({ name: 'katas' }).path,
      },
      {
        id: KatasCategory.IN_PROGRESS,
        name: 'In Progress',
        icon: <InProgressSvg />,
        section: 'Categories',
        url: router.resolve({ name: 'katas-in-progress' }).path,
      },
      {
        id: KatasCategory.COMPLETED,
        name: 'Completed',
        icon: <CompletedSvg />,
        section: 'Categories',
        url: router.resolve({ name: 'katas-completed' }).path,
      },
      {
        id: KatasCategory.LEADERBOARD,
        name: 'Leaderboard',
        icon: <LeaderboardSvg />,
        section: 'Categories',
        url: router.resolve({ name: 'katas-leaderboard' }).path,
      },
    ],
    [router]
  )

  return <SidebarNavigation activeId={activeCategory ?? NONE_TAB} tabs={navigationTabs} />
}

export default KatasNavigation
