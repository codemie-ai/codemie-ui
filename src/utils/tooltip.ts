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
import { createRoot } from 'react-dom/client'
import { Tooltip, type TooltipRefProps } from 'react-tooltip'

import { setupTooltipCloseBehavior } from './tooltipCloseBehavior'

export const TOOLTIP_CONTAINER_ID = 'react-tooltip-container'

// The imperative handle of the single global instance, so the scoped close
// behaviour can hide it without owning its render.
const globalTooltipRef = React.createRef<TooltipRefProps>()
let teardownCloseBehavior: (() => void) | null = null

export function setupGlobalTooltip() {
  if (typeof document === 'undefined') return

  // Check if container already exists
  if (!document.getElementById(TOOLTIP_CONTAINER_ID)) {
    const tooltipContainer = document.createElement('div')
    tooltipContainer.id = TOOLTIP_CONTAINER_ID
    document.body.appendChild(tooltipContainer)
  }

  // Render the tooltip into the container
  const tooltipContainer = document.getElementById(TOOLTIP_CONTAINER_ID)
  if (tooltipContainer) {
    const root = createRoot(tooltipContainer)
    root.render(
      React.createElement(Tooltip, {
        ref: globalTooltipRef,
        id: 'react-tooltip',
        arrowColor: 'transparent',
        openEvents: { mouseover: true },
        clickable: true,
        // react-tooltip only enables the close events it is handed, so naming
        // `escape` alone left resize OFF. `scroll` is deliberately NOT enabled
        // here: the library closes on any scroll of the anchor's scroll parent,
        // and the chat history scrolls itself to the bottom on every streamed
        // token — which would dismiss any tooltip anchored inside it mid-read.
        // setupTooltipCloseBehavior below closes on user-driven scrolls only.
        globalCloseEvents: { escape: true, resize: true },
        className:
          'z-[10000] max-w-[500px] !bg-surface-base-secondary break-words border border-border-structural whitespace-pre-line !text-text-primary !px-3.5 !py-1.5 leading-2 !rounded-lg !opacity-100 !transition-none',
      })
    )

    teardownCloseBehavior?.()
    teardownCloseBehavior = setupTooltipCloseBehavior(() => globalTooltipRef.current)
  }
}
