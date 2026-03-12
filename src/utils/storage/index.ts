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
 * Utility functions for working with localStorage
 */

/**
 * Get an array from localStorage
 * @param userId - User ID to namespace the storage key
 * @param key - Storage key
 * @returns Array stored in localStorage or empty array if not found
 */
export const get = (userId: string, key: string): unknown[] => {
  const value = localStorage.getItem(compoundKey(userId, key))
  return value ? JSON.parse(value) : []
}

/**
 * Store a value in localStorage
 * @param userId - User ID to namespace the storage key
 * @param key - Storage key
 * @param value - Value to store
 */
export const put = (userId: string, key: string, value: unknown): void => {
  localStorage.setItem(compoundKey(userId, key), JSON.stringify(value))
}

/**
 * Get an object from localStorage
 * @param userId - User ID to namespace the storage key
 * @param key - Storage key
 * @param defaultValue - Default value to return if key not found
 * @returns Object stored in localStorage or defaultValue if not found
 */
export const getObject = <T>(userId: string, key: string, defaultValue: T = {} as T): T => {
  const value = localStorage.getItem(compoundKey(userId, key))
  return value ? JSON.parse(value) : defaultValue
}

/**
 * Remove a value from localStorage
 * @param userId - User ID to namespace the storage key
 * @param key - Storage key
 */
export const remove = (userId: string, key: string): void => {
  localStorage.removeItem(compoundKey(userId, key))
}

/**
 * Create a compound key for localStorage
 * @param userId - User ID to namespace the storage key
 * @param key - Storage key
 * @returns Compound key
 */
const compoundKey = (userId: string, key: string): string => {
  return `${userId}_${key}`
}

export default {
  get,
  put,
  getObject,
  remove,
}
