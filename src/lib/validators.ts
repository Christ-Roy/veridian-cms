/**
 * Validators FR pour Payload — utilisables sur n'importe quel champ `text`
 * via `validate: validateFrenchPhone`, etc.
 *
 * Pattern Payload v3 : un validator retourne `true` si valide, sinon une
 * string contenant le message d'erreur affiché à l'utilisateur.
 *
 * Toujours autoriser la valeur vide / null : l'obligatoire est géré par
 * `required: true` sur le champ. Un validator qui refuse "" casserait les
 * champs optionnels.
 */

export type PayloadValidator = (
  value: string | null | undefined,
) => true | string

const isEmpty = (val: string | null | undefined): boolean =>
  val === null || val === undefined || val.trim() === ''

/** SIRET = 14 chiffres (avec ou sans espaces). */
export const validateSiret: PayloadValidator = (val) => {
  if (isEmpty(val)) return true
  const cleaned = val!.replace(/\s+/g, '')
  return /^\d{14}$/.test(cleaned) || 'SIRET = 14 chiffres (espaces autorisés).'
}

/** SIREN = 9 chiffres (avec ou sans espaces). */
export const validateSiren: PayloadValidator = (val) => {
  if (isEmpty(val)) return true
  const cleaned = val!.replace(/\s+/g, '')
  return /^\d{9}$/.test(cleaned) || 'SIREN = 9 chiffres (espaces autorisés).'
}

/** Numéro de TVA intracommunautaire FR = FR + 2 chiffres + 9 chiffres SIREN. */
export const validateTvaIntra: PayloadValidator = (val) => {
  if (isEmpty(val)) return true
  const cleaned = val!.replace(/\s+/g, '').toUpperCase()
  return (
    /^FR\d{2}\d{9}$/.test(cleaned) ||
    'TVA intra FR = "FR" + 2 chiffres + 9 chiffres (ex : FR12345678901).'
  )
}

/**
 * Téléphone FR : `06 12 34 56 78`, `+33 6 12 34 56 78`, `+33612345678`, etc.
 * Accepte espaces, tirets, points et parenthèses comme séparateurs.
 */
export const validateFrenchPhone: PayloadValidator = (val) => {
  if (isEmpty(val)) return true
  const cleaned = val!.replace(/[\s.\-()]/g, '')
  return (
    /^(?:\+33|0033|0)[1-9]\d{8}$/.test(cleaned) ||
    'Format attendu : 06 12 34 56 78 ou +33 6 12 34 56 78.'
  )
}

/** Code postal FR = 5 chiffres. */
export const validateFrenchZip: PayloadValidator = (val) => {
  if (isEmpty(val)) return true
  return /^\d{5}$/.test(val!.trim()) || 'Code postal = 5 chiffres.'
}

/** Couleur hex #RRGGBB ou #RGB. */
export const validateHexColor: PayloadValidator = (val) => {
  if (isEmpty(val)) return true
  return (
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val!.trim()) ||
    'Format attendu : #1a3d2f ou #abc.'
  )
}

/** URL https absolue (pas de http://, pas de chemin relatif). */
export const validateHttpsUrl: PayloadValidator = (val) => {
  if (isEmpty(val)) return true
  try {
    const u = new URL(val!.trim())
    if (u.protocol !== 'https:') {
      return 'URL doit commencer par https://.'
    }
    return true
  } catch {
    return 'URL invalide (ex : https://www.exemple.fr).'
  }
}
