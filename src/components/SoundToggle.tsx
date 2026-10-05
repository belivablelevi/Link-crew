import { updateSettings, useStore } from '../state/store'
import { play } from '../lib/sound'
import { Icon } from './Icon'

/** Always-visible sound on/off switch. */
export function SoundToggle({ className = '' }: { className?: string }) {
  const on = useStore((s) => s.settings.sound)
  return (
    <button
      type="button"
      onClick={() => {
        updateSettings({ sound: !on })
        if (!on) setTimeout(() => play('coin'), 30)
      }}
      aria-pressed={on}
      aria-label={on ? 'Sound on. Click to mute.' : 'Sound off. Click to unmute.'}
      title={on ? 'Mute sound' : 'Turn sound on'}
      className={`sticker h-11 px-3 rounded-xl font-display text-sm flex items-center gap-1.5 transition-colors ${on ? 'bg-lime text-bg' : 'bg-panel2 text-dim'} ${className}`}
    >
      <Icon name={on ? 'volume' : 'volumeOff'} size={20} />
      <span className="hidden sm:inline">{on ? 'ON' : 'OFF'}</span>
    </button>
  )
}
