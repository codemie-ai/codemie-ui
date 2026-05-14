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

import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'
import ToolkitIcon from '@/pages/assistants/components/ToolkitIcon'
import { AssistantToolkit } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

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
          {toolkit.tools.some((t) => t.isUnavailable) && (
            <InfoWarning
              type={InfoWarningType.WARNING}
              message="Some MCP servers are unavailable. Remove them or contact your administrator."
            />
          )}
          {toolkit.tools.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {toolkit.tools.map((tool) => (
                <div
                  key={tool.tool}
                  className={cn(
                    'py-1.5 px-2 flex items-center gap-2 rounded-lg border font-semibold text-xs',
                    tool.isUnavailable
                      ? 'bg-failed-secondary/10 border-border-error text-text-error'
                      : 'bg-surface-base-chat border-border-specific-panel-outline'
                  )}
                >
                  {tool.isUnavailable && (
                    <span className="flex-shrink-0 w-4 h-4 rounded border border-border-error bg-failed-secondary/10 flex items-center justify-center text-text-error text-[9px] font-bold">
                      !
                    </span>
                  )}
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
