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

export interface SkillSelectOption {
  value: string
  label: string
  description?: string
}

export interface KnownSkill {
  id: string
  name: string
  description?: string
}

/**
 * Unions the loaded catalog options with a name-resolved entry for any selected id
 * missing from that catalog. Without this, PrimeReact renders an unmatched id's label
 * as the literal string "null".
 *
 * @param loadedOptions - Options from the scoped catalog call
 * @param selectedIds - Currently selected ids, including any missing from loadedOptions
 * @param knownSkills - Name/description source for a selected id outside loadedOptions
 * @returns loadedOptions plus one resolved entry per selected id missing from it, falling
 * back to the raw id as the label when knownSkills has no match either
 */
export const resolveSkillOptions = (
  loadedOptions: SkillSelectOption[],
  selectedIds: string[],
  knownSkills?: KnownSkill[]
): SkillSelectOption[] => {
  const hidden = selectedIds
    .filter((id) => !loadedOptions.some((option) => option.value === id))
    .map((id) => {
      const known = knownSkills?.find((skill) => skill.id === id)
      return { value: id, label: known?.name ?? id, description: known?.description }
    })

  return [...loadedOptions, ...hidden]
}
