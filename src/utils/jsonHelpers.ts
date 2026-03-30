/**
 * JSON parsing and validation utilities
 */

/**
 * Checks if a value is a plain object (not null, array, or primitive)
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Checks if a parsed JSON value is an object or array (not a primitive)
 * Used to distinguish between:
 * - Valid: JSON.parse('{}') => {}, JSON.parse('[]') => []
 * - Invalid: JSON.parse('2') => 2, JSON.parse('"text"') => 'text', JSON.parse('true') => true
 */
export const isJsonObjectOrArray = (value: unknown): boolean => {
  return Array.isArray(value) || isPlainObject(value)
}

type JsonValue = Record<string, unknown> | Array<unknown>

/**
 * Safely parses JSON string and validates it's an object or array
 * Returns null if parsing fails or result is a primitive
 */
export const tryParseJsonObjectOrArray = (text: string): JsonValue | null => {
  try {
    const parsed = JSON.parse(text)
    return isJsonObjectOrArray(parsed) ? (parsed as JsonValue) : null
  } catch {
    return null
  }
}
