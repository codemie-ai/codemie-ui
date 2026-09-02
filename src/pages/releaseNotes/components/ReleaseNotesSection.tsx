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

import { FC, ReactNode } from 'react'

import { Section, SectionCode, SECTION_LABELS } from '../types'
import { ReleaseNotesItem } from './ReleaseNotesItem'

interface ReleaseNotesSectionProps {
  section: Section
}

const SectionHeading: FC<{ code: SectionCode }> = ({ code }) => (
  <h2 className="text-lg leading-6 font-semibold font-geist-mono text-text-primary">
    {SECTION_LABELS[code]}
  </h2>
)

const HighlightsGrid: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{children}</div>
)

const ItemsList: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="bg-surface-base-secondary border border-border-structural rounded-lg overflow-hidden">
    <div className="px-4">{children}</div>
  </div>
)

export const ReleaseNotesSection: FC<ReleaseNotesSectionProps> = ({ section }) => {
  if (section.items.length === 0) {
    return null
  }

  const Wrapper = section.code === SectionCode.Highlights ? HighlightsGrid : ItemsList

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading code={section.code} />
      <Wrapper>
        {section.items.map((item, index) => (
          <ReleaseNotesItem
            key={`${section.code}-${index}`}
            item={item}
            isHighlight={section.code === SectionCode.Highlights}
          />
        ))}
      </Wrapper>
    </div>
  )
}
