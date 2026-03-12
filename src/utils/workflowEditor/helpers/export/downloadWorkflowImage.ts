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

import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { saveAsPng } from 'save-html-as-image'

import { WorkflowNode } from '@/types/workflowEditor/base'

interface DownloadWorkflowImageOptions {
  nodes: WorkflowNode[]
  workflowName?: string
  isDark: boolean
}

const IMAGE_EXPORT_CONFIG = {
  WIDTH: 1920,
  HEIGHT: 1080,
  PIXEL_RATIO: 4,
  VIEWPORT: {
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 2,
    PADDING: 0.1,
  },
} as const

const BACKGROUND_CONFIG = {
  DARK: {
    COLOR: '#1a1a1a',
    PATTERN: 'radial-gradient(circle, #333 1px, transparent 1px)',
  },
  LIGHT: {
    COLOR: '#ffffff',
    PATTERN: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
  },
  PATTERN_SIZE: '20px 20px',
} as const

const SELECTORS = {
  REACT_FLOW: '.react-flow',
  VIEWPORT: '.react-flow__viewport',
  RESIZE_CONTROL: '.react-flow__resize-control',
  CONNECTION_INDICATOR: '.connection-ind',
} as const

const DEFAULT_FILENAME = 'workflow'

const createBackgroundElement = (
  width: number,
  height: number,
  isDark: boolean
): HTMLDivElement => {
  const config = isDark ? BACKGROUND_CONFIG.DARK : BACKGROUND_CONFIG.LIGHT
  const bgElement = document.createElement('div')

  bgElement.style.position = 'absolute'
  bgElement.style.inset = '0'
  bgElement.style.width = `${width}px`
  bgElement.style.height = `${height}px`
  bgElement.style.backgroundColor = config.COLOR
  bgElement.style.backgroundImage = config.PATTERN
  bgElement.style.backgroundSize = BACKGROUND_CONFIG.PATTERN_SIZE

  return bgElement
}

const createClonedFlowElement = (
  reactFlowElement: HTMLElement,
  viewport: { x: number; y: number; zoom: number },
  isDark: boolean
): HTMLElement | null => {
  const clone = reactFlowElement.cloneNode(true) as HTMLElement
  const clonedViewport = clone.querySelector(SELECTORS.VIEWPORT) as HTMLElement
  if (!clonedViewport) return null

  // Remove redundant elements from clone
  const resizeControls = clone.querySelectorAll(
    `${SELECTORS.RESIZE_CONTROL}, ${SELECTORS.CONNECTION_INDICATOR}`
  )
  for (const control of resizeControls) {
    control.remove()
  }

  // Add background to clone
  const bgElement = createBackgroundElement(
    IMAGE_EXPORT_CONFIG.WIDTH,
    IMAGE_EXPORT_CONFIG.HEIGHT,
    isDark
  )
  clone.appendChild(bgElement)

  // Apply transform to cloned viewport
  clonedViewport.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`

  // Position clone for capture (hidden from view)
  clone.style.position = 'fixed'
  clone.style.left = '0'
  clone.style.top = '0'
  clone.style.zIndex = '-9999'
  clone.style.pointerEvents = 'none'

  return clone
}

export const downloadWorkflowImage = async ({
  nodes,
  workflowName,
  isDark,
}: DownloadWorkflowImageOptions) => {
  const reactFlowElement = document.querySelector(SELECTORS.REACT_FLOW) as HTMLElement
  if (!reactFlowElement) return

  const nodesBounds = getNodesBounds(nodes)
  const viewport = getViewportForBounds(
    nodesBounds,
    IMAGE_EXPORT_CONFIG.WIDTH,
    IMAGE_EXPORT_CONFIG.HEIGHT,
    IMAGE_EXPORT_CONFIG.VIEWPORT.MIN_ZOOM,
    IMAGE_EXPORT_CONFIG.VIEWPORT.MAX_ZOOM,
    IMAGE_EXPORT_CONFIG.VIEWPORT.PADDING
  )

  const clone = createClonedFlowElement(reactFlowElement, viewport, isDark)
  if (!clone) return

  document.body.appendChild(clone)

  try {
    await saveAsPng(
      clone,
      {
        filename: `${workflowName || DEFAULT_FILENAME}_export`,
        printDate: false,
      },
      {
        width: IMAGE_EXPORT_CONFIG.WIDTH,
        height: IMAGE_EXPORT_CONFIG.HEIGHT,
        pixelRatio: IMAGE_EXPORT_CONFIG.PIXEL_RATIO,
      }
    )
  } finally {
    clone.remove()
  }
}
