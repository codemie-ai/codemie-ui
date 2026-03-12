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

import { SKILLS_ALL } from '@/constants/routes'
import { history } from '@/hooks/appLevel/useHistoryStack'
import { RouterState } from '@/hooks/useVueRouter'

/**
 * Navigate back to the previous page.
 * Uses browser history to preserve navigation context (e.g., marketplace vs project skills).
 */
export const goBackSkills = (router: RouterState, defaultRoute: string = SKILLS_ALL) => {
  const { currentIndex } = history
  const prevRoute = history.stack[currentIndex - 1]

  // Navigate back in history if there's a previous route
  if (prevRoute) {
    router.back()
    return
  }

  // Fallback to default skills list if no history
  router.push({ name: defaultRoute })
}
