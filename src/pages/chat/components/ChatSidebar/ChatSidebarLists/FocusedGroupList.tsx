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

import { FC, useCallback } from 'react'

import { ChatListDensity } from '@/store/chatViewSettings'

import FocusedAggregateRow from './FocusedAggregateRow'
import { getRootFontSizePx, useSidebarVirtualList } from '../ChatList/useSidebarVirtualList'

import type { FocusedChatSidebarAggregate } from './chatSidebarListsHelpers'
import type { FocusedView } from './focusedChatSidebarHelpers'

// Row height in rem: py-2 plus the name line, plus the "Last: …" line when not compact.
const getGroupRowHeightRem = (density: ChatListDensity) =>
  density === ChatListDensity.COMPACT ? 2.25 : 3.25

interface FocusedGroupListProps {
  groups: FocusedChatSidebarAggregate[]
  density: ChatListDensity
  onViewChange: (view: FocusedView) => void
  onNewChat: (aggregate: FocusedChatSidebarAggregate) => void
}

const FocusedGroupList: FC<FocusedGroupListProps> = ({
  groups,
  density,
  onViewChange,
  onNewChat,
}) => {
  const estimateSize = useCallback(
    () => getGroupRowHeightRem(density) * getRootFontSizePx(),
    [density]
  )
  const getItemKey = useCallback(
    (index: number) => `${groups[index].kind}:${groups[index].id}`,
    [groups]
  )
  const {
    listRef,
    isVirtual,
    isAwaitingScrollElement,
    virtualItems,
    paddingTop,
    paddingBottom,
    measureRow,
  } = useSidebarVirtualList({ count: groups.length, estimateSize, getItemKey })

  const renderRow = (group: FocusedChatSidebarAggregate, index?: number) => (
    <div key={`${group.kind}:${group.id}`} data-index={index} ref={measureRow}>
      <FocusedAggregateRow
        aggregate={group}
        density={density}
        onSelect={() =>
          onViewChange(
            group.kind === 'assistant'
              ? { type: 'assistant', id: group.id, name: group.name, iconUrl: group.iconUrl }
              : { type: 'folder', name: group.name }
          )
        }
        onNewChat={group.kind === 'assistant' ? () => onNewChat(group) : undefined}
      />
    </div>
  )

  let rows = isAwaitingScrollElement ? [] : groups.map((group) => renderRow(group))
  if (isVirtual) rows = virtualItems.map((item) => renderRow(groups[item.index], item.index))

  return (
    <div
      ref={(element) => {
        listRef.current = element
      }}
    >
      {paddingTop > 0 && <div aria-hidden="true" style={{ height: paddingTop }} />}
      {rows}
      {paddingBottom > 0 && <div aria-hidden="true" style={{ height: paddingBottom }} />}
    </div>
  )
}

export default FocusedGroupList
