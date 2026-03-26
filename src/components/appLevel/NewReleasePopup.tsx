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

import { FC, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Link from '@/components/Link'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { appInfoStore } from '@/store/appInfo'

const NewReleasePopup: FC = () => {
  const router = useVueRouter()
  const [isVisible, setIsVisible] = useState(false)
  const { appReleases } = useSnapshot(appInfoStore)

  const latestVersion = appReleases[0]?.version

  useEffect(() => {
    appInfoStore.loadReleaseNotes()
    if (appInfoStore.isOnboardingCompleted()) {
      setIsVisible(appInfoStore.isAppReleaseNew())
    }
  }, [])

  const closePopup = () => {
    setIsVisible(false)
  }

  const updateViewedRelease = () => {
    appInfoStore.setViewedAppVersion(latestVersion)
    closePopup()
  }

  const onNavigateToReleaseNotes = () => {
    router.push({ name: 'release-notes' })
    closePopup()
  }

  return (
    <Popup
      limitWidth
      hideFooter
      onHide={closePopup}
      visible={isVisible}
      header="New CodeMie Release"
    >
      <div className="p-5 pt-3">
        <div className="text-center">
          <span>
            Great news! We&apos;ve rolled out new <b>CodeMie</b> version <b>{latestVersion}</b> to
            enhance your experience. Take a moment to explore what&apos;s new and discover how these
            changes can benefit you! Please review{' '}
          </span>
          <Link
            target="_self"
            url={
              router.resolve({
                name: 'release-notes',
              }).href
            }
            onClick={onNavigateToReleaseNotes}
            className="text-text-primary hover:text-text-primary font-bold decoration-text-primary"
          >
            Release Notes
          </Link>
          !
        </div>

        <div className="mt-5 flex justify-center">
          <Button
            className="mr-3 w-32"
            variant={ButtonType.SECONDARY}
            onClick={updateViewedRelease}
          >
            Got It, Thanks!
          </Button>
          <Button className="w-32" onClick={onNavigateToReleaseNotes}>
            Tell Me More
          </Button>
        </div>
      </div>
    </Popup>
  )
}

export default NewReleasePopup
