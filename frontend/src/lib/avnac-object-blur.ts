import type { Canvas, FabricObject } from 'fabric'

const PATCH_KEY = '__avnacObjectCanvasBlurInstalled__'

/** Same scale previously used for FabricImage `filters.Blur` (0–1 → UI %). */
const LEGACY_IMAGE_BLUR_UI_MAX = 0.35

const MAX_CSS_BLUR_PX = 28

function blurPxFromObject(
  obj: FabricObject & { avnacBlur?: number },
  forClipping: boolean | undefined,
): number {
  if (forClipping) return 0
  const pct = obj.avnacBlur
  if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= 0) return 0
  return (Math.min(100, Math.max(0, pct)) / 100) * MAX_CSS_BLUR_PX
}

function patchDrawObject(
  proto: { drawObject: FabricObject['drawObject'] },
): void {
  const orig = proto.drawObject
  proto.drawObject = function (
    this: FabricObject & { avnacBlur?: number },
    ctx: CanvasRenderingContext2D,
    forClipping: boolean | undefined,
    context: Parameters<FabricObject['drawObject']>[2],
  ) {
    const px = blurPxFromObject(this, forClipping)
    if (px <= 0) {
      return orig.call(this, ctx, forClipping, context)
    }
    const prev = ctx.filter
    ctx.filter = `blur(${px}px)`
    try {
      return orig.call(this, ctx, forClipping, context)
    } finally {
      ctx.filter = prev
    }
  }
}

export function installAvnacObjectCanvasBlur(
  mod: typeof import('fabric'),
): void {
  try {
    const bag = mod as typeof mod & { [PATCH_KEY]?: boolean }
    if (bag[PATCH_KEY]) return

    const FO = mod.FabricObject
    const cacheProps = FO?.cacheProperties
    if (Array.isArray(cacheProps) && !cacheProps.includes('avnacBlur')) {
      FO.cacheProperties = [...cacheProps, 'avnacBlur']
    }

    if (typeof FO?.prototype?.drawObject === 'function') {
      patchDrawObject(FO.prototype)
    }
    if (
      mod.Group &&
      typeof mod.Group.prototype?.drawObject === 'function'
    ) {
      patchDrawObject(mod.Group.prototype)
    }

    bag[PATCH_KEY] = true
  } catch (err) {
    console.error('[avnac] installAvnacObjectCanvasBlur failed', err)
  }
}

export function readBlurPctFromFabricObject(obj: FabricObject): number {
  const v = (obj as FabricObject & { avnacBlur?: number }).avnacBlur
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.round(Math.max(0, Math.min(100, v)))
    : 0
}

function walkObjects(
  objs: FabricObject[],
  mod: typeof import('fabric'),
  visit: (o: FabricObject) => void,
): void {
  for (const o of objs) {
    visit(o)
    if (mod.Group && o instanceof mod.Group) {
      walkObjects(o.getObjects(), mod, visit)
    }
  }
}

/** Moves old FabricImage `filters.Blur` into `avnacBlur` and removes the filter. */
export function migrateLegacyImageBlurFilters(
  canvas: Canvas,
  mod: typeof import('fabric'),
): void {
  const BlurClass = mod.filters?.Blur
  if (!BlurClass) return
  walkObjects(canvas.getObjects(), mod, (o) => {
    if (!(mod.FabricImage && o instanceof mod.FabricImage)) return
    const img = o
    const filters = img.filters || []
    const idx = filters.findIndex(
      (f) =>
        f != null &&
        (f instanceof BlurClass ||
          (typeof f === 'object' &&
            'type' in f &&
            (f as { type: string }).type === 'Blur')),
    )
    if (idx < 0) return
    const f = filters[idx]!
    const raw =
      f instanceof BlurClass
        ? f.blur
        : Math.max(0, Math.min(1, (f as { blur?: number }).blur ?? 0))
    const pct = Math.round(
      Math.max(0, Math.min(100, (raw / LEGACY_IMAGE_BLUR_UI_MAX) * 100)),
    )
    const next = [...filters]
    next.splice(idx, 1)
    img.filters = next
    img.applyFilters()
    img.set({ avnacBlur: pct })
    img.set('dirty', true)
  })
}
