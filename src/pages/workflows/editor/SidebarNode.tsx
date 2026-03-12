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

import { NodeTemplate } from '@/types/workflowEditor/base'
import { cn } from '@/utils/utils'

interface SidebarNodeProps {
  template: NodeTemplate
  onDragStart: (event, type) => void
}

const SidebarNode = ({ template, onDragStart }: SidebarNodeProps) => {
  if (!template) return <div> error</div>

  return (
    <button
      key={template.type}
      className={cn(
        'cursor-grab active:cursor-grabbing w-full',
        'transition-all group duration-100 ',
        'rounded-[9px] border-1 border-transparent hover:bg-surface-specific-dropdown-hover'
      )}
      draggable
      onPointerDown={(event) => {
        onDragStart(event, template.type)
      }}
    >
      <div className="flex items-center gap-4 text-quaternary text-sm">
        {template.icon}
        {template.label}
      </div>
    </button>
  )
}

export default SidebarNode
