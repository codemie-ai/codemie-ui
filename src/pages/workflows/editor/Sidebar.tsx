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

import React, { useState } from 'react'

import SidebarSVG from '@/assets/icons/sidebar.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { useDnD } from '@/hooks/useReactFlowDnD'
import { NodeType, NodeTemplateCategory, nodeTemplates } from '@/types/workflowEditor/base'
import { cn } from '@/utils/utils'

import DragGhost from './DragGhost'
import SidebarNode from './SidebarNode'

interface NodeEditorSidebarProps {
  createState: (type: NodeType, position: { x: number; y: number }) => void
  disabled?: boolean
}

const controlNodes = nodeTemplates.filter(
  (template) => template.category === NodeTemplateCategory.CONTROL
)

const actionNodes = nodeTemplates.filter(
  (template) => template.category === NodeTemplateCategory.ACTION
)

const otherNodes = nodeTemplates.filter(
  (template) => template.category === NodeTemplateCategory.OTHER
)

interface ToggleButtonProps {
  isCollapsed: boolean
  onClick: () => void
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ isCollapsed, onClick }) => {
  return (
    <Button
      onClick={onClick}
      variant={ButtonType.TERTIARY}
      className={cn({
        'ml-auto': !isCollapsed,
      })}
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <SidebarSVG
        className={cn('w-4 h-4 transition-transform', {
          'rotate-180': isCollapsed,
        })}
      />
      {isCollapsed && <span>Sidebar</span>}
    </Button>
  )
}

const Sidebar: React.FC<NodeEditorSidebarProps> = ({ createState, disabled = false }) => {
  const { onDragStart, isDragging } = useDnD()
  const [ghostType, setGhostType] = useState<NodeType>()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleDragStart = (event, type: NodeType) => {
    if (disabled) return
    setGhostType(type)
    onDragStart(event, ({ position }) => handleDragEnd(position, type))
  }

  const handleDragEnd = (position, type: NodeType) => {
    createState(type, position)
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <>
      {isDragging && ghostType && <DragGhost type={ghostType} />}
      <aside
        id="nodes-sidebar"
        className={cn(
          'absolute top-4 left-6 bg-surface-base-chat border-border-structural border-1 z-[10] rounded-lg',
          'transition-all duration-200',
          {
            'w-[190px] p-4 pb-2': !isCollapsed,
            'p-0': isCollapsed,
            'opacity-50 pointer-events-none': disabled,
          }
        )}
      >
        {isCollapsed ? (
          <div className="opacity-90">
            <ToggleButton isCollapsed={isCollapsed} onClick={toggleSidebar} />
          </div>
        ) : (
          <div className="min-w-[148px]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-md font-semibold text-text-primary mb-1">Nodes</h2>
                <p className="text-sm text-text-quaternary mb-3 mt-1">Drag to canvas</p>
              </div>
              <div className="absolute right-2 top-3 opacity-50">
                <ToggleButton isCollapsed={isCollapsed} onClick={toggleSidebar} />
              </div>
            </div>

            <div className="text-xs font-semibold mt-2 mb-3">Control</div>

            {controlNodes.map((template) => (
              <SidebarNode
                key={`${template.type}-${template.label}`}
                template={template}
                onDragStart={handleDragStart}
              />
            ))}

            <div className="text-xs font-semibold mt-2 mb-3">Action</div>

            {actionNodes.map((template) => (
              <SidebarNode
                key={`${template.type}-${template.label}`}
                template={template}
                onDragStart={handleDragStart}
              />
            ))}

            <div className="text-xs font-semibold mt-2 mb-3">Other</div>

            {otherNodes.map((template) => (
              <SidebarNode
                key={`${template.type}-${template.label}`}
                template={template}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        )}
      </aside>
    </>
  )
}

export default Sidebar
