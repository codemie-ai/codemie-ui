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

import { cn } from '@/utils/utils'

interface NodeFieldProps {
  value: string
  title?: string
  isError?: boolean
}

const NodeField = ({ value, title = '', isError = false }: NodeFieldProps) => {
  return (
    <div className="px-4">
      {title && <div className="text-text-primary text-sm mb-2"> {title} </div>}

      <div
        className={cn(
          'text-text-quaternary text-sm bg-surface-specific-card rounded-md px-2 py-1',
          {
            'border-1 border-failed-secondary/70': isError,
          }
        )}
      >
        {value}
      </div>
    </div>
  )
}

export default NodeField
