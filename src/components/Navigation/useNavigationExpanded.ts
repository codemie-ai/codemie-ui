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

import { useSnapshot } from 'valtio'

import { useIsMobileLayout } from '@/hooks/useIsMobileLayout'
import { appInfoStore } from '@/store/appInfo'

/**
 * Whether the navigation shows its labels. On mobile the navigation is only ever shown as the
 * full-screen menu, which always has room for them, so the desktop collapse preference is ignored.
 */
export const useNavigationExpanded = (): boolean => {
  const { navigationExpanded } = useSnapshot(appInfoStore)
  const isMobileLayout = useIsMobileLayout()

  return navigationExpanded || isMobileLayout
}
