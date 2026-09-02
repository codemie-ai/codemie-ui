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

import StatusBadge, { StatusEnum } from '@/components/StatusBadge'
import { formatDateTime } from '@/utils/helpers'

import { Release, SECTION_ORDER } from '../types'
import { CopyReleaseLinkButton } from './CopyReleaseLinkButton'
import { ReleaseNotesSection } from './ReleaseNotesSection'

interface ReleaseContentProps {
  release: Release
  isLatest: boolean
}

export const ReleaseContent: FC<ReleaseContentProps> = ({ release, isLatest }) => (
  <>
    <header className="mb-8">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl leading-none font-semibold font-geist-mono text-text-primary">
          {release.version}
        </h1>
        {isLatest && <StatusBadge status={StatusEnum.Success} text="Latest" />}
        <CopyReleaseLinkButton version={release.version} scope="header" />
      </div>
      {release.date && (
        <p className="text-sm text-text-quaternary font-geist-mono mt-2">
          {formatDateTime(release.date, 'day')}
        </p>
      )}
    </header>
    <div className="flex flex-col gap-8">
      {SECTION_ORDER.map((code) => {
        const section = release.sections.find((s) => s.code === code)
        return <ReleaseNotesSection key={code} section={{ code, items: section?.items ?? [] }} />
      })}
    </div>
  </>
)
