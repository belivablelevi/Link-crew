/**
 * Generated sound effects via the Web Audio API, no audio files.
 * All sounds are short and run through one master gain so volume is easy to control.
 */
export type SoundName =
  | 'click'
  | 'coin'
  | 'levelup'
  | 'achievement'
  | 'combo'
  | 'gameover'
  | 'victory'
  | 'jackpot'
  | 'hit'
  | 'miss'
  | 'tick'
  | 'quack'
  | 'whoosh'
  | 'pop'
  | 'error'
  | 'countdown'
  | 'go'

let ctx: AudioContext | null = null
let master: GainNode | null = null
const state = { enabled: true, volume: 0.5 }

export function configureSound(enabled: boolean, volume: number) {
  state.enabled = enabled
  state.volume = volume
  if (master) master.gain.value = volume * 0.35
}

function audio(): AudioContext | null {
  if (!state.enabled) return null
  // Browsers block audio until the user interacts; skip silently instead of spamming warnings.
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  if (!ctx && ua && !ua.hasBeenActive) return null
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = state.volume * 0.35
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

interface ToneOpts {
  freq: number
  to?: number
  dur: number
  type?: OscillatorType
  gain?: number
  delay?: number
}

function tone({ freq, to, dur, type = 'square', gain = 0.5, delay = 0 }: ToneOpts) {
  const a = audio()
  if (!a || !master) return
  const t0 = a.currentTime + delay
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noise(dur: number, gain = 0.3, delay = 0) {
  const a = audio()
  if (!a || !master) return
  const len = Math.floor(a.sampleRate * dur)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = a.createBufferSource()
  src.buffer = buf
  const g = a.createGain()
  g.gain.value = gain
  src.connect(g)
  g.connect(master)
  src.start(a.currentTime + delay)
}

const notes = (seq: number[], step: number, type: OscillatorType = 'square', gain = 0.4) =>
  seq.forEach((f, i) => tone({ freq: f, dur: step * 1.6, type, gain, delay: i * step }))

// Small throttle so rapid-fire games don't stack hundreds of oscillators.
const lastPlayed: Partial<Record<SoundName, number>> = {}
const MIN_GAP: Partial<Record<SoundName, number>> = { click: 25, tick: 30, pop: 30, hit: 35, coin: 40 }

export function play(name: SoundName, pitch = 1) {
  if (!state.enabled) return
  const now = performance.now()
  const gap = MIN_GAP[name] ?? 0
  if (gap && now - (lastPlayed[name] ?? 0) < gap) return
  lastPlayed[name] = now

  switch (name) {
    case 'click':
      tone({ freq: 520 * pitch, to: 380 * pitch, dur: 0.05, gain: 0.25 })
      break
    case 'pop':
      tone({ freq: 300 * pitch, to: 900 * pitch, dur: 0.07, type: 'triangle', gain: 0.4 })
      break
    case 'tick':
      tone({ freq: 1200 * pitch, dur: 0.025, type: 'square', gain: 0.15 })
      break
    case 'coin':
      tone({ freq: 988 * pitch, dur: 0.06, gain: 0.3 })
      tone({ freq: 1319 * pitch, dur: 0.18, gain: 0.3, delay: 0.06 })
      break
    case 'combo':
      tone({ freq: 440 * pitch, to: 880 * pitch, dur: 0.12, type: 'sawtooth', gain: 0.22 })
      break
    case 'hit':
      tone({ freq: 180 * pitch, to: 60, dur: 0.1, type: 'square', gain: 0.4 })
      noise(0.06, 0.15)
      break
    case 'miss':
      tone({ freq: 220, to: 110, dur: 0.2, type: 'sawtooth', gain: 0.25 })
      break
    case 'error':
      tone({ freq: 160, dur: 0.12, type: 'square', gain: 0.3 })
      tone({ freq: 120, dur: 0.18, type: 'square', gain: 0.3, delay: 0.1 })
      break
    case 'whoosh':
      noise(0.25, 0.12)
      tone({ freq: 200, to: 800, dur: 0.22, type: 'sine', gain: 0.15 })
      break
    case 'quack':
      tone({ freq: 620 * pitch, to: 340 * pitch, dur: 0.11, type: 'sawtooth', gain: 0.35 })
      tone({ freq: 560 * pitch, to: 300 * pitch, dur: 0.09, type: 'sawtooth', gain: 0.25, delay: 0.1 })
      break
    case 'countdown':
      tone({ freq: 440, dur: 0.12, type: 'square', gain: 0.3 })
      break
    case 'go':
      tone({ freq: 880, dur: 0.25, type: 'square', gain: 0.35 })
      break
    case 'levelup':
      notes([523, 659, 784, 1047, 1319], 0.08, 'square', 0.32)
      break
    case 'achievement':
      notes([784, 988, 1175, 1568], 0.07, 'triangle', 0.45)
      break
    case 'victory':
      notes([523, 523, 523, 659, 784, 659, 784, 1047], 0.09, 'square', 0.3)
      break
    case 'gameover':
      notes([392, 330, 262, 196], 0.14, 'triangle', 0.4)
      break
    case 'jackpot':
      for (let i = 0; i < 12; i++) tone({ freq: 800 + (i % 4) * 200, dur: 0.08, gain: 0.25, delay: i * 0.06 })
      notes([1047, 1319, 1568, 2093], 0.12, 'square', 0.3)
      break
  }
}
