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

import { useState, useEffect } from 'react'
import { subscribe } from 'valtio'

import { appInfoStore } from '@/store/appInfo'

// 308px matches CHAT_SIDEBAR_DEFAULT_WIDTH in
// src/pages/chat/components/ChatSidebar/chatSidebarWidth.ts — keep in sync.
const computeOffsetClass = (): string => {
  if (!appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded) return 'left-navbar'
  if (appInfoStore.sidebarExpanded && !appInfoStore.navigationExpanded)
    return 'left-[calc(theme(spacing.navbar)+var(--chat-sidebar-width,308px))]'
  if (!appInfoStore.sidebarExpanded && appInfoStore.navigationExpanded)
    return 'left-navbar-expanded'
  return 'left-[calc(theme(spacing.navbar-expanded)+var(--chat-sidebar-width,308px))]'
}

export const useSidebarOffsetClass = () => {
  const [offsetClass, setOffsetClass] = useState<string>(() => computeOffsetClass())

  useEffect(() => {
    setOffsetClass(computeOffsetClass())

    const unsubscribe = subscribe(appInfoStore, () => setOffsetClass(computeOffsetClass()))

    return () => {
      unsubscribe()
    }
  }, [])

  return offsetClass
}
