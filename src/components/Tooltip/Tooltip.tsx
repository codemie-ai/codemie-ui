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

import { Tooltip as PrimeTooltip, TooltipProps as PrimeTooltipProps } from 'primereact/tooltip'
import { forwardRef } from 'react'

interface TooltipProps extends PrimeTooltipProps {
  textStyles?: string
  delay?: number
}

const Tooltip = forwardRef<PrimeTooltip, TooltipProps>(
  ({ showDelay, appendTo = 'self', ...props }, ref) => {
    return (
      <PrimeTooltip
        ref={ref}
        appendTo={appendTo}
        updateDelay={500}
        showDelay={showDelay ?? 500}
        pt={{
          root: {
            className: 'shadow-md',
          },
          text: {
            className: `bg-surface-charts-tooltip-background text-white p-3 leading-none rounded-md [word-break:break-word] ${
              props.textStyles ?? ''
            }`,
          },
        }}
        {...props}
      />
    )
  }
)

export default Tooltip
