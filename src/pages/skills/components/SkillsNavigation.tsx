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

import MarketplaceSvg from '@/assets/icons/explore.svg?react'
import SkillsIcon from '@/assets/icons/lightning.svg?react'
import SidebarNavigation from '@/components/SidebarNavigation'
import { useVueRouter } from '@/hooks/useVueRouter'

export enum SkillTab {
  PROJECT = 'project',
  MARKETPLACE = 'marketplace',
}

interface SkillsNavigationProps {
  activeTabID?: SkillTab
}

const SkillsNavigation: React.FC<SkillsNavigationProps> = ({ activeTabID }) => {
  const router = useVueRouter()
  const NONE_TAB = 'none'

  const NavigationTabs = React.useMemo(
    () => [
      {
        id: SkillTab.PROJECT,
        name: 'Project Skills',
        icon: <SkillsIcon />,
        section: 'Browse',
        url: router.resolve({ name: 'skills-project' }).path,
      },
      {
        id: SkillTab.MARKETPLACE,
        name: 'Marketplace',
        section: 'Browse',
        icon: <MarketplaceSvg />,
        url: router.resolve({ name: 'skills-marketplace' }).path,
      },
    ],
    [router]
  )

  return <SidebarNavigation activeId={activeTabID ?? NONE_TAB} tabs={NavigationTabs} />
}

export default SkillsNavigation
