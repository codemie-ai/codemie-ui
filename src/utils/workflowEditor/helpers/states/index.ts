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
 * State Helpers
 *
 * Utility functions for state type checking, reference updates, and selection management.
 */

export {
  isMetaState,
  isExecutionState,
  isDecisionState,
  isConnected,
  hasConditionLogic,
  hasSwitchLogic,
  hasMultipleNextStates,
  hasDecisionLogic,
  getDecisionNodeId,
  isIterator,
  isIteratorID,
  isIteratorParent,
  isNoteState,
} from './stateTypeCheckers'
export { updateStateNext } from './updateStateReferences'
export { clearSelection } from './manageSelection'
export { cleanupUnusedReferences } from './cleanupUnusedReferences'
export {
  getStateNext,
  findDirectParents,
  findParents,
  findDirectChildren,
  findChildren,
} from './stateRelations'
export { generateStateID, generateActorID, shouldReuseActorId } from './idGenerators'
export { translateStateToAbsolute } from './statePosition'
