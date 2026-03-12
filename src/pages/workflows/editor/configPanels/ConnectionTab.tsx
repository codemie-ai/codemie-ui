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

import React from 'react'

import { WorkflowEdge } from '@/types/workflowEditor/base'

import TabFooter from './components/TabFooter'

interface ConnectionTabProps {
  edge: WorkflowEdge
  onDeleteConnection: (edgeId: string) => void
  onClose: (forceClose: boolean) => void
}

const ConnectionTab: React.FC<ConnectionTabProps> = ({ edge, onDeleteConnection, onClose }) => {
  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center gap-2">
          <div className="text-xs font-semibold text-text-quaternary text-right uppercase w-8">
            From
          </div>
          <div className="text-sm text-text-primary font-mono break-all">{edge.source}</div>
        </div>

        <div className="flex flex-row items-center gap-2">
          <div className="text-xs font-semibold text-text-quaternary text-right uppercase w-8">
            To
          </div>
          <div className="text-sm text-text-primary font-mono break-all">{edge.target}</div>
        </div>
      </div>

      <TabFooter
        onCancel={() => onClose(true)}
        onSave={() => {}}
        onDelete={() => onDeleteConnection(edge.id)}
      />
    </>
  )
}

export default ConnectionTab
