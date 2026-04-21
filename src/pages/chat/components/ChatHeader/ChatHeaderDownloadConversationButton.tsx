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

import { OverlayPanel } from 'primereact/overlaypanel'
import { FC, KeyboardEvent, useRef, useState } from 'react'

import ExportSvg from '@/assets/icons/download.svg?react'
import ExportToDocxSvg from '@/assets/icons/export-to-docx.svg?react'
import ExportToJsonSvg from '@/assets/icons/export-to-json.svg?react'
import ExportToPdfSvg from '@/assets/icons/export-to-pdf.svg?react'
import Button from '@/components/Button'
import { chatsStore } from '@/store/chats'
import { ChatExportFormat } from '@/types/chats'
import toaster from '@/utils/toaster'

interface ButtonOverlayProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

const ButtonOverlay: FC<ButtonOverlayProps> = ({ icon, label, onClick }) => {
  const formatType = label.split(' ').pop() // Extract format type (JSON, DOCX, PDF)
  const ariaLabel = `Export your conversation as ${formatType} format for easy sharing and archiving`

  return (
    <button
      type="button"
      role="menuitem"
      className="flex items-center gap-4 hover:bg-surface-specific-dropdown-hover px-1 py-2 text-xs w-full font-medium rounded-md outline-none text-text-primary leading-4 tracking-tight disabled:text-text-quaternary hover:text-text-accent focus:bg-surface-specific-dropdown-hover"
      onClick={onClick}
      aria-label={ariaLabel}
      data-pr-tooltip={label}
    >
      <span className="w-[18px] h-[18px] flex justify-center items-center" aria-hidden="true">
        {icon}
      </span>
      <span className="text-left">{label}</span>
    </button>
  )
}

const ChatHeaderDownloadConversationButton: FC = () => {
  const ref = useRef<OverlayPanel>(null)
  const triggerWrapperRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isOverlayVisible, setIsOverlayVisible] = useState(false)

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    ref.current?.toggle(e)
    setIsOverlayVisible(!isOverlayVisible)
  }

  const handleOverlayShow = () => {
    setIsOverlayVisible(true)
    setTimeout(() => {
      const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')
      firstItem?.focus()
    }, 0)
  }

  const handleOverlayHide = () => {
    setIsOverlayVisible(false)
    triggerWrapperRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
    )
    const currentIndex = items.findIndex((item) => item === document.activeElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(currentIndex + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(currentIndex - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Escape') {
      ref.current?.hide()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      ref.current?.hide()
    }
  }

  const handleMenuBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!menuRef.current?.contains(e.relatedTarget as Node)) {
      ref.current?.hide()
    }
  }

  const handleExport = async (format: ChatExportFormat) => {
    const success = chatsStore.exportChat(format)

    ref.current?.hide()

    if (await success) {
      const formatUpper = format.toUpperCase()
      toaster.info(
        `Your conversation has been successfully exported as ${formatUpper}. The file is now ready in your downloads folder.`
      )
    }
  }

  return (
    <>
      <div ref={triggerWrapperRef} data-onboarding="chat-export-button">
        <Button
          type="secondary"
          aria-label="Export Conversation"
          aria-haspopup="menu"
          aria-expanded={isOverlayVisible}
          data-tooltip-id="react-tooltip"
          data-tooltip-content={isOverlayVisible ? '' : 'Export Conversation'}
          onClick={handleButtonClick}
        >
          <ExportSvg aria-hidden="true" />
        </Button>
      </div>
      <OverlayPanel
        ref={ref}
        onShow={handleOverlayShow}
        onHide={handleOverlayHide}
        className="bg-surface-base-secondary p-2 rounded-lg border border-border-structural shadow-xl"
        pt={{ root: { style: { transform: 'translateX(-64px)' } } }}
      >
        <div
          ref={menuRef}
          role="menu"
          aria-label="Export Conversation"
          className="flex flex-col gap-1"
          onKeyDown={handleMenuKeyDown}
          onBlur={handleMenuBlur}
        >
          <ButtonOverlay
            icon={<ExportToJsonSvg />}
            label="Export to JSON"
            onClick={() => handleExport('json')}
          />

          <ButtonOverlay
            icon={<ExportToDocxSvg />}
            label="Export to DOCX"
            onClick={() => handleExport('docx')}
          />
          <ButtonOverlay
            icon={<ExportToPdfSvg />}
            label="Export to PDF"
            onClick={() => handleExport('pdf')}
          />
        </div>
      </OverlayPanel>
    </>
  )
}

export default ChatHeaderDownloadConversationButton
