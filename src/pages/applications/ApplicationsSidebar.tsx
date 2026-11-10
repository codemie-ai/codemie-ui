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

import { ReactNode, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import Sidebar from '@/components/Sidebar'
import SidebarNavigation from '@/components/SidebarNavigation'
import { hostedApplicationsStore as store } from '@/store/hostedApplications'

import { APPLICATION_COLLECTIONS } from './applicationCollections'
import {
  APPLICATION_COLLECTION_IDS,
  applicationsRoutes,
  type ApplicationCollectionId,
} from './applicationsRoutes'

interface Props {
  /** Highlighted collection; omit when a single application is shown. */
  activeCollection?: ApplicationCollectionId
  children?: ReactNode
}

const ApplicationsSidebar = ({ activeCollection, children }: Props) => {
  const state = useSnapshot(store)
  const canView = !!state.capabilities?.view

  const tabs = useMemo(
    () =>
      APPLICATION_COLLECTION_IDS.filter(
        (id) => canView || APPLICATION_COLLECTIONS[id].provider !== 'hosted'
      ).map((id) => ({
        id,
        name: APPLICATION_COLLECTIONS[id].label,
        icon: APPLICATION_COLLECTIONS[id].icon,
        url: applicationsRoutes.collection(id),
      })),
    [canView]
  )

  return (
    <Sidebar
      title="Applications"
      description={
        canView
          ? 'Create and share static apps, visuals, and ideas.'
          : 'Browse and launch available AI applications'
      }
    >
      {canView && (
        <nav aria-label="Application collections">
          <SidebarNavigation tabs={tabs} activeId={activeCollection ?? 'none'} />
        </nav>
      )}
      {children}
    </Sidebar>
  )
}

export default ApplicationsSidebar
