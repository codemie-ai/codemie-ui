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

import { useEffect } from 'react'
import { useMatches } from 'react-router'

import { APP_TITLE, ROUTE_ID_TO_TITLE } from '@/constants/pageTitles'

export const usePageTitle = () => {
  const matches = useMatches()

  useEffect(() => {
    // Find the most-specific (deepest) route with a known title by scanning
    // matches in reverse. Mirrors the ROUTE_ID_TO_PAGE_ID lookup pattern used
    // in AutoPopupManager.tsx.
    const match = [...matches].reverse().find(({ id }) => id && ROUTE_ID_TO_TITLE[id])
    const pageTitle = match ? ROUTE_ID_TO_TITLE[match.id] : undefined

    document.title = pageTitle ? `${APP_TITLE} - ${pageTitle}` : APP_TITLE
  }, [matches])
}
