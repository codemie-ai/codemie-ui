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
import { AutoCompletePassThroughMethodOptions } from 'primereact/autocomplete'
import { InputTextPassThroughMethodOptions } from 'primereact/inputtext'

const preset: PrimeReactPTOptions['autocomplete'] = {
  root: ({ props }: AutoCompletePassThroughMethodOptions) => ({
    className: [
      'h-full rounded-lg transition',

      // Color and Background
      'bg-surface-base-content',
      'border border-border-primary',
      'focus-within:border-border-secondary',
      'hover:border-border-secondary',

      // Invalid State
      { 'border !border-failed-secondary': props.invalid },

      // Misc
      'cursor-select',
      { 'opacity-60': props.disabled },
    ],
  }),
  container: { className: 'w-full' },
  input: {
    root: ({ props }: InputTextPassThroughMethodOptions) => ({
      className: [
        'w-full pl-3 pr-8 py-1.5 bg-transparent text-sm text-text-primary focus:outline-none placeholder:text-text-specific-input-placeholder',
        { 'pointer-events-none': props.disabled },
      ],
    }),
  },
  panel: {
    className:
      'mt-2 py-2 px-0.5 max-w-[400px] shadow-md bg-surface-base-secondary border rounded-lg border border-border-specific-panel-outline flex flex-col-reverse',
  },
  item: ({ context }: AutoCompletePassThroughMethodOptions) => ({
    className: [
      'text-sm rounded-lg py-1.5 pl-2.5 mx-2 text-text-primary cursor-pointer hover:bg-surface-specific-dropdown-hover hover:text-text-accent transition',
      'overflow-hidden whitespace-nowrap truncate',
      // `surface-base-navigation` (the token this used before) is scoped to nav bar
      // / selected nav items and resolves to pure black (`0 0 0`) in dark theme.
      // AutoComplete's item context never carries a `focused` flag (unlike Dropdown
      // and MultiSelect, which mask this token behind a `focused && selected` case),
      // so it was the only style ever shown for the selected item — rendering as a
      // solid black row on every open (EPMCDME-14856). `surface-specific-dropdown-focused`
      // is the token EPMCDME-8547 introduced for exactly this dropdown-item contrast
      // case in the sibling Dropdown/MultiSelect presets (~3:1+ against the panel
      // background in both themes) — `surface-interactive-active` (#1A1A1A dark)
      // was tried first but is itself only ~1.09:1 against the panel (#212224),
      // effectively invisible.
      { 'bg-surface-specific-dropdown-focused text-text-primary': context.selected },
    ],
  }),
  list: { className: 'show-scroll max-h-[200px] overflow-auto' },
  emptyMessage: { className: 'py-1.5 leading-none text-sm text-center text-text-quaternary' },
  loadingIcon: { className: 'text-text-quaternary right-3 top-1/2 -mt-2' },
  dropdownButton: {
    root: {
      className: 'w-8 absolute h-full right-0 text-text-quaternary',
      tabIndex: -1,
    },
  },
}

export default preset
