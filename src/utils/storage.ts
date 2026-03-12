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

const get = <T = any>(userId: string, key: string): T[] => {
  const value = localStorage.getItem(compoundKey(userId, key))
  return value ? JSON.parse(value) : []
}

const put = (userId: string, key: string, value: unknown): void => {
  localStorage.setItem(compoundKey(userId, key), JSON.stringify(value))
}

const getObject = <T = Record<string, any>>(
  userId: string,
  key: string,
  defaultValue: T = {} as T
): T => {
  const value = localStorage.getItem(compoundKey(userId, key))
  return value ? JSON.parse(value) : defaultValue
}

const remove = (userId: string, key: string): void => {
  localStorage.removeItem(compoundKey(userId, key))
}

const compoundKey = (userId: string, key: string): string => {
  return `${userId}_${key}`
}

export default {
  get,
  put,
  getObject,
  remove,
}
