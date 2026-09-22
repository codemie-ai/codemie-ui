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

import {
  Controls,
  useNodesInitialized,
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
} from '@xyflow/react'
import React, { useCallback, useEffect } from 'react'

import NodeControlFitSVG from '@/assets/icons/node-control-fit.svg?react'
import NodeControlMinusSVG from '@/assets/icons/node-control-minus.svg?react'
import NodeControlPlusSVG from '@/assets/icons/node-control-plus.svg?react'
import { cn } from '@/utils/utils'

import CanvasControlButton from './CanvasControlButton'

const FIT_VIEW_OPTIONS = { padding: 0.15, maxZoom: 1 } as const

interface DiffCanvasControlsProps {
  isActive: boolean
  className?: string
}

function useDiffCanvasFitView(isActive: boolean) {
  const { fitView, getNodes } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()
  const nodesInitialized = useNodesInitialized()
  const width = useStore((state) => state.width)
  const height = useStore((state) => state.height)

  const refreshNodeInternals = useCallback(() => {
    for (const node of getNodes()) {
      updateNodeInternals(node.id)
    }
  }, [getNodes, updateNodeInternals])

  useEffect(() => {
    if (!isActive || !nodesInitialized || width === 0 || height === 0) return () => {}

    let cancelled = false
    let outerFrame = 0
    let innerFrameA = 0
    let innerFrameB = 0
    const retryTimeout = window.setTimeout(() => {
      if (cancelled) return
      refreshNodeInternals()
      fitView(FIT_VIEW_OPTIONS)
      innerFrameA = window.requestAnimationFrame(() => {
        if (!cancelled) refreshNodeInternals()
      })
    }, 150)

    refreshNodeInternals()
    outerFrame = window.requestAnimationFrame(() => {
      if (cancelled) return
      fitView(FIT_VIEW_OPTIONS)
      innerFrameB = window.requestAnimationFrame(() => {
        if (!cancelled) refreshNodeInternals()
      })
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(outerFrame)
      window.cancelAnimationFrame(innerFrameA)
      window.cancelAnimationFrame(innerFrameB)
      window.clearTimeout(retryTimeout)
    }
  }, [isActive, nodesInitialized, width, height, fitView, refreshNodeInternals])
}

const DiffCanvasControls: React.FC<DiffCanvasControlsProps> = ({ isActive, className }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  useDiffCanvasFitView(isActive)

  return (
    <Controls
      showZoom={false}
      showFitView={false}
      showInteractive={false}
      orientation="horizontal"
      position="bottom-left"
      className={cn(
        'rounded-lg overflow-hidden bg-surface-base-chat border-1 border-border-structural',
        className
      )}
    >
      <CanvasControlButton onClick={() => zoomIn()} title="Zoom in" icon={NodeControlPlusSVG} />
      <CanvasControlButton onClick={() => zoomOut()} title="Zoom out" icon={NodeControlMinusSVG} />
      <CanvasControlButton
        onClick={() => fitView(FIT_VIEW_OPTIONS)}
        title="Fit view"
        icon={NodeControlFitSVG}
      />
    </Controls>
  )
}

export default DiffCanvasControls
