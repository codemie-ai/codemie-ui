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

import { useMemo } from 'react'
import { useMatches } from 'react-router'
import { useSnapshot } from 'valtio'

import HelpLauncher from '@/components/HelpLauncher'
import type { HelpLink } from '@/components/HelpLauncher'
import { HelpPageId, HELP_TOOLTIP_TEXT } from '@/constants/helpLinks'
import { appInfoStore } from '@/store/appInfo'
import { helpStore } from '@/store/help'

// Map route IDs to help page IDs
const ROUTE_ID_TO_PAGE_ID: Record<string, HelpPageId> = {
  // Assistants forms
  'new-assistant': HelpPageId.ASSISTANTS,
  'edit-assistant': HelpPageId.ASSISTANTS,
  'new-assistant-from-template': HelpPageId.ASSISTANTS,
  'clone-assistant': HelpPageId.ASSISTANTS,
  'new-remote-assistant': HelpPageId.ASSISTANTS,
  'edit-remote-assistant': HelpPageId.ASSISTANTS,

  // Workflows forms
  'new-workflow': HelpPageId.WORKFLOWS,
  'edit-workflow': HelpPageId.WORKFLOWS,
  'new-workflow-from-template': HelpPageId.WORKFLOWS,
  'clone-workflow': HelpPageId.WORKFLOWS,

  // Integrations forms
  'new-user-integration': HelpPageId.INTEGRATIONS,
  'edit-user-integration': HelpPageId.INTEGRATIONS,
  'new-project-integration': HelpPageId.INTEGRATIONS,
  'edit-project-integration': HelpPageId.INTEGRATIONS,

  // Kata forms
  'new-kata': HelpPageId.KATAS,
  'edit-kata': HelpPageId.KATAS,

  // Data Source forms
  'edit-data-source': HelpPageId.DATASOURCES,
  'create-data-source': HelpPageId.DATASOURCES,
}

interface ParsedHelpLink {
  isHelpPageItem: boolean
  idSegment: HelpPageId | null
  selectionSegment: string | null
}

const REGEX = /^helpLinks:(\w+)(?::selection:(\w+))?.*$/
function parsePageId(id: string): ParsedHelpLink {
  const match = REGEX.exec(id)

  const res: ParsedHelpLink = {
    isHelpPageItem: id.startsWith('helpLinks:'),
    idSegment: null,
    selectionSegment: null,
  }

  if (!(match && res.isHelpPageItem)) return res

  const pageId = match[1] as HelpPageId
  const selectionSegment = match[2] ?? null

  if (Object.values(HelpPageId).includes(pageId)) {
    res.idSegment = pageId
    res.selectionSegment = selectionSegment
  }

  return res
}

const HelpPanel = () => {
  const matches = useMatches()
  const { configs } = useSnapshot(appInfoStore)
  const { activeSegment } = useSnapshot(helpStore)

  // Determine current pageId based on route ID
  const currentPageId = useMemo(() => {
    // Get the last (most specific) matched route that has an ID
    let pageId: HelpPageId | null = null

    for (const match of matches) {
      if (match.id && ROUTE_ID_TO_PAGE_ID[match.id]) {
        pageId = ROUTE_ID_TO_PAGE_ID[match.id]
      }
    }

    return pageId
  }, [matches])

  // Filter help links for current page from configs
  const helpLinks = useMemo<HelpLink[]>(() => {
    if (!currentPageId) return []

    const links: HelpLink[] = []

    configs
      .filter((item) => {
        const { isHelpPageItem, idSegment, selectionSegment } = parsePageId(item.id)
        if (!isHelpPageItem || !item.settings.enabled) return false
        if (idSegment !== currentPageId) return false

        return selectionSegment === null || selectionSegment === activeSegment
      })
      .forEach((item) => {
        if (item.settings.name && item.settings.url) {
          links.push({
            id: item.id,
            label: item.settings.name,
            href: item.settings.url,
          })
        }
      })

    return links
  }, [configs, currentPageId, activeSegment])

  if (helpLinks.length === 0) {
    return null
  }

  const tooltipText = currentPageId ? HELP_TOOLTIP_TEXT[currentPageId] : 'Help Resources'

  return (
    <HelpLauncher
      links={helpLinks}
      tooltipText={tooltipText}
      className="fixed bottom-1.5 right-6 z-50"
    />
  )
}

export default HelpPanel
