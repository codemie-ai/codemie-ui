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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import DefaultIconPng from '@/assets/images/ai-avatar.png'
import Avatar from '@/components/Avatar/Avatar'
import { ONBOARDING_ASSISTANT_SLUG, CHATBOT_ASSISTANT_SLUG } from '@/constants/assistants'
import { AvatarType } from '@/constants/avatar'
import { useFeatureFlag, usePinnedAssistantsEnabled } from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'
import { appInfoStore } from '@/store/appInfo'
import { assistantsStore } from '@/store/assistants'
import { chatsStore } from '@/store/chats'
import { generateAssistantAvatarDataUrl } from '@/utils/assistantAvatar'
import { cn } from '@/utils/utils'

import OverflowButton from './OverflowButton'
import PinnedAssistantsOverflowDropdown from './PinnedAssistantsOverflowDropdown'
import PinnedRow from './PinnedRow'
import {
  CONTAINER_PB,
  ITEM_GAP,
  ITEM_HEIGHT,
  computeCollapsedBubbles,
  computeExpandedBubbles,
  normalizeName,
} from './pinnedSectionUtils'
import UnpinFromSidebarPopup from './UnpinFromSidebarPopup'

export interface NavSectionItem {
  id: string
  name: string
  description?: string
  icon_url: string
  isDeletable: boolean
  onClick: () => void
}

const NavigationPinnedSection: React.FC = () => {
  const { pinnedAssistants, helpAssistants, helpAssistantsFetched } = useSnapshot(assistantsStore)
  const { navigationExpanded } = useSnapshot(appInfoStore)
  useSnapshot(chatsStore)

  const router = useVueRouter()
  const [isGeneratedAvatarsEnabled] = useFeatureFlag('features:generatedAssistantIcons')
  const [isPinnedAssistantsEnabled] = usePinnedAssistantsEnabled()

  const containerRef = useRef<HTMLDivElement>(null)
  const overflowButtonRef = useRef<HTMLButtonElement>(null)
  const gridBlockRef = useRef<HTMLDivElement>(null)
  const gridButtonRef = useRef<HTMLButtonElement>(null)
  const [availableHeight, setAvailableHeight] = useState(0)
  const [unpinTarget, setUnpinTarget] = useState<NavSectionItem | null>(null)
  const [overflowOpen, setOverflowOpen] = useState(false)

  useEffect(() => {
    assistantsStore.fetchPinnedAssistants()
  }, [])

  useEffect(() => {
    const el = containerRef.current
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setAvailableHeight(entry.contentRect.height)
      }
    })
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [navigationExpanded])

  const staticItems = useMemo((): NavSectionItem[] => {
    const items: NavSectionItem[] = []

    const onboarding = helpAssistants.find((a: any) => a.slug === ONBOARDING_ASSISTANT_SLUG)
    if (onboarding) {
      const name = normalizeName(onboarding.name)
      items.push({
        id: onboarding.id,
        name,
        description: onboarding.description,
        icon_url:
          onboarding.icon_url ||
          (isGeneratedAvatarsEnabled ? generateAssistantAvatarDataUrl(name) : DefaultIconPng),
        isDeletable: false,
        onClick: () =>
          router.push({
            name: 'start-assistant-chat',
            params: { slug: onboarding.slug },
          }),
      })
    }

    const chatbot = helpAssistants.find((a: any) => a.slug === CHATBOT_ASSISTANT_SLUG)
    if (chatbot) {
      const name = normalizeName(chatbot.name)
      items.push({
        id: chatbot.id,
        name,
        description: chatbot.description,
        icon_url:
          chatbot.icon_url ||
          (isGeneratedAvatarsEnabled ? generateAssistantAvatarDataUrl(name) : DefaultIconPng),
        isDeletable: false,
        onClick: () =>
          router.push({
            name: 'start-assistant-chat',
            params: { slug: chatbot.slug },
          }),
      })
    }

    return items
  }, [helpAssistants, isGeneratedAvatarsEnabled])

  const handlePinnedItemClick = useCallback(async (a: (typeof pinnedAssistants)[number]) => {
    const chat = await chatsStore.createChat(a.id, a.name, false)
    assistantsStore.updateRecentAssistants(a)
    window.location.hash = `#/chats/${chat.id}`
  }, [])

  const pinnedItems = useMemo(
    (): NavSectionItem[] =>
      [...pinnedAssistants].map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon_url: a.icon_url,
        isDeletable: true,
        onClick: () => handlePinnedItemClick(a),
      })),
    [pinnedAssistants, handlePinnedItemClick]
  )

  const allItems = useMemo(
    () => [...staticItems, ...(isPinnedAssistantsEnabled ? pinnedItems : [])],
    [staticItems, pinnedItems, isPinnedAssistantsEnabled]
  )

  const handleDeleteClick = useCallback((e: React.MouseEvent, item: NavSectionItem) => {
    e.stopPropagation()
    setUnpinTarget(item)
  }, [])

  const handleUnpinConfirm = async () => {
    if (unpinTarget) {
      await assistantsStore.unpinAssistant(unpinTarget.id)
    }
    setUnpinTarget(null)
  }

  const handleUnpinCancel = () => setUnpinTarget(null)

  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined
    if (unpinTarget) {
      id = setTimeout(() => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
        const firstFocusable = dialog?.querySelector<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
      }, 0)
    }
    return () => clearTimeout(id)
  }, [unpinTarget])

  const handleCloseOverflow = useCallback(() => setOverflowOpen(false), [])

  const visibleSlots =
    availableHeight > 0
      ? Math.floor((availableHeight + ITEM_GAP - CONTAINER_PB) / (ITEM_HEIGHT + ITEM_GAP))
      : 0
  const allFit = allItems.length <= visibleSlots

  useEffect(() => {
    if (allFit) setOverflowOpen(false)
  }, [allFit])

  const collapsedBubbles = computeCollapsedBubbles(allItems, allFit)
  const expandedBubbles = computeExpandedBubbles(allItems, allFit)

  const renderUnpinPopup = () =>
    unpinTarget ? (
      <UnpinFromSidebarPopup
        visible={true}
        assistantName={unpinTarget.name}
        onConfirm={handleUnpinConfirm}
        onCancel={handleUnpinCancel}
      />
    ) : null

  const renderExpandedContent = () => {
    if (allFit) {
      return allItems.map((item) => (
        <PinnedRow key={item.id} item={item} onDelete={(e) => handleDeleteClick(e, item)} />
      ))
    }
    const hasOverflow = expandedBubbles.overflow.length > 0

    const getInnerButtons = () =>
      Array.from(
        gridBlockRef.current?.querySelectorAll<HTMLButtonElement>('button[data-inner]') ?? []
      )

    const handleOuterKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOverflowOpen((prev) => !prev)
      } else if (e.key === 'Tab' && !e.shiftKey) {
        const buttons = getInnerButtons()
        if (buttons.length > 0) {
          e.preventDefault()
          buttons[0].focus()
        }
      }
    }

    const handleInnerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (e.key !== 'Tab') return
      e.stopPropagation()
      const buttons = getInnerButtons()
      if (e.shiftKey) {
        e.preventDefault()
        if (index === 0) {
          gridButtonRef.current?.focus()
        } else {
          buttons[index - 1]?.focus()
        }
      } else if (index < buttons.length - 1) {
        e.preventDefault()
        buttons[index + 1]?.focus()
      }
      // last button + Tab: natural flow → OverflowButton (visible) or next outside block (invisible)
    }

    return (
      <div
        ref={gridBlockRef}
        className="relative flex items-center justify-center p-2 rounded-lg select-none cursor-pointer hover:bg-white/15 transition-colors"
      >
        <button
          ref={gridButtonRef}
          type="button"
          className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/60"
          aria-label="Pinned assistants menu"
          aria-haspopup="menu"
          aria-expanded={overflowOpen}
          onClick={() => setOverflowOpen((prev) => !prev)}
          onKeyDown={handleOuterKeyDown}
        />
        <div className="relative z-[1] grid gap-2 grid-cols-[repeat(4,24px)] pointer-events-none">
          {expandedBubbles.visible.map((item, index) => (
            <button
              key={item.id}
              type="button"
              data-inner
              tabIndex={-1}
              aria-label={item.name}
              data-tooltip-id="react-tooltip"
              data-tooltip-place="right"
              data-tooltip-content={item.name}
              className="size-6 rounded-full pointer-events-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-white/50"
              onClick={(e) => {
                e.stopPropagation()
                item.onClick()
              }}
              onKeyDown={(e) => handleInnerKeyDown(e, index)}
            >
              <Avatar iconUrl={item.icon_url} name={item.name} type={AvatarType.XS} />
            </button>
          ))}
        </div>
        <div className="relative z-[1] pointer-events-none">
          <OverflowButton
            count={expandedBubbles.overflow.length}
            onToggle={() => setOverflowOpen((prev) => !prev)}
            buttonRef={overflowButtonRef}
            isExpanded={overflowOpen}
            className={cn('pointer-events-auto', !hasOverflow ? 'invisible' : undefined)}
          />
        </div>
      </div>
    )
  }

  const renderCollapsedContent = () => {
    if (allFit) {
      return allItems.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.name}
          data-tooltip-id="react-tooltip"
          data-tooltip-place="right"
          data-tooltip-content={item.name}
          className="h-9 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-white/50"
          onClick={item.onClick}
        >
          <Avatar iconUrl={item.icon_url} name={item.name} type={AvatarType.XS} />
        </button>
      ))
    }
    return (
      <>
        {collapsedBubbles.visible.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.name}
            data-tooltip-id="react-tooltip"
            data-tooltip-place="right"
            data-tooltip-content={item.name}
            className="h-9 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-white/50"
            onClick={item.onClick}
          >
            <Avatar iconUrl={item.icon_url} name={item.name} type={AvatarType.XS} />
          </button>
        ))}
        <OverflowButton
          count={collapsedBubbles.overflow.length}
          onToggle={() => setOverflowOpen((prev) => !prev)}
          buttonRef={overflowButtonRef}
          isExpanded={overflowOpen}
          className="hover:bg-white/15"
        />
      </>
    )
  }

  return (
    <div ref={containerRef} className="h-full relative">
      {helpAssistantsFetched && allItems.length > 0 && (
        <div
          className={cn(
            'flex flex-col gap-1.5 overflow-hidden h-full justify-end pb-[18px]',
            !navigationExpanded && 'items-center'
          )}
        >
          {navigationExpanded ? renderExpandedContent() : renderCollapsedContent()}
        </div>
      )}
      {overflowOpen && (
        <PinnedAssistantsOverflowDropdown
          items={allItems}
          onClose={handleCloseOverflow}
          anchorRef={navigationExpanded && !allFit ? gridButtonRef : overflowButtonRef}
        />
      )}
      {renderUnpinPopup()}
    </div>
  )
}

export default NavigationPinnedSection
