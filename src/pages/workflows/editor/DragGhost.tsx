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

import { useDnDPosition } from '@/hooks/useReactFlowDnD'
import { NodeType, nodeTemplates } from '@/types/workflowEditor/base'

interface DragGhostProps {
  type: NodeType
}

function DragGhost({ type }: Readonly<DragGhostProps>) {
  const { position } = useDnDPosition()
  const template = nodeTemplates.find((item) => item.type === type)

  if (!position) return null
  if (!template) return null

  return (
    <div
      key={type}
      className="fixed z-[9999] top-0 left-0 px-2 py-2 bg-surface-base-chat rounded-lg border border-border-structural shadow-lg pointer-events-none"
      style={{
        transform: `translate(${position.x}px, ${position.y}px) translate(-50%, -50%)`,
      }}
    >
      <div className="flex items-center gap-4 text-text-primary text-sm">
        {template.icon}
        {template.label}
      </div>
    </div>
  )
}

export default DragGhost
