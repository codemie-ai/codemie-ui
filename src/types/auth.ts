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

// Base auth form data
export interface BaseAuthFormData {
  email: string
  password: string
}

// Sign in specific data
export interface SignInFormData extends BaseAuthFormData {}

// Sign up specific data
export interface SignUpFormData extends BaseAuthFormData {
  name: string
}

// Password validation result
export interface PasswordValidationResult {
  hasNumber: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasMinLength: boolean
  metCount: number
  total: number
}
