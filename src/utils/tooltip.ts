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
import { Tooltip } from 'react-tooltip'

export const TOOLTIP_CONTAINER_ID = 'react-tooltip-container'

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
        id: 'react-tooltip',
        arrowColor: 'transparent',
        openEvents: { mouseover: true },
        className:
          'z-[10000] max-w-[500px] !bg-surface-base-secondary break-all border border-border-structural whitespace-pre-line !text-text-primary !px-3.5 !py-1.5 leading-2 !rounded-lg !opacity-100 !transition-none',
      })
    )
  }
}
