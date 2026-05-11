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

import { Command } from 'cmdk'

import ChatIcon from '@/assets/icons/chat.svg?react'
import FolderIcon from '@/assets/icons/folder.svg?react'
import { SearchResultItem as SearchItem } from '@/types/chats'
import { formatDateTime } from '@/utils/helpers'
import { highlightText } from '@/utils/textUtils'

interface SearchResultItemProps {
  item: SearchItem
  query?: string
  onSelect: (item: SearchItem) => void
}

const SearchResultItem = ({ item, query, onSelect }: SearchResultItemProps) => {
  const Icon = item.type === 'chat' ? ChatIcon : FolderIcon
  const relativeTime = item.updated_at ? formatDateTime(item.updated_at, 'relative') : null

  return (
    <Command.Item
      value={item.id}
      onSelect={() => onSelect(item)}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-surface-specific-dropdown-hover data-[selected=true]:bg-surface-specific-dropdown-hover"
    >
      <Icon className="h-[1.12rem] w-[1.12rem] flex-shrink-0 text-text-secondary" />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <div className="truncate text-sm text-text-primary">
          {highlightText(item.name, query ?? '')}
        </div>

        {item.folder && (
          <div className="flex items-center gap-1.5 text-xs text-text-quaternary min-w-0">
            <FolderIcon className="size-3 flex-shrink-0" />
            <span className="truncate">{item.folder}</span>
          </div>
        )}
      </div>
      {relativeTime && (
        <div className="whitespace-nowrap text-xs text-text-quaternary">{relativeTime}</div>
      )}
    </Command.Item>
  )
}

export default SearchResultItem
