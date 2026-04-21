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
 * @deprecated This hook is no longer needed. Use inline execute functions in CodeExecution steps instead.
 *
 * Previously used for registering actions by string name in a global registry.
 * Now, CodeExecution steps accept inline functions directly.
 *
 * Example:
 * ```typescript
 * {
 *   actionType: 'CodeExecution',
 *   execute: () => {
 *     appInfoStore.toggleNavigationExpanded()
 *   }
 * }
 * ```
 */
export const useOnboardingActions = () => {
  // No-op stub for backward compatibility
  return {
    registerAction: () => {},
    unregisterAction: () => {},
  }
}
