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

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

import { ASSISTANT_DETAILS } from '@/constants/routes'
import { findRouteObject } from '@/hooks/__mocks__/useVueRouter'
import { history } from '@/hooks/appLevel/useHistoryStack'
import { goBackAssistants } from '@/pages/assistants/utils/goBackAssistants'
import { router as hashRouter, routes } from '@/router'

type AppRoute = (typeof routes)[number]

// Verify the history-less back fallback in navigateBack against the REAL route
// config (via goBackAssistants). Uses the real hash router so paths like /assistants/:id and
// assistants/:projectName/:slug match production exactly.
const realFindRouteObject = (routeId: string): AppRoute | undefined => {
  const stack: AppRoute[] = [...routes]
  let found: AppRoute | undefined
  while (stack.length > 0 && !found) {
    const route = stack.pop()!
    if (route.id === routeId) {
      found = route
    } else if (route.children?.length) {
      stack.push(...route.children)
    }
  }
  return found
}

const spyOnNavigate = () => vi.spyOn(hashRouter, 'navigate')

describe('navigateBack — history-less fallback', () => {
  let navigateSpy: ReturnType<typeof spyOnNavigate>

  beforeEach(() => {
    findRouteObject.mockImplementation(realFindRouteObject)
    history.stack = []
    history.currentIndex = -1
  })

  afterEach(() => {
    navigateSpy?.mockRestore()
    findRouteObject.mockReset()
  })

  const goTo = async (path: string) => {
    await hashRouter.navigate(path)
    navigateSpy = spyOnNavigate()
  }

  it('redirects a slug details URL (assistant-by-slug) to the assistants list, not /assistants/{project}', async () => {
    await goTo('/assistants/test-proj/test-assistant')

    await goBackAssistants()

    expect(navigateSpy).toHaveBeenCalledWith('/assistants')
    expect(navigateSpy).not.toHaveBeenCalledWith('/assistants/test-proj')
  })

  it('redirects a GUID details URL (assistant) to the assistants list — unchanged behaviour', async () => {
    await goTo('/assistants/asst-123')

    await goBackAssistants()

    expect(navigateSpy).toHaveBeenCalledWith('/assistants')
  })

  it('redirects a slug edit URL (edit-assistant-by-slug) to the assistants list, not /assistants/{project}', async () => {
    await goTo('/assistants/test-proj/test-assistant/edit')

    await goBackAssistants(ASSISTANT_DETAILS)

    expect(navigateSpy).toHaveBeenCalledWith('/assistants')
    expect(navigateSpy).not.toHaveBeenCalledWith('/assistants/test-proj')
  })

  it('still walks a GUID edit URL up to its real parent details page (/assistants/{id})', async () => {
    await goTo('/assistants/asst-123/edit')

    await goBackAssistants(ASSISTANT_DETAILS)

    expect(navigateSpy).toHaveBeenCalledWith('/assistants/asst-123')
  })
})
