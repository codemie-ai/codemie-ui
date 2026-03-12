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
 * Check if application is running in enterprise edition mode
 *
 * @returns {boolean} true if enterprise edition, false if community edition
 *
 * @example
 * ```ts
 * import { isEnterpriseEdition } from '@/utils/enterpriseEdition'
 *
 * if (isEnterpriseEdition()) {
 *   // Show enterprise features
 * }
 * ```
 */
export const isEnterpriseEdition = (): boolean => {
  const envValue = import.meta.env.VITE_IS_ENTERPRISE_EDITION ?? 'false'
  return envValue === 'true'
}
