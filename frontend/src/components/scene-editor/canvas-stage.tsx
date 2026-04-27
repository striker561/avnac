import type {
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react'

import {
  getObjectRotatedBounds,
  type SceneObject,
  type SceneText,
} from '../../lib/avnac-scene'
import type { VectorBoardDocument } from '../../lib/avnac-vector-board-document'
import type { BgValue } from '../background-popover'
import CanvasElementToolbar, {
  type CanvasAlignKind,
} from '../canvas-element-toolbar'
import type {
  MarqueeRect,
  ResizeHandleId,
  SceneSnapGuide,
} from '../../scene-engine/primitives'
import { SceneObjectView } from './object-view'
import {
  SelectionBoundsOverlay,
  SelectionOverlay,
  SnapGuidesOverlay,
} from './selection-overlays'

type ElementToolbarLayout = {
  left: number
  top: number
  placement: 'above' | 'below'
}

const EMPTY_ALIGN_STATE: Record<CanvasAlignKind, boolean> = {
  left: false,
  centerH: false,
  right: false,
  top: false,
  centerV: false,
  bottom: false,
}

export function CanvasStage({
  alignElementToArtboard,
  alignSelectedElements,
  artboardH,
  artboardInnerRef,
  artboardOuterRef,
  artboardW,
  backgroundActive,
  backgroundHovered,
  bg,
  commitTextDraft,
  copyElementToClipboard,
  deleteSelection,
  duplicateElement,
  editingSelectedText,
  elementToolbarAlignAlready,
  elementToolbarCanAlignElements,
  elementToolbarCanGroup,
  elementToolbarCanUngroup,
  elementToolbarLayout,
  elementToolbarLockedDisplay,
  elementToolbarRef,
  groupSelection,
  hasObjectSelected,
  hoveredObject,
  marqueeRect,
  objects,
  onArtboardPointerEnter,
  onArtboardPointerLeave,
  onArtboardPointerMove,
  onObjectHoverChange,
  onObjectPointerDown,
  onRotateHandlePointerDown,
  onSelectionHandlePointerDown,
  onTextDoubleClick,
  onTextDraftChange,
  onViewportPointerDown,
  pasteFromClipboard,
  ready,
  scale,
  selectedIds,
  selectedObjects,
  selectedSingle,
  selectionBounds,
  snapGuides,
  textDraft,
  textEditingId,
  toggleElementLock,
  ungroupSelection,
  vectorBoardDocs,
  viewportRef,
}: {
  alignElementToArtboard: (kind: CanvasAlignKind) => void
  alignSelectedElements: (kind: CanvasAlignKind) => void
  artboardH: number
  artboardInnerRef: RefObject<HTMLDivElement | null>
  artboardOuterRef: RefObject<HTMLDivElement | null>
  artboardW: number
  backgroundActive: boolean
  backgroundHovered: boolean
  bg: BgValue
  commitTextDraft: () => void
  copyElementToClipboard: () => void
  deleteSelection: () => void
  duplicateElement: () => void
  editingSelectedText: boolean
  elementToolbarAlignAlready: Record<CanvasAlignKind, boolean> | null
  elementToolbarCanAlignElements: boolean
  elementToolbarCanGroup: boolean
  elementToolbarCanUngroup: boolean
  elementToolbarLayout: ElementToolbarLayout | null
  elementToolbarLockedDisplay: boolean
  elementToolbarRef: RefObject<HTMLDivElement | null>
  groupSelection: () => void
  hasObjectSelected: boolean
  hoveredObject: SceneObject | null
  marqueeRect: MarqueeRect | null
  objects: SceneObject[]
  onArtboardPointerEnter: () => void
  onArtboardPointerLeave: () => void
  onArtboardPointerMove: () => void
  onObjectHoverChange: (id: string, hovering: boolean) => void
  onObjectPointerDown: (e: ReactPointerEvent<HTMLDivElement>, obj: SceneObject) => void
  onRotateHandlePointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void
  onSelectionHandlePointerDown: (
    e: ReactPointerEvent<HTMLButtonElement>,
    handle: ResizeHandleId,
  ) => void
  onTextDoubleClick: (textObj: SceneText) => void
  onTextDraftChange: (value: string) => void
  onViewportPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void
  pasteFromClipboard: () => void
  ready: boolean
  scale: number
  selectedIds: string[]
  selectedObjects: SceneObject[]
  selectedSingle: SceneObject | null
  selectionBounds: { left: number; top: number; width: number; height: number } | null
  snapGuides: SceneSnapGuide[]
  textDraft: string
  textEditingId: string | null
  toggleElementLock: () => void
  ungroupSelection: () => void
  vectorBoardDocs: Record<string, VectorBoardDocument>
  viewportRef: RefObject<HTMLDivElement | null>
}) {
  return (
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
            onDuplicate={duplicateElement}
            onToggleLock={toggleElementLock}
            onDelete={deleteSelection}
            onCopy={copyElementToClipboard}
            onPaste={pasteFromClipboard}
            onAlign={alignElementToArtboard}
            alignAlreadySatisfied={elementToolbarAlignAlready ?? EMPTY_ALIGN_STATE}
            canGroup={elementToolbarCanGroup}
            canAlignElements={elementToolbarCanAlignElements}
            canUngroup={elementToolbarCanUngroup}
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
              background: bg.type === 'solid' ? bg.color : bg.css,
            }}
            onPointerEnter={onArtboardPointerEnter}
            onPointerMove={onArtboardPointerMove}
            onPointerDown={onViewportPointerDown}
            onPointerLeave={onArtboardPointerLeave}
          >
            <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
              {objects
                .filter((obj) => obj.visible)
                .map((obj) => (
                  <SceneObjectView
                    key={obj.id}
                    obj={obj}
                    vectorBoardDocs={vectorBoardDocs}
                    textEditingId={textEditingId}
                    textDraft={textDraft}
                    onObjectPointerDown={onObjectPointerDown}
                    onObjectHoverChange={onObjectHoverChange}
                    onTextDoubleClick={onTextDoubleClick}
                    onTextDraftChange={onTextDraftChange}
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
  )
}
