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

import { Controls } from '@xyflow/react'

import CollapseSVG from '@/assets/icons/collapse.svg?react'
import DownloadSVG from '@/assets/icons/download.svg?react'
import ExpandSVG from '@/assets/icons/expand.svg?react'
import NodeControlFitSVG from '@/assets/icons/node-control-fit.svg?react'
import NodeControlLockSVG from '@/assets/icons/node-control-lock.svg?react'
import NodeControlMinusSVG from '@/assets/icons/node-control-minus.svg?react'
import NodeControlPlusSVG from '@/assets/icons/node-control-plus.svg?react'
import NodeControlUnlockSVG from '@/assets/icons/node-control-unlock.svg?react'

import CanvasControlButton from './CanvasControlButton'

interface EditorControlsProps {
  isFullscreen: boolean
  locked: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onToggleLock: () => void
  onDownloadImage: () => void
  disableLockToggle?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
}

const EditorControls = ({
  isFullscreen,
  locked,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleLock,
  onDownloadImage,
  disableLockToggle = false,
  isExpanded = false,
  onToggleExpand,
}: EditorControlsProps) => {
  return (
    <Controls
      showZoom={false}
      showFitView={false}
      showInteractive={false}
      orientation="horizontal"
      className="rounded-lg overflow-hidden bg-surface-base-chat border-1 border-border-structural remove-when-downloading"
    >
      <CanvasControlButton onClick={onZoomIn} title="Zoom in" icon={NodeControlPlusSVG} />
      <CanvasControlButton onClick={onZoomOut} title="Zoom out" icon={NodeControlMinusSVG} />

      <CanvasControlButton onClick={onFitView} title="Fit view" icon={NodeControlFitSVG} />

      {isFullscreen && (
        <CanvasControlButton
          onClick={onToggleLock}
          title={locked ? 'Unlock' : 'Lock'}
          icon={locked ? NodeControlLockSVG : NodeControlUnlockSVG}
          disabled={disableLockToggle}
        />
      )}

      <CanvasControlButton onClick={onDownloadImage} title="Download" icon={DownloadSVG} />

      {!isFullscreen && onToggleExpand && (
        <CanvasControlButton
          onClick={onToggleExpand}
          title={isExpanded ? 'Collapse' : 'Expand'}
          icon={isExpanded ? CollapseSVG : ExpandSVG}
        />
      )}
    </Controls>
  )
}

export default EditorControls
