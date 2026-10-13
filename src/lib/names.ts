/**
 * Username rules + profanity filter.
 *
 * The same rules also run inside the database (supabase/schema.sql, is_clean_name), so a name
 * that slips past the website still can't be saved. Keep the two word lists in sync.
 *
 * Two kinds of match, to block bad words without blocking innocent names:
 *  - ANYWHERE: blocked even inside other words or with junk between letters ("xXfuckXx", "f.u.c.k").
 *  - WHOLE_WORD: only blocked as a separate word, because they hide inside normal words
 *    ("ass" in "Cassie", "dick" in "Dickens", "rape" in "grape").
 * Words are split on spaces, symbols and camelCase ("BigAssDuck" -> big ass duck).
 * Common look-alike tricks are undone first: 0->o 1->i 3->e 4->a 5->s 7->t 8->b @->a $->s !->i |->i
 * and repeated letters are collapsed ("fuuuck" -> "fuck").
 */

export const ANYWHERE = [
  'fuck', 'fck', 'phuck', 'bullshit', 'shithead', 'shitty', 'bitch', 'cunt', 'pussy', 'pussi', 'nigg', 'faggot', 'fagot',
  'slut', 'whore', 'hitler', 'porn', 'penis', 'vagina', 'retard', 'molest', 'pedophile', 'paedo', 'dildo', 'jizz',
  'twat', 'bastard', 'asshole', 'arsehole', 'dumbass', 'jackass', 'bollock', 'orgasm', 'horny', 'onlyfans',
  'cocaine', 'tranny', 'wetback', 'beaner', 'killyourself', 'blowjob', 'handjob', 'boner', 'erection',
  'masturbat', 'motherfuck', 'sexy', 'boobs', 'titties', 'nudes', 'kkk', 'swastika',
]

export const WHOLE_WORD = [
  'shit', 'shits', 'fuk', 'ass', 'arse', 'dick', 'cock', 'fag', 'rape', 'rapist', 'sex', 'cum', 'tit', 'tits', 'boob',
  'prick', 'spic', 'chink', 'kike', 'dyke', 'coon', 'gook', 'homo', 'anal', 'anus', 'nude', 'naked', 'weed', 'meth',
  'heroin', 'kys', 'pedo', 'hoe', 'hoes', 'thot', 'nig', 'niger', 'nazi', 'nazis', 'isis', 'wank', 'wanker', 'damn',
  'hell', 'crap', 'piss', 'slag', 'skank', 'butt', 'poop', 'pee',
]

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' }

const deLeet = (s: string) => s.toLowerCase().replace(/[0134578@$!|]/g, (c) => LEET[c] ?? c)
const collapse = (s: string) => s.replace(/(.)\1+/g, '$1')

export function isCleanName(raw: string): boolean {
  // whole string with everything but letters removed: catches "f.u.c.k", "F_U_C_K", "xXfuckXx"
  const squashed = deLeet(raw).replace(/[^a-z]/g, '')
  const squashedVariants = [squashed, collapse(squashed)]
  if (squashedVariants.some((v) => ANYWHERE.some((w) => v.includes(w)))) return false

  // separate words (spaces, symbols, camelCase): catches "big ass duck", "BigAssDuck", "the_hoe"
  const words = deLeet(raw.replace(/([a-z])([A-Z])/g, '$1 $2'))
    .split(/[^a-z]+/)
    .filter(Boolean)
  const wordSet = new Set([...words, ...words.map(collapse)])
  if (WHOLE_WORD.some((w) => wordSet.has(w))) return false
  // a name that is ONLY a whole-word term, written with junk between letters ("a.s.s", "d-i-c-k")
  if (squashedVariants.some((v) => WHOLE_WORD.includes(v))) return false
  return true
}

/** Name shown on the leaderboard: bad names that somehow got in are hidden. */
export function displayName(name: string): string {
  return isCleanName(name) ? name : 'Player (name hidden)'
}

export function cleanName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (name.length < 2) return { ok: false, error: 'At least 2 characters.' }
  if (name.length > 16) return { ok: false, error: '16 characters max.' }
  if (!/^[A-Za-z0-9 _.\-]+$/.test(name)) return { ok: false, error: 'Letters, numbers, spaces, _ . - only.' }
  if (!isCleanName(name)) return { ok: false, error: 'Keep it school-friendly. Try a different name.' }
  return { ok: true, name }
}
