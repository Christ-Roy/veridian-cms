# [CMS] Ajouter boutons "Continuer avec Google + Microsoft" sur page admin Payload

> **Type** : UX login fallback CMS
> **Sévérité** : 🟦 P5 (quand CMS passera en SaaS multi-tenant public)
> **Owner** : agent CMS
> **Spec parent** : `veridian-hub/todo/2026-05-20-fallback-login-apps-redirect-hub.md`
> **Créé** : 2026-05-20

## Demande

Sur `cms.veridian.site/admin/login` (page admin Payload), ajouter 2 boutons
"Continuer avec Google" + "Continuer avec Microsoft" en plus du form email
existant.

⚠️ **Particularité Payload 3** : la page admin Payload n'est pas trivialement
customisable. Il faut soit :
- Override le React component `LoginForm` via Payload `admin.components`
- Soit ajouter un middleware qui redirige `/admin/login` vers
  `app.veridian.site/login?next=https://cms.veridian.site/admin`

**Aucun OAuth côté Payload** — les boutons redirigent simplement vers
`app.veridian.site/login?next=...` et le Hub gère puis renvoie l'auto-login.

## Pré-requis

- CMS doit avoir un flow magic link cross-app implémenté (cf. ticket dormant
  `veridian-cms/todo/2026-05-20-hub-integration-when-saas-launched.md`)
- Hub doit avoir livré le support `?next=` (Phase 2 ticket OAuth)
- Patch Payload `admin.components.Login` (rechercher la voie standard
  Payload 3, sinon iframe alternative)

## Effort estimé

- 1j (Payload custom component plus délicat que les apps Next.js classiques)

## Référence

- Spec complète : `veridian-hub/todo/2026-05-20-fallback-login-apps-redirect-hub.md`
- Doc Payload custom components : https://payloadcms.com/docs/admin/components
