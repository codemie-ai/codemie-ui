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

import { FC, useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import FilterAccordionItem from '@/components/FilterAccordionItem'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import { CONFIG_KEYS } from '@/constants/configKeys'
import { useSearchParams } from '@/hooks/useSearchParams'
import { appInfoStore } from '@/store/appInfo'
import { getConfigItemSettings } from '@/utils/settings'

import { ReleaseContent } from './components/ReleaseContent'
import { ReleaseNavButton } from './components/ReleaseNavButton'
import { Release, VERSION_PARAM } from './types'

const DEFAULT_RECENT_RELEASE_COUNT = 10

const getMajorReleaseGroup = (version: string) => `${version.split('.')[0]}.x`

const ReleaseNotesPage: FC = () => {
  const { appReleases, configs } = useSnapshot(appInfoStore)
  const [searchParams, setSearchParams] = useSearchParams()

  const recentReleaseCount = (() => {
    const n = Number(
      getConfigItemSettings(configs, CONFIG_KEYS.RELEASE_NOTES_RECENT_COUNT)?.recentReleaseCount
    )
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_RECENT_RELEASE_COUNT
  })()

  const requestedVersion = searchParams.get(VERSION_PARAM)
  const latestRelease = appReleases[0]
  const selectedRelease =
    (requestedVersion && appReleases.find((release) => release.version === requestedVersion)) ||
    latestRelease

  const recentReleases = useMemo(
    () => appReleases.slice(0, recentReleaseCount),
    [appReleases, recentReleaseCount]
  )

  const archiveGroups = useMemo(() => {
    const groups: { label: string; releases: Release[] }[] = []
    appReleases.slice(recentReleaseCount).forEach((release) => {
      const label = getMajorReleaseGroup(release.version)
      const group = groups.find((g) => g.label === label)
      if (group) {
        group.releases.push(release)
      } else {
        groups.push({ label, releases: [release] })
      }
    })
    return groups
  }, [appReleases, recentReleaseCount])

  useEffect(() => {
    if (latestRelease?.version) {
      appInfoStore.setViewedAppVersion(latestRelease.version)
    }
  }, [latestRelease?.version])

  const selectRelease = (version: string) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set(VERSION_PARAM, version)
    setSearchParams(nextSearchParams)
  }

  return (
    <div className="flex min-h-full h-full">
      <Sidebar
        title="What's New"
        description="Discover the latest improvements, new features, and important changes."
        className="!mt-6"
      >
        <div className="pb-6">
          <h3 className="text-sm-1 tracking-wide text-text-quaternary uppercase mb-2 font-semibold">
            Releases
          </h3>
          <nav aria-label="Release versions" className="flex flex-col gap-0.5">
            {recentReleases.map((release) => (
              <ReleaseNavButton
                key={release.version}
                release={release}
                isSelected={selectedRelease?.version === release.version}
                onSelect={selectRelease}
              />
            ))}
          </nav>
        </div>
        {archiveGroups.length > 0 && (
          <div className="pb-6">
            <h3 className="text-sm-1 tracking-wide text-text-quaternary uppercase mb-2 font-semibold">
              Older releases
            </h3>
            <div className="flex flex-col">
              {archiveGroups.map((group) => (
                <FilterAccordionItem
                  key={group.label}
                  label={group.label}
                  defaultExpanded={group.releases.some(
                    (r) => r.version === selectedRelease?.version
                  )}
                >
                  <nav
                    className="flex flex-col gap-0.5 pl-2"
                    aria-label={`${group.label} releases`}
                  >
                    {group.releases.map((release) => (
                      <ReleaseNavButton
                        key={release.version}
                        release={release}
                        isSelected={selectedRelease?.version === release.version}
                        onSelect={selectRelease}
                      />
                    ))}
                  </nav>
                </FilterAccordionItem>
              ))}
            </div>
          </div>
        )}
      </Sidebar>
      <PageLayout childrenClassName="px-8">
        <div className="w-full max-w-4xl mx-auto py-10 pb-12">
          {selectedRelease ? (
            <ReleaseContent
              release={selectedRelease}
              isLatest={selectedRelease.version === latestRelease?.version}
            />
          ) : (
            <p className="text-sm text-text-quaternary py-10">No release notes available.</p>
          )}
        </div>
      </PageLayout>
    </div>
  )
}

export default ReleaseNotesPage
