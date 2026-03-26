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

export interface FieldValidationError {
  field: string
  msg: string
}

export class ValidationError extends Error {
  fieldErrors: FieldValidationError[]

  constructor(fieldErrors: FieldValidationError[]) {
    super('Validation error')
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }

  static fromParsedError(parsedError: unknown): ValidationError | null {
    const details = (parsedError as Record<string, unknown>)?.details
    if (!Array.isArray(details) || details.length === 0) return null

    const fieldErrors = details
      .filter(
        (d: unknown) =>
          Array.isArray((d as Record<string, unknown>).loc) &&
          ((d as Record<string, unknown>).loc as unknown[]).length > 1
      )
      .map((d: unknown) => {
        const detail = d as Record<string, unknown>
        const loc = detail.loc as unknown[]
        return { field: loc[loc.length - 1] as string, msg: detail.msg as string }
      })

    if (fieldErrors.length === 0) return null
    return new ValidationError(fieldErrors)
  }
}
