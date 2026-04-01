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

import { Checkbox } from '@/components/form/Checkbox'
import { MCPServerDetails } from '@/types/entity/mcp'
import { cn } from '@/utils/utils'

import MCPServerInfo from './MCPServerInfo'

interface MCPServerListItemProps {
  server: MCPServerDetails
  index: number
  selectedIndex: number
  isSelected: boolean
  isActive?: boolean
  onClick: () => void
  onToggle: () => void
}

const MCPServerListItem = ({
  server,
  index,
  selectedIndex,
  isSelected,
  isActive,
  onClick,
  onToggle,
}: MCPServerListItemProps) => (
  <div
    onClick={onClick}
    className={cn(
      'flex items-center p-3 gap-3 rounded-lg cursor-pointer transition-all border min-w-0 w-full',
      (isActive !== undefined ? isActive : selectedIndex === index)
        ? 'bg-surface-base-float border-border-structural'
        : 'border-transparent hover:bg-border-structural/10'
    )}
  >
    <div onClick={(e) => e.stopPropagation()}>
      <Checkbox checked={isSelected} onChange={onToggle} label="" />
    </div>
    <MCPServerInfo server={server} />
  </div>
)

export default MCPServerListItem
