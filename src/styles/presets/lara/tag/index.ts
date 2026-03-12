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
import { TagPassThroughMethodOptions } from 'primereact/tag'

const preset: PrimeReactPTOptions['tag'] = {
  root: ({ props }: TagPassThroughMethodOptions) => ({
    className: [
      // Font
      'text-xs font-bold',

      // Alignments
      'inline-flex items-center justify-center',

      // Spacing
      'px-2 py-1',

      // Shape
      {
        'rounded-md': !props.rounded,
        'rounded-full': props.rounded,
      },

      // Colors
      'text-text-inverse',
      {
        'bg-not-started-primary': props.severity == null,
        'bg-success-primary': props.severity === 'success',
        'bg-in-progress-primary': props.severity === 'info',
        'bg-aborted-primary': props.severity === 'warning',
        'bg-failed-primary': props.severity === 'danger',
      },
    ],
  }),
  value: {
    className: 'leading-normal',
  },
  icon: {
    className: 'mr-1 text-sm',
  },
}

export default preset
