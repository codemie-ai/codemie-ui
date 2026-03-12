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

import ToolkitIcon from '@/pages/assistants/components/ToolkitIcon'
import { AssistantToolkit } from '@/types/entity/assistant'

interface ToolkitsViewListProps {
  toolkits: AssistantToolkit[]
  className?: string
}

const ToolkitsViewList = ({ toolkits, className }: ToolkitsViewListProps) => {
  return (
    <div className={className}>
      {toolkits.map((toolkit) => (
        <div key={toolkit.toolkit} className="flex flex-col gap-2">
          <p className="flex items-center gap-2 font-semibold text-text-tertiary text-xs">
            <ToolkitIcon toolkitType={toolkit.toolkit as any} />
            {toolkit.label || toolkit.toolkit}
          </p>
          {toolkit.tools.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {toolkit.tools.map((tool) => (
                <div
                  key={tool.tool}
                  className="py-1.5 px-2 flex items-center gap-2 rounded-lg bg-surface-base-chat border border-border-specific-panel-outline font-semibold text-xs"
                >
                  {tool.label}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default ToolkitsViewList
