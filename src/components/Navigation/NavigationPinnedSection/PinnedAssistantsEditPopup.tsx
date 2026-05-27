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

import React, { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import SearchSvg from '@/assets/icons/search.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import PinAssistantButton from '@/components/PinAssistantButton/PinAssistantButton'
import Popup from '@/components/Popup/Popup'
import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { AvatarType } from '@/constants/avatar'
import { assistantsStore } from '@/store/assistants'
import { preferencesStore } from '@/store/preferences'
import { Assistant } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

interface PinnedAssistantsEditPopupProps {
  isOpen: boolean
  onClose: () => void
}

const PinnedAssistantsEditPopup: React.FC<PinnedAssistantsEditPopupProps> = ({
  isOpen,
  onClose,
}) => {
  const { assistants } = useSnapshot(assistantsStore)
  const { preferences } = useSnapshot(preferencesStore)
  const [search, setSearch] = useState('')
  const [pinLoading, setPinLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    if (assistants.length === 0) {
      assistantsStore.indexAssistants(ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER, {}, 0, 50, true)
    }
  }, [isOpen, assistants.length])

  const pinnedIds = preferences?.pinned_assistants ?? []

  const filtered = (assistants as Assistant[]).filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleTogglePin = async (assistant: Assistant) => {
    setPinLoading(assistant.id)
    try {
      if (pinnedIds.includes(assistant.id)) {
        await assistantsStore.unpinAssistant(assistant.id)
      } else {
        await assistantsStore.pinAssistant(assistant.id)
      }
    } finally {
      setPinLoading(null)
    }
  }

  return (
    <Popup visible={isOpen} onHide={onClose} header="Edit Pinned Assistants" hideFooter limitWidth>
      <div className="flex flex-col gap-3">
        <div className="relative">
          <SearchSvg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search assistants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg text-sm',
              'bg-surface-base-primary border border-border-structural',
              'text-text-primary placeholder:text-text-secondary',
              'focus:outline-none focus:ring-1 focus:ring-border-accent'
            )}
          />
        </div>

        <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
          {filtered.map((assistant) => {
            const isPinned = pinnedIds.includes(assistant.id)
            return (
              <div
                key={assistant.id}
                className={cn(
                  'flex items-center gap-3 px-2 py-2 rounded-lg transition-colors',
                  isPinned && 'bg-surface-base-primary'
                )}
              >
                <Avatar
                  iconUrl={assistant.icon_url}
                  name={assistant.name}
                  type={AvatarType.SMALL}
                />
                <span className="text-sm flex-1 truncate text-text-primary">{assistant.name}</span>
                <PinAssistantButton
                  isPinned={isPinned}
                  onToggle={() => handleTogglePin(assistant)}
                  loading={pinLoading === assistant.id}
                />
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-text-secondary text-center py-4">No assistants found</p>
          )}
        </div>
      </div>
    </Popup>
  )
}

export default PinnedAssistantsEditPopup
