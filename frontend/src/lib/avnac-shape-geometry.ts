import type { XY } from 'fabric'

export function regularPolygonPoints(sides: number, radius: number): XY[] {
  const n = Math.max(3, Math.min(32, Math.round(sides)))
  const pts: XY[] = []
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    pts.push({ x: radius * Math.cos(a), y: radius * Math.sin(a) })
  }
  return pts
}

export function starPolygonPoints(
  numPoints: number,
  outerR: number,
  innerRatio = 0.45,
): XY[] {
  const n = Math.max(3, Math.min(24, Math.round(numPoints)))
  const innerR = outerR * innerRatio
  const pts: XY[] = []
  const step = Math.PI / n
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * step
    const r = i % 2 === 0 ? outerR : innerR
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) })
  }
  return pts
}

export function bboxMinRadius(br: { width: number; height: number }): number {
  return Math.max(24, Math.min(br.width, br.height) / 2)
}
