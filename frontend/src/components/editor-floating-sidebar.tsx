import { HugeiconsIcon } from '@hugeicons/react'
import {
  CloudUploadIcon,
  Layers02Icon,
} from '@hugeicons/core-free-icons'

export type EditorSidebarPanelId = 'layers' | 'uploads'

const ITEMS: {
  id: EditorSidebarPanelId
  label: string
  icon: typeof Layers02Icon
}[] = [
  { id: 'layers', label: 'Layers', icon: Layers02Icon },
  { id: 'uploads', label: 'Uploads', icon: CloudUploadIcon },
]

type Props = {
  activePanel: EditorSidebarPanelId | null
  onSelectPanel: (id: EditorSidebarPanelId) => void
  disabled?: boolean
}

export default function EditorFloatingSidebar({
  activePanel,
  onSelectPanel,
  disabled,
}: Props) {
  return (
    <nav
      data-avnac-chrome
      aria-label="Editor tools"
      className={[
        'pointer-events-auto fixed left-3 top-16 z-[45] flex flex-col gap-0.5 rounded-3xl border border-black/[0.08] bg-neutral-100/95 p-1.5 backdrop-blur-md',
        disabled ? 'pointer-events-none opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {ITEMS.map((item) => {
        const active = activePanel === item.id
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            title={item.label}
            onClick={() => onSelectPanel(item.id)}
            className={[
              'flex w-[4.25rem] flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-[11px] font-medium transition-colors',
              active
                ? 'bg-white text-neutral-900'
                : 'text-neutral-600 hover:bg-white/70 hover:text-neutral-900',
              disabled ? 'cursor-not-allowed' : '',
            ].join(' ')}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={22}
              strokeWidth={1.65}
              className="shrink-0 text-neutral-700"
            />
            <span className="max-w-full truncate">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
