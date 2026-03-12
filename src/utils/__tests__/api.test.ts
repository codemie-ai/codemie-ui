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

import { describe, it, expect } from 'vitest'

import api from '@/utils/api'
import toaster from '@/utils/toaster'

describe('handleError', () => {
  it('should correctly handle an error response', () => {
    const errorBody = {
      message: 'An error occurred',
      details: 'This is the error details',
      help: 'Here is some help',
    }

    api.handleError({ error: errorBody })

    expect(toaster.error).toHaveBeenCalledWith(
      'An error occurred<br> This is the error details<br><i>Here is some help</i>'
    )
  })

  it('does not include help text if includeHelp is false', () => {
    const errorBody = {
      message: 'An error occurred',
      details: 'This is the error details',
      help: 'Here is some help',
    }

    api.handleError({ error: errorBody }, false)

    expect(toaster.error).toHaveBeenCalledWith('An error occurred<br> This is the error details')
  })

  it('shows default error message if error handling fails', () => {
    api.handleError({} as any)

    expect(toaster.error).toHaveBeenCalledWith('Oops! Something went wrong')
  })
})
