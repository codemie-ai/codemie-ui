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

import { ControlButton } from '@xyflow/react'
import React from 'react'

import { cn } from '@/utils/utils'

interface CanvasControlButtonProps {
  onClick: () => void
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  disabled?: boolean
}

const CanvasControlButton: React.FC<CanvasControlButtonProps> = ({
  onClick,
  title,
  icon: Icon,
  disabled = false,
}) => {
  return (
    <ControlButton
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        '!h-8 !w-8 !border-none transition-colors !bg-surface-base-secondary hover:!bg-border-specific-node-border/15',
        disabled && '!opacity-50 !cursor-not-allowed'
      )}
    >
      <Icon className="!max-h-4 !max-w-4" />
    </ControlButton>
  )
}

export default CanvasControlButton
