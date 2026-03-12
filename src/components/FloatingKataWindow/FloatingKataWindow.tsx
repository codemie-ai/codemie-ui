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

import { useState, useRef } from 'react'
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import CollapseSvg from '@/assets/icons/collapse.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import ExpandSvg from '@/assets/icons/expand.svg?react'
import ExternalSvg from '@/assets/icons/external.svg?react'
import CompleteKataConfirmation from '@/pages/katas/components/CompleteKataConfirmation'
import StepByStepNavigator from '@/pages/katas/components/StepByStepNavigator'
import { floatingKataStore } from '@/store/floatingKata'
import { katasStore } from '@/store/katas'
import { cn } from '@/utils/utils'

const FloatingKataWindow = () => {
  const navigate = useNavigate()
  const store = useSnapshot(floatingKataStore)
  const [showCompleteConfirmation, setShowCompleteConfirmation] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)

  const windowWidth = store.isCollapsed ? 300 : 500
  const windowHeight = store.isCollapsed ? 60 : 650

  // Handle drag stop to save position
  const handleDragStop = (_e: DraggableEvent, data: DraggableData) => {
    floatingKataStore.updatePosition(data.x, data.y)
  }

  // Calculate bounds to constrain to viewport
  const getBounds = ():
    | { left: number; top: number; right: number; bottom: number }
    | undefined => {
    return typeof window === 'undefined'
      ? undefined
      : {
          left: 0,
          top: 0,
          right: window.innerWidth - windowWidth,
          bottom: window.innerHeight - windowHeight,
        }
  }

  const handleToggleCollapsed = () => {
    floatingKataStore.toggleCollapsed()
  }

  const handleClose = () => {
    floatingKataStore.closeFloatingKata()
  }

  const handleRestoreToPage = () => {
    const { kataId } = store
    floatingKataStore.restoreToPage()

    if (kataId) {
      navigate(`/katas/${kataId}`)
    }
  }

  const handleStepChange = (index: number) => {
    floatingKataStore.updateStepIndex(index)
  }

  const handleExitStepMode = () => {
    // When user exits step mode in floating window, just close the window
    handleClose()
  }

  const handleCompleteKata = () => {
    setShowCompleteConfirmation(true)
  }

  const confirmCompleteKata = async () => {
    if (!store.kataId) return

    try {
      setIsCompleting(true)
      await katasStore.completeKata(store.kataId)
      setShowCompleteConfirmation(false)
      // Close the floating window after successful completion
      floatingKataStore.closeFloatingKata()
    } catch (error) {
      console.error('Error completing kata:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const cancelCompleteKata = () => {
    setShowCompleteConfirmation(false)
  }

  if (!store.isVisible) {
    return null
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: store.position.x, y: store.position.y }}
      onStop={handleDragStop}
      bounds={getBounds()}
      handle=".drag-handle"
    >
      <div
        ref={nodeRef}
        className={cn(
          'fixed z-50 bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg shadow-2xl transition-all duration-300'
        )}
        style={{
          width: `${windowWidth}px`,
          height: store.isCollapsed ? `${windowHeight}px` : 'auto',
          maxHeight: `${windowHeight}px`,
        }}
      >
        {/* Header - Draggable */}
        <div
          className={cn(
            'drag-handle flex items-center justify-between px-4 py-3 border-b border-border-specific-panel-outline cursor-move select-none',
            'bg-white/5 hover:bg-white/10 transition-colors'
          )}
        >
          <h4 className="text-sm font-semibold text-text-primary truncate flex-1 mr-3">
            {store.kataTitle}
          </h4>

          <div className="flex items-center gap-2 shrink-0">
            {/* Restore to page button */}
            <button
              onClick={handleRestoreToPage}
              className="p-1.5 rounded hover:bg-white/10 transition-colors text-text-quaternary hover:text-text-info"
              title="Restore to page"
              aria-label="Restore to page"
            >
              <ExternalSvg className="w-4 h-4" />
            </button>

            {/* Collapse/Expand toggle */}
            <button
              onClick={handleToggleCollapsed}
              className="p-1.5 rounded hover:bg-white/10 transition-colors text-text-quaternary hover:text-text-primary"
              title={store.isCollapsed ? 'Expand' : 'Collapse'}
              aria-label={store.isCollapsed ? 'Expand window' : 'Collapse window'}
            >
              {store.isCollapsed ? (
                <ExpandSvg className="w-4 h-4" />
              ) : (
                <CollapseSvg className="w-4 h-4" />
              )}
            </button>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="p-1.5 rounded hover:bg-white/10 transition-colors text-text-quaternary hover:text-text-primary"
              title="Close"
              aria-label="Close floating window"
            >
              <CrossSvg className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content - Only show when expanded */}
        {!store.isCollapsed && (
          <div className="p-4 overflow-y-auto max-h-[590px]">
            <StepByStepNavigator
              markdownContent={store.markdownContent}
              onExitStepMode={handleExitStepMode}
              initialStepIndex={store.currentStepIndex}
              onStepChange={handleStepChange}
              isInFloatingWindow={true}
              onCompleteKata={handleCompleteKata}
            />
          </div>
        )}

        <CompleteKataConfirmation
          visible={showCompleteConfirmation}
          onCancel={cancelCompleteKata}
          onConfirm={confirmCompleteKata}
          isCompleting={isCompleting}
        />
      </div>
    </Draggable>
  )
}

export default FloatingKataWindow
