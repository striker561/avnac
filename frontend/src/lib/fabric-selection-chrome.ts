import type {
  Canvas,
  Control,
  FabricObject,
  InteractiveFabricObject,
  Point,
} from 'fabric'

export const EDITOR_ACCENT_PURPLE = '#8B3DFF'

const HOVER_OUTLINE_PAD_CSS_PX = 6
const HOVER_OUTLINE_LINE_CSS_PX = 2
const HANDLE_RING_STROKE = '#B4B4C0'

type ControlStyleOverride = Parameters<Control['render']>[3]

type ActiveSelectionLike = FabricObject & {
  getObjects: () => FabricObject[]
}

function isActiveSelectionInstance(o: FabricObject | undefined): o is ActiveSelectionLike {
  return !!o && typeof o === 'object' && 'multiSelectionStacking' in o
}

function transformSceneToCanvas(
  x: number,
  y: number,
  m: [number, number, number, number, number, number],
) {
  const [a, b, c, d, e, f] = m
  return { x: a * x + c * y + e, y: b * x + d * y + f }
}

function drawHoverOutline(
  ctx: CanvasRenderingContext2D,
  canvas: Canvas,
  target: FabricObject,
) {
  const vpt = canvas.viewportTransform
  const rs = canvas.getRetinaScaling?.() ?? 1
  const zoom = Math.max(Math.abs(vpt[0]), Math.abs(vpt[3]), 1e-6)
  const padScene = HOVER_OUTLINE_PAD_CSS_PX / zoom

  const { left, top, width, height } = target.getBoundingRect()
  const corners = [
    { x: left - padScene, y: top - padScene },
    { x: left + width + padScene, y: top - padScene },
    { x: left + width + padScene, y: top + height + padScene },
    { x: left - padScene, y: top + height + padScene },
  ]

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const c of corners) {
    const p = transformSceneToCanvas(c.x, c.y, vpt)
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  ctx.save()
  ctx.strokeStyle = EDITOR_ACCENT_PURPLE
  ctx.lineWidth = Math.max(1, HOVER_OUTLINE_LINE_CSS_PX * rs)
  ctx.setLineDash([])
  ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
  ctx.restore()
}

function renderSidePill(
  this: Control,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: ControlStyleOverride,
  fabricObject: InteractiveFabricObject,
) {
  const o = styleOverride ?? {}
  const corner = fabricObject.cornerSize
  const xSize = this.sizeX ?? corner * 2.15
  const ySize = this.sizeY ?? corner * 0.6
  const transparent =
    typeof o.transparentCorners === 'boolean'
      ? o.transparentCorners
      : fabricObject.transparentCorners
  const strokeColor =
    o.cornerStrokeColor ||
    fabricObject.cornerStrokeColor ||
    HANDLE_RING_STROKE
  const fillColor = o.cornerColor || fabricObject.cornerColor || '#ffffff'
  const w = xSize
  const h = ySize
  const r = Math.min(h / 2, w / 4)

  ctx.save()
  ctx.translate(left, top)
  ctx.rotate((fabricObject.getTotalAngle() * Math.PI) / 180)
  ctx.beginPath()
  const x0 = -w / 2
  const y0 = -h / 2
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x0, y0, w, h, r)
  } else {
    ctx.moveTo(x0 + r, y0)
    ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r)
    ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r)
    ctx.arcTo(x0, y0 + h, x0, y0, r)
    ctx.arcTo(x0, y0, x0 + w, y0, r)
    ctx.closePath()
  }
  const rs = fabricObject.canvas?.getRetinaScaling?.() ?? 1
  const edgePx = Math.max(1, 1.2 * rs)
  if (transparent) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = edgePx
    ctx.stroke()
  } else {
    ctx.fillStyle = fillColor
    ctx.fill()
    if (strokeColor) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = edgePx
      ctx.stroke()
    }
  }
  ctx.restore()
}

function customizeControlMap(
  controls: Record<string, Control>,
  fabric: typeof import('fabric'),
) {
  const ml = controls.ml
  const mr = controls.mr
  if (ml) {
    controls.ml = new fabric.Control({
      x: ml.x,
      y: ml.y,
      offsetX: ml.offsetX,
      offsetY: ml.offsetY,
      actionHandler: ml.actionHandler,
      cursorStyleHandler: ml.cursorStyleHandler,
      getActionName: ml.getActionName,
      mouseDownHandler: ml.mouseDownHandler,
      mouseUpHandler: ml.mouseUpHandler,
      actionName: ml.actionName,
      render: renderSidePill,
      sizeX: 64,
      sizeY: 22,
    })
  }
  if (mr) {
    controls.mr = new fabric.Control({
      x: mr.x,
      y: mr.y,
      offsetX: mr.offsetX,
      offsetY: mr.offsetY,
      actionHandler: mr.actionHandler,
      cursorStyleHandler: mr.cursorStyleHandler,
      getActionName: mr.getActionName,
      mouseDownHandler: mr.mouseDownHandler,
      mouseUpHandler: mr.mouseUpHandler,
      actionName: mr.actionName,
      render: renderSidePill,
      sizeX: 64,
      sizeY: 22,
    })
  }
  const mtr = controls.mtr
  if (mtr) {
    controls.mtr = new fabric.Control({
      x: 0,
      y: 0.5,
      offsetX: mtr.offsetX ?? 0,
      offsetY: 88,
      withConnection: true,
      actionHandler: mtr.actionHandler,
      cursorStyleHandler: mtr.cursorStyleHandler,
      mouseDownHandler: mtr.mouseDownHandler,
      mouseUpHandler: mtr.mouseUpHandler,
      actionName: mtr.actionName,
      sizeX: 56,
      sizeY: 56,
    })
  }
}

function patchCreateControls(
  Cls: {
    createControls: () => { controls: Record<string, Control> }
  },
  fabric: typeof import('fabric'),
) {
  if (createControlsOriginal.has(Cls)) return
  const orig = Cls.createControls.bind(Cls)
  createControlsOriginal.set(Cls, orig)
  Cls.createControls = function createControlsPatched() {
    const out = orig()
    customizeControlMap(out.controls, fabric)
    return out
  }
}

let ownDefaultsApplied = false
let strokeBordersPatched = false

const createControlsOriginal = new WeakMap<
  { createControls: () => { controls: Record<string, Control> } },
  () => { controls: Record<string, Control> }
>()

function patchStrokeBordersScreenThickness(fab: typeof import('fabric')) {
  if (strokeBordersPatched) return
  strokeBordersPatched = true
  const proto = fab.InteractiveFabricObject.prototype

  proto.strokeBorders = function (
    this: InteractiveFabricObject,
    ctx: CanvasRenderingContext2D,
    size: Point,
  ) {
    const retina = this.canvas?.getRetinaScaling?.() ?? 1
    const targetCssPx = 2
    ctx.lineWidth = Math.max(2, targetCssPx * retina)
    ctx.strokeRect(-size.x / 2, -size.y / 2, size.x, size.y)
  }
}

export function installFabricSelectionChrome(fabric: typeof import('fabric')) {
  if (!ownDefaultsApplied) {
    Object.assign(fabric.InteractiveFabricObject.ownDefaults, {
      borderColor: EDITOR_ACCENT_PURPLE,
      cornerColor: '#ffffff',
      cornerStrokeColor: HANDLE_RING_STROKE,
      transparentCorners: false,
      cornerStyle: 'circle',
      cornerSize: 56,
      touchCornerSize: 112,
      borderScaleFactor: 2.5,
      hoverCursor: 'move',
    })
    ownDefaultsApplied = true
  }

  patchStrokeBordersScreenThickness(fabric)

  patchCreateControls(fabric.InteractiveFabricObject, fabric)
  if (fabric.Textbox) {
    patchCreateControls(fabric.Textbox, fabric)
  }
  if (fabric.IText?.ownDefaults) {
    Object.assign(fabric.IText.ownDefaults, {
      editingBorderColor: 'rgba(139, 61, 255, 0.28)',
    })
  }
  if (fabric.Textbox?.ownDefaults) {
    Object.assign(fabric.Textbox.ownDefaults, {
      editingBorderColor: 'rgba(139, 61, 255, 0.28)',
    })
  }
}

type CanvasWithInternals = Canvas & {
  _currentTransform: unknown
  _hoveredTarget?: FabricObject
  _activeObject?: FabricObject
}

export function attachFabricHoverOutline(canvas: Canvas) {
  const c = canvas as CanvasWithInternals
  let lastHovered: FabricObject | undefined

  const requestRenderIfHoverChanged = () => {
    const next = c._hoveredTarget
    if (next !== lastHovered) {
      lastHovered = next
      canvas.requestRenderAll()
    }
  }

  canvas.on('mouse:move', requestRenderIfHoverChanged)
  canvas.on('mouse:out', requestRenderIfHoverChanged)
  canvas.on('mouse:over', requestRenderIfHoverChanged)

  const baseDrawControls = c.drawControls.bind(c)
  c.drawControls = function drawControlsWithHover(
    ctx: CanvasRenderingContext2D,
  ) {
    baseDrawControls(ctx)
    if (c._currentTransform) return

    const hovered = c._hoveredTarget
    const active = c._activeObject
    if (!hovered) return
    if (hovered === active) return
    if (
      isActiveSelectionInstance(active) &&
      active.getObjects().includes(hovered)
    ) {
      return
    }
    if ('isEditing' in hovered && (hovered as { isEditing?: boolean }).isEditing) {
      return
    }

    drawHoverOutline(ctx, c, hovered)
  }
}
