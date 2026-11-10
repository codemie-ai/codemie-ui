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

import PageLayout from '@/components/Layouts/Layout'
import Spinner from '@/components/Spinner'

import { APPLICATION_COLLECTIONS } from './applicationCollections'
import ApplicationsSidebar from './ApplicationsSidebar'
import ApplicationGrid from './components/ApplicationGrid'
import { usePlatformApplications } from './usePlatformApplications'

interface Props {
  /** Hosted applications are off: this is the whole Applications page, as before them. */
  standalone?: boolean
}

const PlatformApplicationsPage = ({ standalone = false }: Props) => {
  const { applications, loading, open } = usePlatformApplications()
  const { label, subtitle } = APPLICATION_COLLECTIONS.platform

  return (
    <div className="flex h-full min-w-0">
      <ApplicationsSidebar activeCollection="platform" />
      <PageLayout
        title={standalone ? 'Applications' : label}
        subtitle={standalone ? undefined : subtitle}
      >
        <div className="flex min-w-0 flex-col gap-5 py-4">
          {loading && !applications.length ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <ApplicationGrid applications={[...applications]} onOpenApplication={open} />
          )}
        </div>
      </PageLayout>
    </div>
  )
}

export default PlatformApplicationsPage
