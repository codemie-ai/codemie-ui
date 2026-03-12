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

import { PrimeReactPTOptions } from 'primereact/api'
import { CheckboxPassThroughMethodOptions } from 'primereact/checkbox'

const preset: PrimeReactPTOptions['checkbox'] = {
  root: {
    className: [
      'relative',

      // Alignment
      'inline-flex',
      'align-bottom',

      // Size
      'w-6',
      'h-6',

      // Misc
      'cursor-pointer',
      'select-none',
    ],
  },
  box: ({ props, context }: CheckboxPassThroughMethodOptions) => ({
    className: [
      // Alignment
      'flex',
      'items-center',
      'justify-center',

      // Size
      'w-6',
      'h-6',

      // Shape
      'rounded-md',
      'border-2',

      // Colors
      {
        'border-border-primary bg-surface-elevated': !context.checked && !props.invalid,
        'border-surface-base-content bg-not-started-primary': context.checked,
      },

      // Invalid State
      { 'border-border-error dark:border-border-error': props.invalid },

      // States
      {
        'peer-hover:border-border-accent': !props.disabled && !context.checked && !props.invalid,
        'peer-hover:bg-border-accent peer-hover:border-border-accent':
          !props.disabled && context.checked,
        'peer-focus-visible:ring-2 peer-focus-visible:ring-border-subtle/20': !props.disabled,
        'cursor-default opacity-60': props.disabled,
      },

      // Transitions
      'transition-colors',
      'duration-200',
    ],
  }),
  input: {
    className: [
      'peer',

      // Size
      'w-full ',
      'h-full',

      // Position
      'absolute',
      'top-0 left-0',
      'z-10',

      // Spacing
      'p-0',
      'm-0',

      // Shape
      'opacity-0',
      'rounded-md',
      'outline-none',
      'border-2 border-border-primary',

      // Misc
      'appearance-none',
      'cursor-pointer',
    ],
  },
  icon: {
    className: [
      // Font
      'text-base leading-none',

      // Size
      'w-4',
      'h-4',

      // Colors
      'text-text-inverse',

      // Transitions
      'transition-all',
      'duration-200',
    ],
  },
}

export default preset
