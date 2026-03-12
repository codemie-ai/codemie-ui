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

import { SplitButtonPassThroughOptions } from 'primereact/splitbutton'

import { cn } from '@/utils/utils'

const makePtDropdownButton = (size: 'medium' | 'large', disabled: boolean, className?: string) =>
  ({
    root: {
      className: cn(
        'flex items-center justify-center font-medium transition-colors whitespace-nowrap rounded-lg border button',
        'bg-button-primary-bg text-text-accent border border-border-tertiary hover:to-surface-elevated border-solid hover:bg-button-primary-bg-hover',
        {
          'py-0.5 px-2 gap-1.5 items-center text-xs font-semibold leading-6 tracking-tight h-7':
            size === 'medium',
          'py-1.5 px-4 gap-2.5 items-center text-sm font-semibold leading-7 tracking-tight h-11':
            size === 'large',
          'cursor-not-allowed opacity-50': disabled,
        },
        className
      ),
    },
    label: {
      className: 'flex items-center gap-2',
    },
    button: {
      root: {
        className: 'gap-1.5',
      },
    },
  } as SplitButtonPassThroughOptions)

export default makePtDropdownButton
