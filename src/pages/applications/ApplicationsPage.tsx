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

import React, { useEffect, useState } from 'react'

import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { useVueRouter } from '@/hooks/useVueRouter'
import { applicationsStore } from '@/store/applications'
import { Application, AppType } from '@/types/entity/application'
import toaster from '@/utils/toaster'

import ApplicationGrid from './components/ApplicationGrid'

const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const router = useVueRouter()

  useEffect(() => {
    const fetchApplications = async () => {
      const apps = await applicationsStore.fetchApplications()
      setApplications(apps)
      setLoading(false)
    }

    fetchApplications()
  }, [])

  const handleOpenApplication = (application: Application) => {
    if (application.type === AppType.LINK) {
      return window.open(application.entry, '_blank')
    }

    if (application.type === AppType.IFRAME) {
      return router.push({ name: 'application-iframe', params: { slug: application.slug } })
    }

    if (application.type === AppType.MODULE) {
      return router.push({ name: 'application-federation', params: { slug: application.slug } })
    }

    return toaster.error(`Unsupported application type: ${application.type}`)
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Applications" description="Browse and launch available AI applications" />
      <PageLayout title="Applications" rightContent={true}>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : (
          <div className="py-4">
            <ApplicationGrid
              applications={applications}
              onOpenApplication={handleOpenApplication}
            />
          </div>
        )}
      </PageLayout>
    </div>
  )
}

export default ApplicationsPage
