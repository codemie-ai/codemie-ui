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

import isEqual from 'lodash/isEqual'

/**
 * Compares initial and current data source form data to detect changes
 * @param initial - Initial form data
 * @param current - Current form data
 * @returns True if data has changed, false otherwise
 */
export const compareFormData = (initial: any, current: any) => {
  if (!initial || !current) return false

  const normalizedInitial = { ...initial }
  const normalizedCurrent = { ...current }

  if (!initial.embeddingsModel || initial.embeddingsModel === '') {
    normalizedInitial.embeddingsModel = normalizedCurrent.embeddingsModel
  }

  if (!initial.summarizationModel || initial.summarizationModel === '') {
    normalizedInitial.summarizationModel = normalizedCurrent.summarizationModel
  }

  if (!initial.projectName || initial.projectName === '') {
    normalizedInitial.projectName = normalizedCurrent.projectName
  }

  if (!initial.setting_id || initial.setting_id === '') {
    normalizedInitial.setting_id = normalizedCurrent.setting_id
  }

  delete normalizedInitial.indexMetadata
  delete normalizedCurrent.indexMetadata

  return !isEqual(normalizedInitial, normalizedCurrent)
}
