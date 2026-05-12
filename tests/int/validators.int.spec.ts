/**
 * Tests purs des validators FR de `@/lib/validators`. Pas de Payload, pas de DB.
 *
 * Convention Payload : un validator retourne `true` si OK, sinon une string
 * (message d'erreur). Les valeurs vides / null / undefined doivent toujours
 * retourner `true` — le `required: true` est géré par Payload lui-même.
 *
 * Sabotage check : casser une regex (ex. autoriser 13 chiffres dans SIRET)
 * fait fail les cas invalides → c'est ce qui prouve l'utilité du validator.
 */
import { describe, it, expect } from 'vitest'

import {
  validateSiret,
  validateSiren,
  validateTvaIntra,
  validateFrenchPhone,
  validateFrenchZip,
  validateHexColor,
  validateHttpsUrl,
} from '@/lib/validators'

describe('validateSiret', () => {
  it('retourne true pour valeur vide ("")', () => {
    expect(validateSiret('')).toBe(true)
  })

  it('retourne true pour null', () => {
    expect(validateSiret(null)).toBe(true)
  })

  it('retourne true pour undefined', () => {
    expect(validateSiret(undefined)).toBe(true)
  })

  it('retourne true pour un SIRET valide (14 chiffres collés)', () => {
    expect(validateSiret('12345678901234')).toBe(true)
  })

  it('retourne true pour un SIRET valide avec espaces (formatage humain)', () => {
    expect(validateSiret('123 456 789 01234')).toBe(true)
  })

  it('rejette un SIRET trop court avec message FR', () => {
    const result = validateSiret('1234567890')
    expect(typeof result).toBe('string')
    expect(result).toMatch(/14 chiffres/i)
  })

  it('rejette un SIRET avec lettres', () => {
    expect(validateSiret('1234567890123A')).toMatch(/14 chiffres/i)
  })
})

describe('validateSiren', () => {
  it('retourne true pour valeur vide', () => {
    expect(validateSiren('')).toBe(true)
  })

  it('retourne true pour null/undefined', () => {
    expect(validateSiren(null)).toBe(true)
    expect(validateSiren(undefined)).toBe(true)
  })

  it('retourne true pour un SIREN valide (9 chiffres)', () => {
    expect(validateSiren('123456789')).toBe(true)
  })

  it('retourne true pour un SIREN avec espaces', () => {
    expect(validateSiren('123 456 789')).toBe(true)
  })

  it('rejette un SIREN trop court', () => {
    expect(validateSiren('12345678')).toMatch(/9 chiffres/i)
  })

  it('rejette un SIREN trop long (14 chiffres = SIRET, pas SIREN)', () => {
    expect(validateSiren('12345678901234')).toMatch(/9 chiffres/i)
  })
})

describe('validateTvaIntra', () => {
  it('retourne true pour valeur vide', () => {
    expect(validateTvaIntra('')).toBe(true)
    expect(validateTvaIntra(null)).toBe(true)
    expect(validateTvaIntra(undefined)).toBe(true)
  })

  it('retourne true pour un numéro de TVA FR valide', () => {
    expect(validateTvaIntra('FR12345678901')).toBe(true)
  })

  it('retourne true en lowercase (normalisé via toUpperCase)', () => {
    expect(validateTvaIntra('fr12345678901')).toBe(true)
  })

  it('retourne true avec espaces', () => {
    expect(validateTvaIntra('FR 12 345 678 901')).toBe(true)
  })

  it('rejette un préfixe non-FR', () => {
    expect(validateTvaIntra('DE12345678901')).toMatch(/fr/i)
  })

  it('rejette un numéro trop court', () => {
    expect(validateTvaIntra('FR123')).toMatch(/fr/i)
  })
})

describe('validateFrenchPhone', () => {
  it('retourne true pour valeur vide', () => {
    expect(validateFrenchPhone('')).toBe(true)
    expect(validateFrenchPhone(null)).toBe(true)
    expect(validateFrenchPhone(undefined)).toBe(true)
  })

  it('accepte le format national avec espaces ("06 12 34 56 78")', () => {
    expect(validateFrenchPhone('06 12 34 56 78')).toBe(true)
  })

  it('accepte le format international avec espaces ("+33 6 12 34 56 78")', () => {
    expect(validateFrenchPhone('+33 6 12 34 56 78')).toBe(true)
  })

  it('accepte le format international collé ("+33612345678")', () => {
    expect(validateFrenchPhone('+33612345678')).toBe(true)
  })

  it('accepte un fixe FR ("01 23 45 67 89")', () => {
    expect(validateFrenchPhone('01 23 45 67 89')).toBe(true)
  })

  it('rejette un numéro étranger non préfixé', () => {
    expect(validateFrenchPhone('+44 20 7946 0958')).toMatch(/06 12 34 56 78|\+33/i)
  })

  it('rejette un numéro trop court', () => {
    expect(validateFrenchPhone('0612345')).toMatch(/06 12 34 56 78|\+33/i)
  })

  it('rejette un numéro commençant par 0 mais avec 0 invalide ("00 12 34 56 78")', () => {
    // 0 suivi de 0 n'est pas un préfixe FR valide ([1-9] requis après le 0)
    expect(validateFrenchPhone('00 12 34 56 78')).toMatch(/06 12 34 56 78|\+33/i)
  })
})

describe('validateFrenchZip', () => {
  it('retourne true pour valeur vide', () => {
    expect(validateFrenchZip('')).toBe(true)
    expect(validateFrenchZip(null)).toBe(true)
    expect(validateFrenchZip(undefined)).toBe(true)
  })

  it('retourne true pour un code postal valide (5 chiffres)', () => {
    expect(validateFrenchZip('75001')).toBe(true)
  })

  it('retourne true avec espaces externes (trim)', () => {
    expect(validateFrenchZip('  75001  ')).toBe(true)
  })

  it('rejette un code trop court', () => {
    expect(validateFrenchZip('7500')).toMatch(/5 chiffres/i)
  })

  it('rejette un code avec lettres', () => {
    expect(validateFrenchZip('7500A')).toMatch(/5 chiffres/i)
  })
})

describe('validateHexColor', () => {
  it('retourne true pour valeur vide', () => {
    expect(validateHexColor('')).toBe(true)
    expect(validateHexColor(null)).toBe(true)
    expect(validateHexColor(undefined)).toBe(true)
  })

  it('retourne true pour un hex #RRGGBB', () => {
    expect(validateHexColor('#1a3d2f')).toBe(true)
  })

  it('retourne true pour un hex #RGB (forme courte)', () => {
    expect(validateHexColor('#abc')).toBe(true)
  })

  it('retourne true pour un hex en majuscules', () => {
    expect(validateHexColor('#FF00AA')).toBe(true)
  })

  it('rejette un hex sans dièse', () => {
    expect(validateHexColor('1a3d2f')).toMatch(/#/i)
  })

  it('rejette un hex avec longueur invalide (5 chars)', () => {
    expect(validateHexColor('#12345')).toMatch(/#/i)
  })

  it('rejette un hex avec caractères non hexa', () => {
    expect(validateHexColor('#zz0000')).toMatch(/#/i)
  })
})

describe('validateHttpsUrl', () => {
  it('retourne true pour valeur vide', () => {
    expect(validateHttpsUrl('')).toBe(true)
    expect(validateHttpsUrl(null)).toBe(true)
    expect(validateHttpsUrl(undefined)).toBe(true)
  })

  it('retourne true pour une URL https valide', () => {
    expect(validateHttpsUrl('https://www.exemple.fr')).toBe(true)
  })

  it('retourne true pour une URL https avec path et query', () => {
    expect(validateHttpsUrl('https://exemple.fr/path/to?x=1&y=2')).toBe(true)
  })

  it('rejette une URL http:// (protocole non sécurisé)', () => {
    expect(validateHttpsUrl('http://exemple.fr')).toMatch(/https/i)
  })

  it('rejette une chaîne non-URL', () => {
    expect(validateHttpsUrl('pas une url')).toMatch(/url/i)
  })

  it('rejette une URL relative', () => {
    expect(validateHttpsUrl('/path/relative')).toMatch(/url/i)
  })
})
