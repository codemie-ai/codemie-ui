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

import { FC, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import contentGradientPng from '@/assets/images/content-gradient.png'
import PageLayout from '@/components/Layouts/Layout'
import { useTheme } from '@/hooks/useTheme'
import { appInfoStore } from '@/store/appInfo'

import IssueList from './components/IssueList'

const ReleaseNotesPage: FC = () => {
  const { appReleases } = useSnapshot(appInfoStore)
  const { isDark } = useTheme()

  useEffect(() => {
    if (appReleases[0]?.version) {
      appInfoStore.setViewedAppVersion(appReleases[0].version)
    }
  }, [appReleases])

  const typeOrder = ['BUG', 'STORY'] as const

  return (
    <PageLayout>
      <div
        className="pt-10 z-10 pb-8 w-full min-h-screen overflow-auto bg-contain bg-no-repeat bg-bottom"
        style={{ backgroundImage: !isDark ? `url(${contentGradientPng})` : 'none' }}
      >
        <h1 className="text-2xl leading-none font-semibold font-mono text-text-primary mb-1">
          What&apos;s New
        </h1>
        <p className="font-mono text-sm text-text-secondary leading-tight mb-8">
          Discover the latest improvements, new features, and important changes in your experience.
        </p>
        <div>
          {appReleases.map((release) => (
            <div key={release.version} className="mb-8">
              <div className="text-base leading-none font-mono font-semibold text-primary mb-2">
                {release.version}
              </div>
              <div className="flex flex-col gap-2">
                {typeOrder.map((type) => {
                  const filteredIssues = release.issues.filter((issue) => issue.type === type)
                  return <IssueList key={type} type={type} issues={filteredIssues} />
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}

export default ReleaseNotesPage
