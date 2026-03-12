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

import ExploreSvg from '@/assets/icons/explore.svg?react'
import TemplatesSvg from '@/assets/icons/templates.svg?react'
import WorkflowSvg from '@/assets/icons/workflow.svg?react'
import SidebarNavigation from '@/components/SidebarNavigation'
import { WORKFLOWS_ALL, WORKFLOWS_MY, WORKFLOWS_TEMPLATES } from '@/constants/routes'
import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'

const WorkflowsNavigation: React.FC = () => {
  const router = useVueRouter()
  const route = useVueRoute()

  const navigationTabs = React.useMemo(
    () => [
      {
        id: WORKFLOWS_MY,
        name: 'My Workflows',
        icon: <WorkflowSvg />,
        section: 'Categories',
        url: router.resolve({ name: WORKFLOWS_MY }).path,
      },
      {
        id: WORKFLOWS_ALL,
        name: 'All Workflows',
        icon: <ExploreSvg />,
        section: 'Categories',
        url: router.resolve({ name: WORKFLOWS_ALL }).path,
      },
      {
        id: WORKFLOWS_TEMPLATES,
        name: 'Templates',
        icon: <TemplatesSvg />,
        section: 'Categories',
        url: router.resolve({ name: WORKFLOWS_TEMPLATES }).path,
      },
    ],
    []
  )

  const activeId = (route.name as string) || WORKFLOWS_MY

  return <SidebarNavigation activeId={activeId} tabs={navigationTabs} />
}

export default WorkflowsNavigation
