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

import { Link } from 'react-router'

import ApplicationsIcon from '@/assets/icons/applications.svg?react'

import { hostedRoutes } from './hostedRoutes'

interface Props {
  message?: string
}

/** The one answer for a missing, forbidden or revoked application; it never reveals which. */
const HostedNotAvailable = ({
  message = 'It may have been removed, or you may no longer have access to it.',
}: Props) => (
  <div className="flex flex-col items-center gap-3 py-24 text-center">
    <ApplicationsIcon aria-hidden className="size-10 text-icon-secondary" />
    <h2 className="text-xl font-semibold">This application is not available</h2>
    <p className="max-w-md break-words text-sm text-text-tertiary">{message}</p>
    <Link to={hostedRoutes.root} className="text-sm text-text-accent hover:underline">
      Back to Applications
    </Link>
  </div>
)

export default HostedNotAvailable
