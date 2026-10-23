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

import { FC } from 'react'

import ConnectionSvg from '@/assets/icons/connection.svg?react'
import DeleteDangerSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { MCPConfig } from '@/types/entity/mcp'

interface ServerActionsProps {
  server: MCPConfig
  onEdit: (server: MCPConfig) => void
  onDelete: (server: MCPConfig) => void
  onTest: (server: MCPConfig) => void
  isTesting?: boolean
}

const ServerActions: FC<ServerActionsProps> = ({ server, onEdit, onDelete, onTest, isTesting }) => (
  <div className="flex flex-col gap-2 sticky bottom-0 bg-surface-base-secondary border-t border-border-structural p-4">
    <Button
      variant={ButtonType.SECONDARY}
      onClick={() => onTest(server)}
      disabled={isTesting}
      className="w-full"
    >
      <ConnectionSvg className="w-4 h-4" />
      {isTesting ? 'Testing...' : 'Test Integration'}
    </Button>
    <Button variant={ButtonType.PRIMARY} onClick={() => onEdit(server)} className="w-full">
      <EditSvg className="w-4 h-4" />
      Edit Server
    </Button>
    <Button variant={ButtonType.DELETE} onClick={() => onDelete(server)} className="w-full">
      <DeleteDangerSvg className="w-4 h-4" />
      Delete Server
    </Button>
  </div>
)

export default ServerActions
