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

import { VALIDATION_PATTERNS, VALIDATION_CONSTRAINTS } from '@/constants/validation'
import { PasswordValidationResult } from '@/types/auth'

/**
 * Validates password against all requirements
 * @param password - Password string to validate
 * @returns Validation result with individual checks and met count
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const isEmpty = !password || password.length === 0

  // If empty, show all as not met (neutral state)
  if (isEmpty) {
    return {
      hasNumber: false,
      hasUppercase: false,
      hasLowercase: false,
      hasMinLength: false,
      metCount: 0,
      total: VALIDATION_CONSTRAINTS.PASSWORD_REQUIREMENTS_TOTAL,
    }
  }

  // Validate password against all requirements
  const hasNumber = VALIDATION_PATTERNS.PASSWORD_NUMBER.test(password)
  const hasUppercase = VALIDATION_PATTERNS.PASSWORD_UPPERCASE.test(password)
  const hasLowercase = VALIDATION_PATTERNS.PASSWORD_LOWERCASE.test(password)
  const hasMinLength = password.length >= VALIDATION_CONSTRAINTS.PASSWORD_MIN_LENGTH

  const metCount = [hasNumber, hasUppercase, hasLowercase, hasMinLength].filter(Boolean).length

  return {
    hasNumber,
    hasUppercase,
    hasLowercase,
    hasMinLength,
    metCount,
    total: VALIDATION_CONSTRAINTS.PASSWORD_REQUIREMENTS_TOTAL,
  }
}
