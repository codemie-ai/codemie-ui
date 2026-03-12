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

import React, { memo, ReactNode } from 'react'

interface PageHeaderProps {
  headline?: string
  headerActions?: ReactNode
}

const PageHeader: React.FC<PageHeaderProps> = ({ headline, headerActions }) => {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 items-center border-b-2 border-black py-4 mx-6 sticky top-0 w-full z-[2]">
      {headline && (
        <div className="flex items-center gap-2">
          {headline && <h1 className="text-[24px] font-normal mb-0">{headline}</h1>}
        </div>
      )}
      {headerActions && <div className="ml-auto flex gap-2">{headerActions}</div>}
    </div>
  )
}

export default memo(
  PageHeader,
  ({ headline, headerActions }, { headline: nextHeadline, headerActions: nextHeaderActions }) => {
    if (headline !== nextHeadline) return false
    if (headerActions !== nextHeaderActions) return false
    return true
  }
)
