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

import { FC, useMemo } from 'react'

type Props = {
  filesCount: number
  errors: Array<{ message: string } | undefined>
  showErrors: boolean
}

export const FileDropzoneErrors: FC<Props> = ({ errors, showErrors, filesCount }) => {
  const errorsMessages = useMemo(
    () =>
      Array.from(
        new Set(
          (errors ?? [])
            .filter((e): e is { message: string } => !!e?.message && (showErrors || filesCount > 0))
            .map((e) => e.message)
        )
      ),
    [errors, filesCount, showErrors]
  )

  return (
    <>
      {errorsMessages.map((errorMessage) => (
        <div className="text-text-error text-sm" key={errorMessage} role="alert">
          {errorMessage}
        </div>
      ))}
    </>
  )
}
