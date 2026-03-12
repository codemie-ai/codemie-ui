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

import { describe, it, expect } from 'vitest'

import { WorkflowNode } from '@/types/workflowEditor/base'

import { isIteratorNode } from '../nodeTypeCheckers'

describe('nodeTypeCheckers', () => {
  describe('isIteratorNode', () => {
    it('returns true for node with iterator_ prefix', () => {
      const node: WorkflowNode = {
        id: 'iterator_1',
        type: 'iterator',
        position: { x: 0, y: 0 },
        data: {},
      }

      expect(isIteratorNode(node)).toBe(true)
    })

    it('returns false for non-iterator node', () => {
      const node: WorkflowNode = {
        id: 'assistant_1',
        type: 'assistant',
        position: { x: 0, y: 0 },
        data: {},
      }

      expect(isIteratorNode(node)).toBe(false)
    })
  })
})
