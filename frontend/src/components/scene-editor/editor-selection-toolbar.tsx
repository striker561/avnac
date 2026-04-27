import { HugeiconsIcon } from '@hugeicons/react'
import { CropIcon } from '@hugeicons/core-free-icons'
import type {
  Dispatch,
  ReactNode,
  RefObject,
  SetStateAction,
} from 'react'

import type {
  ArrowLineStyle,
  ArrowPathType,
  AvnacShapeMeta,
} from '../../lib/avnac-shape-meta'
import ArtboardResizeToolbarControl from '../artboard-resize-toolbar-control'
import BackgroundPopover, {
  bgValueToSwatch,
  type BgValue,
} from '../background-popover'
import CornerRadiusToolbarControl from '../corner-radius-toolbar-control'
import {
  FloatingToolbarDivider,
  FloatingToolbarShell,
  floatingToolbarIconButton,
} from '../floating-toolbar-shell'
import ShapeOptionsToolbar from '../shape-options-toolbar'
import TextFormatToolbar, {
  type TextFormatToolbarValues,
} from '../text-format-toolbar'

type ShapeToolbarModel = {
  meta: AvnacShapeMeta
  paint: BgValue
  rectCornerRadius?: number
  rectCornerRadiusMax?: number
}

type ImageCornerToolbar = {
  radius: number
  max: number
}

function backgroundTopBtn(disabled?: boolean) {
  const base =
    'flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-neutral-700 outline-none transition-colors hover:bg-black/[0.06]'
  if (disabled) return `${base} pointer-events-none cursor-not-allowed opacity-35`
  return base
}

export function EditorSelectionToolbar({
  applyArrowLineStyle,
  applyArrowPathType,
  applyArrowRoundedEnds,
  applyArrowStrokeWidth,
  applyBackgroundPicked,
  applyImageCornerRadius,
  applyPaintToSelection,
  applyPolygonSides,
  applyRectCornerRadius,
  applyStarPoints,
  artboardH,
  artboardW,
  backgroundPopoverAnchorRef,
  backgroundPopoverOpenUpward,
  backgroundPopoverPanelRef,
  backgroundPopoverShiftX,
  bg,
  bgPopoverOpen,
  canvasBodySelected,
  elementToolbarLockedDisplay,
  hasObjectSelected,
  imageCornerToolbar,
  onArtboardResize,
  onTextFormatChange,
  openImageCropModal,
  ready,
  selectionEffectsFooterSlot,
  selectionToolsRef,
  setBgPopoverOpen,
  shapeToolbarModel,
  textToolbarValues,
  viewportRef,
}: {
  applyArrowLineStyle: (style: ArrowLineStyle) => void
  applyArrowPathType: (pathType: ArrowPathType) => void
  applyArrowRoundedEnds: (rounded: boolean) => void
  applyArrowStrokeWidth: (width: number) => void
  applyBackgroundPicked: (bg: BgValue) => void
  applyImageCornerRadius: (radius: number) => void
  applyPaintToSelection: (bg: BgValue) => void
  applyPolygonSides: (sides: number) => void
  applyRectCornerRadius: (radius: number) => void
  applyStarPoints: (points: number) => void
  artboardH: number
  artboardW: number
  backgroundPopoverAnchorRef: RefObject<HTMLDivElement | null>
  backgroundPopoverOpenUpward: boolean
  backgroundPopoverPanelRef: RefObject<HTMLDivElement | null>
  backgroundPopoverShiftX: number
  bg: BgValue
  bgPopoverOpen: boolean
  canvasBodySelected: boolean
  elementToolbarLockedDisplay: boolean
  hasObjectSelected: boolean
  imageCornerToolbar: ImageCornerToolbar | null
  onArtboardResize: (width: number, height: number) => void
  onTextFormatChange: (next: Partial<TextFormatToolbarValues>) => void
  openImageCropModal: () => void
  ready: boolean
  selectionEffectsFooterSlot: ReactNode
  selectionToolsRef: RefObject<HTMLDivElement | null>
  setBgPopoverOpen: Dispatch<SetStateAction<boolean>>
  shapeToolbarModel: ShapeToolbarModel | null
  textToolbarValues: TextFormatToolbarValues | null
  viewportRef: RefObject<HTMLDivElement | null>
}) {
  return (
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
                style={bgValueToSwatch(bg)}
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
              <BackgroundPopover value={bg} onChange={applyBackgroundPicked} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
