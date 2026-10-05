// Very small blocklist — school event, keep names friendly. Extend as needed.
const BLOCKED = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'nigg', 'fag', 'slut', 'whore', 'rape', 'nazi', 'porn', 'sex', 'penis', 'vagina', 'retard', 'kys']

export function cleanName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (name.length < 2) return { ok: false, error: 'At least 2 characters.' }
  if (name.length > 16) return { ok: false, error: '16 characters max.' }
  if (!/^[A-Za-z0-9 _.\-]+$/.test(name)) return { ok: false, error: 'Letters, numbers, spaces, _ . - only.' }
  const squashed = name.toLowerCase().replace(/[^a-z]/g, '').replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's')
  if (BLOCKED.some((w) => squashed.includes(w))) return { ok: false, error: 'Keep it school-friendly 🙂' }
  return { ok: true, name }
}
