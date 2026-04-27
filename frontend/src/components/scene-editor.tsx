import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  Copy01Icon,
  CropIcon,
  Delete02Icon,
  FilePasteIcon,
  HelpCircleIcon,
  Image01Icon,
  Layers02Icon,
  SquareLock01Icon,
  SquareUnlock01Icon,
  TextFontIcon,
} from '@hugeicons/core-free-icons'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import {
  AVNAC_DOC_VERSION,
  AVNAC_STORAGE_KEY,
  cloneAvnacDocument,
  cloneSceneObject,
  createEmptyAvnacDocument,
  createGroupFromSelection,
  getObjectCenter,
  getObjectFill,
  getObjectRotatedBounds,
  getObjectStroke,
  getObjectStrokeWidth,
  getSelectionBounds,
  maxCornerRadiusForObject,
  objectDisplayName,
  objectSupportsFill,
  objectSupportsOutlineStroke,
  parseAvnacDocument,
  removeTopLevelObjects,
  sceneObjectToShapeMeta,
  setObjectCornerRadius,
  setObjectFill,
  setObjectStroke,
  setObjectStrokeWidth,
  ungroupSceneObject,
  type AvnacDocument,
  type SceneArrow,
  type SceneImage,
  type SceneLine,
  type SceneObject,
  type SceneText,
} from '../lib/avnac-scene'
import { idbGetDocument, idbPutDocument } from '../lib/avnac-editor-idb'
import {
  loadVectorBoardDocs,
  loadVectorBoards,
  mergeVectorBoardDocsForMeta,
  saveVectorBoardDocs,
  saveVectorBoards,
  type AvnacVectorBoardMeta,
} from '../lib/avnac-vector-boards-storage'
import {
  AVNAC_VECTOR_BOARD_DRAG_MIME,
  emptyVectorBoardDocument,
  vectorDocHasRenderableStrokes,
  type VectorBoardDocument,
} from '../lib/avnac-vector-board-document'
import {
  layoutSceneText,
  renderAvnacDocumentToDataUrl,
  sceneTextLineHeight,
} from '../lib/avnac-scene-render'
import {
  DEFAULT_SHADOW_UI,
  averageShadowUi,
  type ShadowUi,
} from '../lib/avnac-shadow'
import { loadImageMetadata } from '../lib/avnac-image-proxy'
import { extractImageUrlFromDataTransfer } from '../lib/extract-image-url-from-data-transfer'
import { loadGoogleFontFamily } from '../lib/load-google-font'
import { useViewportAwarePopoverPlacement } from '../hooks/use-viewport-aware-popover'
import ShapeOptionsToolbar from './shape-options-toolbar'
import TransparencyToolbarPopover from './transparency-toolbar-popover'
import ShapesPopover, {
  iconForShapesQuickAdd,
  type PopoverShapeKind,
  type ShapesQuickAddKind,
} from './shapes-popover'
import TextFormatToolbar, {
  type TextFormatToolbarValues,
} from './text-format-toolbar'
import BackgroundPopover, {
  bgValueToSwatch,
  type BgValue,
} from './background-popover'
import ArtboardResizeToolbarControl from './artboard-resize-toolbar-control'
import BlurToolbarControl from './blur-toolbar-control'
import ShadowToolbarPopover from './shadow-toolbar-popover'
import StrokeToolbarPopover from './stroke-toolbar-popover'
import CornerRadiusToolbarControl from './corner-radius-toolbar-control'
import CanvasZoomSlider from './canvas-zoom-slider'
import CanvasElementToolbar, {
  type CanvasAlignKind,
} from './canvas-element-toolbar'
import {
  FloatingToolbarDivider,
  FloatingToolbarShell,
  floatingToolbarIconButton,
} from './floating-toolbar-shell'
import ImageCropModal, {
  type ImageCropModalApplyPayload,
} from './image-crop-modal'
import type { ExportPngOptions } from './editor-export-menu'
import EditorFloatingSidebar, {
  type EditorSidebarPanelId,
} from './editor-floating-sidebar'
import EditorLayersPanel, {
  type EditorLayerRow,
} from './editor-layers-panel'
import EditorAiPanel from './editor-ai-panel'
import type {
  AiDesignController,
  AiObjectKind,
  AiObjectSummary,
} from '../lib/avnac-ai-controller'
import EditorShortcutsModal from './editor-shortcuts-modal'
import EditorUploadsPanel from './editor-uploads-panel'
import EditorAppsPanel from './editor-apps-panel'
import EditorImagesPanel from './editor-images-panel'
import EditorVectorBoardPanel from './editor-vector-board-panel'
import VectorBoardWorkspace from './vector-board-workspace'
import { SceneObjectView } from './scene-editor/object-view'
import {
  SelectionBoundsOverlay,
  SelectionOverlay,
  SnapGuidesOverlay,
} from './scene-editor/selection-overlays'
import { useEditorKeyboardShortcuts } from './scene-editor/use-editor-keyboard-shortcuts'
import {
  SNAP_DEADBAND_PX,
  angleFromPoints,
  boundsIntersect,
  clampDimension,
  computeSceneSnap,
  constrainAspectRatioBounds,
  getHandleLocalPosition,
  imageFilesFromTransfer,
  isImageFile,
  isCornerHandle,
  isPerfectShapeObject,
  mergeUniqueIds,
  oppositeHandle,
  pointerSceneDelta,
  readClipboardImageFiles,
  rectFromPoints,
  renameWithFreshIds,
  reorderTopLevelObjects,
  resizeObjectWithBox,
  rotateDeltaToScene,
  sceneSnapThreshold,
  snapAngle,
  type DragState,
  type LayerReorderKind,
  type MarqueeRect,
  type ResizeHandleId,
  type SceneSnapGuide,
  type TransformDimensionUi,
} from '../scene-engine/primitives'

const DEFAULT_ARTBOARD_W = 4000
const DEFAULT_ARTBOARD_H = 4000
const ARTBOARD_ALIGN_PAD = 32
const ZOOM_MIN_PCT = 5
const ZOOM_MAX_PCT = 100
const FIT_PADDING = 48
const CLIPBOARD_PASTE_OFFSET = 24
const DEFAULT_FILL: BgValue = { type: 'solid', color: '#262626' }
const DEFAULT_STROKE: BgValue = { type: 'solid', color: 'transparent' }
const DEFAULT_LINE_STROKE: BgValue = { type: 'solid', color: '#262626' }

export type SceneEditorHandle = {
  exportPng: (opts?: ExportPngOptions) => void
  saveDocument: () => void
  loadDocument: (file: File) => Promise<void>
}

type SceneEditorProps = {
  onReadyChange?: (ready: boolean) => void
  persistId?: string
  persistDisplayName?: string
  initialArtboardWidth?: number
  initialArtboardHeight?: number
}

type EditorContextMenuState = {
  x: number
  y: number
  sceneX: number
  sceneY: number
  hasSelection: boolean
  locked: boolean
}

function toolbarIconBtn(disabled?: boolean) {
  const base =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 outline-none transition-colors hover:bg-black/[0.06]'
  if (disabled) return `${base} pointer-events-none cursor-not-allowed opacity-35`
  return base
}

function backgroundTopBtn(disabled?: boolean) {
  const base =
    'flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-neutral-700 outline-none transition-colors hover:bg-black/[0.06]'
  if (disabled) return `${base} pointer-events-none cursor-not-allowed opacity-35`
  return base
}

function artboardAlignAlreadySatisfied(
  bounds: { left: number; top: number; width: number; height: number },
  boardW: number,
  boardH: number,
): Record<CanvasAlignKind, boolean> {
  const pad = ARTBOARD_ALIGN_PAD
  return {
    left: Math.abs(bounds.left - pad) <= 2,
    centerH: Math.abs(bounds.left + bounds.width / 2 - boardW / 2) <= 2,
    right: Math.abs(bounds.left + bounds.width - (boardW - pad)) <= 2,
    top: Math.abs(bounds.top - pad) <= 2,
    centerV: Math.abs(bounds.top + bounds.height / 2 - boardH / 2) <= 2,
    bottom: Math.abs(bounds.top + bounds.height - (boardH - pad)) <= 2,
  }
}

function computeTransformDimensionUi(
  frameEl: HTMLElement,
  sceneW: number,
  sceneH: number,
  bounds: { left: number; top: number; width: number; height: number },
): TransformDimensionUi | null {
  const frameRect = frameEl.getBoundingClientRect()
  if (frameRect.width <= 0 || frameRect.height <= 0 || sceneW <= 0 || sceneH <= 0) {
    return null
  }
  const sx = frameRect.width / sceneW
  const sy = frameRect.height / sceneH
  return {
    left: frameRect.left + (bounds.left + bounds.width) * sx + 8,
    top: frameRect.top + (bounds.top + bounds.height) * sy + 8,
    text: `w: ${Math.round(bounds.width).toLocaleString('en-US')} h: ${Math.round(bounds.height).toLocaleString('en-US')}`,
  }
}


const SceneEditor = forwardRef<SceneEditorHandle, SceneEditorProps>(
  function SceneEditor(
    {
      onReadyChange,
      persistId,
      persistDisplayName,
      initialArtboardWidth,
      initialArtboardHeight,
    },
    ref,
  ) {
    const persistIdRef = useRef<string | undefined>(persistId)
    persistIdRef.current = persistId
    const persistDisplayNameRef = useRef(
      persistDisplayName?.trim() || 'Untitled',
    )
    persistDisplayNameRef.current = persistDisplayName?.trim() || 'Untitled'

    const viewportRef = useRef<HTMLDivElement>(null)
    const artboardOuterRef = useRef<HTMLDivElement>(null)
    const artboardInnerRef = useRef<HTMLDivElement>(null)
    const elementToolbarRef = useRef<HTMLDivElement>(null)
    const selectionToolsRef = useRef<HTMLDivElement>(null)
    const shapeToolSplitRef = useRef<HTMLDivElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const zoomUserAdjustedRef = useRef(false)
    const historyRef = useRef<AvnacDocument[]>([])
    const historyIndexRef = useRef(-1)
    const applyingHistoryRef = useRef(false)
    const dragStateRef = useRef<DragState | null>(null)
    const autosaveTimerRef = useRef<number | null>(null)
    const historyTimerRef = useRef<number | null>(null)
    const snapGuideXRef = useRef<number | null>(null)
    const snapGuideYRef = useRef<number | null>(null)

    const [doc, setDoc] = useState<AvnacDocument>(() =>
      createEmptyAvnacDocument(
        clampDimension(initialArtboardWidth, DEFAULT_ARTBOARD_W),
        clampDimension(initialArtboardHeight, DEFAULT_ARTBOARD_H),
      ),
    )
    const [ready, setReady] = useState(false)
    const [zoomPercent, setZoomPercent] = useState<number | null>(null)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [editorSidebarPanel, setEditorSidebarPanel] =
      useState<EditorSidebarPanelId | null>(null)
    const [vectorBoards, setVectorBoards] = useState<AvnacVectorBoardMeta[]>([])
    const [vectorBoardDocs, setVectorBoardDocs] = useState<
      Record<string, VectorBoardDocument>
    >({})
    const [vectorWorkspaceId, setVectorWorkspaceId] = useState<string | null>(null)
    const [bgPopoverOpen, setBgPopoverOpen] = useState(false)
    const [shortcutsOpen, setShortcutsOpen] = useState(false)
    const [shapesPopoverOpen, setShapesPopoverOpen] = useState(false)
    const [shapesQuickAddKind, setShapesQuickAddKind] =
      useState<ShapesQuickAddKind>('generic')
    const [imageCropOpen, setImageCropOpen] = useState(false)
    const [imageCropSrc, setImageCropSrc] = useState('')
    const [imageCropInitial, setImageCropInitial] = useState({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    })
    const imageCropTargetIdRef = useRef<string | null>(null)
    const [exportError, setExportError] = useState<string | null>(null)
    const [contextMenu, setContextMenu] =
      useState<EditorContextMenuState | null>(null)
    const [textEditingId, setTextEditingId] = useState<string | null>(null)
    const [textDraft, setTextDraft] = useState('')
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [backgroundActive, setBackgroundActive] = useState(false)
    const [backgroundHovered, setBackgroundHovered] = useState(false)
    const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null)
    const [snapGuides, setSnapGuides] = useState<SceneSnapGuide[]>([])
    const [, setSelectionRev] = useState(0)
    const [transformDimensionUi, setTransformDimensionUi] =
      useState<TransformDimensionUi | null>(null)

    const backgroundPopoverAnchorRef = useRef<HTMLDivElement>(null)
    const backgroundPopoverPanelRef = useRef<HTMLDivElement>(null)
    const pickBackgroundPopoverPanel = useCallback(
      () => backgroundPopoverPanelRef.current,
      [],
    )
    const {
      openUpward: backgroundPopoverOpenUpward,
      shiftX: backgroundPopoverShiftX,
    } = useViewportAwarePopoverPlacement(
      bgPopoverOpen,
      backgroundPopoverAnchorRef,
      440,
      pickBackgroundPopoverPanel,
      'center',
    )

    const scale = (zoomPercent ?? 100) / 100
    const artboardW = doc.artboard.width
    const artboardH = doc.artboard.height
    const selectedObjects = useMemo(
      () => doc.objects.filter((obj) => selectedIds.includes(obj.id)),
      [doc.objects, selectedIds],
    )
    const selectedSingle = selectedObjects.length === 1 ? selectedObjects[0] : null
    const editingSelectedText =
      selectedSingle?.type === 'text' && textEditingId === selectedSingle.id
    const hasObjectSelected = selectedObjects.length > 0
    const canvasBodySelected = ready && !hasObjectSelected
    const hoveredObject = useMemo(
      () =>
        hoveredId
          ? doc.objects.find((obj) => obj.id === hoveredId && obj.visible) ?? null
          : null,
      [doc.objects, hoveredId],
    )

    const fitZoom = useCallback(() => {
      const viewport = viewportRef.current
      if (!viewport) return
      const availW = Math.max(200, viewport.clientWidth - FIT_PADDING * 2)
      const availH = Math.max(200, viewport.clientHeight - FIT_PADDING * 2)
      const pct = Math.max(
        ZOOM_MIN_PCT,
        Math.min(
          ZOOM_MAX_PCT,
          Math.floor(
            Math.min(availW / Math.max(1, artboardW), availH / Math.max(1, artboardH)) * 100,
          ),
        ),
      )
      setZoomPercent(pct)
    }, [artboardH, artboardW])

    useLayoutEffect(() => {
      if (zoomPercent === null || zoomUserAdjustedRef.current) return
      fitZoom()
    }, [artboardW, artboardH, fitZoom, zoomPercent])

    useEffect(() => {
      let cancelled = false
      setReady(false)
      ;(async () => {
        let nextDoc: AvnacDocument | null = null
        if (persistId) {
          const raw = await idbGetDocument(persistId)
          nextDoc = raw ? parseAvnacDocument(raw) : null
        } else {
          try {
            const raw = localStorage.getItem(AVNAC_STORAGE_KEY)
            nextDoc = raw ? parseAvnacDocument(JSON.parse(raw)) : null
          } catch {
            nextDoc = null
          }
        }
        const base =
          nextDoc ??
          createEmptyAvnacDocument(
            clampDimension(initialArtboardWidth, DEFAULT_ARTBOARD_W),
            clampDimension(initialArtboardHeight, DEFAULT_ARTBOARD_H),
          )
        const boards = persistId ? loadVectorBoards(persistId) : []
        const docs = persistId ? loadVectorBoardDocs(persistId) : {}
        const merged = persistId
          ? mergeVectorBoardDocsForMeta(boards, docs)
          : docs
        if (cancelled) return
        setDoc(base)
        setVectorBoards(boards)
        setVectorBoardDocs(merged)
        setSelectedIds([])
        setTextEditingId(null)
        historyRef.current = [cloneAvnacDocument(base)]
        historyIndexRef.current = 0
        zoomUserAdjustedRef.current = false
        setZoomPercent(100)
        setReady(true)
      })()
      return () => {
        cancelled = true
      }
    }, [persistId, initialArtboardWidth, initialArtboardHeight])

    useEffect(() => {
      onReadyChange?.(ready)
    }, [onReadyChange, ready])

    useEffect(() => {
      if (!ready) return
      if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current)
      historyTimerRef.current = window.setTimeout(() => {
        if (applyingHistoryRef.current) return
        const snap = cloneAvnacDocument(doc)
        const serialized = JSON.stringify(snap)
        const current = historyRef.current[historyIndexRef.current]
        if (current && JSON.stringify(current) === serialized) return
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
        historyRef.current.push(snap)
        historyIndexRef.current = historyRef.current.length - 1
      }, 140)
      return () => {
        if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current)
      }
    }, [doc, ready])

    useEffect(() => {
      if (!ready) return
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = window.setTimeout(() => {
        const snapshot = cloneAvnacDocument(doc)
        if (!persistIdRef.current) {
          localStorage.setItem(AVNAC_STORAGE_KEY, JSON.stringify(snapshot))
          return
        }
        void idbPutDocument(persistIdRef.current, snapshot, {
          name: persistDisplayNameRef.current,
        }).catch((error) => {
          console.error('[avnac] autosave failed', error)
        })
      }, 240)
      return () => {
        if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
      }
    }, [doc, ready])

    useEffect(() => {
      if (!persistId || !ready) return
      saveVectorBoards(persistId, vectorBoards)
    }, [persistId, ready, vectorBoards])

    useEffect(() => {
      if (!persistId || !ready) return
      saveVectorBoardDocs(persistId, vectorBoardDocs)
    }, [persistId, ready, vectorBoardDocs])

    useEffect(() => {
      if (!exportError) return
      const timer = window.setTimeout(() => setExportError(null), 4500)
      return () => window.clearTimeout(timer)
    }, [exportError])

    const layerRows = useMemo<EditorLayerRow[]>(
      () =>
        [...doc.objects]
          .map((obj, index) => ({
            id: obj.id,
            index,
            label: objectDisplayName(obj),
            visible: obj.visible,
            selected: selectedIds.includes(obj.id),
          }))
          .reverse(),
      [doc.objects, selectedIds],
    )

    const selectionBounds = useMemo(
      () => getSelectionBounds(selectedObjects),
      [selectedObjects],
    )

    const textToolbarValues = useMemo<TextFormatToolbarValues | null>(() => {
      if (!selectedSingle || selectedSingle.type !== 'text') return null
      return {
        fontFamily: selectedSingle.fontFamily,
        fontSize: selectedSingle.fontSize,
        fillStyle: selectedSingle.fill,
        textAlign: selectedSingle.textAlign,
        bold:
          selectedSingle.fontWeight === 'bold' ||
          selectedSingle.fontWeight === 700 ||
          selectedSingle.fontWeight === 600,
        italic: selectedSingle.fontStyle === 'italic',
        underline: selectedSingle.underline,
      }
    }, [selectedSingle])

    const shapeToolbarModel = useMemo(() => {
      if (!selectedSingle) return null
      const meta = sceneObjectToShapeMeta(selectedSingle)
      if (!meta) return null
      const paint =
        selectedSingle.type === 'line' || selectedSingle.type === 'arrow'
          ? selectedSingle.stroke
          : getObjectFill(selectedSingle) ?? DEFAULT_FILL
      return {
        meta,
        paint,
        rectCornerRadius:
          selectedSingle.type === 'rect' ? selectedSingle.cornerRadius : undefined,
        rectCornerRadiusMax:
          selectedSingle.type === 'rect'
            ? maxCornerRadiusForObject(selectedSingle)
            : undefined,
      }
    }, [selectedSingle])

    const imageCornerToolbar = useMemo(() => {
      if (!selectedSingle || selectedSingle.type !== 'image') return null
      return {
        radius: selectedSingle.cornerRadius,
        max: maxCornerRadiusForObject(selectedSingle),
      }
    }, [selectedSingle])

    const selectionBlurPct = useMemo(() => {
      if (selectedObjects.length === 0) return 0
      return Math.round(
        selectedObjects.reduce((sum, obj) => sum + obj.blurPct, 0) /
          selectedObjects.length,
      )
    }, [selectedObjects])

    const selectionOpacityPct = useMemo(() => {
      if (selectedObjects.length === 0) return 100
      return Math.round(
        (selectedObjects.reduce((sum, obj) => sum + obj.opacity, 0) /
          selectedObjects.length) *
          100,
      )
    }, [selectedObjects])

    const selectionOutlineStrokeAllowed = useMemo(
      () => selectedObjects.some((obj) => objectSupportsOutlineStroke(obj)),
      [selectedObjects],
    )

    const selectionOutlineStrokeWidth = useMemo(() => {
      const targets = selectedObjects.filter((obj) => objectSupportsOutlineStroke(obj))
      if (targets.length === 0) return 0
      return Math.round(
        targets.reduce((sum, obj) => sum + getObjectStrokeWidth(obj), 0) /
          targets.length,
      )
    }, [selectedObjects])

    const selectionOutlineStrokePaint = useMemo<BgValue>(() => {
      const targets = selectedObjects.filter((obj) => objectSupportsOutlineStroke(obj))
      if (targets.length === 0) return { type: 'solid', color: '#000000' }
      return getObjectStroke(targets[0]) ?? { type: 'solid', color: '#000000' }
    }, [selectedObjects])

    const selectionShadowActive = useMemo(
      () => selectedObjects.some((obj) => obj.shadow != null),
      [selectedObjects],
    )

    const selectionShadowUi = useMemo<ShadowUi>(() => {
      const rows = selectedObjects
        .map((obj) => obj.shadow)
        .filter((row): row is ShadowUi => row != null)
      return rows.length > 0 ? averageShadowUi(rows) : { ...DEFAULT_SHADOW_UI }
    }, [selectedObjects])

    const elementToolbarLayout = useMemo(() => {
      if (!selectionBounds || !zoomPercent) return null
      const top = selectionBounds.top * scale
      const bottom = (selectionBounds.top + selectionBounds.height) * scale
      const placement: 'above' | 'below' = top <= 56 ? 'below' : 'above'
      return {
        left: (selectionBounds.left + selectionBounds.width / 2) * scale,
        top: top <= 56 ? bottom : top,
        placement,
      }
    }, [selectionBounds, zoomPercent, scale])

    const elementToolbarAlignAlready = useMemo(() => {
      if (!selectionBounds) return null
      return artboardAlignAlreadySatisfied(selectionBounds, artboardW, artboardH)
    }, [selectionBounds, artboardW, artboardH])

    const elementToolbarLockedDisplay = useMemo(
      () => selectedObjects.length > 0 && selectedObjects.every((obj) => obj.locked),
      [selectedObjects],
    )
    const elementToolbarCanGroup = selectedObjects.length >= 2
    const elementToolbarCanAlignElements = selectedObjects.length >= 2
    const elementToolbarCanUngroup =
      selectedSingle?.type === 'group' && !selectedSingle.locked

    const nudgeSelection = useCallback((dx: number, dy: number) => {
      if (selectedIds.length === 0) return
      setDoc((prev) => ({
        ...prev,
        objects: prev.objects.map((obj) =>
          selectedIds.includes(obj.id)
            ? { ...obj, x: obj.x + dx, y: obj.y + dy }
            : obj,
        ),
      }))
      setSelectionRev((n) => n + 1)
    }, [selectedIds])

    const pushSelectionToTop = useCallback((ids: string[]) => {
      setSelectedIds(ids)
      setSelectionRev((n) => n + 1)
    }, [])

    useEffect(() => {
      const fonts = new Set<string>()
      const visit = (obj: SceneObject) => {
        if (obj.type === 'text' && obj.fontFamily.trim()) {
          fonts.add(obj.fontFamily.trim())
        }
        if (obj.type === 'group') {
          obj.children.forEach(visit)
        }
      }
      doc.objects.forEach(visit)
      fonts.forEach((fontFamily) => {
        void loadGoogleFontFamily(fontFamily)
      })
    }, [doc.objects])

    const reorderSelectionLayers = useCallback(
      (kind: LayerReorderKind) => {
        if (selectedIds.length === 0) return
        setDoc((prev) => {
          const next = reorderTopLevelObjects(prev.objects, selectedIds, kind)
          return next === prev.objects ? prev : { ...prev, objects: next }
        })
      },
      [selectedIds],
    )

    const pointerToScene = useCallback((clientX: number, clientY: number) => {
      const el = artboardInnerRef.current
      if (!el) return { x: 0, y: 0 }
      const rect = el.getBoundingClientRect()
      return {
        x: Math.max(0, Math.min(artboardW, (clientX - rect.left) / scale)),
        y: Math.max(0, Math.min(artboardH, (clientY - rect.top) / scale)),
      }
    }, [artboardW, artboardH, scale])

    const addObjects = useCallback((objectsToAdd: SceneObject[]) => {
      setDoc((prev) => ({ ...prev, objects: [...prev.objects, ...objectsToAdd] }))
      pushSelectionToTop(objectsToAdd.map((obj) => obj.id))
    }, [pushSelectionToTop])

    const defaultShapeBox = useMemo(
      () => ({
        fontSize: Math.round(artboardW * 0.04),
        shapeSize: Math.round(Math.min(artboardW, artboardH) * 0.16),
        lineW: Math.round(artboardW * 0.24),
        lineH: Math.round(artboardH * 0.12),
      }),
      [artboardW, artboardH],
    )

    const createCenteredObject = useCallback(
      (obj: SceneObject) => {
        return { ...obj, x: artboardW / 2 - obj.width / 2, y: artboardH / 2 - obj.height / 2 }
      },
      [artboardW, artboardH],
    )

    const addShapeFromKind = useCallback(
      (kind: PopoverShapeKind) => {
        const perfectSize = defaultShapeBox.shapeSize
        const lineW = defaultShapeBox.lineW
        const lineH = defaultShapeBox.lineH
        const common = {
          id: crypto.randomUUID(),
          x: 0,
          y: 0,
          width: kind === 'line' || kind === 'arrow' ? Math.round(lineW * 1.2) : perfectSize,
          height:
            kind === 'line' || kind === 'arrow'
              ? Math.max(24, Math.round(lineH * 0.35))
              : perfectSize,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          blurPct: 0,
          shadow: null,
        }
        if (kind === 'rect') {
          addObjects([
            createCenteredObject({
              ...common,
              type: 'rect',
              fill: DEFAULT_FILL,
              stroke: DEFAULT_STROKE,
              strokeWidth: 0,
              cornerRadius: Math.round(perfectSize * 0.06),
            }),
          ])
          return
        }
        if (kind === 'ellipse') {
          addObjects([
            createCenteredObject({
              ...common,
              type: 'ellipse',
              fill: DEFAULT_FILL,
              stroke: DEFAULT_STROKE,
              strokeWidth: 0,
            }),
          ])
          return
        }
        if (kind === 'polygon') {
          addObjects([
            createCenteredObject({
              ...common,
              type: 'polygon',
              fill: DEFAULT_FILL,
              stroke: DEFAULT_STROKE,
              strokeWidth: 0,
              sides: 6,
            }),
          ])
          return
        }
        if (kind === 'star') {
          addObjects([
            createCenteredObject({
              ...common,
              type: 'star',
              fill: DEFAULT_FILL,
              stroke: DEFAULT_STROKE,
              strokeWidth: 0,
              points: 5,
            }),
          ])
          return
        }
        if (kind === 'line') {
          addObjects([
            createCenteredObject({
              ...common,
              type: 'line',
              stroke: DEFAULT_LINE_STROKE,
              strokeWidth: 6,
              lineStyle: 'solid',
              roundedEnds: true,
            }),
          ])
          return
        }
        addObjects([
          createCenteredObject({
            ...common,
            type: 'arrow',
            stroke: DEFAULT_LINE_STROKE,
            strokeWidth: 6,
            lineStyle: 'solid',
            roundedEnds: true,
            pathType: 'straight',
            headSize: 1,
            curveBulge: Math.round(common.height * 0.4),
            curveT: 0.5,
          }),
        ])
      },
      [addObjects, createCenteredObject, defaultShapeBox],
    )

    const addText = useCallback(() => {
      addObjects([
        createCenteredObject({
          id: crypto.randomUUID(),
          type: 'text',
          x: 0,
          y: 0,
          width: Math.round(artboardW * 0.28),
          height: Math.round(defaultShapeBox.fontSize * 1.4),
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          blurPct: 0,
          shadow: null,
          text: 'Add text',
          fill: { type: 'solid', color: '#171717' },
          stroke: DEFAULT_STROKE,
          strokeWidth: 0,
          fontFamily: 'Inter',
          fontSize: defaultShapeBox.fontSize,
          lineHeight: 1.22,
          fontWeight: 'normal',
          fontStyle: 'normal',
          underline: false,
          textAlign: 'left',
        }),
      ])
    }, [addObjects, artboardW, createCenteredObject, defaultShapeBox.fontSize])

    const placeImageObject = useCallback(
      async (
        rawUrl: string,
        opts?: {
          x?: number
          y?: number
          width?: number
          height?: number
          origin?: 'center' | 'top-left'
        },
      ) => {
        const meta = await loadImageMetadata(rawUrl)
        const maxEdge = 800
        let width = opts?.width ?? meta.naturalWidth
        let height = opts?.height ?? meta.naturalHeight
        if (!opts?.width && !opts?.height) {
          const scaleDown = Math.min(1, maxEdge / Math.max(width, height))
          width = Math.round(width * scaleDown)
          height = Math.round(height * scaleDown)
        } else if (opts?.width && !opts?.height) {
          height = Math.round((meta.naturalHeight / meta.naturalWidth) * opts.width)
        } else if (!opts?.width && opts?.height) {
          width = Math.round((meta.naturalWidth / meta.naturalHeight) * opts.height)
        }
        const origin = opts?.origin ?? 'center'
        const x =
          origin === 'center'
            ? (opts?.x ?? artboardW / 2) - width / 2
            : (opts?.x ?? artboardW / 2 - width / 2)
        const y =
          origin === 'center'
            ? (opts?.y ?? artboardH / 2) - height / 2
            : (opts?.y ?? artboardH / 2 - height / 2)
        const obj: SceneImage = {
          id: crypto.randomUUID(),
          type: 'image',
          x,
          y,
          width,
          height,
          rotation: 0,
          opacity: 1,
          visible: true,
          locked: false,
          blurPct: 0,
          shadow: null,
          src: meta.src,
          naturalWidth: meta.naturalWidth,
          naturalHeight: meta.naturalHeight,
          crop: {
            x: 0,
            y: 0,
            width: meta.naturalWidth,
            height: meta.naturalHeight,
          },
          cornerRadius: 0,
        }
        addObjects([obj])
        return obj.id
      },
      [addObjects, artboardH, artboardW],
    )

    const addImageFromFiles = useCallback(
      async (files: FileList | File[] | null | undefined) => {
        const list = files ? Array.from(files) : []
        for (const file of list) {
          if (!isImageFile(file)) continue
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
          await placeImageObject(dataUrl)
        }
      },
      [placeImageObject],
    )

    const updateSelectedObjects = useCallback(
      (updater: (obj: SceneObject) => SceneObject) => {
        setDoc((prev) => ({
          ...prev,
          objects: prev.objects.map((obj) =>
            selectedIds.includes(obj.id) ? updater(obj) : obj,
          ),
        }))
      },
      [selectedIds],
    )

    const deleteSelection = useCallback(() => {
      if (selectedIds.length === 0) return
      setDoc((prev) => ({
        ...prev,
        objects: removeTopLevelObjects(prev.objects, selectedIds),
      }))
      setSelectedIds([])
      setTextEditingId(null)
    }, [selectedIds])

    const duplicateElement = useCallback(async () => {
      if (selectedIds.length === 0) return
      const duplicates = doc.objects
        .filter((obj) => selectedIds.includes(obj.id))
        .map((obj) => {
          const dup = renameWithFreshIds(obj)
          dup.x += CLIPBOARD_PASTE_OFFSET
          dup.y += CLIPBOARD_PASTE_OFFSET
          dup.locked = false
          return dup
        })
      addObjects(duplicates)
    }, [addObjects, doc.objects, selectedIds])

    const copyElementToClipboard = useCallback(async () => {
      if (selectedIds.length === 0) return
      const objects = doc.objects
        .filter((obj) => selectedIds.includes(obj.id))
        .map((obj) => cloneSceneObject(obj))
      await navigator.clipboard.writeText(
        JSON.stringify({ avnacClip: true, v: 2, objects }),
      )
    }, [doc.objects, selectedIds])

    const pasteFromClipboard = useCallback(
      async (anchor?: { x: number; y: number }) => {
        const imageFiles = await readClipboardImageFiles().catch(() => [])
        if (imageFiles.length > 0) {
          await addImageFromFiles(imageFiles)
          return
        }
        const text = await navigator.clipboard.readText().catch(() => '')
        if (!text) return
        let parsed: { avnacClip?: boolean; objects?: unknown[] } | null = null
        try {
          parsed = JSON.parse(text) as { avnacClip?: boolean; objects?: unknown[] }
        } catch {
          parsed = null
        }
        if (parsed?.avnacClip && Array.isArray(parsed.objects)) {
          const objects = parsed.objects
            .map((row) => parseAvnacDocument({ v: AVNAC_DOC_VERSION, artboard: doc.artboard, bg: doc.bg, objects: [row] })?.objects[0] ?? null)
            .filter((row): row is SceneObject => row != null)
            .map((obj) => renameWithFreshIds(obj))
          if (objects.length > 0) {
            if (anchor) {
              const bounds = getSelectionBounds(objects)
              if (bounds) {
                const dx = anchor.x - bounds.left
                const dy = anchor.y - bounds.top
                for (const obj of objects) {
                  obj.x += dx
                  obj.y += dy
                }
              }
            } else {
              for (const obj of objects) {
                obj.x += CLIPBOARD_PASTE_OFFSET
                obj.y += CLIPBOARD_PASTE_OFFSET
              }
            }
            addObjects(objects)
            return
          }
        }
        if (/^https?:\/\//i.test(text.trim()) || /^data:image\//i.test(text.trim())) {
          await placeImageObject(text.trim(), anchor ? { ...anchor, origin: 'top-left' } : undefined)
        }
      },
      [addImageFromFiles, addObjects, doc.artboard, doc.bg, placeImageObject],
    )

    const toggleElementLock = useCallback(() => {
      updateSelectedObjects((obj) => ({ ...obj, locked: !elementToolbarLockedDisplay }))
    }, [elementToolbarLockedDisplay, updateSelectedObjects])

    const groupSelection = useCallback(() => {
      const picked = doc.objects.filter((obj) => selectedIds.includes(obj.id))
      const group = createGroupFromSelection(picked)
      if (!group) return
      const firstIndex = doc.objects.findIndex((obj) => selectedIds.includes(obj.id))
      const remaining = doc.objects.filter((obj) => !selectedIds.includes(obj.id))
      remaining.splice(firstIndex < 0 ? remaining.length : firstIndex, 0, group)
      setDoc((prev) => ({ ...prev, objects: remaining }))
      setSelectedIds([group.id])
    }, [doc.objects, selectedIds])

    const ungroupSelection = useCallback(() => {
      if (!selectedSingle || selectedSingle.type !== 'group') return
      const children = ungroupSceneObject(selectedSingle)
      setDoc((prev) => {
        const idx = prev.objects.findIndex((obj) => obj.id === selectedSingle.id)
        const next = prev.objects.filter((obj) => obj.id !== selectedSingle.id)
        next.splice(idx < 0 ? next.length : idx, 0, ...children)
        return { ...prev, objects: next }
      })
      setSelectedIds(children.map((child) => child.id))
    }, [selectedSingle])

    const applyBackgroundPicked = useCallback((bg: BgValue) => {
      setDoc((prev) => ({ ...prev, bg }))
    }, [])

    const applyPaintToSelection = useCallback(
      (paint: BgValue) => {
        updateSelectedObjects((obj) => {
          if (obj.type === 'line' || obj.type === 'arrow') return setObjectStroke(obj, paint)
          if (objectSupportsFill(obj)) return setObjectFill(obj, paint)
          return obj
        })
      },
      [updateSelectedObjects],
    )

    const applyOutlineStrokeWidth = useCallback(
      (px: number) => {
        updateSelectedObjects((obj) => setObjectStrokeWidth(obj, px))
      },
      [updateSelectedObjects],
    )

    const applyOutlineStrokePaint = useCallback(
      (paint: BgValue) => {
        updateSelectedObjects((obj) => setObjectStroke(obj, paint))
      },
      [updateSelectedObjects],
    )

    const applyBlurToSelection = useCallback(
      (blurPct: number) => {
        updateSelectedObjects((obj) => ({ ...obj, blurPct }))
      },
      [updateSelectedObjects],
    )

    const applyOpacityToSelection = useCallback(
      (opacityPct: number) => {
        updateSelectedObjects((obj) => ({
          ...obj,
          opacity: Math.max(0, Math.min(1, opacityPct / 100)),
        }))
      },
      [updateSelectedObjects],
    )

    const applyShadowToSelection = useCallback(
      (shadow: ShadowUi) => {
        const inactive =
          shadow.blur === 0 &&
          shadow.offsetX === 0 &&
          shadow.offsetY === 0 &&
          shadow.opacityPct === 0
        updateSelectedObjects((obj) => ({
          ...obj,
          shadow: inactive ? null : { ...shadow },
        }))
      },
      [updateSelectedObjects],
    )

    const applyRectCornerRadius = useCallback(
      (radius: number) => {
        updateSelectedObjects((obj) =>
          obj.type === 'rect' ? setObjectCornerRadius(obj, radius) : obj,
        )
      },
      [updateSelectedObjects],
    )

    const applyImageCornerRadius = useCallback(
      (radius: number) => {
        updateSelectedObjects((obj) =>
          obj.type === 'image' ? setObjectCornerRadius(obj, radius) : obj,
        )
      },
      [updateSelectedObjects],
    )

    const applyPolygonSides = useCallback(
      (sides: number) => {
        updateSelectedObjects((obj) =>
          obj.type === 'polygon'
            ? { ...obj, sides: Math.max(3, Math.min(32, Math.round(sides))) }
            : obj,
        )
      },
      [updateSelectedObjects],
    )

    const applyStarPoints = useCallback(
      (points: number) => {
        updateSelectedObjects((obj) =>
          obj.type === 'star'
            ? { ...obj, points: Math.max(4, Math.min(32, Math.round(points))) }
            : obj,
        )
      },
      [updateSelectedObjects],
    )

    const applyArrowLineStyle = useCallback(
      (lineStyle: SceneLine['lineStyle']) => {
        updateSelectedObjects((obj) =>
          obj.type === 'line' || obj.type === 'arrow' ? { ...obj, lineStyle } : obj,
        )
      },
      [updateSelectedObjects],
    )

    const applyArrowRoundedEnds = useCallback(
      (roundedEnds: boolean) => {
        updateSelectedObjects((obj) =>
          obj.type === 'line' || obj.type === 'arrow' ? { ...obj, roundedEnds } : obj,
        )
      },
      [updateSelectedObjects],
    )

    const applyArrowStrokeWidth = useCallback(
      (strokeWidth: number) => {
        updateSelectedObjects((obj) =>
          obj.type === 'line' || obj.type === 'arrow'
            ? { ...obj, strokeWidth: Math.max(1, strokeWidth) }
            : obj,
        )
      },
      [updateSelectedObjects],
    )

    const applyArrowPathType = useCallback(
      (pathType: SceneArrow['pathType']) => {
        updateSelectedObjects((obj) =>
          obj.type === 'arrow' ? { ...obj, pathType } : obj,
        )
      },
      [updateSelectedObjects],
    )

    const onTextFormatChange = useCallback(
      (patch: Partial<TextFormatToolbarValues>) => {
        if (patch.fontFamily) void loadGoogleFontFamily(patch.fontFamily)
        updateSelectedObjects((obj) => {
          if (obj.type !== 'text') return obj
          const next = { ...obj }
          if (patch.fontFamily) next.fontFamily = patch.fontFamily
          if (patch.fontSize) next.fontSize = patch.fontSize
          if (patch.fillStyle) next.fill = patch.fillStyle
          if (patch.textAlign) next.textAlign = patch.textAlign
          if (patch.bold !== undefined) next.fontWeight = patch.bold ? 'bold' : 'normal'
          if (patch.italic !== undefined) next.fontStyle = patch.italic ? 'italic' : 'normal'
          if (patch.underline !== undefined) next.underline = patch.underline
          const layout = layoutSceneText(next)
          next.height = Math.max(
            layout.height,
            next.fontSize * sceneTextLineHeight(next),
          )
          return next
        })
      },
      [updateSelectedObjects],
    )

    const alignElementToArtboard = useCallback(
      (kind: CanvasAlignKind) => {
        if (!selectionBounds) return
        let dx = 0
        let dy = 0
        if (kind === 'left') dx = ARTBOARD_ALIGN_PAD - selectionBounds.left
        if (kind === 'centerH')
          dx = artboardW / 2 - (selectionBounds.left + selectionBounds.width / 2)
        if (kind === 'right')
          dx = artboardW - ARTBOARD_ALIGN_PAD - (selectionBounds.left + selectionBounds.width)
        if (kind === 'top') dy = ARTBOARD_ALIGN_PAD - selectionBounds.top
        if (kind === 'centerV')
          dy = artboardH / 2 - (selectionBounds.top + selectionBounds.height / 2)
        if (kind === 'bottom')
          dy = artboardH - ARTBOARD_ALIGN_PAD - (selectionBounds.top + selectionBounds.height)
        updateSelectedObjects((obj) => ({ ...obj, x: obj.x + dx, y: obj.y + dy }))
      },
      [artboardH, artboardW, selectionBounds, updateSelectedObjects],
    )

    const alignSelectedElements = useCallback(
      (kind: CanvasAlignKind) => {
        if (selectedObjects.length < 2) return
        const bounds = getSelectionBounds(selectedObjects)
        if (!bounds) return
        updateSelectedObjects((obj) => {
          const box = getObjectRotatedBounds(obj)
          if (kind === 'left') return { ...obj, x: obj.x + (bounds.left - box.left) }
          if (kind === 'right')
            return {
              ...obj,
              x:
                obj.x +
                (bounds.left + bounds.width - (box.left + box.width)),
            }
          if (kind === 'centerH')
            return {
              ...obj,
              x:
                obj.x +
                (bounds.left + bounds.width / 2 - (box.left + box.width / 2)),
            }
          if (kind === 'top') return { ...obj, y: obj.y + (bounds.top - box.top) }
          if (kind === 'bottom')
            return {
              ...obj,
              y:
                obj.y +
                (bounds.top + bounds.height - (box.top + box.height)),
            }
          return {
            ...obj,
            y:
              obj.y +
              (bounds.top + bounds.height / 2 - (box.top + box.height / 2)),
          }
        })
      },
      [selectedObjects, updateSelectedObjects],
    )

    const onArtboardResize = useCallback((width: number, height: number) => {
      setDoc((prev) => ({
        ...prev,
        artboard: { width, height },
      }))
      if (!zoomUserAdjustedRef.current) window.setTimeout(() => fitZoom(), 0)
    }, [fitZoom])

    const openImageCropModal = useCallback(() => {
      if (!selectedSingle || selectedSingle.type !== 'image') return
      imageCropTargetIdRef.current = selectedSingle.id
      setImageCropSrc(selectedSingle.src)
      setImageCropInitial({
        x: selectedSingle.crop.x,
        y: selectedSingle.crop.y,
        w: selectedSingle.crop.width,
        h: selectedSingle.crop.height,
      })
      setImageCropOpen(true)
    }, [selectedSingle])

    const applyImageCropFromModal = useCallback(
      (rect: ImageCropModalApplyPayload) => {
        const targetId = imageCropTargetIdRef.current
        if (!targetId) return
        setDoc((prev) => ({
          ...prev,
          objects: prev.objects.map((obj) =>
            obj.id === targetId && obj.type === 'image'
              ? {
                  ...obj,
                  crop: {
                    x: rect.cropX,
                    y: rect.cropY,
                    width: rect.width,
                    height: rect.height,
                  },
                }
              : obj,
          ),
        }))
        setImageCropOpen(false)
      },
      [],
    )

    const cancelImageCrop = useCallback(() => {
      setImageCropOpen(false)
    }, [])

    const onLayerReorder = useCallback((orderedLayerIds: string[]) => {
      const byId = new Map(doc.objects.map((obj) => [obj.id, obj]))
      const next = [...orderedLayerIds]
        .reverse()
        .map((id) => byId.get(id))
        .filter((obj): obj is SceneObject => !!obj)
      setDoc((prev) => ({ ...prev, objects: next }))
    }, [doc.objects])

    const onSelectLayer = useCallback((stackIndex: number) => {
      const obj = doc.objects[stackIndex]
      if (!obj) return
      setSelectedIds([obj.id])
    }, [doc.objects])

    const onToggleLayerVisible = useCallback((stackIndex: number) => {
      setDoc((prev) => ({
        ...prev,
        objects: prev.objects.map((obj, index) =>
          index === stackIndex ? { ...obj, visible: !obj.visible } : obj,
        ),
      }))
    }, [])

    const onLayerBringForward = useCallback((stackIndex: number) => {
      setDoc((prev) => {
        if (stackIndex >= prev.objects.length - 1) return prev
        const next = [...prev.objects]
        const swap = next[stackIndex]
        next[stackIndex] = next[stackIndex + 1]
        next[stackIndex + 1] = swap
        return { ...prev, objects: next }
      })
    }, [])

    const onLayerSendBackward = useCallback((stackIndex: number) => {
      setDoc((prev) => {
        if (stackIndex <= 0) return prev
        const next = [...prev.objects]
        const swap = next[stackIndex]
        next[stackIndex] = next[stackIndex - 1]
        next[stackIndex - 1] = swap
        return { ...prev, objects: next }
      })
    }, [])

    const onRenameLayer = useCallback((stackIndex: number, name: string) => {
      setDoc((prev) => ({
        ...prev,
        objects: prev.objects.map((obj, index) =>
          index === stackIndex ? { ...obj, name: name.trim() || undefined } : obj,
        ),
      }))
    }, [])

    const createVectorBoard = useCallback(() => {
      const id = crypto.randomUUID()
      const board: AvnacVectorBoardMeta = {
        id,
        name: `Vector ${vectorBoards.length + 1}`,
        createdAt: Date.now(),
      }
      setVectorBoards((prev) => [...prev, board])
      setVectorBoardDocs((prev) => ({
        ...prev,
        [id]: emptyVectorBoardDocument(),
      }))
      setVectorWorkspaceId(id)
    }, [vectorBoards.length])

    const deleteVectorBoard = useCallback((id: string) => {
      setVectorBoards((prev) => prev.filter((board) => board.id !== id))
      setVectorBoardDocs((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setDoc((prev) => ({
        ...prev,
        objects: prev.objects.filter(
          (obj) => !(obj.type === 'vector-board' && obj.boardId === id),
        ),
      }))
      if (vectorWorkspaceId === id) setVectorWorkspaceId(null)
    }, [vectorWorkspaceId])

    const openVectorBoardWorkspace = useCallback((id: string) => {
      setVectorWorkspaceId(id)
    }, [])

    const closeVectorWorkspace = useCallback(() => {
      setVectorWorkspaceId(null)
    }, [])

    const onVectorBoardDocumentChange = useCallback(
      (boardId: string, next: VectorBoardDocument) => {
        setVectorBoardDocs((prev) => ({ ...prev, [boardId]: next }))
      },
      [],
    )

    const placeVectorBoard = useCallback(
      (boardId: string, x?: number, y?: number) => {
        const docForBoard = vectorBoardDocs[boardId]
        if (!docForBoard || !vectorDocHasRenderableStrokes(docForBoard)) return
        const width = 280
        const height = 280
        addObjects([
          {
            id: crypto.randomUUID(),
            type: 'vector-board',
            x: x ?? artboardW / 2 - width / 2,
            y: y ?? artboardH / 2 - height / 2,
            width,
            height,
            rotation: 0,
            opacity: 1,
            visible: true,
            locked: false,
            blurPct: 0,
            shadow: null,
            boardId,
          },
        ])
      },
      [addObjects, artboardH, artboardW, vectorBoardDocs],
    )

    const placeActiveVectorBoardAtArtboardCenter = useCallback(() => {
      if (!vectorWorkspaceId) return
      placeVectorBoard(vectorWorkspaceId)
    }, [placeVectorBoard, vectorWorkspaceId])

    const downloadDocumentJson = useCallback((value: AvnacDocument) => {
      const blob = new Blob([JSON.stringify(value, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'avnac-document.json'
      a.click()
      URL.revokeObjectURL(url)
    }, [])

    const saveDocument = useCallback(() => {
      downloadDocumentJson(doc)
    }, [doc, downloadDocumentJson])

    const loadDocument = useCallback(async (file: File) => {
      const text = await file.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error('Invalid JSON file.')
      }
      const next = parseAvnacDocument(parsed)
      if (!next) throw new Error('This file is not an Avnac document.')
      applyingHistoryRef.current = true
      setDoc(next)
      setSelectedIds([])
      setTextEditingId(null)
      historyRef.current = [cloneAvnacDocument(next)]
      historyIndexRef.current = 0
      window.setTimeout(() => {
        applyingHistoryRef.current = false
      }, 0)
    }, [])

    const exportPng = useCallback(
      (opts?: ExportPngOptions) => {
        void (async () => {
          try {
            const url = await renderAvnacDocumentToDataUrl(doc, vectorBoardDocs, {
              multiplier: opts?.multiplier ?? 1,
              transparent: opts?.transparent ?? false,
            })
            const a = document.createElement('a')
            a.href = url
            a.download = `${persistDisplayNameRef.current || 'avnac'}.png`
            a.click()
          } catch (error) {
            console.error('[avnac] PNG export failed', error)
            setExportError(
              'Could not export this canvas. Some images could not be prepared.',
            )
          }
        })()
      },
      [doc, vectorBoardDocs],
    )

    useImperativeHandle(
      ref,
      () => ({ exportPng, saveDocument, loadDocument }),
      [exportPng, saveDocument, loadDocument],
    )

    const onZoomSliderChange = useCallback((pct: number) => {
      zoomUserAdjustedRef.current = true
      setZoomPercent(Math.max(ZOOM_MIN_PCT, Math.min(ZOOM_MAX_PCT, Math.round(pct))))
    }, [])

    const onZoomFitRequest = useCallback(() => {
      zoomUserAdjustedRef.current = false
      fitZoom()
    }, [fitZoom])

    const commitTextDraft = useCallback(() => {
      if (!textEditingId) return
      setDoc((prev) => ({
        ...prev,
        objects: prev.objects.map((obj) => {
          if (obj.id !== textEditingId || obj.type !== 'text') return obj
          const next: SceneText = { ...obj, text: textDraft }
          const layout = layoutSceneText(next)
          next.height = Math.max(layout.height, next.fontSize * 1.22)
          return next
        }),
      }))
      setTextEditingId(null)
    }, [textDraft, textEditingId])

    const startWindowDrag = useCallback(
      (state: DragState) => {
        dragStateRef.current = state
        setHoveredId(null)
        setMarqueeRect(null)
        snapGuideXRef.current = null
        snapGuideYRef.current = null
        setSnapGuides([])
        setTransformDimensionUi(null)
        const onMove = (e: PointerEvent) => {
          const drag = dragStateRef.current
          if (!drag) return
          const pt = pointerToScene(e.clientX, e.clientY)
          if (drag.kind === 'marquee') {
            const nextRect = rectFromPoints(
              drag.startSceneX,
              drag.startSceneY,
              pt.x,
              pt.y,
            )
            setMarqueeRect(nextRect)
            const intersectedIds = drag.objects
              .filter(
                (obj) =>
                  obj.visible &&
                  boundsIntersect(getObjectRotatedBounds(obj), nextRect),
              )
              .map((obj) => obj.id)
            setSelectedIds(
              drag.additive
                ? mergeUniqueIds(drag.initialSelection, intersectedIds)
                : intersectedIds,
            )
            return
          }
          if (drag.kind === 'move') {
            const rawDx = pt.x - drag.startSceneX
            const rawDy = pt.y - drag.startSceneY
            let dx = rawDx
            let dy = rawDy
            if (drag.initialBounds) {
              const snap = computeSceneSnap(
                {
                  ...drag.initialBounds,
                  left: drag.initialBounds.left + rawDx,
                  top: drag.initialBounds.top + rawDy,
                },
                drag.snapTargets,
                artboardW,
                artboardH,
                sceneSnapThreshold(artboardW, artboardH),
                snapGuideXRef.current,
                snapGuideYRef.current,
              )
              dx += Math.abs(snap.dx) >= SNAP_DEADBAND_PX ? snap.dx : 0
              dy += Math.abs(snap.dy) >= SNAP_DEADBAND_PX ? snap.dy : 0
              snapGuideXRef.current =
                snap.guides.find((guide) => guide.axis === 'v')?.pos ?? null
              snapGuideYRef.current =
                snap.guides.find((guide) => guide.axis === 'h')?.pos ?? null
              setSnapGuides(snap.guides)
            } else {
              snapGuideXRef.current = null
              snapGuideYRef.current = null
              setSnapGuides([])
            }
            setDoc((prev) => ({
              ...prev,
              objects: prev.objects.map((obj) => {
                const start = drag.initial.get(obj.id)
                return start ? { ...obj, x: start.x + dx, y: start.y + dy } : obj
              }),
            }))
            return
          }
          if (drag.kind === 'rotate') {
            const angle = angleFromPoints(
              drag.center.x,
              drag.center.y,
              pt.x,
              pt.y,
            )
            const delta = angle - drag.startAngle
            const nextRotation = drag.initialRotation + delta
            setDoc((prev) => ({
              ...prev,
              objects: prev.objects.map((obj) =>
                obj.id === drag.id
                  ? { ...obj, rotation: e.shiftKey ? snapAngle(nextRotation) : nextRotation }
                  : obj,
              ),
            }))
            return
          }
          const initial = drag.initial
          const center = getObjectCenter(initial)
          const local = pointerSceneDelta(pt.x - center.x, pt.y - center.y, initial.rotation)
          const centeredScaling = e.altKey
          const freeformScaling = e.shiftKey
          const shouldLockShapeAspect =
            isPerfectShapeObject(initial) &&
            isCornerHandle(drag.handle) &&
            !freeformScaling
          const anchor = getHandleLocalPosition(
            oppositeHandle(drag.handle),
            initial.width,
            initial.height,
          )
          const current = getHandleLocalPosition(drag.handle, initial.width, initial.height)
          const px =
            drag.handle === 'n' || drag.handle === 's' ? current.x : local.x
          const py =
            drag.handle === 'e' || drag.handle === 'w' ? current.y : local.y
          let minX = Math.min(anchor.x, px)
          let maxX = Math.max(anchor.x, px)
          let minY = Math.min(anchor.y, py)
          let maxY = Math.max(anchor.y, py)
          if (centeredScaling) {
            const halfW =
              drag.handle === 'n' || drag.handle === 's'
                ? initial.width / 2
                : Math.max(6, Math.abs(local.x))
            const halfH =
              drag.handle === 'e' || drag.handle === 'w'
                ? initial.height / 2
                : Math.max(6, Math.abs(local.y))
            minX = -halfW
            maxX = halfW
            minY = -halfH
            maxY = halfH
          } else if (drag.handle === 'e' || drag.handle === 'w') {
            minY = -initial.height / 2
            maxY = initial.height / 2
          } else if (drag.handle === 'n' || drag.handle === 's') {
            minX = -initial.width / 2
            maxX = initial.width / 2
          } else if (shouldLockShapeAspect) {
            const constrained = constrainAspectRatioBounds(
              drag.handle,
              anchor,
              { x: px, y: py },
              initial.width,
              initial.height,
            )
            minX = constrained.minX
            maxX = constrained.maxX
            minY = constrained.minY
            maxY = constrained.maxY
          }
          if (centeredScaling && shouldLockShapeAspect) {
            const scale = Math.max(
              12 / Math.max(1, initial.width),
              12 / Math.max(1, initial.height),
              (maxX - minX) / Math.max(1, initial.width),
              (maxY - minY) / Math.max(1, initial.height),
            )
            const nextW = Math.max(1, initial.width) * scale
            const nextH = Math.max(1, initial.height) * scale
            minX = -nextW / 2
            maxX = nextW / 2
            minY = -nextH / 2
            maxY = nextH / 2
          }
          if (maxX - minX < 12) {
            const mid = (maxX + minX) / 2
            minX = mid - 6
            maxX = mid + 6
          }
          if (maxY - minY < 12) {
            const mid = (maxY + minY) / 2
            minY = mid - 6
            maxY = mid + 6
          }
          const localCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
          const globalCenterDelta = rotateDeltaToScene(
            localCenter.x,
            localCenter.y,
            initial.rotation,
          )
          const nextCenter = {
            x: centeredScaling ? center.x : center.x + globalCenterDelta.x,
            y: centeredScaling ? center.y : center.y + globalCenterDelta.y,
          }
          const nextBox = {
            x: nextCenter.x - (maxX - minX) / 2,
            y: nextCenter.y - (maxY - minY) / 2,
            width: maxX - minX,
            height: maxY - minY,
          }
          const nextObject = resizeObjectWithBox(initial, nextBox, {
            handle: drag.handle,
            initial,
          })
          const nextBounds = getObjectRotatedBounds(nextObject)
          const frameEl = artboardInnerRef.current
          if (frameEl) {
            setTransformDimensionUi(
              computeTransformDimensionUi(frameEl, artboardW, artboardH, nextBounds),
            )
          }
          setDoc((prev) => ({
            ...prev,
            objects: prev.objects.map((obj) =>
              obj.id === drag.id ? nextObject : obj,
            ),
          }))
        }

        const onUp = () => {
          dragStateRef.current = null
          setMarqueeRect(null)
          snapGuideXRef.current = null
          snapGuideYRef.current = null
          setSnapGuides([])
          setTransformDimensionUi(null)
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          window.removeEventListener('pointercancel', onUp)
        }

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
      },
      [artboardH, artboardW, pointerToScene],
    )

    const onObjectPointerDown = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>, obj: SceneObject) => {
        if (e.button !== 0) return
        e.stopPropagation()
        setBackgroundActive(false)
        if (textEditingId && textEditingId !== obj.id) {
          commitTextDraft()
        }
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          setSelectedIds((prev) =>
            prev.includes(obj.id) ? prev.filter((id) => id !== obj.id) : [...prev, obj.id],
          )
          return
        }
        if (!selectedIds.includes(obj.id)) setSelectedIds([obj.id])
        setContextMenu(null)
        if (obj.locked) return
        const pt = pointerToScene(e.clientX, e.clientY)
        const sourceIds = selectedIds.includes(obj.id) ? selectedIds : [obj.id]
        let ids = sourceIds
        let movingObjects = doc.objects.filter((row) => ids.includes(row.id))
        if (e.altKey && movingObjects.length > 0) {
          const duplicates = movingObjects.map((row) => {
            const dup = renameWithFreshIds(row)
            dup.locked = false
            return dup
          })
          ids = duplicates.map((row) => row.id)
          movingObjects = duplicates
          setDoc((prev) => ({ ...prev, objects: [...prev.objects, ...duplicates] }))
          setSelectedIds(ids)
        }
        const initial = new Map<string, { x: number; y: number }>()
        for (const row of movingObjects) {
          initial.set(row.id, { x: row.x, y: row.y })
        }
        const initialBounds = getSelectionBounds(movingObjects)
        const snapTargets = doc.objects
          .filter((row) => row.visible && !sourceIds.includes(row.id))
          .map((row) => getObjectRotatedBounds(row))
        startWindowDrag({
          kind: 'move',
          ids,
          startSceneX: pt.x,
          startSceneY: pt.y,
          initial,
          initialBounds,
          snapTargets,
        })
      },
      [
        commitTextDraft,
        doc.objects,
        pointerToScene,
        selectedIds,
        startWindowDrag,
        textEditingId,
      ],
    )

    const onSelectionHandlePointerDown = useCallback(
      (e: ReactPointerEvent<HTMLButtonElement>, handle: ResizeHandleId) => {
        if (!selectedSingle || selectedSingle.locked) return
        e.preventDefault()
        e.stopPropagation()
        startWindowDrag({
          kind: 'resize',
          id: selectedSingle.id,
          handle,
          initial: cloneSceneObject(selectedSingle),
        })
      },
      [selectedSingle, startWindowDrag],
    )

    const onRotateHandlePointerDown = useCallback(
      (e: ReactPointerEvent<HTMLButtonElement>) => {
        if (!selectedSingle || selectedSingle.locked) return
        e.preventDefault()
        e.stopPropagation()
        const pt = pointerToScene(e.clientX, e.clientY)
        const center = getObjectCenter(selectedSingle)
        startWindowDrag({
          kind: 'rotate',
          id: selectedSingle.id,
          center,
          initialRotation: selectedSingle.rotation,
          startAngle: angleFromPoints(center.x, center.y, pt.x, pt.y),
        })
      },
      [pointerToScene, selectedSingle, startWindowDrag],
    )

    const onViewportPointerDown = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return
        if (textEditingId) {
          commitTextDraft()
        }
        setContextMenu(null)
        setHoveredId(null)
        setBackgroundHovered(true)
        const additive = e.shiftKey || e.metaKey || e.ctrlKey
        const pt = pointerToScene(e.clientX, e.clientY)
        setBackgroundActive(!additive)
        if (!additive) setSelectedIds([])
        startWindowDrag({
          kind: 'marquee',
          startSceneX: pt.x,
          startSceneY: pt.y,
          additive,
          initialSelection: additive ? selectedIds : [],
          objects: doc.objects.filter((obj) => obj.visible),
        })
      },
      [
        commitTextDraft,
        doc.objects,
        pointerToScene,
        selectedIds,
        startWindowDrag,
        textEditingId,
      ],
    )

    const onArtboardPointerEnter = useCallback(() => {
      setBackgroundHovered(true)
    }, [])

    const onArtboardPointerMove = useCallback(() => {
      setBackgroundHovered(true)
    }, [])

    const onArtboardPointerLeave = useCallback(() => {
      setHoveredId(null)
      setBackgroundHovered(false)
    }, [])

    const onViewportContextMenu = useCallback(
      (e: ReactMouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        const pt = pointerToScene(e.clientX, e.clientY)
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          sceneX: pt.x,
          sceneY: pt.y,
          hasSelection: selectedIds.length > 0,
          locked: elementToolbarLockedDisplay,
        })
      },
      [elementToolbarLockedDisplay, pointerToScene, selectedIds.length],
    )

    const closeContextMenu = useCallback(() => setContextMenu(null), [])

    const vectorWorkspaceName = useMemo(
      () => vectorBoards.find((board) => board.id === vectorWorkspaceId)?.name ?? 'Vector board',
      [vectorBoards, vectorWorkspaceId],
    )

    useEditorKeyboardShortcuts({
      applyingHistoryRef,
      commitTextDraft,
      copyElementToClipboard,
      deleteSelection,
      duplicateElement,
      groupSelection,
      historyIndexRef,
      historyRef,
      nudgeSelection,
      onZoomFitRequest,
      pasteFromClipboard,
      reorderSelectionLayers,
      setDoc,
      setShortcutsOpen,
      ungroupSelection,
    })

    useEffect(() => {
      const onPaste = (e: ClipboardEvent) => {
        if (textEditingId) return
        const files = imageFilesFromTransfer(e.clipboardData)
        if (files.length > 0) {
          e.preventDefault()
          void addImageFromFiles(files)
          return
        }
        const imageUrl = e.clipboardData
          ? extractImageUrlFromDataTransfer(e.clipboardData)
          : null
        if (imageUrl) {
          e.preventDefault()
          void placeImageObject(imageUrl)
        }
      }
      window.addEventListener('paste', onPaste)
      return () => window.removeEventListener('paste', onPaste)
    }, [addImageFromFiles, placeImageObject, textEditingId])

    const onViewportDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      if (
        e.dataTransfer.types.includes(AVNAC_VECTOR_BOARD_DRAG_MIME) ||
        imageFilesFromTransfer(e.dataTransfer).length > 0 ||
        !!extractImageUrlFromDataTransfer(e.dataTransfer)
      ) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }
    }, [])

    const onViewportDrop = useCallback(
      (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const pt = pointerToScene(e.clientX, e.clientY)
        const boardId = e.dataTransfer.getData(AVNAC_VECTOR_BOARD_DRAG_MIME)
        if (boardId) {
          placeVectorBoard(boardId, pt.x, pt.y)
          return
        }
        const files = imageFilesFromTransfer(e.dataTransfer)
        if (files.length > 0) {
          void addImageFromFiles(files)
          return
        }
        const imageUrl = extractImageUrlFromDataTransfer(e.dataTransfer)
        if (imageUrl) void placeImageObject(imageUrl, { x: pt.x, y: pt.y, origin: 'top-left' })
      },
      [addImageFromFiles, placeImageObject, placeVectorBoard, pointerToScene],
    )

    const aiController = useMemo<AiDesignController>(
      () => ({
        getCanvas: () => ({
          width: doc.artboard.width,
          height: doc.artboard.height,
          background: doc.bg.type === 'solid' ? doc.bg.color : doc.bg.css,
          objectCount: doc.objects.length,
          objects: doc.objects.map<AiObjectSummary>((obj) => ({
            id: obj.id,
            kind:
              obj.type === 'vector-board'
                ? 'vector-board'
                : obj.type === 'group'
                  ? 'group'
                  : (obj.type as AiObjectKind),
            label: objectDisplayName(obj),
            left: obj.x,
            top: obj.y,
            width: obj.width,
            height: obj.height,
            angle: obj.rotation,
            fill: (() => {
              const fill = objectSupportsFill(obj) ? getObjectFill(obj) : null
              return fill?.type === 'solid' ? fill.color : null
            })(),
            stroke: (() => {
              const stroke = objectSupportsOutlineStroke(obj)
                ? getObjectStroke(obj)
                : null
              return stroke?.type === 'solid' ? stroke.color : null
            })(),
            text: obj.type === 'text' ? obj.text : null,
          })),
        }),
        addRectangle: (spec) => {
          const obj: SceneObject = {
            id: crypto.randomUUID(),
            type: 'rect',
            x:
              (spec.origin === 'top-left' ? spec.x ?? artboardW / 2 : (spec.x ?? artboardW / 2) - spec.width / 2),
            y:
              (spec.origin === 'top-left' ? spec.y ?? artboardH / 2 : (spec.y ?? artboardH / 2) - spec.height / 2),
            width: spec.width,
            height: spec.height,
            rotation: spec.rotation ?? 0,
            opacity: spec.opacity ?? 1,
            visible: true,
            locked: false,
            blurPct: 0,
            shadow: null,
            fill: { type: 'solid', color: spec.fill ?? '#262626' },
            stroke: { type: 'solid', color: spec.stroke ?? 'transparent' },
            strokeWidth: spec.strokeWidth ?? 0,
            cornerRadius: spec.cornerRadius ?? 0,
          }
          addObjects([obj])
          return { id: obj.id }
        },
        addEllipse: (spec) => {
          const obj: SceneObject = {
            id: crypto.randomUUID(),
            type: 'ellipse',
            x:
              (spec.origin === 'top-left' ? spec.x ?? artboardW / 2 : (spec.x ?? artboardW / 2) - spec.width / 2),
            y:
              (spec.origin === 'top-left' ? spec.y ?? artboardH / 2 : (spec.y ?? artboardH / 2) - spec.height / 2),
            width: spec.width,
            height: spec.height,
            rotation: spec.rotation ?? 0,
            opacity: spec.opacity ?? 1,
            visible: true,
            locked: false,
            blurPct: 0,
            shadow: null,
            fill: { type: 'solid', color: spec.fill ?? '#262626' },
            stroke: { type: 'solid', color: spec.stroke ?? 'transparent' },
            strokeWidth: spec.strokeWidth ?? 0,
          }
          addObjects([obj])
          return { id: obj.id }
        },
        addText: (spec) => {
          const obj: SceneText = {
            id: crypto.randomUUID(),
            type: 'text',
            x:
              (spec.origin === 'top-left' ? spec.x ?? artboardW / 2 : (spec.x ?? artboardW / 2) - (spec.width ?? 320) / 2),
            y:
              (spec.origin === 'top-left' ? spec.y ?? artboardH / 2 : (spec.y ?? artboardH / 2) - (spec.fontSize ?? 64)),
            width: spec.width ?? 320,
            height: spec.fontSize ?? 64,
            rotation: spec.rotation ?? 0,
            opacity: spec.opacity ?? 1,
            visible: true,
            locked: false,
            blurPct: 0,
            shadow: null,
            text: spec.text,
            fill: { type: 'solid', color: spec.fill ?? '#171717' },
            stroke: DEFAULT_STROKE,
            strokeWidth: 0,
            fontFamily: spec.fontFamily ?? 'Inter',
            fontSize: spec.fontSize ?? 64,
            lineHeight: 1.22,
            fontWeight: spec.fontWeight ?? 'normal',
            fontStyle: spec.fontStyle ?? 'normal',
            underline: false,
            textAlign: spec.textAlign ?? 'left',
          }
          obj.height = Math.max(
            layoutSceneText(obj).height,
            obj.fontSize * sceneTextLineHeight(obj),
          )
          addObjects([obj])
          return { id: obj.id }
        },
        addLine: (spec) => {
          const width = Math.max(1, Math.hypot(spec.x2 - spec.x1, spec.y2 - spec.y1))
          const height = Math.max(24, (spec.strokeWidth ?? 4) * 3)
          const centerX = (spec.x1 + spec.x2) / 2
          const centerY = (spec.y1 + spec.y2) / 2
          const obj: SceneLine = {
            id: crypto.randomUUID(),
            type: 'line',
            x: centerX - width / 2,
            y: centerY - height / 2,
            width,
            height,
            rotation: angleFromPoints(spec.x1, spec.y1, spec.x2, spec.y2),
            opacity: spec.opacity ?? 1,
            visible: true,
            locked: false,
            blurPct: 0,
            shadow: null,
            stroke: { type: 'solid', color: spec.stroke ?? '#262626' },
            strokeWidth: spec.strokeWidth ?? 4,
            lineStyle: 'solid',
            roundedEnds: true,
          }
          addObjects([obj])
          return { id: obj.id }
        },
        addImageFromUrl: async (spec) => {
          const id = await placeImageObject(spec.url, {
            x: spec.x,
            y: spec.y,
            origin: spec.origin,
            width: spec.width,
            height: spec.height,
          })
          return id ? { id } : null
        },
        updateObject: (id, patch) => {
          let changed = false
          setDoc((prev) => ({
            ...prev,
            objects: prev.objects.map((obj) => {
              if (obj.id !== id) return obj
              changed = true
              let next: SceneObject = { ...obj }
              if (patch.left !== undefined) next.x = patch.left
              if (patch.top !== undefined) next.y = patch.top
              if (patch.width !== undefined) next.width = patch.width
              if (patch.height !== undefined) next.height = patch.height
              if (patch.angle !== undefined) next.rotation = patch.angle
              if (patch.opacity !== undefined)
                next.opacity = Math.max(0, Math.min(1, patch.opacity))
              if (patch.fill !== undefined) next = setObjectFill(next, { type: 'solid', color: patch.fill })
              if (patch.stroke !== undefined) next = setObjectStroke(next, { type: 'solid', color: patch.stroke })
              if (patch.strokeWidth !== undefined) next = setObjectStrokeWidth(next, patch.strokeWidth)
              if (next.type === 'text') {
                if (patch.text !== undefined) next.text = patch.text
                if (patch.fontSize !== undefined) next.fontSize = patch.fontSize
                next.height = Math.max(
                  layoutSceneText(next).height,
                  next.fontSize * sceneTextLineHeight(next),
                )
              }
              return next
            }),
          }))
          return changed
        },
        deleteObject: (id) => {
          const exists = doc.objects.some((obj) => obj.id === id)
          if (!exists) return false
          setDoc((prev) => ({
            ...prev,
            objects: prev.objects.filter((obj) => obj.id !== id),
          }))
          return true
        },
        selectObjects: (ids) => {
          const valid = ids.filter((id) => doc.objects.some((obj) => obj.id === id))
          setSelectedIds(valid)
          return valid.length
        },
        setBackgroundColor: (color) => setDoc((prev) => ({ ...prev, bg: { type: 'solid', color } })),
        clearCanvas: () => {
          const count = doc.objects.length
          setDoc((prev) => ({ ...prev, objects: [] }))
          setSelectedIds([])
          return count
        },
      }),
      [
        addObjects,
        artboardH,
        artboardW,
        doc,
        placeImageObject,
      ],
    )

    const selectionEffectsFooterSlot = hasObjectSelected ? (
      <>
        <BlurToolbarControl blurPct={selectionBlurPct} onChange={applyBlurToSelection} />
        <FloatingToolbarDivider />
        <TransparencyToolbarPopover
          opacityPct={selectionOpacityPct}
          onChange={applyOpacityToSelection}
        />
        {selectionOutlineStrokeAllowed ? (
          <>
            <FloatingToolbarDivider />
            <StrokeToolbarPopover
              strokeWidthPx={selectionOutlineStrokeWidth}
              strokePaint={selectionOutlineStrokePaint}
              onStrokeWidthChange={applyOutlineStrokeWidth}
              onStrokePaintChange={applyOutlineStrokePaint}
            />
          </>
        ) : null}
        <FloatingToolbarDivider />
        <ShadowToolbarPopover
          value={selectionShadowUi}
          shadowActive={selectionShadowActive}
          onChange={applyShadowToSelection}
        />
      </>
    ) : null

    const contextMenuButtonClass =
      'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-neutral-800 outline-none hover:bg-black/[0.05] focus:bg-black/[0.05]'

    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          multiple
          onChange={(e) => {
            void addImageFromFiles(e.target.files)
            e.target.value = ''
          }}
        />

        <div
          ref={selectionToolsRef}
          className="pointer-events-auto relative z-30 flex h-14 w-full shrink-0 items-center justify-center px-1 sm:px-2"
        >
          {ready && textToolbarValues ? (
            <TextFormatToolbar
              values={textToolbarValues}
              onChange={onTextFormatChange}
              footerSlot={selectionEffectsFooterSlot}
            />
          ) : null}
          {ready && !textToolbarValues && shapeToolbarModel ? (
            <ShapeOptionsToolbar
              meta={shapeToolbarModel.meta}
              paintValue={shapeToolbarModel.paint}
              onPaintChange={applyPaintToSelection}
              onPolygonSides={applyPolygonSides}
              onStarPoints={applyStarPoints}
              onArrowLineStyle={applyArrowLineStyle}
              onArrowRoundedEnds={applyArrowRoundedEnds}
              onArrowStrokeWidth={applyArrowStrokeWidth}
              onArrowPathType={applyArrowPathType}
              rectCornerRadius={shapeToolbarModel.rectCornerRadius}
              rectCornerRadiusMax={shapeToolbarModel.rectCornerRadiusMax}
              onRectCornerRadius={
                shapeToolbarModel.meta.kind === 'rect'
                  ? applyRectCornerRadius
                  : undefined
              }
              footerSlot={selectionEffectsFooterSlot}
            />
          ) : null}
          {ready && hasObjectSelected && !textToolbarValues && !shapeToolbarModel ? (
            <FloatingToolbarShell role="toolbar" aria-label="Selection">
              <div className="flex items-center py-1 pl-2 pr-2">
                {imageCornerToolbar ? (
                  <>
                    <button
                      type="button"
                      disabled={elementToolbarLockedDisplay}
                      className={[
                        floatingToolbarIconButton(false),
                        elementToolbarLockedDisplay
                          ? 'pointer-events-none opacity-40'
                          : '',
                      ].join(' ')}
                      onClick={openImageCropModal}
                      aria-label="Crop image"
                      title="Crop image"
                    >
                      <HugeiconsIcon icon={CropIcon} size={20} strokeWidth={1.75} />
                    </button>
                    <CornerRadiusToolbarControl
                      value={imageCornerToolbar.radius}
                      max={imageCornerToolbar.max}
                      onChange={applyImageCornerRadius}
                      disabled={elementToolbarLockedDisplay}
                    />
                    <FloatingToolbarDivider />
                  </>
                ) : null}
                {selectionEffectsFooterSlot}
              </div>
            </FloatingToolbarShell>
          ) : null}
          {ready && !textToolbarValues && !shapeToolbarModel && canvasBodySelected ? (
            <div ref={backgroundPopoverAnchorRef} className="relative">
              <div className="flex items-center rounded-full border border-black/[0.08] bg-white/90 px-2 py-1 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md">
                <ArtboardResizeToolbarControl
                  width={artboardW}
                  height={artboardH}
                  onResize={onArtboardResize}
                  viewportRef={viewportRef}
                />
                <FloatingToolbarDivider />
                <button
                  type="button"
                  className={backgroundTopBtn(false)}
                  onClick={() => setBgPopoverOpen((open) => !open)}
                  aria-label="Page background"
                  aria-expanded={bgPopoverOpen}
                >
                  <span
                    className="size-4 rounded-full border border-black/10"
                    style={bgValueToSwatch(doc.bg)}
                  />
                  Background
                </button>
              </div>
              {bgPopoverOpen ? (
                <div
                  ref={backgroundPopoverPanelRef}
                  className={[
                    'absolute left-1/2 z-[60]',
                    backgroundPopoverOpenUpward ? 'bottom-full mb-2' : 'top-full mt-2',
                  ].join(' ')}
                  style={{
                    transform: `translateX(calc(-50% + ${backgroundPopoverShiftX}px))`,
                  }}
                >
                  <BackgroundPopover value={doc.bg} onChange={applyBackgroundPicked} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {exportError ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-3">
            <div className="rounded-full border border-red-200 bg-red-50/95 px-4 py-2 text-sm text-red-700 shadow-[0_8px_24px_rgba(153,27,27,0.12)] backdrop-blur">
              {exportError}
            </div>
          </div>
        ) : null}

        <div
          ref={viewportRef}
          className="relative flex min-h-0 flex-1 flex-col overflow-auto rounded-2xl bg-[var(--surface-subtle)]"
          onContextMenu={ready ? onViewportContextMenu : undefined}
          onDragOver={ready ? onViewportDragOver : undefined}
          onDrop={ready ? onViewportDrop : undefined}
        >
          <div className="flex min-h-min w-full flex-1 flex-col items-center justify-center px-4 pb-4 pt-0 sm:px-6 sm:pb-6 sm:pt-1">
            <div className="relative z-0 -mt-4 inline-block sm:-mt-5">
              {ready && hasObjectSelected && elementToolbarLayout && !editingSelectedText ? (
                <CanvasElementToolbar
                  ref={elementToolbarRef}
                  style={{
                    left: elementToolbarLayout.left,
                    top: elementToolbarLayout.top,
                  }}
                  placement={elementToolbarLayout.placement}
                  viewportRef={viewportRef}
                  locked={elementToolbarLockedDisplay}
                  onDuplicate={() => void duplicateElement()}
                  onToggleLock={toggleElementLock}
                  onDelete={deleteSelection}
                  onCopy={() => void copyElementToClipboard()}
                  onPaste={() => void pasteFromClipboard()}
                  onAlign={alignElementToArtboard}
                  alignAlreadySatisfied={
                    elementToolbarAlignAlready ?? {
                      left: false,
                      centerH: false,
                      right: false,
                      top: false,
                      centerV: false,
                      bottom: false,
                    }
                  }
                  canGroup={elementToolbarCanGroup}
                  canAlignElements={elementToolbarCanAlignElements}
                  canUngroup={!!elementToolbarCanUngroup}
                  onGroup={groupSelection}
                  onAlignElements={alignSelectedElements}
                  onUngroup={ungroupSelection}
                />
              ) : null}

              <div
                ref={artboardOuterRef}
                className="relative rounded-sm"
                style={{
                  width: artboardW * scale,
                  height: artboardH * scale,
                  lineHeight: 0,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                }}
              >
                <div
                  ref={artboardInnerRef}
                  className="absolute left-0 top-0 select-none overflow-visible rounded-sm bg-white"
                  style={{
                    width: artboardW,
                    height: artboardH,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    background:
                      doc.bg.type === 'solid' ? doc.bg.color : doc.bg.css,
                  }}
                  onPointerEnter={onArtboardPointerEnter}
                  onPointerMove={onArtboardPointerMove}
                  onPointerDown={onViewportPointerDown}
                  onPointerLeave={onArtboardPointerLeave}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
                    {doc.objects
                      .filter((obj) => obj.visible)
                      .map((obj) => (
                      <SceneObjectView
                        key={obj.id}
                        obj={obj}
                        vectorBoardDocs={vectorBoardDocs}
                        textEditingId={textEditingId}
                        textDraft={textDraft}
                        onObjectPointerDown={onObjectPointerDown}
                        onObjectHoverChange={(id, hovering) => {
                          setHoveredId((current) => {
                            if (hovering) return id
                            return current === id ? null : current
                          })
                        }}
                        onTextDoubleClick={(textObj) => {
                          if (textObj.locked) return
                          setSelectedIds([textObj.id])
                          setTextEditingId(textObj.id)
                          setTextDraft(textObj.text)
                        }}
                        onTextDraftChange={setTextDraft}
                        onTextDraftCommit={commitTextDraft}
                      />
                      ))}
                  </div>
                  <SnapGuidesOverlay
                    guides={snapGuides}
                    scale={scale}
                    artboardW={artboardW}
                    artboardH={artboardH}
                  />
                  {hoveredObject &&
                  selectedIds.length === 0 &&
                  textEditingId == null ? (
                    <SelectionBoundsOverlay
                      bounds={getObjectRotatedBounds(hoveredObject)}
                      scale={scale}
                    />
                  ) : null}
                  {!hoveredObject &&
                  selectedIds.length === 0 &&
                  textEditingId == null &&
                  (backgroundActive || backgroundHovered) ? (
                    <SelectionBoundsOverlay
                      bounds={{ left: 0, top: 0, width: artboardW, height: artboardH }}
                      scale={scale}
                    />
                  ) : null}
                  {selectedObjects.length > 1 && selectionBounds ? (
                    <SelectionBoundsOverlay bounds={selectionBounds} scale={scale} />
                  ) : null}
                  {marqueeRect && (marqueeRect.width > 0 || marqueeRect.height > 0) ? (
                    <SelectionBoundsOverlay
                      bounds={marqueeRect}
                      scale={scale}
                      dashed
                      fill
                    />
                  ) : null}
                  {selectedSingle && !selectedSingle.locked && !editingSelectedText ? (
                    <SelectionOverlay
                      object={selectedSingle}
                      scale={scale}
                      onHandlePointerDown={onSelectionHandlePointerDown}
                      onRotatePointerDown={onRotateHandlePointerDown}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {contextMenu ? (
          <div
            role="menu"
            className="fixed z-[90] min-w-48 overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_18px_48px_rgba(0,0,0,0.16)] backdrop-blur"
            style={{
              left: `min(${contextMenu.x}px, calc(100vw - 12.5rem))`,
              top: `min(${contextMenu.y}px, calc(100vh - 18rem))`,
            }}
            data-avnac-chrome
          >
            {contextMenu.hasSelection ? (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className={contextMenuButtonClass}
                  onClick={() => {
                    void copyElementToClipboard()
                    closeContextMenu()
                  }}
                >
                  <HugeiconsIcon icon={Copy01Icon} size={18} strokeWidth={1.75} />
                  Copy
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={contextMenuButtonClass}
                  onClick={() => {
                    void duplicateElement()
                    closeContextMenu()
                  }}
                >
                  <HugeiconsIcon icon={Layers02Icon} size={18} strokeWidth={1.75} />
                  Duplicate
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={contextMenuButtonClass}
                  onClick={() => {
                    toggleElementLock()
                    closeContextMenu()
                  }}
                >
                  <HugeiconsIcon
                    icon={contextMenu.locked ? SquareUnlock01Icon : SquareLock01Icon}
                    size={18}
                    strokeWidth={1.75}
                  />
                  {contextMenu.locked ? 'Unlock' : 'Lock'}
                </button>
                <div className="my-1 h-px bg-black/[0.06]" aria-hidden />
              </>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className={contextMenuButtonClass}
              onClick={() => {
                void pasteFromClipboard({ x: contextMenu.sceneX, y: contextMenu.sceneY })
                closeContextMenu()
              }}
            >
              <HugeiconsIcon icon={FilePasteIcon} size={18} strokeWidth={1.75} />
              Paste
            </button>
            {contextMenu.hasSelection ? (
              <>
                <div className="my-1 h-px bg-black/[0.06]" aria-hidden />
                <button
                  type="button"
                  role="menuitem"
                  className={contextMenuButtonClass}
                  onClick={() => {
                    deleteSelection()
                    closeContextMenu()
                  }}
                >
                  <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.75} />
                  Delete
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="pointer-events-auto absolute bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] right-3 z-30 sm:right-4">
          {ready && zoomPercent !== null ? (
            <CanvasZoomSlider
              value={zoomPercent}
              min={ZOOM_MIN_PCT}
              max={ZOOM_MAX_PCT}
              onChange={onZoomSliderChange}
              onFitRequest={onZoomFitRequest}
            />
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-2 pt-24">
          <div
            className="pointer-events-auto flex items-center gap-1 rounded-full border border-black/[0.08] bg-white/85 px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.8)_inset] backdrop-blur-xl"
            role="toolbar"
            aria-label="Editor tools"
          >
            <div
              ref={shapeToolSplitRef}
              className="relative flex items-stretch rounded-lg border border-black/[0.06] bg-black/[0.02]"
            >
              <button
                type="button"
                disabled={!ready}
                className={`${toolbarIconBtn(!ready)} rounded-l-lg rounded-r-none border-0`}
                onClick={() => addShapeFromKind(shapesQuickAddKind === 'generic' ? 'rect' : shapesQuickAddKind)}
                aria-label="Add shape"
                title="Add shape"
              >
                <HugeiconsIcon
                  icon={iconForShapesQuickAdd(shapesQuickAddKind)}
                  size={20}
                  strokeWidth={1.75}
                />
              </button>
              <button
                type="button"
                disabled={!ready}
                className={`${toolbarIconBtn(!ready)} rounded-l-none rounded-r-lg border-0 border-l border-black/[0.06]`}
                onClick={() => setShapesPopoverOpen((open) => !open)}
                aria-expanded={shapesPopoverOpen}
                aria-haspopup="menu"
                aria-label="More shapes"
              >
                <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.75} />
              </button>
              <ShapesPopover
                open={shapesPopoverOpen}
                disabled={!ready}
                anchorRef={shapeToolSplitRef}
                onClose={() => setShapesPopoverOpen(false)}
                onPick={(kind) => {
                  setShapesQuickAddKind(kind)
                  addShapeFromKind(kind)
                  setShapesPopoverOpen(false)
                }}
              />
            </div>
            <button
              type="button"
              disabled={!ready}
              className={toolbarIconBtn(!ready)}
              onClick={addText}
              aria-label="Add text"
              title="Add text"
            >
              <HugeiconsIcon icon={TextFontIcon} size={20} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              disabled={!ready}
              className={toolbarIconBtn(!ready)}
              onClick={() => imageInputRef.current?.click()}
              aria-label="Add image"
              title="Add image"
            >
              <HugeiconsIcon icon={Image01Icon} size={20} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              disabled={!ready}
              className={toolbarIconBtn(!ready)}
              onClick={() => setShortcutsOpen(true)}
              aria-label="Keyboard shortcuts"
              title="Shortcuts (?)"
            >
              <HugeiconsIcon icon={HelpCircleIcon} size={20} strokeWidth={1.75} />
            </button>
            {!ready ? (
              <span className="px-3 text-xs text-[var(--text-muted)]">Loading…</span>
            ) : null}
          </div>
        </div>

        {!ready ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-[var(--text-muted)]">Loading canvas…</span>
          </div>
        ) : null}

        {ready ? (
          <EditorFloatingSidebar
            activePanel={editorSidebarPanel}
            onSelectPanel={(id) => setEditorSidebarPanel((prev) => (prev === id ? null : id))}
          />
        ) : null}

        <EditorLayersPanel
          open={ready && editorSidebarPanel === 'layers'}
          onClose={() => setEditorSidebarPanel(null)}
          rows={layerRows}
          onSelectLayer={onSelectLayer}
          onToggleVisible={onToggleLayerVisible}
          onBringForward={onLayerBringForward}
          onSendBackward={onLayerSendBackward}
          onReorder={onLayerReorder}
          onRenameLayer={onRenameLayer}
        />
        <EditorUploadsPanel
          open={ready && editorSidebarPanel === 'uploads'}
          onClose={() => setEditorSidebarPanel(null)}
        />
        <EditorImagesPanel
          open={ready && editorSidebarPanel === 'images'}
          onClose={() => setEditorSidebarPanel(null)}
          controller={aiController}
        />
        <EditorVectorBoardPanel
          open={ready && editorSidebarPanel === 'vector-board'}
          onClose={() => setEditorSidebarPanel(null)}
          boards={vectorBoards}
          boardDocs={vectorBoardDocs}
          onCreateNew={createVectorBoard}
          onOpenBoard={openVectorBoardWorkspace}
          onDeleteBoard={deleteVectorBoard}
        />
        <EditorAppsPanel
          open={ready && editorSidebarPanel === 'apps'}
          onClose={() => setEditorSidebarPanel(null)}
          controller={aiController}
        />
        <EditorAiPanel
          open={ready && editorSidebarPanel === 'ai'}
          onClose={() => setEditorSidebarPanel(null)}
          controller={aiController}
        />
        {vectorWorkspaceId ? (
          <VectorBoardWorkspace
            open
            boardName={vectorWorkspaceName}
            document={vectorBoardDocs[vectorWorkspaceId] ?? emptyVectorBoardDocument()}
            onDocumentChange={(next) => onVectorBoardDocumentChange(vectorWorkspaceId, next)}
            onSave={closeVectorWorkspace}
            onSaveAndPlace={() => {
              placeActiveVectorBoardAtArtboardCenter()
              closeVectorWorkspace()
            }}
            onClose={closeVectorWorkspace}
          />
        ) : null}
        <EditorShortcutsModal
          open={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />
      <ImageCropModal
        open={imageCropOpen}
        imageSrc={imageCropSrc}
        initialCrop={imageCropInitial}
        onCancel={cancelImageCrop}
        onApply={applyImageCropFromModal}
      />
      {ready && transformDimensionUi
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[10050] rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium leading-5 tabular-nums text-white shadow-md"
              style={{
                left: transformDimensionUi.left,
                top: transformDimensionUi.top,
              }}
              role="status"
              aria-live="polite"
            >
              {transformDimensionUi.text}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
},
)

export default SceneEditor
