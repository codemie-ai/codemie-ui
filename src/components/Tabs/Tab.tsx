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

import { cn } from '@/utils/utils'

import { Tab } from './Tabs'

interface TabsButton<TabId extends string> {
  isEmbedded?: boolean
  isSmall?: boolean
  tab: Tab<TabId>
  isActive: boolean
  className?: string
  handleClick: (itabId: TabId) => void
}

const TabsButton = <TabId extends string>({
  isEmbedded,
  isSmall,
  tab,
  isActive,
  className,
  handleClick,
}: TabsButton<TabId>) => (
  <button
    role="tab"
    type="button"
    key={tab.id}
    onClick={() => handleClick(tab.id)}
    className={cn(
      'pt-2 pb-4 px-2 flex gap-2 justify-center [overflow-wrap:anywhere] items-center text-text-primary text-sm no-underline border-b-2 transition hover:no-underline select-none border-transparent hover:border-text-secondary',
      isActive && 'border-text-primary hover:border-text-primary font-semibold cursor-default',
      isEmbedded && 'max-h-[600px]',
      isSmall && 'p-2.5 text-xs',
      className
    )}
  >
    {tab.icon}
    {tab.label}
  </button>
)

export default TabsButton
