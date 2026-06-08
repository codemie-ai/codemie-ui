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

import toaster from '@/utils/toaster'

export class HttpError extends Error {
  constructor(public readonly response: Response) {
    super(`HTTP error ${response.status}`)
    this.name = 'HttpError'
  }
}

export const handleMultipartError = async (err: unknown, fallbackMessage: string) => {
  if (!(err instanceof HttpError)) {
    toaster.error(fallbackMessage)
    return { error: fallbackMessage }
  }
  const data = await err.response.json()
  if (Array.isArray(data.detail)) {
    data.detail.forEach((d: any) => toaster.error(d.msg))
  } else if (data.detail) {
    toaster.error(data.detail)
  }
  return { error: data.detail }
}
