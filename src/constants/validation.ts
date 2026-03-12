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

// Validation regex patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_NUMBER: /[0-9]/,
  PASSWORD_UPPERCASE: /[A-Z]/,
  PASSWORD_LOWERCASE: /[a-z]/,
  NAME_ALLOWED_CHARS: /^[a-zA-Z0-9\-[\].\s]+$/,
}

// Validation constraints
export const VALIDATION_CONSTRAINTS = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIREMENTS_TOTAL: 4,
}

// Validation error messages
export const VALIDATION_MESSAGES = {
  FOLDER_NAME_REQUIRED: 'Folder name is required',
  EMAIL_INVALID: 'Email is invalid',
  EMAIL_REQUIRED: 'Email is required',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_MIN_LENGTH: `Password must be at least ${VALIDATION_CONSTRAINTS.PASSWORD_MIN_LENGTH} characters`,
  PASSWORD_NUMBER: 'Password must contain at least one number',
  PASSWORD_UPPERCASE: 'Password must contain at least one uppercase letter',
  PASSWORD_LOWERCASE: 'Password must contain at least one lowercase letter',
  NAME_REQUIRED: 'Name is required',
  NAME_INVALID_CHARS:
    'Only English letters, digits and special characters ("-", "[", "]", ".", "\\s") are allowed',
}

// Password requirement labels for UI
export const PASSWORD_REQUIREMENT_LABELS = {
  NUMBER: 'Number',
  UPPERCASE: 'Uppercase letter',
  LOWERCASE: 'Lowercase letter',
  MIN_LENGTH: `Min. ${VALIDATION_CONSTRAINTS.PASSWORD_MIN_LENGTH} characters`,
}
