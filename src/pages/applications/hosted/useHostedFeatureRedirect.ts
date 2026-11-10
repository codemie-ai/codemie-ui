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

import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import { hostedApplicationsStore as store } from '@/store/hostedApplications'

import { platformApplicationsPath } from '../applicationCollections'

/**
 * Waits for the capabilities (one shared request). True when custom applications are off, for this
 * customer or this deployment: the page then waits for useHostedFeatureRedirect instead of calling
 * the hosted API.
 */
export const hostedApplicationsOff = async () => {
  await store.ensureCapabilities()
  return !!store.capabilities && !store.capabilities.view
}

/**
 * Sends a hosted application page to Platform apps once custom applications turn out to be off, as the
 * catalog collections do. A failed capabilities request is not "off": the page then shows its own error.
 */
export const useHostedFeatureRedirect = () => {
  const { capabilities } = useSnapshot(store)
  const navigate = useNavigate()
  useEffect(() => {
    if (capabilities && !capabilities.view) navigate(platformApplicationsPath(), { replace: true })
  }, [capabilities?.view])
}
