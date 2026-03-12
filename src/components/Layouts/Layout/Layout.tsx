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

import React, { ReactNode } from 'react'

import Sidebar from '@/components/Sidebar'
import SidebarNavigation, { SidebarNavigationItem } from '@/components/SidebarNavigation'
import { useVueRouter } from '@/hooks/useVueRouter'

import PageLayout from './PageLayout'

export interface LayoutTab extends SidebarNavigationItem {
  title: string
  url: string
  children?: LayoutTab[]
}

interface Props {
  tabs: LayoutTab[]
  title?: string
  subTitle?: string
  contentTitle?: string // override the one defined in tab
  content?: ReactNode
  sidebar?: ReactNode
  onBack?: () => void
  rightContent?: ReactNode
}

const Layout = ({
  tabs,
  content,
  sidebar,
  onBack,
  title,
  subTitle,
  contentTitle,
  rightContent,
}: Props) => {
  const tabsFlat = React.useMemo(() => {
    const flattenTabs = (items: LayoutTab[]): LayoutTab[] => {
      return items.reduce<LayoutTab[]>((acc, item) => {
        acc.push(item)
        if (item.children && item.children.length > 0) {
          acc.push(...flattenTabs(item.children))
        }
        return acc
      }, [])
    }

    return flattenTabs(tabs)
  }, [tabs])
  const router = useVueRouter()
  const currentPath = router.currentRoute.value.path

  const currentTab = tabsFlat.find((tab) => {
    return currentPath?.startsWith(tab.url) && !tab.children
  })

  if (!currentTab) {
    return <div className="flex items-center justify-center h-full">Not found</div>
  }

  return (
    <div className="flex min-h-full h-full">
      <Sidebar title={title ?? ''} description={subTitle ?? ''}>
        <SidebarNavigation tabs={tabs} activeId={currentTab.id} />
        <div className="mt-6" />
        {sidebar}
      </Sidebar>
      <PageLayout
        title={contentTitle ?? currentTab.title}
        onBack={onBack}
        rightContent={rightContent}
      >
        {content}
      </PageLayout>
    </div>
  )
}

export default Layout
