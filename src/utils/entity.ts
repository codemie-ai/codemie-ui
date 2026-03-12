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

import { ABILITIES, ABILITY_KEY } from '@/constants'

export interface Entity {
  [ABILITY_KEY]?: string[]
  [key: string | number]: any
}

export const mergeEntityWithUpdateData = <T extends Entity>(
  entity: T,
  updateData: Partial<T>
): T => {
  return {
    ...updateData,
    [ABILITY_KEY]: entity[ABILITY_KEY],
  } as T
}

export const canDelete = (entity: Entity): boolean => {
  return entity[ABILITY_KEY]?.includes(ABILITIES.DELETE) ?? false
}

export const canEdit = (entity: Entity): boolean => {
  return entity[ABILITY_KEY]?.includes(ABILITIES.WRITE) ?? false
}

export const canView = (entity: Entity): boolean => {
  return entity[ABILITY_KEY]?.includes(ABILITIES.READ) ?? false
}
