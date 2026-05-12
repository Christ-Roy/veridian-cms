/**
 * Helpers d'access control partagés entre collections (section 5 du TODO Didier).
 *
 * Niveaux de rôle (du plus puissant au moins) :
 *  - super-admin : tout (Veridian)
 *  - client : tout sur son tenant (admin auto-managé)
 *  - editor : peut MODIFIER mais pas CRÉER ni SUPPRIMER (Didier qui ne doit
 *    pas pouvoir supprimer ses pages par accident)
 *  - site-reader : lecture API seulement (clé API publique)
 */

type AccessArgs = {
  req: { user?: { roles?: string[] | null } | null }
}

function hasRole(req: AccessArgs['req'], role: string): boolean {
  return req.user?.roles?.includes(role) ?? false
}

export function isSuperAdmin(req: AccessArgs['req']): boolean {
  return hasRole(req, 'super-admin')
}

export function isClient(req: AccessArgs['req']): boolean {
  return hasRole(req, 'client')
}

export function isEditor(req: AccessArgs['req']): boolean {
  return hasRole(req, 'editor')
}

export function isAuthenticated(req: AccessArgs['req']): boolean {
  return Boolean(req.user)
}

/**
 * Peut CRÉER un doc : super-admin et client uniquement. Pas editor.
 */
export const canCreate = ({ req }: AccessArgs): boolean => {
  return isSuperAdmin(req) || isClient(req)
}

/**
 * Peut SUPPRIMER un doc : super-admin et client uniquement. Pas editor.
 * (Le hook `beforeDelete` ajoute ensuite des restrictions sur les slugs
 * critiques pour les non super-admin.)
 */
export const canDelete = ({ req }: AccessArgs): boolean => {
  return isSuperAdmin(req) || isClient(req)
}

/**
 * Peut MODIFIER : tous les utilisateurs authentifiés (multi-tenant filtre
 * ensuite par tenant courant).
 */
export const canUpdate = ({ req }: AccessArgs): boolean => {
  return isAuthenticated(req)
}

/**
 * Peut LIRE : tous les utilisateurs authentifiés (multi-tenant filtre).
 */
export const canRead = ({ req }: AccessArgs): boolean => {
  return isAuthenticated(req)
}
