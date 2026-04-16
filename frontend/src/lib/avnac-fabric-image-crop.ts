import type { FabricImage } from 'fabric'
import { setSceneCornerRadiusOnImage } from './fabric-corner-radius'

export type FabricImageSourceCrop = {
  cropX: number
  cropY: number
  width: number
  height: number
}

/**
 * Visible source rectangle for a FabricImage (natural pixel space, before object scale).
 */
export function getFabricImageSourceCrop(img: FabricImage): FabricImageSourceCrop {
  const { width: nw, height: nh } = img.getOriginalSize()
  const cropX = Math.max(0, img.cropX || 0)
  const cropY = Math.max(0, img.cropY || 0)
  const w = img.width || 0
  const h = img.height || 0
  const srcW = Math.min(w, Math.max(0, nw - cropX))
  const srcH = Math.min(h, Math.max(0, nh - cropY))
  return { cropX, cropY, width: srcW, height: srcH }
}

export function applyFabricImageSourceCrop(
  img: FabricImage,
  rect: FabricImageSourceCrop,
  mod: typeof import('fabric'),
  sceneCornerRadius: number,
): void {
  const { width: nw, height: nh } = img.getOriginalSize()
  let { cropX, cropY, width, height } = rect
  cropX = Math.max(0, Math.min(cropX, Math.max(0, nw - 1)))
  cropY = Math.max(0, Math.min(cropY, Math.max(0, nh - 1)))
  width = Math.max(1, Math.min(width, nw - cropX))
  height = Math.max(1, Math.min(height, nh - cropY))

  img.set({
    cropX,
    cropY,
    width,
    height,
  })
  setSceneCornerRadiusOnImage(img, sceneCornerRadius, mod)
  img.set('dirty', true)
  img.setCoords()
}
