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

import { useMemo, useState, useEffect } from 'react'

import { TIME_PERIODS } from '@/constants/chats'
import { recentChatsStore } from '@/store/recentChats'
import { GroupedRecentChats, TimePeriod, RecentChat } from '@/types/chats'

const getTimePeriod = (isoTimestamp: string): TimePeriod => {
  const timestamp = new Date(isoTimestamp).getTime()
  const now = Date.now()
  const diff = now - timestamp

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()

  if (timestamp >= todayStart) {
    return 'today'
  }
  if (diff <= TIME_PERIODS.LAST_7_DAYS) {
    return 'last7Days'
  }
  if (diff <= TIME_PERIODS.LAST_30_DAYS) {
    return 'last30Days'
  }
  return 'earlier'
}

export const useRecentChats = ({ open }: { open: boolean }) => {
  const [recentChats, setRecentChats] = useState<RecentChat[]>([])

  useEffect(() => {
    if (open) {
      const chats = recentChatsStore.getRecentChats()
      setRecentChats(chats)
    }
  }, [open])

  const groupedChats = useMemo((): GroupedRecentChats => {
    const grouped: GroupedRecentChats = {
      today: [],
      last7Days: [],
      last30Days: [],
      earlier: [],
    }

    recentChats.forEach((chat) => {
      const period = getTimePeriod(chat.openedAt)
      grouped[period].push(chat)
    })

    return grouped
  }, [recentChats])

  return { recentChats, groupedChats }
}
