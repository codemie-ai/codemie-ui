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
import { MultiSelectPassThroughMethodOptions } from 'primereact/multiselect'

const preset: PrimeReactPTOptions['multiselect'] = {
  root: ({ props, state }: MultiSelectPassThroughMethodOptions) => ({
    className: [
      // Display and Position
      'inline-flex',
      'relative',

      // Shape
      'rounded-[3px]',

      // Color and Background
      'bg-surface-elevated',
      'outline-none outline-offset-0',
      'border',
      { 'border border-border-primary': !props.invalid },

      // Invalid State
      { 'border-border-error dark:border-border-error': props.invalid },

      // Transitions
      'transition-all',
      'duration-50',

      // States
      { 'hover:border-border-secondary': !props.invalid },
      { 'outline-none outline-offset-0': state.focused },

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
  labelContainer: {
    className: 'overflow-hidden flex flex-auto cursor-pointer',
  },
  label: ({ props }: MultiSelectPassThroughMethodOptions) => ({
    className: [
      'leading-none',
      'block ',

      // Spacing
      {
        'px-3 py-2': props.display !== 'chip',
        'py-3 px-3': props.display === 'chip' && !props?.value?.length,
        'py-1.5 px-3': props.display === 'chip' && props?.value?.length > 0,
      },

      // Color
      {
        'text-text-secondary': props.value?.length,
        'text-text-quaternary': !props.value?.length,
      },
      'placeholder:text-text-secondary',

      // Transitions
      'transition duration-200',

      // Misc
      'overflow-hidden whitespace-nowrap cursor-pointer overflow-ellipsis',
    ],
  }),
  token: {
    className: [
      // Flex
      'inline-flex items-center',

      // Spacings
      'py-1.5 px-3 mr-2',

      // Shape
      'rounded-[1.14rem]',

      // Colors
      'bg-surface-interactive-active',
      'text-text-primary',

      // Misc
      'cursor-default',
    ],
  },
  removeTokenIcon: {
    className: [
      // Shape
      'rounded-md leading-6',

      // Spacing
      'ml-2',

      // Size
      'w-4 h-4',

      // Transition
      'transition duration-200 ease-in-out',

      // Misc
      'cursor-pointer',
    ],
  },
  trigger: {
    className: [
      // Flexbox
      'flex items-center justify-center',
      'shrink-0',

      // Color and Background
      'bg-transparent',
      'text-text-quaternary',

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
      '',
    ],
  },
  header: {
    className: [
      'flex items-center justify-between',
      // Spacing
      'px-2 py-3',
      'm-0',

      // Shape
      'border-b rounded-0 border-border-primary',
      'rounded-[3px] border border-border-primary',

      // Color
      'text-text-primary',
    ],
  },
  headerCheckboxContainer: {
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
  headerCheckbox: {
    root: {
      className: [
        'relative',

        // Alignment
        'inline-flex',
        'align-bottom',

        // Size
        'w-6',
        'h-6',

        // Spacing
        'mr-2',

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
        'rounded-[3px]',
        'border-2',

        // Colors
        {
          'border-border-primary bg-surface-elevated': !context.checked,
          'border-not-started-primary bg-not-started-primary': context.checked,
        },

        // States
        {
          'peer-hover:border-not-started-primary ': !props.disabled && !context.checked,
          'peer-hover:bg-not-started-secondary   ': !props.disabled && context.checked,
          'peer-focus-visible:border-not-started-primary  peer-focus-visible:ring-2 peer-focus-visible:ring-border-subtle/20':
            !props.disabled,
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
  },
  closeButton: {
    className: [
      'relative',

      // Flexbox and Alignment
      'flex items-center justify-center',

      // Size and Spacing
      'mr-2',
      'last:mr-0',
      'w-8 h-8',

      // Shape
      'border-0',
      'rounded-full',

      // Colors
      'text-text-quaternary',
      'bg-transparent',

      // Transitions
      'transition duration-200 ease-in-out',

      // States
      'hover:text-text-primary',
      'hover:bg-surface-interactive-hover',
      'focus:outline-none focus:outline-offset-0 focus:ring focus:ring-inset',
      'focus:ring-border-subtle/50',

      // Misc
      'overflow-hidden',
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
  item: ({ context }: MultiSelectPassThroughMethodOptions) => ({
    className: [
      // Font
      'font-normal',
      'leading-none',

      // Flexbox
      'flex items-center',

      // Position
      'relative',

      // Shape
      'border-0',
      'rounded-none',

      // Spacing
      'm-0',
      'py-3 px-2',

      // Color
      { 'text-text-primary': !context.focused && !context.selected },
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
        'hover:bg-surface-base-primary': !context.focused && context.selected,
      },
      {
        'hover:text-text-primary hover:bg-surface-interactive-hover':
          context.focused && !context.selected,
      },

      // Transitions
      'transition-shadow',
      'duration-200',

      // Misc
      'cursor-pointer',
      'overflow-hidden',
      'whitespace-nowrap',
      'truncate',
      '[&>span]:!block',
      '[&>span]:truncate',
    ],
  }),
  itemGroup: {
    className: [
      // Font
      'font-bold',

      // Spacing
      'm-0',
      'p-3 px-5',

      // Color
      'text-text-secondary',
      'bg-surface-elevated',

      // Misc
      'cursor-auto',
    ],
  },
  filterContainer: {
    className: 'relative w-full mx-2',
  },
  filterInput: {
    root: {
      className: [
        // Font
        'font-sans',
        'leading-none',

        // Sizing
        'pr-7 py-3 px-3',
        '-mr-7',
        'w-full',

        // Shape
        'rounded-[3px]',
        'appearance-none',

        // Transitions
        'transition',
        'duration-50',

        // States

        'border border-border-primary',
        'focus:border-border-subtle border-3',
        'outline-none outline-offset-0',

        // Misc
        'appearance-none',
      ],
    },
  },
  filterIcon: {
    className: ['absolute', 'top-1/2 right-3', '-mt-2'],
  },
  clearIcon: {
    className: [
      // Color
      'text-text-quaternary',

      // Position
      'absolute',
      'top-1/2',
      'right-12',

      // Spacing
      '-mt-2',
    ],
  },
  emptyMessage: {
    className: [
      // Font
      'leading-none',

      // Spacing
      'py-3 px-5',

      // Color
      'text-text-secondary',
      'bg-transparent',
    ],
  },
  checkbox: {
    root: {
      className: 'hidden',
    },
  },
}
export default preset
