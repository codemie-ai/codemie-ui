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

import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import { useVueRouter } from '@/hooks/useVueRouter'
import { applicationsStore } from '@/store/applications'
import { AppType, type Application } from '@/types/entity/application'
import toaster from '@/utils/toaster'

const PLATFORM_ROUTES: Partial<Record<AppType, string>> = {
  [AppType.IFRAME]: 'application-iframe',
  [AppType.MODULE]: 'application-federation',
}

/** The applications configured for the deployment (MODULE, IFRAME and LINK apps). */
export const usePlatformApplications = () => {
  const platform = useSnapshot(applicationsStore)
  const router = useVueRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.resolve(applicationsStore.fetchApplications()).finally(() => {
      if (alive) setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [])

  const open = (app: Application) => {
    if (app.type === AppType.LINK) {
      window.open(app.entry, '_blank', 'noopener,noreferrer')
      return
    }
    const name = PLATFORM_ROUTES[app.type]
    if (!name) {
      toaster.error(`Unsupported application type: ${app.type}`)
      return
    }
    router.push({ name, params: { slug: app.slug } })
  }

  return { applications: platform.applications, loading, open }
}
