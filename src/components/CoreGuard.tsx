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

import { FC, ReactNode } from 'react'
import { useSnapshot } from 'valtio'

import { appInfoStore } from '@/store/appInfo'
import { isCoreAvailable } from '@/utils/coreAvailability'
import { notFoundError } from '@/utils/notFoundError'

/** Throws 404 when the backend reports standalone mode (`features:core` disabled). */
export const CoreGuard: FC<{ children: ReactNode }> = ({ children }) => {
  const { configs } = useSnapshot(appInfoStore)
  if (!isCoreAvailable(configs)) throw notFoundError()
  return children
}
