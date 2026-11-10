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

import { ReactNode } from 'react'

import ApplicationsSvg from '@/assets/icons/applications.svg?react'
import ExploreSvg from '@/assets/icons/explore.svg?react'
import PluginSvg from '@/assets/icons/plugin.svg?react'
import ShareSvg from '@/assets/icons/share.svg?react'
import OwnedIcon from '@/components/OwnedIcon'

import {
  APPLICATION_COLLECTION_IDS,
  applicationsRoutes,
  isApplicationCollection,
  type ApplicationCollectionId,
} from './applicationsRoutes'

export interface ApplicationCollection {
  label: string
  icon: ReactNode
  subtitle: string
  /**
   * Who serves the tab: `hosted` tabs exist only while custom (hosted) applications are
   * available; `platform` lists the applications configured for the deployment.
   */
  provider: 'hosted' | 'platform'
}

export const APPLICATION_COLLECTIONS: Record<ApplicationCollectionId, ApplicationCollection> = {
  mine: {
    label: 'My apps',
    icon: <OwnedIcon icon={<ApplicationsSvg />} />,
    subtitle: 'Private until you share them. Publish to the marketplace when ready.',
    provider: 'hosted',
  },
  project: {
    label: 'Project',
    icon: <ApplicationsSvg />,
    subtitle: 'Applications shared with your project.',
    provider: 'hosted',
  },
  marketplace: {
    label: 'Marketplace',
    icon: <ExploreSvg />,
    subtitle: 'Applications published to the marketplace.',
    provider: 'hosted',
  },
  shared: {
    label: 'Shared with me',
    icon: <ShareSvg />,
    subtitle: 'Applications that colleagues shared with you.',
    provider: 'hosted',
  },
  platform: {
    label: 'Platform apps',
    icon: <PluginSvg />,
    subtitle: 'Built-in applications provided by your organization.',
    provider: 'platform',
  },
}

export type ApplicationProvider = ApplicationCollection['provider']

/** The provider that serves the tab at the end of `pathname`, if it is a tab. */
export const providerOfPath = (pathname: string): ApplicationProvider | undefined => {
  const tail = pathname.split('/').filter(Boolean).at(-1)
  return isApplicationCollection(tail) ? APPLICATION_COLLECTIONS[tail].provider : undefined
}

/** Where the deployment's platform applications are listed: the first tab they serve. */
export const platformApplicationsPath = () => {
  const id = APPLICATION_COLLECTION_IDS.find(
    (collection) => APPLICATION_COLLECTIONS[collection].provider === 'platform'
  )
  return id ? applicationsRoutes.collection(id) : applicationsRoutes.root
}
