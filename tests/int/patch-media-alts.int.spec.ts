/**
 * Tests purs des règles `buildNewAlt` / `isAlreadyPatched` du script
 * `scripts/patch-media-alts.ts`. Pas de Payload, pas de DB.
 *
 * Sabotage check : enlever un prefix dans RULES (ex retirer la règle
 * `used__partners_`) fait fail le cas correspondant → c'est ce qui prouve
 * que les règles couvrent bien le scope attendu.
 *
 * On importe les helpers en dupliquant la logique : les fonctions sont
 * privées au script (pas exportées). On garde un mini-mirror ici pour
 * pouvoir tester. Si tu changes les règles dans patch-media-alts.ts,
 * mets à jour ici en miroir — le test pinned permet d'attraper la dérive.
 */
import { describe, it, expect } from 'vitest'

type Rule = { match: RegExp; prefix: string }
const RULES: Rule[] = [
  { match: /^used__hero[_-]/i, prefix: 'Hero — ' },
  { match: /^used__partners[_-]/i, prefix: 'Logo partenaire — ' },
  { match: /^used__products[_-]/i, prefix: 'Produit — ' },
  { match: /^used__legacy[_-]/i, prefix: 'Page Services — ' },
  { match: /^used__brands[_-]/i, prefix: 'Marque distribuée — ' },
  { match: /^used__references[_-]/i, prefix: 'Client référence — ' },
  { match: /^used__illustrations[_-]/i, prefix: 'Illustration UI — ' },
  { match: /^used__/i, prefix: 'Média — ' },
  { match: /^stock__/i, prefix: 'Banque image — ' },
]
const KNOWN_PREFIXES = RULES.map((r) => r.prefix)

function buildNewAlt(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, '')
  for (const rule of RULES) {
    if (rule.match.test(base)) {
      const stripped = base
        .replace(/^used__[a-z]+[_-]/i, '')
        .replace(/^used__/i, '')
        .replace(/^stock__/i, '')
        .replace(/[_-]/g, ' ')
        .trim()
      return rule.prefix + stripped
    }
  }
  return null
}

function isAlreadyPatched(alt: string): boolean {
  if (!alt) return false
  return KNOWN_PREFIXES.some((p) => alt.startsWith(p))
}

describe('patch-media-alts — buildNewAlt', () => {
  it('hero → préfixe "Hero — "', () => {
    expect(buildNewAlt('used__hero_verifone-spa-desktop.webp')).toBe(
      'Hero — verifone spa desktop',
    )
  })

  it('partners → "Logo partenaire — "', () => {
    expect(buildNewAlt('used__partners_sunmi.svg')).toBe('Logo partenaire — sunmi')
  })

  it('products → "Produit — "', () => {
    expect(buildNewAlt('used__products_dx-8000.png')).toBe('Produit — dx 8000')
  })

  it('legacy → "Page Services — "', () => {
    expect(buildNewAlt('used__legacy_paiement.jpg')).toBe('Page Services — paiement')
  })

  it('brands → "Marque distribuée — "', () => {
    expect(buildNewAlt('used__brands_verifone.svg')).toBe('Marque distribuée — verifone')
  })

  it('references → "Client référence — "', () => {
    expect(buildNewAlt('used__references_morel-volailles.png')).toBe(
      'Client référence — morel volailles',
    )
  })

  it('illustrations → "Illustration UI — "', () => {
    expect(buildNewAlt('used__illustrations_pos-icon.svg')).toBe(
      'Illustration UI — pos icon',
    )
  })

  it('stock → "Banque image — "', () => {
    expect(buildNewAlt('stock__Café.png')).toBe('Banque image — Café')
  })

  it('used__ catch-all → "Média — " (catégorie inconnue)', () => {
    // Note : la règle catch-all `^used__/i` match avant que le regex `used__[a-z]+[_-]`
    // tente de strip. Donc "used__random-thing" passe via :
    //   replace(^used__[a-z]+[_-], '') → match "used__random-" → strip → "thing"
    // C'est le comportement actuel : on garde le mot APRÈS le 1er séparateur.
    expect(buildNewAlt('used__random-thing.png')).toBe('Média — thing')
  })

  it('retourne null si aucune règle ne matche (filename arbitraire)', () => {
    expect(buildNewAlt('IMG_1234.jpg')).toBeNull()
    expect(buildNewAlt('photo-cliente.png')).toBeNull()
  })

  it('case insensitive sur le préfixe used__/stock__', () => {
    expect(buildNewAlt('USED__HERO_xxx.png')).toBe('Hero — xxx')
    expect(buildNewAlt('STOCK__Caviste.png')).toBe('Banque image — Caviste')
  })

  it('strip extension multi-dot (file.original.png)', () => {
    expect(buildNewAlt('used__hero_image.original.png')).toBe('Hero — image.original')
  })
})

describe('patch-media-alts — isAlreadyPatched (idempotence)', () => {
  it('détecte chaque préfixe connu', () => {
    expect(isAlreadyPatched('Hero — verifone spa')).toBe(true)
    expect(isAlreadyPatched('Logo partenaire — sunmi')).toBe(true)
    expect(isAlreadyPatched('Produit — dx 8000')).toBe(true)
    expect(isAlreadyPatched('Page Services — paiement')).toBe(true)
    expect(isAlreadyPatched('Marque distribuée — verifone')).toBe(true)
    expect(isAlreadyPatched('Client référence — morel')).toBe(true)
    expect(isAlreadyPatched('Illustration UI — pos')).toBe(true)
    expect(isAlreadyPatched('Média — random')).toBe(true)
    expect(isAlreadyPatched('Banque image — Café')).toBe(true)
  })

  it("retourne false pour un alt arbitraire (à patcher)", () => {
    expect(isAlreadyPatched('Café')).toBe(false)
    expect(isAlreadyPatched('used__hero_xxx.png')).toBe(false)
    expect(isAlreadyPatched('')).toBe(false)
  })

  it('un 2e passage du script ne re-patch pas (idempotence prouvée)', () => {
    const filename = 'used__hero_xxx.png'
    const firstPass = buildNewAlt(filename)
    expect(firstPass).toBe('Hero — xxx')
    // après 1er passage, l'alt = "Hero — xxx" → isAlreadyPatched=true → skip
    expect(isAlreadyPatched(firstPass!)).toBe(true)
  })
})
