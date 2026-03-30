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

/* eslint-disable prefer-regex-literals */
/* eslint-disable no-new-wrappers */

import { describe, it, expect } from 'vitest'

import { getValueAtPath, hasPathChanged, isPrimitive } from '../pathUtils'

describe('isPrimitive', () => {
  describe('returns true for primitive types', () => {
    it('returns true for strings', () => {
      expect(isPrimitive('')).toBe(true)
      expect(isPrimitive('hello')).toBe(true)
      expect(isPrimitive('123')).toBe(true)
    })

    it('returns true for numbers', () => {
      expect(isPrimitive(0)).toBe(true)
      expect(isPrimitive(42)).toBe(true)
      expect(isPrimitive(-10)).toBe(true)
      expect(isPrimitive(3.14)).toBe(true)
      expect(isPrimitive(NaN)).toBe(true)
      expect(isPrimitive(Infinity)).toBe(true)
      expect(isPrimitive(-Infinity)).toBe(true)
    })

    it('returns true for booleans', () => {
      expect(isPrimitive(true)).toBe(true)
      expect(isPrimitive(false)).toBe(true)
    })

    it('returns true for undefined', () => {
      expect(isPrimitive(undefined)).toBe(true)
    })

    it('returns true for null', () => {
      expect(isPrimitive(null)).toBe(true)
    })

    it('returns true for bigint', () => {
      expect(isPrimitive(BigInt(123))).toBe(true)
      expect(isPrimitive(123n)).toBe(true)
    })

    it('returns true for symbols', () => {
      expect(isPrimitive(Symbol('test'))).toBe(true)
      expect(isPrimitive(Symbol.for('test'))).toBe(true)
    })
  })

  describe('returns false for non-primitive types', () => {
    it('returns false for objects', () => {
      expect(isPrimitive({})).toBe(false)
      expect(isPrimitive({ key: 'value' })).toBe(false)
      expect(isPrimitive({ nested: { object: true } })).toBe(false)
    })

    it('returns false for arrays', () => {
      expect(isPrimitive([])).toBe(false)
      expect(isPrimitive([1, 2, 3])).toBe(false)
      expect(isPrimitive(['a', 'b', 'c'])).toBe(false)
    })

    it('returns false for functions', () => {
      expect(isPrimitive(() => {})).toBe(false)
      expect(isPrimitive(function () {})).toBe(false)
      expect(isPrimitive(async () => {})).toBe(false)
      // eslint-disable-next-line no-empty-function
      expect(isPrimitive(function* () {})).toBe(false)
    })

    it('returns false for class instances', () => {
      class TestClass {}
      expect(isPrimitive(new TestClass())).toBe(false)
    })

    it('returns false for dates', () => {
      expect(isPrimitive(new Date())).toBe(false)
    })

    it('returns false for regex', () => {
      expect(isPrimitive(/test/)).toBe(false)
      expect(isPrimitive(new RegExp('test'))).toBe(false)
    })

    it('returns false for Maps and Sets', () => {
      expect(isPrimitive(new Map())).toBe(false)
      expect(isPrimitive(new Set())).toBe(false)
      expect(isPrimitive(new WeakMap())).toBe(false)
      expect(isPrimitive(new WeakSet())).toBe(false)
    })

    it('returns false for Error objects', () => {
      expect(isPrimitive(new Error('test'))).toBe(false)
      expect(isPrimitive(new TypeError('test'))).toBe(false)
    })

    it('returns false for Promise', () => {
      expect(isPrimitive(Promise.resolve())).toBe(false)
    })

    it('returns false for wrapped primitives', () => {
      expect(isPrimitive(new String('test'))).toBe(false)
      expect(isPrimitive(new Number(42))).toBe(false)
      expect(isPrimitive(new Boolean(true))).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('returns false for Object.create(null)', () => {
      expect(isPrimitive(Object.create(null))).toBe(false)
    })

    it('returns false for Buffer (if in Node environment)', () => {
      if (typeof Buffer !== 'undefined') {
        expect(isPrimitive(Buffer.from('test'))).toBe(false)
      }
    })

    it('returns false for ArrayBuffer', () => {
      expect(isPrimitive(new ArrayBuffer(8))).toBe(false)
    })

    it('returns false for typed arrays', () => {
      expect(isPrimitive(new Uint8Array(8))).toBe(false)
      expect(isPrimitive(new Int32Array(8))).toBe(false)
    })
  })
})

describe('getValueAtPath', () => {
  describe('simple property access', () => {
    it('returns value for top-level property', () => {
      const obj = { name: 'test', age: 30 }
      expect(getValueAtPath(obj, 'name')).toBe('test')
      expect(getValueAtPath(obj, 'age')).toBe(30)
    })

    it('returns undefined for non-existent property', () => {
      const obj = { name: 'test' }
      expect(getValueAtPath(obj, 'missing')).toBeUndefined()
    })

    it('returns value for nested property with dot notation', () => {
      const obj = { user: { profile: { name: 'John' } } }
      expect(getValueAtPath(obj, 'user.profile.name')).toBe('John')
    })

    it('returns nested object when path stops at parent', () => {
      const obj = { user: { profile: { name: 'John' } } }
      expect(getValueAtPath(obj, 'user.profile')).toEqual({ name: 'John' })
    })
  })

  describe('array access', () => {
    it('returns value using array bracket notation', () => {
      const obj = { items: ['a', 'b', 'c'] }
      expect(getValueAtPath(obj, 'items[0]')).toBe('a')
      expect(getValueAtPath(obj, 'items[1]')).toBe('b')
      expect(getValueAtPath(obj, 'items[2]')).toBe('c')
    })

    it('returns undefined for out-of-bounds array index', () => {
      const obj = { items: ['a', 'b'] }
      expect(getValueAtPath(obj, 'items[5]')).toBeUndefined()
    })

    it('returns value from nested array access', () => {
      const obj = { data: [{ id: 1 }, { id: 2 }] }
      expect(getValueAtPath(obj, 'data[0].id')).toBe(1)
      expect(getValueAtPath(obj, 'data[1].id')).toBe(2)
    })

    it('returns value from deeply nested arrays', () => {
      const obj = {
        matrix: [
          [1, 2],
          [3, 4],
        ],
      }
      expect(getValueAtPath(obj, 'matrix[0][0]')).toBe(1)
      expect(getValueAtPath(obj, 'matrix[0][1]')).toBe(2)
      expect(getValueAtPath(obj, 'matrix[1][0]')).toBe(3)
      expect(getValueAtPath(obj, 'matrix[1][1]')).toBe(4)
    })
  })

  describe('complex paths', () => {
    it('handles mixed dot notation and array indices', () => {
      const obj = {
        users: [
          { name: 'Alice', tags: ['admin', 'user'] },
          { name: 'Bob', tags: ['user'] },
        ],
      }
      expect(getValueAtPath(obj, 'users[0].name')).toBe('Alice')
      expect(getValueAtPath(obj, 'users[0].tags[0]')).toBe('admin')
      expect(getValueAtPath(obj, 'users[1].tags[0]')).toBe('user')
    })

    it('handles deeply nested object paths', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      }
      expect(getValueAtPath(obj, 'level1.level2.level3.level4.value')).toBe('deep')
    })
  })

  describe('edge cases', () => {
    it('returns undefined when path encounters null', () => {
      const obj = { user: null }
      expect(getValueAtPath(obj, 'user.name')).toBeUndefined()
    })

    it('returns undefined when path encounters undefined', () => {
      const obj = { user: undefined }
      expect(getValueAtPath(obj, 'user.name')).toBeUndefined()
    })

    it('returns null if that is the actual value', () => {
      const obj = { value: null }
      expect(getValueAtPath(obj, 'value')).toBeNull()
    })

    it('returns undefined if that is the actual value', () => {
      const obj = { value: undefined }
      expect(getValueAtPath(obj, 'value')).toBeUndefined()
    })

    it('returns 0 for numeric zero value', () => {
      const obj = { count: 0 }
      expect(getValueAtPath(obj, 'count')).toBe(0)
    })

    it('returns empty string for empty string value', () => {
      const obj = { text: '' }
      expect(getValueAtPath(obj, 'text')).toBe('')
    })

    it('returns false for boolean false value', () => {
      const obj = { flag: false }
      expect(getValueAtPath(obj, 'flag')).toBe(false)
    })

    it('handles empty path', () => {
      const obj = { name: 'test' }
      expect(getValueAtPath(obj, '')).toEqual(obj)
    })

    it('handles path with consecutive dots', () => {
      const obj = { a: { b: 'value' } }
      // Consecutive dots are filtered out, so 'a..b' becomes 'a.b'
      expect(getValueAtPath(obj, 'a..b')).toBe('value')
    })
  })
})

describe('hasPathChanged', () => {
  describe('primitive value changes', () => {
    it('returns true when string value changes', () => {
      const oldObj = { name: 'Alice' }
      const newObj = { name: 'Bob' }
      expect(hasPathChanged(newObj, oldObj, 'name')).toBe(true)
    })

    it('returns true when number value changes', () => {
      const oldObj = { count: 5 }
      const newObj = { count: 10 }
      expect(hasPathChanged(newObj, oldObj, 'count')).toBe(true)
    })

    it('returns true when boolean value changes', () => {
      const oldObj = { active: true }
      const newObj = { active: false }
      expect(hasPathChanged(newObj, oldObj, 'active')).toBe(true)
    })

    it('returns false when value stays the same', () => {
      const oldObj = { name: 'Alice', count: 5 }
      const newObj = { name: 'Alice', count: 5 }
      expect(hasPathChanged(newObj, oldObj, 'name')).toBe(false)
      expect(hasPathChanged(newObj, oldObj, 'count')).toBe(false)
    })
  })

  describe('nested property changes', () => {
    it('returns true when nested property changes', () => {
      const oldObj = { user: { name: 'Alice' } }
      const newObj = { user: { name: 'Bob' } }
      expect(hasPathChanged(newObj, oldObj, 'user.name')).toBe(true)
    })

    it('returns false when nested property stays the same', () => {
      const oldObj = { user: { name: 'Alice' } }
      const newObj = { user: { name: 'Alice' } }
      expect(hasPathChanged(newObj, oldObj, 'user.name')).toBe(false)
    })

    it('returns true when deeply nested property changes', () => {
      const oldObj = { a: { b: { c: { d: 'old' } } } }
      const newObj = { a: { b: { c: { d: 'new' } } } }
      expect(hasPathChanged(newObj, oldObj, 'a.b.c.d')).toBe(true)
    })
  })

  describe('array changes', () => {
    it('returns true when array element changes', () => {
      const oldObj = { items: ['a', 'b', 'c'] }
      const newObj = { items: ['a', 'x', 'c'] }
      expect(hasPathChanged(newObj, oldObj, 'items[1]')).toBe(true)
    })

    it('returns false when array element stays the same', () => {
      const oldObj = { items: ['a', 'b', 'c'] }
      const newObj = { items: ['a', 'b', 'c'] }
      expect(hasPathChanged(newObj, oldObj, 'items[1]')).toBe(false)
    })

    it('returns true when nested array property changes', () => {
      const oldObj = { users: [{ name: 'Alice' }] }
      const newObj = { users: [{ name: 'Bob' }] }
      expect(hasPathChanged(newObj, oldObj, 'users[0].name')).toBe(true)
    })

    it('returns true when entire array changes', () => {
      const oldObj = { items: ['a', 'b'] }
      const newObj = { items: ['x', 'y', 'z'] }
      expect(hasPathChanged(newObj, oldObj, 'items')).toBe(true)
    })

    it('returns false when array reference differs but content is same', () => {
      const oldObj = { items: ['a', 'b'] }
      const newObj = { items: ['a', 'b'] }
      expect(hasPathChanged(newObj, oldObj, 'items')).toBe(false)
    })
  })

  describe('object changes', () => {
    it('returns true when object property is added', () => {
      const oldObj = { config: { a: 1 } }
      const newObj = { config: { a: 1, b: 2 } }
      expect(hasPathChanged(newObj, oldObj, 'config')).toBe(true)
    })

    it('returns true when object property is removed', () => {
      const oldObj = { config: { a: 1, b: 2 } }
      const newObj = { config: { a: 1 } }
      expect(hasPathChanged(newObj, oldObj, 'config')).toBe(true)
    })

    it('returns false when object reference differs but content is same', () => {
      const oldObj = { config: { a: 1, b: 2 } }
      const newObj = { config: { a: 1, b: 2 } }
      expect(hasPathChanged(newObj, oldObj, 'config')).toBe(false)
    })

    it('returns false when nested objects have same deep structure', () => {
      const oldObj = { data: { nested: { value: 'test', count: 5 } } }
      const newObj = { data: { nested: { value: 'test', count: 5 } } }
      expect(hasPathChanged(newObj, oldObj, 'data.nested')).toBe(false)
    })
  })

  describe('null and undefined changes', () => {
    it('returns true when value changes from defined to null', () => {
      const oldObj = { value: 'test' }
      const newObj = { value: null }
      expect(hasPathChanged(newObj, oldObj, 'value')).toBe(true)
    })

    it('returns true when value changes from null to defined', () => {
      const oldObj = { value: null }
      const newObj = { value: 'test' }
      expect(hasPathChanged(newObj, oldObj, 'value')).toBe(true)
    })

    it('returns true when value changes from defined to undefined', () => {
      const oldObj = { value: 'test' }
      const newObj = {}
      expect(hasPathChanged(newObj, oldObj, 'value')).toBe(true)
    })

    it('returns true when value changes from undefined to defined', () => {
      const oldObj = {}
      const newObj = { value: 'test' }
      expect(hasPathChanged(newObj, oldObj, 'value')).toBe(true)
    })

    it('returns false when both values are null', () => {
      const oldObj = { value: null }
      const newObj = { value: null }
      expect(hasPathChanged(newObj, oldObj, 'value')).toBe(false)
    })

    it('returns false when both values are undefined', () => {
      const oldObj = {}
      const newObj = {}
      expect(hasPathChanged(newObj, oldObj, 'value')).toBe(false)
    })
  })

  describe('special value changes', () => {
    it('returns false when both values are 0', () => {
      const oldObj = { count: 0 }
      const newObj = { count: 0 }
      expect(hasPathChanged(newObj, oldObj, 'count')).toBe(false)
    })

    it('returns false when both values are empty string', () => {
      const oldObj = { text: '' }
      const newObj = { text: '' }
      expect(hasPathChanged(newObj, oldObj, 'text')).toBe(false)
    })

    it('returns false when both values are false', () => {
      const oldObj = { flag: false }
      const newObj = { flag: false }
      expect(hasPathChanged(newObj, oldObj, 'flag')).toBe(false)
    })

    it('returns true when value changes from 0 to empty string', () => {
      const oldObj = { value: 0 }
      const newObj = { value: '' }
      expect(hasPathChanged(newObj, oldObj, 'value')).toBe(true)
    })

    it('returns true when value changes from false to 0', () => {
      const oldObj = { value: false }
      const newObj = { value: 0 }
      expect(hasPathChanged(newObj, oldObj, 'value')).toBe(true)
    })
  })

  describe('complex workflow editor scenarios', () => {
    it('detects changes in task configuration', () => {
      const oldConfig = { task: { config: { timeout: 30 } } }
      const newConfig = { task: { config: { timeout: 60 } } }
      expect(hasPathChanged(newConfig, oldConfig, 'task.config.timeout')).toBe(true)
    })

    it('detects no change when task config stays same', () => {
      const oldConfig = { task: { config: { timeout: 30 } } }
      const newConfig = { task: { config: { timeout: 30 } } }
      expect(hasPathChanged(newConfig, oldConfig, 'task.config.timeout')).toBe(false)
    })

    it('detects changes in assistant_id', () => {
      const oldState = { assistant_id: 'assistant1' }
      const newState = { assistant_id: 'assistant2' }
      expect(hasPathChanged(newState, oldState, 'assistant_id')).toBe(true)
    })

    it('detects changes in nested state meta', () => {
      const oldState = { _meta: { type: 'assistant', position: { x: 100, y: 200 } } }
      const newState = { _meta: { type: 'assistant', position: { x: 150, y: 200 } } }
      expect(hasPathChanged(newState, oldState, '_meta.position.x')).toBe(true)
      expect(hasPathChanged(newState, oldState, '_meta.position.y')).toBe(false)
    })

    it('detects changes in array of tools', () => {
      const oldState = { tools: [{ name: 'tool1' }, { name: 'tool2' }] }
      const newState = { tools: [{ name: 'tool1' }, { name: 'tool3' }] }
      expect(hasPathChanged(newState, oldState, 'tools[1].name')).toBe(true)
    })
  })
})
