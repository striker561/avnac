import type { Canvas, FabricObject } from 'fabric'

/** `object:modified` `action` values that end a scale / resize / skew transform. */
export const TRANSFORM_DIMENSION_END_ACTIONS = new Set([
  'scale',
  'scaleX',
  'scaleY',
  'scaling',
  'resizing',
  'skewX',
  'skewY',
  'skewing',
])

export type TransformDimensionUi = {
  left: number
  top: number
  text: string
}

/**
 * Positions are viewport (`position: fixed`) CSS pixels so the chip is not clipped by
 * overflow on the scroll container. Width/height are Fabric scene units (artboard space).
 */
export function computeTransformDimensionUi(
  canvas: Canvas,
  frameEl: HTMLElement,
  target: FabricObject,
): TransformDimensionUi | null {
  const br = target.getBoundingRect()
  const cw = canvas.getWidth()
  const ch = canvas.getHeight()
  const fr = frameEl.getBoundingClientRect()
  if (cw <= 0 || ch <= 0 || fr.width <= 0 || fr.height <= 0) return null
  const sx = fr.width / cw
  const sy = fr.height / ch
  const wPx = Math.round(br.width)
  const hPx = Math.round(br.height)
  const anchorLeft = fr.left + (br.left + br.width) * sx + 8
  const anchorTop = fr.top + (br.top + br.height) * sy + 8
  return {
    left: anchorLeft,
    top: anchorTop,
    text: `w: ${wPx.toLocaleString('en-US')} h: ${hPx.toLocaleString('en-US')}`,
  }
}
