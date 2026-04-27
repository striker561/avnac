import {
  cloneSceneObject,
  getObjectCornerRadius,
  maxCornerRadiusForObject,
  objectSupportsCornerRadius,
  setObjectCornerRadius,
  type SceneObject,
} from '../../lib/avnac-scene'
import { layoutSceneText } from '../../lib/avnac-scene-render'
import { isCornerHandle } from './geometry'
import type { LayerReorderKind, ResizeHandleId } from './types'

export function renameWithFreshIds(obj: SceneObject): SceneObject {
  const next = cloneSceneObject(obj)
  next.id = crypto.randomUUID()
  if (next.type === 'group') {
    next.children = next.children.map((child) => renameWithFreshIds(child))
  }
  return next
}

function scaleGroupChildren(
  children: SceneObject[],
  scaleX: number,
  scaleY: number,
): SceneObject[] {
  return children.map((child) => {
    const next = cloneSceneObject(child)
    next.x *= scaleX
    next.y *= scaleY
    next.width = Math.max(1, next.width * scaleX)
    next.height = Math.max(1, next.height * scaleY)
    if (next.type === 'group') {
      next.children = scaleGroupChildren(next.children, scaleX, scaleY)
    }
    if (objectSupportsCornerRadius(next)) {
      return setObjectCornerRadius(
        next,
        Math.min(getObjectCornerRadius(next) * Math.max(scaleX, scaleY), maxCornerRadiusForObject(next)),
      )
    }
    return next
  })
}

export function isPerfectShapeObject(obj: SceneObject): boolean {
  return (
    obj.type === 'rect' ||
    obj.type === 'ellipse' ||
    obj.type === 'polygon' ||
    obj.type === 'star'
  )
}

export function reorderTopLevelObjects(
  objects: SceneObject[],
  selectedIds: string[],
  kind: LayerReorderKind,
): SceneObject[] {
  if (selectedIds.length === 0) return objects
  const selected = new Set(selectedIds)
  if (kind === 'front' || kind === 'back') {
    const picked = objects.filter((obj) => selected.has(obj.id))
    if (picked.length === 0) return objects
    const rest = objects.filter((obj) => !selected.has(obj.id))
    const next =
      kind === 'front' ? [...rest, ...picked] : [...picked, ...rest]
    return next.every((obj, index) => obj === objects[index]) ? objects : next
  }
  const next = [...objects]
  let changed = false
  if (kind === 'forward') {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (!selected.has(next[index].id) || selected.has(next[index + 1].id)) {
        continue
      }
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      changed = true
    }
    return changed ? next : objects
  }
  for (let index = 1; index < next.length; index += 1) {
    if (!selected.has(next[index].id) || selected.has(next[index - 1].id)) {
      continue
    }
    ;[next[index], next[index - 1]] = [next[index - 1], next[index]]
    changed = true
  }
  return changed ? next : objects
}

export function resizeObjectWithBox(
  obj: SceneObject,
  box: {
    x: number
    y: number
    width: number
    height: number
  },
  opts?: {
    handle?: ResizeHandleId
    initial?: SceneObject
  },
): SceneObject {
  const next = cloneSceneObject(obj)
  next.x = box.x
  next.y = box.y
  next.width = Math.max(1, box.width)
  next.height = Math.max(1, box.height)
  if (next.type === 'text') {
    const initialText =
      opts?.initial?.type === 'text' ? opts.initial : next
    if (opts?.handle && isCornerHandle(opts.handle)) {
      const scaleFactor = Math.max(
        0.1,
        Math.max(
          box.width / Math.max(1, initialText.width),
          box.height / Math.max(1, initialText.height),
        ),
      )
      next.fontSize = Math.max(8, Math.round(initialText.fontSize * scaleFactor))
    }
    next.width = Math.max(24, box.width)
    const layout = layoutSceneText(next)
    next.height = Math.max(layout.height, box.height)
    return next
  }
  if (next.type === 'group') {
    next.children = scaleGroupChildren(
      next.children,
      next.width / obj.width,
      next.height / obj.height,
    )
  }
  if (objectSupportsCornerRadius(next)) {
    return setObjectCornerRadius(
      next,
      Math.min(getObjectCornerRadius(next), maxCornerRadiusForObject(next)),
    )
  }
  return next
}
