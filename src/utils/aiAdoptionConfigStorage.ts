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

import type { AiAdoptionConfig } from '@/types/analytics'

const STORAGE_KEY = 'codemie-ai-adoption-config'

/**
 * Load AI Adoption Framework configuration from browser localStorage
 * @returns Parsed config object or null if not found/invalid
 */
export const loadConfigFromStorage = (): AiAdoptionConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to load AI adoption config from storage:', error)
    return null
  }
}

/**
 * Save AI Adoption Framework configuration to browser localStorage
 * @param config - Configuration object to save
 * @throws Error if save fails
 */
export const saveConfigToStorage = (config: AiAdoptionConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save AI adoption config to storage:', error)
    throw error
  }
}

/**
 * Clear AI Adoption Framework configuration from browser localStorage
 */
export const clearConfigFromStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear AI adoption config from storage:', error)
  }
}

/**
 * Check if AI Adoption Framework configuration exists in localStorage
 * @returns true if config exists, false otherwise
 */
export const hasStoredConfig = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) !== null
}
