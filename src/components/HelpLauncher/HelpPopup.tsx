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

import React from 'react'

import CloseSVG from '@/assets/icons/cross.svg?react'
import { cn } from '@/utils/utils'

export interface HelpLink {
  id: string
  label: string
  href: string
}

export interface HelpPopupProps {
  onClose: () => void
  title?: string
  description?: string
  links: HelpLink[]
  style?: React.CSSProperties
}

const HelpPopup: React.FC<HelpPopupProps> = ({
  onClose,
  title = 'Codemie Helper',
  description,
  links,
  style,
}) => {
  const handleLinkClick = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      <div
        className={cn(
          'fixed z-50 w-96 p-4',
          'flex flex-col gap-4',
          'rounded-lg shadow-lg',
          'border border-border-primary bg-surface-base-float'
        )}
        style={style}
      >
        <div className="flex justify-between items-center gap-2">
          <h3 className="text-sm font-semibold leading-4 text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center p-1 rounded-full transition-colors"
            aria-label="Close"
            type="button"
          >
            <CloseSVG className="w-4.5 h-4.5 text-text-primary" />
          </button>
        </div>

        {description && (
          <p className="text-sm font-normal leading-4 text-text-primary">{description}</p>
        )}

        <div className="flex flex-col gap-3">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link.href)}
              className={cn(
                'text-left text-sm leading-4 font-normal',
                'text-text-accent-status hover:text-text-accent-status-hover',
                'focus:outline-none transition-all cursor-pointer'
              )}
              type="button"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export default HelpPopup
