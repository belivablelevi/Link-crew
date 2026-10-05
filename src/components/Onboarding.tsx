import { useState } from 'react'
import { setUsername, useStore } from '../state/store'
import { cleanName } from '../lib/names'
import { Modal } from './Modal'
import { Button } from './Button'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

/** First-visit "WHAT DO WE CALL YOU?" prompt. */
export function Onboarding() {
  const onboarded = useStore((s) => s.onboarded)
  const current = useStore((s) => s.username)
  const [value, setValue] = useState(current)
  const [err, setErr] = useState('')
  if (onboarded) return null
  const submit = (name: string) => {
    const res = cleanName(name)
    if (!res.ok) {
      setErr(res.error)
      play('error')
      return
    }
    setUsername(res.name)
    play('levelup')
    fx.confetti(160)
    fx.toast({ title: `YOU'RE IN, ${res.name.toUpperCase()}!`, body: '100 starter tokens loaded. Go play.', tone: 'token' })
  }
  return (
    <Modal open title="PLAYER 1, ENTER YOUR NAME" color="var(--color-yellow)">
      <p className="text-dim mb-4">This is what shows on the leaderboard. Keep it school-friendly.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(value)
        }}
        className="grid gap-3"
      >
        <label htmlFor="onboard-name" className="sr-only">
          Username
        </label>
        <input
          id="onboard-name"
          value={value}
          maxLength={16}
          onChange={(e) => {
            setValue(e.target.value)
            setErr('')
          }}
          className="sticker rounded-2xl bg-bg px-4 h-14 font-display text-xl text-yellow w-full"
          autoComplete="off"
          spellCheck={false}
        />
        {err && <div className="text-red text-sm font-bold">{err}</div>}
        <Button type="submit" color="lime" size="lg">
          LET&apos;S GO →
        </Button>
        <button type="button" className="text-sm text-dim underline underline-offset-4" onClick={() => submit(current)}>
          Keep &quot;{current}&quot;
        </button>
      </form>
    </Modal>
  )
}
