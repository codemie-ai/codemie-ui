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

import { User } from '@/types/entity/user'
import { createdBy } from '@/utils/helpers'

export const isUserProjectAdmin = (
  user: User | null,
  project?: string,
  checkIfAdminOfAnyProject: boolean = false
): boolean => {
  if (!user) return false
  if (user.isAdmin) return true

  if (checkIfAdminOfAnyProject) {
    return (user.applicationsAdmin?.length ?? 0) > 0
  }

  if (!project) return false
  return user.applicationsAdmin?.includes(project) ?? false
}

/**
 * Detects if a string is a UUID
 */
export const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Prioritizes names for display (non-UUID, non-empty strings first)
 * Returns a priority number: lower is better
 */
export const prioritizeName = (name: string): number => {
  if (!name || name.trim() === '') return 3 // Empty strings last
  if (isUUID(name)) return 2 // UUIDs second to last
  return 1 // Regular names first
}

/**
 * Formats user options with smart name selection
 * Groups users by ID and creates labels with the best name first
 */
export const formatUserOptions = (users: any[]): Array<{ label: string; value: string }> => {
  // Group users by ID and merge names
  const userMap = new Map<string, string[]>()

  users.forEach((user: any) => {
    const { id } = user
    const name = createdBy(user)

    if (!userMap.has(id)) {
      userMap.set(id, [])
    }

    const names = userMap.get(id)!
    if (!names.includes(name)) {
      names.push(name)
    }
  })

  // Format options with smart name selection
  return Array.from(userMap.entries()).map(([id, allNames]) => {
    // Filter out empty strings if there are multiple names
    let names =
      allNames.length > 1 ? allNames.filter((name) => name && name.trim() !== '') : allNames

    // If all names were empty, keep at least one
    if (names.length === 0) {
      names = allNames
    }

    // Sort names by priority (non-UUID first, then non-empty, then rest)
    names.sort((a, b) => {
      const priorityA = prioritizeName(a)
      const priorityB = prioritizeName(b)
      return priorityA - priorityB
    })

    // Create label with the best name first, others in parentheses
    const label = names.length > 1 ? `${names[0]} (${names.slice(1).join(', ')})` : names[0]

    return {
      label,
      value: id,
    }
  })
}
