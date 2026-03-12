/**
 * Graph Builder Constants
 *
 * Iterator layout constants for bounding box calculations.
 */

/* Iterator layout configuration */
export const LAYOUT = {
  DEFAULT_NODE_POSITION: {
    X: 100,
    Y: 100,
  },
  ITERATOR_PADDING: 40, // Padding inside iterator to contain children (left, right, bottom)
  ITERATOR_TOP_PADDING: 55, // Top padding for iterator
  MARGIN_X: 0,
  MARGIN_Y: 20,
  SPACING_X: 100,
  SPACING_Y: 80,
} as const
