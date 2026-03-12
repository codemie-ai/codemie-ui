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

import capitalize from 'lodash/capitalize'
import React from 'react'

import { NodeType, nodeTemplates } from '@/types/workflowEditor/base'

interface NodeHeaderProps {
  type: NodeType
  title: string
}

const NodeHeader: React.FC<NodeHeaderProps> = ({ type, title }) => {
  const template = nodeTemplates.find((t) => t.type === type)

  return (
    <div className="flex items-center gap-4 px-4 py-4">
      {template?.icon && (
        <div className="flex w-8 h-8 items-center justify-center shrink-0">{template.icon}</div>
      )}
      <div className="font-medium text-lg text-text-primary truncate">{capitalize(title)}</div>
    </div>
  )
}

export default NodeHeader
