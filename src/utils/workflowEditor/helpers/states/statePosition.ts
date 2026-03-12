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

/**
 * State Position Utilities
 *
 * Utilities for transforming state positions
 */

import { StateConfiguration } from '@/types/workflowEditor/configuration'

/**
 * Translates a state's position from relative (to iterator) to absolute (to canvas)
 */
export const translateStateToAbsolute = (
  state: StateConfiguration,
  iteratorState: StateConfiguration
): StateConfiguration => {
  if (!state._meta?.position || !iteratorState._meta?.position) {
    return state
  }

  return {
    ...state,
    _meta: {
      ...state._meta,
      position: {
        x: state._meta.position.x + iteratorState._meta.position.x,
        y: state._meta.position.y + iteratorState._meta.position.y,
      },
    },
  }
}
