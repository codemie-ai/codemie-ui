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

import { FC } from 'react'

import HelpItem from './HelpItem'
import { HelpItemType } from '../HelpPage'

interface HelpSectionProps {
  title: string
  description?: string
  items: HelpItemType[]
}

const HelpSection: FC<HelpSectionProps> = ({ title, description, items }) => {
  if (!items || items.length === 0) return null

  return (
    <section className="flex flex-col gap-y-5">
      <div className="flex flex-col gap-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-xs text-text-quaternary min-h-4">{description || ''}</p>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <HelpItem
            key={item.name}
            name={item.name}
            description={item.description}
            link={item.link}
            type={item.type}
            icon={item.icon}
            iconUrl={item.iconUrl}
            buttonText={item.buttonText}
            isExternal={item.isExternal}
          />
        ))}
      </div>
    </section>
  )
}

export default HelpSection
