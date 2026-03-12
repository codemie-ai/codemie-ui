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
import { DropdownPassThroughMethodOptions } from 'primereact/dropdown'

const preset: PrimeReactPTOptions['dropdown'] = {
  root: ({ props, state }: DropdownPassThroughMethodOptions) => ({
    className: [
      // Display and Position
      'inline-flex',
      'relative',

      // Shape
      'rounded-md',

      // Color and Background
      'bg-surface-elevated',
      'border',
      { 'border-border-primary': !props.invalid },

      // Invalid State
      { 'border-border-error dark:border-border-error': props.invalid },

      // Transitions
      'transition-all',
      'duration-200',

      // States
      { 'hover:border-border-secondary': !props.invalid },
      {
        'outline-none outline-offset-0 ring ring-border-subtle/50': state.focused,
      },

      // Misc
      'cursor-pointer',
      'select-none',
      {
        'opacity-60': props.disabled,
        'pointer-events-none': props.disabled,
        'cursor-default': props.disabled,
      },
    ],
  }),
  input: ({ props }: DropdownPassThroughMethodOptions) => ({
    className: [
      // Font
      'font-sans',
      'leading-none',

      // Display
      'block',
      'flex-auto',

      // Color and Background
      'bg-transparent',
      'border-0',

      // Sizing and Spacing
      'w-[1%]',
      'p-3',
      { 'pr-7': props.showClear },

      // Shape
      'rounded-none',

      // Transitions
      'transition',
      'duration-200',

      // States
      'focus:outline-none focus:shadow-none',

      // Misc
      'relative',
      'cursor-pointer',
      'overflow-hidden overflow-ellipsis',
      'whitespace-nowrap',
      'appearance-none',
    ],
  }),
  trigger: {
    className: [
      // Flexbox
      'flex items-center justify-center',
      'shrink-0',

      // Color and Background
      'bg-transparent',

      // Size
      'w-12',

      // Shape
      'rounded-tr-md',
      'rounded-br-md',
    ],
  },
  panel: {
    className: [
      // Position
      'absolute top-0 left-0',

      // Shape
      'border-0 dark:border',
      'rounded-md',
      'shadow-md',

      // Color
      'bg-surface-elevated0',
      'text-text-secondary',
      'border-border-primary',
    ],
  },
  wrapper: {
    className: [
      // Sizing
      'max-h-[200px]',

      // Misc
      'overflow-auto',
    ],
  },
  list: {
    className: 'py-3 list-none m-0',
  },
  item: ({ context }: DropdownPassThroughMethodOptions) => ({
    className: [
      // Font
      'font-normal',
      'leading-none',

      // Position
      'relative',

      // Shape
      'border-0',
      'rounded-none',

      // Spacing
      'm-0',
      'py-3 px-5',

      // Color
      {
        'text-text-primary': !context.focused && !context.selected && !context.disabled,
      },
      {
        'text-text-tertiary': !context.focused && !context.selected && context.disabled,
      },
      {
        'bg-surface-interactive-active text-text-primary': context.focused && !context.selected,
      },
      {
        'bg-surface-base-primary text-text-primary': context.focused && context.selected,
      },
      {
        'bg-surface-base-navigation text-text-primary': !context.focused && context.selected,
      },

      // States
      {
        'hover:bg-surface-interactive-hover': !context.focused && !context.selected,
      },
      {
        'hover:text-text-primary hover:bg-surface-interactive-hover':
          context.focused && !context.selected,
      },
      'focus-visible:outline-none focus-visible:outline-offset-0 focus-visible:ring focus-visible:ring-inset focus-visible:ring-border-subtle/50',

      // Transitions
      'transition-shadow',
      'duration-200',

      // Misc
      { 'pointer-events-none cursor-default': context.disabled },
      { 'cursor-pointer': !context.disabled },
      'overflow-hidden',
      'whitespace-nowrap',
    ],
  }),
  itemGroup: {
    className: [
      // Font
      'font-bold',

      // Spacing
      'm-0',
      'py-3 px-5',

      // Color
      'text-text-secondary',
      'bg-surface-elevated',

      // Misc
      'cursor-auto',
    ],
  },
  emptyMessage: {
    className: [
      // Font
      'leading-none AAAAAAAAAAAAAAAAAAAAAAAa',

      // Spacing
      'py-3 px-5',

      // Color
      'text-text-secondary',
      'bg-transparent',
    ],
  },
  header: {
    className: [
      // Spacing
      'py-3 px-5',
      'm-0',

      // Shape
      'border-b',
      'rounded-tl-md',
      'rounded-tr-md',

      // Color
      'text-text-primary',
      'bg-surface-interactive-hover',
      'border-border-primary',
    ],
  },
  filterContainer: {
    className: 'relative',
  },
  filterInput: {
    className: [
      // Font
      'font-sans',
      'leading-none',

      // Sizing
      'pr-7 py-3 px-3',
      '-mr-7',
      'w-full',

      // Color
      'text-text-primary',
      'bg-surface-elevated',
      'border-border-primary',

      // Shape
      'border',
      'rounded-lg',
      'appearance-none',

      // Transitions
      'transition',
      'duration-200',

      // States
      'hover:border-border-secondary',
      'focus:ring focus:outline-none focus:outline-offset-0',
      'focus:ring-border-subtle/50',

      // Misc
      'appearance-none',
    ],
  },
  filterIcon: {
    className: ['absolute', 'top-1/2 right-3', '-mt-2'],
  },
  clearIcon: {
    className: [
      // Position
      'absolute',
      'top-1/2',
      'right-12',

      // Spacing
      '-mt-2',
    ],
  },
}

export default preset
