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

import { getMinimumIteratorSize, constrainIteratorResize } from '../constrainIteratorResize'

describe('constrainIteratorResize', () => {
  describe('getMinimumIteratorSize', () => {
    it('returns default size when iterator has no children', () => {
      const iterator: WorkflowNode = {
        id: 'iterator_1',
        type: 'iterator',
        position: { x: 0, y: 0 },
        data: {},
      }

      const result = getMinimumIteratorSize(iterator, [iterator])

      expect(result).toEqual({ width: 200, height: 150 })
    })

    it('calculates size based on single child with default dimensions', () => {
      const iterator: WorkflowNode = {
        id: 'iterator_1',
        type: 'iterator',
        position: { x: 0, y: 0 },
        data: {},
      }

      const child: WorkflowNode = {
        id: 'assistant_1',
        type: 'assistant',
        position: { x: 50, y: 50 },
        parentId: 'iterator_1',
        data: {},
      }

      // Default width: 350, height: 150
      // Child right: 50 + 350 = 400
      // Child bottom: 50 + 150 = 200
      // With padding 40: width: 440, height: 240
      const result = getMinimumIteratorSize(iterator, [iterator, child])

      expect(result).toEqual({ width: 440, height: 240 })
    })

    it('calculates size based on single child with explicit dimensions', () => {
      const iterator: WorkflowNode = {
        id: 'iterator_1',
        type: 'iterator',
        position: { x: 0, y: 0 },
        data: {},
      }

      const child: WorkflowNode = {
        id: 'assistant_1',
        type: 'assistant',
        position: { x: 50, y: 50 },
        width: 400,
        height: 300,
        parentId: 'iterator_1',
        data: {},
      }

      // Child right: 50 + 400 = 450
      // Child bottom: 50 + 300 = 350
      // With padding 40: width: 490, height: 390
      const result = getMinimumIteratorSize(iterator, [iterator, child])

      expect(result).toEqual({ width: 490, height: 390 })
    })

    it('calculates size based on multiple children', () => {
      const iterator: WorkflowNode = {
        id: 'iterator_1',
        type: 'iterator',
        position: { x: 0, y: 0 },
        data: {},
      }

      const child1: WorkflowNode = {
        id: 'assistant_1',
        type: 'assistant',
        position: { x: 50, y: 50 },
        width: 300,
        height: 200,
        parentId: 'iterator_1',
        data: {},
      }

      const child2: WorkflowNode = {
        id: 'assistant_2',
        type: 'assistant',
        position: { x: 400, y: 300 },
        width: 300,
        height: 200,
        parentId: 'iterator_1',
        data: {},
      }

      // Max right: 400 + 300 = 700
      // Max bottom: 300 + 200 = 500
      // With padding 40: width: 740, height: 540
      const result = getMinimumIteratorSize(iterator, [iterator, child1, child2])

      expect(result).toEqual({ width: 740, height: 540 })
    })

    it('ignores children of other iterators', () => {
      const iterator1: WorkflowNode = {
        id: 'iterator_1',
        type: 'iterator',
        position: { x: 0, y: 0 },
        data: {},
      }

      const iterator2: WorkflowNode = {
        id: 'iterator_2',
        type: 'iterator',
        position: { x: 500, y: 500 },
        data: {},
      }

      const child1: WorkflowNode = {
        id: 'assistant_1',
        type: 'assistant',
        position: { x: 50, y: 50 },
        width: 300,
        height: 200,
        parentId: 'iterator_1',
        data: {},
      }

      const child2: WorkflowNode = {
        id: 'assistant_2',
        type: 'assistant',
        position: { x: 550, y: 550 },
        width: 300,
        height: 200,
        parentId: 'iterator_2',
        data: {},
      }

      const result = getMinimumIteratorSize(iterator1, [iterator1, iterator2, child1, child2])

      // Should only consider child1
      expect(result).toEqual({ width: 390, height: 290 })
    })
  })

  describe('constrainIteratorResize', () => {
    describe('iterator with no children', () => {
      it('returns minimum size when requested size is smaller', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          data: {},
        }

        const result = constrainIteratorResize(iterator, 150, 100, [iterator])

        expect(result).toEqual({
          width: 200,
          height: 150,
          x: 100,
          y: 100,
          shiftX: 0,
          shiftY: 0,
          childrenIds: [],
        })
      })

      it('returns requested size when larger than minimum', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          data: {},
        }

        const result = constrainIteratorResize(iterator, 500, 400, [iterator])

        expect(result).toEqual({
          width: 500,
          height: 400,
          x: 100,
          y: 100,
          shiftX: 0,
          shiftY: 0,
          childrenIds: [],
        })
      })
    })

    describe('iterator with children inside padding', () => {
      it('does not shift when children are within padding boundaries', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          width: 600,
          height: 400,
          data: {},
        }

        const child: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 50, y: 50 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const result = constrainIteratorResize(iterator, 600, 400, [iterator, child])

        // Padding is 40
        // Child at (50, 50) is within padding (>= 40)
        // Max X: 50 + 300 = 350, Max Y: 50 + 200 = 250
        // Required: 350 + 40 = 390, 250 + 40 = 290
        expect(result).toEqual({
          width: 600,
          height: 400,
          x: 100,
          y: 100,
          shiftX: 0,
          shiftY: 0,
          childrenIds: ['assistant_1'],
        })
      })

      it('enforces minimum size based on children', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          width: 600,
          height: 400,
          data: {},
        }

        const child: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 50, y: 50 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        // Try to resize smaller than children
        const result = constrainIteratorResize(iterator, 200, 200, [iterator, child])

        // Required width: 350 + 40 = 390, height: 250 + 40 = 290
        expect(result.width).toBe(390)
        expect(result.height).toBe(290)
      })
    })

    describe('iterator with children outside padding (shift needed)', () => {
      it('shifts iterator left when child is too close to left edge', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          width: 600,
          height: 400,
          data: {},
        }

        const child: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 20, y: 50 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const result = constrainIteratorResize(iterator, 600, 400, [iterator, child])

        // Padding is 40, child at x=20 needs shift
        // shiftX: 40 - 20 = 20
        // New iterator X: 100 - 20 = 80
        // Child max X after shift: 320 + 20 = 340
        // Required width: 340 + 40 = 380
        expect(result.x).toBe(80)
        expect(result.y).toBe(100)
        expect(result.shiftX).toBe(20)
        expect(result.shiftY).toBe(0)
        expect(result.width).toBeGreaterThanOrEqual(380)
      })

      it('shifts iterator up when child is too close to top edge', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          width: 600,
          height: 400,
          data: {},
        }

        const child: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 50, y: 10 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const result = constrainIteratorResize(iterator, 600, 400, [iterator, child])

        // Padding is 40, child at y=10 needs shift
        // shiftY: 40 - 10 = 30
        // New iterator Y: 100 - 30 = 70
        expect(result.x).toBe(100)
        expect(result.y).toBe(70)
        expect(result.shiftX).toBe(0)
        expect(result.shiftY).toBe(30)
      })

      it('shifts iterator both left and up when needed', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          width: 600,
          height: 400,
          data: {},
        }

        const child: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 20, y: 10 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const result = constrainIteratorResize(iterator, 600, 400, [iterator, child])

        // shiftX: 40 - 20 = 20, shiftY: 40 - 10 = 30
        expect(result.x).toBe(80)
        expect(result.y).toBe(70)
        expect(result.shiftX).toBe(20)
        expect(result.shiftY).toBe(30)
      })
    })

    describe('iterator with multiple children', () => {
      it('calculates shift based on leftmost/topmost child', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          width: 800,
          height: 600,
          data: {},
        }

        const child1: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 20, y: 50 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const child2: WorkflowNode = {
          id: 'assistant_2',
          type: 'assistant',
          position: { x: 400, y: 10 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const result = constrainIteratorResize(iterator, 800, 600, [iterator, child1, child2])

        // Min X: 20 (child1), Min Y: 10 (child2)
        // shiftX: 40 - 20 = 20, shiftY: 40 - 10 = 30
        expect(result.shiftX).toBe(20)
        expect(result.shiftY).toBe(30)
        expect(result.x).toBe(80)
        expect(result.y).toBe(70)
      })

      it('calculates size based on rightmost/bottommost child after shift', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          width: 800,
          height: 600,
          data: {},
        }

        const child1: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 20, y: 50 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const child2: WorkflowNode = {
          id: 'assistant_2',
          type: 'assistant',
          position: { x: 400, y: 300 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const result = constrainIteratorResize(iterator, 500, 400, [iterator, child1, child2])

        // shiftX: 20, shiftY: 0
        // Max X: 700 + 20 = 720, Max Y: 500
        // Required: width: 760, height: 540
        expect(result.width).toBe(760)
        expect(result.height).toBe(540)
      })

      it('returns all children IDs', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          data: {},
        }

        const child1: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 50, y: 50 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const child2: WorkflowNode = {
          id: 'tool_1',
          type: 'tool',
          position: { x: 400, y: 50 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const result = constrainIteratorResize(iterator, 800, 400, [iterator, child1, child2])

        expect(result.childrenIds).toEqual(['assistant_1', 'tool_1'])
      })
    })

    describe('edge cases', () => {
      it('handles child at exactly padding boundary', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          data: {},
        }

        const child: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 40, y: 40 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const result = constrainIteratorResize(iterator, 500, 400, [iterator, child])

        // At exact padding boundary, no shift needed
        expect(result.shiftX).toBe(0)
        expect(result.shiftY).toBe(0)
        expect(result.x).toBe(100)
        expect(result.y).toBe(100)
      })

      it('handles child at origin (0, 0)', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          data: {},
        }

        const child: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 0, y: 0 },
          width: 300,
          height: 200,
          parentId: 'iterator_1',
          data: {},
        }

        const result = constrainIteratorResize(iterator, 500, 400, [iterator, child])

        // shiftX: 40 - 0 = 40, shiftY: 40 - 0 = 40
        expect(result.shiftX).toBe(40)
        expect(result.shiftY).toBe(40)
        expect(result.x).toBe(60)
        expect(result.y).toBe(60)
      })

      it('handles child with missing width/height (uses defaults)', () => {
        const iterator: WorkflowNode = {
          id: 'iterator_1',
          type: 'iterator',
          position: { x: 100, y: 100 },
          data: {},
        }

        const child: WorkflowNode = {
          id: 'assistant_1',
          type: 'assistant',
          position: { x: 50, y: 50 },
          parentId: 'iterator_1',
          data: {},
        }

        const result = constrainIteratorResize(iterator, 500, 400, [iterator, child])

        // Should use default dimensions (350x150)
        expect(result.childrenIds).toEqual(['assistant_1'])
        expect(result.width).toBeGreaterThan(0)
        expect(result.height).toBeGreaterThan(0)
      })
    })
  })
})
