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

import { Accordion, AccordionTab } from 'primereact/accordion'
import React, { useMemo } from 'react'

import { useVueRouter } from '@/hooks/useVueRouter'
import { clearUrlFilters } from '@/utils/filters'
import { cn } from '@/utils/utils'

import { SidebarNavigationItem } from './types'

interface SidebarNavigationProps {
  tabs: SidebarNavigationItem[]
  activeId: string
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ tabs, activeId = tabs[0]?.id }) => {
  const router = useVueRouter()
  const handleNavigation = (item: { id: string; url?: string }) => {
    if (item.url) {
      router.push(item.url)
      return
    }

    clearUrlFilters()

    router.push({
      query: { ...router.currentRoute.value.query, tab: item.id },
    })
  }

  // Group tabs by section
  const groupedTabs = useMemo(() => {
    // Create a map to preserve the order of sections as they appear in the tabs array
    const sectionOrder: string[] = []
    const sections: Record<string, SidebarNavigationItem[]> = {}

    // Default section for tabs without a section property
    const defaultSection = ''

    tabs.forEach((tab) => {
      const section = tab.section || defaultSection

      // If this section hasn't been seen yet, add it to the order array
      if (!sections[section]) {
        sectionOrder.push(section)
        sections[section] = []
      }

      // Add the tab to its section
      sections[section].push(tab)
    })

    // Return sections in the order they first appeared
    return sectionOrder.map((section) => ({
      title: section,
      tabs: sections[section],
    }))
  }, [tabs])

  return (
    <div className="pb-6">
      {groupedTabs.map((section, index) => (
        <div key={section.title || `section-${index}`} className="mb-4 last:mb-0">
          {section.title && (
            <h3 className="text-sm-1 tracking-wide text-text-quaternary uppercase mb-2 font-semibold block">
              {section.title}
            </h3>
          )}
          <ul className="list-none p-0 m-0 cursor-pointer">
            {section.tabs.map((item) => {
              const isActive = activeId === item.id

              return (
                <li
                  key={item.id}
                  className={`${isActive ? '!bg-surface-specific-dropdown-hover ' : ''}${
                    !item.children
                      ? 'hover:bg-surface-specific-dropdown-hover transition rounded-md'
                      : ''
                  }`}
                >
                  {item.children && item.children.length > 0 ? (
                    <Accordion
                      activeIndex={0}
                      className="border-none"
                      pt={{ root: { className: 'border-none' } }}
                    >
                      <AccordionTab
                        pt={{
                          header: { className: 'flex items-center w-full pl-1' },
                          headerAction: {
                            className:
                              'w-full flex items-center justify-between gap-4 py-2 hover:!no-underline text-sm',
                          },
                        }}
                        header={
                          <div className="flex items-center">
                            {item.icon && <div className="mr-3">{item.icon}</div>}
                            <span>{item.name}</span>
                          </div>
                        }
                      >
                        <ul className="list-none p-0 m-0">
                          {item.children.map((child) => {
                            const isChildActive = activeId === child.id
                            return (
                              <li
                                key={child.id}
                                className={cn(
                                  'pl-4 hover:bg-surface-specific-dropdown-hover transition rounded-md',
                                  isChildActive && 'bg-surface-specific-dropdown-hover'
                                )}
                                onClick={() => handleNavigation(child)}
                              >
                                <button className="flex items-center w-full px-4 py-2 mb-[1px] hover:no-underline text-sm">
                                  {child.icon && (
                                    <div className="mr-3 w-[18px] h-[18px]">{child.icon}</div>
                                  )}
                                  {child.name}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </AccordionTab>
                    </Accordion>
                  ) : (
                    <button
                      className="flex items-center w-full px-4 py-2 mb-[1px] hover:no-underline text-sm"
                      onClick={() => handleNavigation(item)}
                    >
                      {item.icon && (
                        <div className="text-text-accent mr-3 w-[18px] h-[18px]">{item.icon}</div>
                      )}
                      <span className="flex-1 text-left">{item.name}</span>
                      {item.badge && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-600 text-white leading-none">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export default SidebarNavigation
