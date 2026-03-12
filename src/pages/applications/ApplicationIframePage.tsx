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

import { FC, useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router'

import PageLayout from '@/components/Layouts/Layout'
import { APPLICATIONS } from '@/constants/routes'
import { applicationsStore } from '@/store/applications'
import { Application, AppType } from '@/types/entity/application'
import { navigateBack } from '@/utils/helpers'
import toaster from '@/utils/toaster'

const ApplicationIframePage: FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const path = searchParams.get('path')

  const [appConfig, setAppConfig] = useState<Application | null>(null)

  const iframeURL = useMemo(() => {
    if (!appConfig) return ''
    if (!path) return appConfig.entry
    return `${appConfig.entry}${path}`
  }, [appConfig, path])

  useEffect(() => {
    const loadApplication = async () => {
      const applications = await applicationsStore.fetchApplications()
      const app = applications.find((app) => app.slug === slug)

      if (!app) {
        toaster.error(`Application not found: ${slug}`)
        return
      }

      if (app.type !== AppType.IFRAME) {
        toaster.error(`Application type mismatch: ${app.type}`)
      }

      setAppConfig(app)
    }

    loadApplication()
  }, [slug])

  const handleBack = () => {
    navigateBack(APPLICATIONS)
  }

  return (
    <PageLayout onBack={handleBack} title={appConfig?.name} childrenClassName="px-0">
      <div className="bg-surface-base-primary relative w-full h-full">
        {appConfig && <iframe src={iframeURL} className="w-full h-full" title="AICE Frame" />}
      </div>
    </PageLayout>
  )
}

export default ApplicationIframePage
