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

import { OverlayPanel } from 'primereact/overlaypanel'
import { MouseEvent, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import SlidersSvg from '@/assets/icons/sliders.svg?react'
import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import { RadioButton } from '@/components/form/RadioButton'
import TooltipButton from '@/components/TooltipButton'
import { ChatListDensity, ChatOrganizeMode, chatViewSettingsStore } from '@/store/chatViewSettings'

const ORGANIZE_OPTIONS = [
  {
    label: 'Unified sidebar',
    description: 'Browse chats, assistants, and folders in one panel.',
    tooltip:
      'Folders expand directly in the sidebar, so you can browse and switch between several contexts without leaving the main Chats view.',
    value: ChatOrganizeMode.UNIFIED,
  },
  {
    label: 'Focused views',
    description: 'Open folders and assistant histories in dedicated views.',
    tooltip:
      'Folders and assistant histories open in a dedicated second-level view with scoped search. This is useful when you prefer to work inside one context at a time.',
    value: ChatOrganizeMode.FOCUSED,
  },
]

const DENSITY_OPTIONS = [
  {
    label: 'Detailed',
    description: 'Show participant avatars and additional folder context.',
    tooltip:
      'Shows assistant and participant context. Multi-assistant chats and mixed custom folders display avatar stacks. In Focused views, folders also show chat count and the latest chat.',
    value: ChatListDensity.DETAILED,
  },
  {
    label: 'Compact',
    description: 'Reduce visual noise and focus on titles.',
    tooltip:
      'Reduces visual noise by hiding chat and folder participant metadata. Recent Assistants still keep their avatars, and structural folder icons remain visible.',
    value: ChatListDensity.COMPACT,
  },
]

const SECTIONS_TOOLTIPS = {
  showRecentAssistants:
    'Shows quick access to assistants you have used. Selecting an assistant starts a new chat without requiring a trip to the Assistants page.',
  showWorkflowRunsSeparately:
    'When enabled, workflow runs are shown in their own Workflows section instead of being mixed into Recent Chats. Chats manually placed in custom folders are not affected.',
}

const ChatViewSettings = () => {
  const overlayRef = useRef<OverlayPanel>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const { organizeBy, density, showRecentAssistants, showWorkflowRunsSeparately } =
    useSnapshot(chatViewSettingsStore)

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget
    const shouldOpen = !overlayRef.current?.isVisible()
    overlayRef.current?.toggle(event)
    setIsOpen(shouldOpen)
  }

  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const { target } = event
      if (!(target instanceof Node)) return

      const overlay = overlayRef.current?.getElement()
      if (overlay?.contains(target) || triggerRef.current?.contains(target)) return

      overlayRef.current?.hide()
      setIsOpen(false)
    }

    if (isOpen) document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  }, [isOpen])

  return (
    <>
      <Button
        variant="tertiary"
        size="small"
        aria-label="Open Chat view settings"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="chat-view-settings-panel"
        onClick={handleToggle}
        className="rounded-full text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <SlidersSvg aria-hidden="true" />
      </Button>

      <OverlayPanel
        ref={overlayRef}
        id="chat-view-settings-panel"
        aria-label="Chat view settings"
        dismissable={false}
        onShow={() => setIsOpen(true)}
        onHide={() => setIsOpen(false)}
        className="w-96 max-w-full rounded-lg border border-border-primary bg-surface-base-float p-4 shadow-xl"
      >
        <div className="flex flex-col gap-4 text-text-primary">
          <h3 className="text-base font-semibold">Chat view</h3>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-xs text-text-tertiary">Organize by</legend>
            {ORGANIZE_OPTIONS.map((option) => (
              <div key={option.value}>
                <div className="flex items-center gap-1">
                  <RadioButton
                    inputId={`chat-organize-${option.value}`}
                    name="chat-organize-mode"
                    value={option.value}
                    label={option.label}
                    checked={organizeBy === option.value}
                    onChange={() => chatViewSettingsStore.setOrganizeBy(option.value)}
                  />
                  <TooltipButton content={option.tooltip} wrapperClassName="ml-1" />
                </div>
                <p className="ml-7 mt-1 text-xs leading-5 text-text-tertiary">
                  {option.description}
                </p>
              </div>
            ))}
          </fieldset>

          <div className="border-t border-border-secondary" />

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-xs text-text-tertiary">List density</legend>
            {DENSITY_OPTIONS.map((option) => (
              <div key={option.value}>
                <div className="flex items-center gap-1">
                  <RadioButton
                    inputId={`chat-density-${option.value}`}
                    name="chat-list-density"
                    value={option.value}
                    label={option.label}
                    checked={density === option.value}
                    onChange={() => chatViewSettingsStore.setDensity(option.value)}
                  />
                  <TooltipButton content={option.tooltip} wrapperClassName="ml-1" />
                </div>
                <p className="ml-7 mt-1 text-xs leading-5 text-text-tertiary">
                  {option.description}
                </p>
              </div>
            ))}
          </fieldset>

          <div className="border-t border-border-secondary" />

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 text-xs text-text-tertiary">Sections</legend>
            <div className="flex items-center gap-1">
              <Checkbox
                label="Show recent assistants"
                checked={showRecentAssistants}
                onChange={(value) => chatViewSettingsStore.setShowRecentAssistants(value)}
              />
              <TooltipButton
                content={SECTIONS_TOOLTIPS.showRecentAssistants}
                wrapperClassName="ml-1"
              />
            </div>
            <div className="flex items-center gap-1">
              <Checkbox
                label="Show workflow runs separately"
                checked={showWorkflowRunsSeparately}
                onChange={(value) => chatViewSettingsStore.setShowWorkflowRunsSeparately(value)}
              />
              <TooltipButton
                content={SECTIONS_TOOLTIPS.showWorkflowRunsSeparately}
                wrapperClassName="ml-1"
              />
            </div>
          </fieldset>
        </div>
      </OverlayPanel>
    </>
  )
}

export default ChatViewSettings
