import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import NewCanvasDialog from "../components/new-canvas-dialog";

export const Route = createFileRoute("/")({ component: Landing });

type Sticker = {
  id: string;
  src: string;
  label: string;
  x: number;
  y: number;
  rotation: number;
  size: string;
};

const initialStickers: Sticker[] = [
  {
    id: "sunflower",
    src: "/stickers/sunflower-badge.webp",
    label: "Sunflower sticker",
    x: 74,
    y: 12,
    rotation: 6,
    size: "clamp(5.6rem, 10.8vw, 8.8rem)",
  },
  {
    id: "star",
    src: "/stickers/shooting-star-badge.webp",
    label: "Shooting star sticker",
    x: 9,
    y: 12,
    rotation: -7,
    size: "clamp(4.4rem, 8.8vw, 7.4rem)",
  },
  {
    id: "pineapple",
    src: "/stickers/pineapple.webp",
    label: "Pineapple sticker",
    x: 77,
    y: 70,
    rotation: 7,
    size: "clamp(5.4rem, 11.2vw, 9.1rem)",
  },
  {
    id: "donut",
    src: "/stickers/donut.webp",
    label: "Donut sticker",
    x: 16,
    y: 73,
    rotation: -8,
    size: "clamp(4.9rem, 9.6vw, 8rem)",
  },
  {
    id: "lollipop",
    src: "/stickers/lollipop.webp",
    label: "Lollipop sticker",
    x: 80,
    y: 45,
    rotation: 12,
    size: "clamp(4.1rem, 8vw, 6.5rem)",
  },
  {
    id: "leaf",
    src: "/stickers/leaf.webp",
    label: "Leaf sticker",
    x: 11,
    y: 47,
    rotation: -11,
    size: "clamp(4rem, 7.8vw, 6.2rem)",
  },
];

type DragState = {
  mode: "drag" | "rotate";
  id: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startLeft: number;
  startTop: number;
  startRotation: number;
  centerX: number;
  centerY: number;
  startPointerAngle: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function Landing() {
  const [newCanvasOpen, setNewCanvasOpen] = useState(false);
  const [stickers, setStickers] = useState(initialStickers);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const posthog = usePostHog();
  const stickerLayerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const updateStickerPosition = (
    stickerId: string,
    clientX: number,
    clientY: number,
  ) => {
    const layer = stickerLayerRef.current;
    const dragState = dragStateRef.current;
    if (!layer || !dragState || dragState.id !== stickerId) {
      return;
    }

    if (dragState.mode === "rotate") {
      const pointerAngle = Math.atan2(
        clientY - dragState.centerY,
        clientX - dragState.centerX,
      );
      const rotation =
        dragState.startRotation +
        radiansToDegrees(pointerAngle - dragState.startPointerAngle);

      setStickers((current) =>
        current.map((sticker) =>
          sticker.id === stickerId ? { ...sticker, rotation } : sticker,
        ),
      );
      return;
    }

    const layerRect = layer.getBoundingClientRect();
    const nextLeft = clamp(
      dragState.startLeft + (clientX - dragState.startClientX),
      0,
      Math.max(layerRect.width - dragState.width, 0),
    );
    const nextTop = clamp(
      dragState.startTop + (clientY - dragState.startClientY),
      0,
      Math.max(layerRect.height - dragState.height, 0),
    );

    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === stickerId
          ? {
              ...sticker,
              x: (nextLeft / Math.max(layerRect.width, 1)) * 100,
              y: (nextTop / Math.max(layerRect.height, 1)) * 100,
            }
          : sticker,
      ),
    );
  };

  const endDrag = (pointerId: number, target: EventTarget | null) => {
    if (dragStateRef.current?.pointerId !== pointerId) {
      return;
    }

    if (target instanceof HTMLElement && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }

    dragStateRef.current = null;
    setActiveStickerId(null);
  };

  return (
    <main className="hero-page relative flex min-h-[100dvh] flex-col justify-center overflow-hidden px-5 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
      <div className="hero-bg-orb hero-bg-orb-a" aria-hidden="true" />
      <div className="hero-bg-orb hero-bg-orb-b" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />
      <div ref={stickerLayerRef} className="hero-sticker-layer" aria-hidden="true">
        {stickers.map((sticker) => (
          <div
            key={sticker.id}
            className={`hero-sticker-frame ${activeStickerId === sticker.id ? "is-active" : ""}`}
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              width: sticker.size,
              transform: `rotate(${sticker.rotation}deg)`,
              zIndex: activeStickerId === sticker.id ? 3 : 1,
            }}
            onPointerDown={(e) => {
              const layer = stickerLayerRef.current;
              if (!layer) {
                return;
              }

              const layerRect = layer.getBoundingClientRect();
              const stickerLeft =
                (sticker.x / 100) * Math.max(layerRect.width, 1);
              const stickerTop =
                (sticker.y / 100) * Math.max(layerRect.height, 1);

              dragStateRef.current = {
                mode: "drag",
                id: sticker.id,
                pointerId: e.pointerId,
                startClientX: e.clientX,
                startClientY: e.clientY,
                startLeft: stickerLeft,
                startTop: stickerTop,
                startRotation: sticker.rotation,
                centerX: e.currentTarget.getBoundingClientRect().left + e.currentTarget.offsetWidth / 2,
                centerY: e.currentTarget.getBoundingClientRect().top + e.currentTarget.offsetHeight / 2,
                startPointerAngle: 0,
                width: e.currentTarget.offsetWidth,
                height: e.currentTarget.offsetHeight,
              };
              setActiveStickerId(sticker.id);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              updateStickerPosition(sticker.id, e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              endDrag(e.pointerId, e.target);
            }}
            onPointerCancel={(e) => {
              endDrag(e.pointerId, e.target);
            }}
          >
            <span className="hero-sticker-selection" />
            <span className="hero-sticker-handle hero-sticker-handle-nw" />
            <span
              className="hero-sticker-rotation-arm"
              onPointerDown={(e) => {
                e.stopPropagation();
                const frame = e.currentTarget.parentElement;
                if (!frame) {
                  return;
                }

                const frameRect = frame.getBoundingClientRect();
                const centerX = frameRect.left + frameRect.width / 2;
                const centerY = frameRect.top + frameRect.height / 2;

                dragStateRef.current = {
                  mode: "rotate",
                  id: sticker.id,
                  pointerId: e.pointerId,
                  startClientX: e.clientX,
                  startClientY: e.clientY,
                  startLeft: 0,
                  startTop: 0,
                  startRotation: sticker.rotation,
                  centerX,
                  centerY,
                  startPointerAngle: Math.atan2(
                    e.clientY - centerY,
                    e.clientX - centerX,
                  ),
                  width: frameRect.width,
                  height: frameRect.height,
                };
                setActiveStickerId(sticker.id);
                frame.setPointerCapture(e.pointerId);
              }}
            >
              <span className="hero-sticker-rotation-handle" />
            </span>
            <span className="hero-sticker-handle hero-sticker-handle-ne" />
            <span className="hero-sticker-handle hero-sticker-handle-e" />
            <span className="hero-sticker-handle hero-sticker-handle-se" />
            <span className="hero-sticker-handle hero-sticker-handle-s" />
            <span className="hero-sticker-handle hero-sticker-handle-sw" />
            <span className="hero-sticker-handle hero-sticker-handle-w" />
            <img
              src={sticker.src}
              alt={sticker.label}
              className="hero-sticker-image"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>
      <div className="relative z-[1] mx-auto w-full max-w-3xl">
        <div className="rise-in text-left">
          <h1 className="display-title hero-headline mb-8 font-medium text-balance text-[var(--text)] sm:mb-10 lg:mb-12">
            Design in the browser,
            <br />
            openly.
          </h1>
          <p className="mb-10 max-w-xl text-lg leading-[1.6] text-[var(--text-muted)] sm:mb-12 sm:text-xl sm:leading-[1.55] lg:text-[1.375rem] lg:leading-[1.5]">
            Open-source canvas for layouts and graphics.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--text)] px-10 py-3.5 text-base font-medium text-white hover:bg-[#262626] sm:min-h-14 sm:px-12 sm:py-4 sm:text-[1.0625rem]"
              onClick={() => {
                posthog.capture("editor_opened", { source: "landing_hero" });
                setNewCanvasOpen(true);
              }}
            >
              Open editor
            </button>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/[0.14] bg-white/70 px-8 py-3.5 text-base font-medium text-[var(--text)] no-underline backdrop-blur-sm hover:border-black/[0.22] hover:bg-white sm:min-h-14 sm:px-10 sm:py-4 sm:text-[1.0625rem]"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
      <NewCanvasDialog
        open={newCanvasOpen}
        onClose={() => setNewCanvasOpen(false)}
      />
    </main>
  );
}
