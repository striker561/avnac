import type { FabricObject } from 'fabric'
import { getAvnacShapeMeta, isAvnacStrokeLineLike } from './avnac-shape-meta'

export function fabricObjectSupportsOutlineStroke(
  o: FabricObject,
  mod: typeof import('fabric'),
): boolean {
  if (mod.FabricImage && o instanceof mod.FabricImage) return false
  if (o instanceof mod.Line) return false
  const meta = getAvnacShapeMeta(o)
  if (o instanceof mod.Group && isAvnacStrokeLineLike(meta)) return false
  return true
}

export function collectOutlineStrokeTargets(
  active: FabricObject,
  mod: typeof import('fabric'),
  getActiveObjects: () => FabricObject[],
): FabricObject[] {
  if (
    'multiSelectionStacking' in active &&
    mod.ActiveSelection &&
    active instanceof mod.ActiveSelection
  ) {
    return getActiveObjects().filter((o) =>
      fabricObjectSupportsOutlineStroke(o, mod),
    )
  }
  if (!fabricObjectSupportsOutlineStroke(active, mod)) return []
  return [active]
}
