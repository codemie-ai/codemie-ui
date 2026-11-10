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

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import { hostedApplicationsStore } from '@/store/hostedApplications'

import { platformApplicationsPath, providerOfPath } from './applicationCollections'
import HostedApplicationsPage from './hosted/HostedApplicationsPage'
import PlatformApplicationsPage from './PlatformApplicationsPage'

/**
 * The Applications area: the registry entry of the current tab names its provider. Platform apps
 * are served on their own; every other route belongs to hosted applications.
 */
const ApplicationsPage = () => {
  const { capabilities } = useSnapshot(hostedApplicationsStore)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const platformPath = platformApplicationsPath()
  // Without hosted applications every /apps route shows Platform apps, even before the redirect.
  const hostedOff = !!capabilities && !capabilities.view
  const platformTab = providerOfPath(pathname) === 'platform'

  useEffect(() => {
    hostedApplicationsStore.ensureCapabilities()
  }, [])
  useEffect(() => {
    if (hostedOff && pathname !== platformPath) navigate(platformPath, { replace: true })
  }, [hostedOff, pathname])

  if (hostedOff || platformTab) return <PlatformApplicationsPage standalone={hostedOff} />
  return <HostedApplicationsPage />
}

export default ApplicationsPage
