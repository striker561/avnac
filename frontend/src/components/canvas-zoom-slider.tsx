type CanvasZoomSliderProps = {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
  onFitRequest?: () => void
  disabled?: boolean
}

const rangeClassName = [
  'relative z-10 h-8 w-full cursor-pointer appearance-none bg-transparent',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B3DFF]/25 focus-visible:ring-offset-1',
  'rounded-full disabled:cursor-not-allowed disabled:opacity-40',
  '[&::-webkit-slider-runnable-track]:h-0 [&::-webkit-slider-runnable-track]:bg-transparent',
  '[&::-webkit-slider-thumb]:-mt-2.5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5',
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0',
  '[&::-webkit-slider-thumb]:bg-white',
  '[&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(59,130,246,0.14),0_1px_4px_rgba(0,0,0,0.12)]',
  '[&::-moz-range-track]:h-0 [&::-moz-range-track]:bg-transparent',
  '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0',
  '[&::-moz-range-thumb]:bg-white',
  '[&::-moz-range-thumb]:shadow-[0_2px_8px_rgba(59,130,246,0.14),0_1px_4px_rgba(0,0,0,0.12)]',
].join(' ')

export default function CanvasZoomSlider({
  value,
  min = 5,
  max = 100,
  onChange,
  onFitRequest,
  disabled,
}: CanvasZoomSliderProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl bg-[var(--surface-subtle)] px-3 py-2 sm:bg-white/90 sm:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
      title="Drag to zoom. Click the percentage to fit the page in view."
    >
      <div className="relative flex h-8 w-[9.5rem] shrink-0 items-center sm:w-40">
        <div
          className="pointer-events-none absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-neutral-300/90"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-2 top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-500"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-2 top-1/2 size-[5px] translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-500"
          aria-hidden
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          disabled={disabled}
          aria-label="Canvas zoom"
          onChange={(e) => onChange(Number(e.target.value))}
          className={rangeClassName}
        />
      </div>
      {onFitRequest ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onFitRequest}
          className="min-w-[2.75rem] text-left text-sm tabular-nums text-neutral-600 outline-none hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40"
        >
          {value}%
        </button>
      ) : (
        <span className="min-w-[2.75rem] text-sm tabular-nums text-neutral-600">
          {value}%
        </span>
      )}
    </div>
  )
}
