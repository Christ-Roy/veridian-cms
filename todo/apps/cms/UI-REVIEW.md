# CMS — UI Review (polish solo Robert)

> File d'attente de polish UI a faire en session standalone, tranquillement,
> hors sprint. Non bloquant pour la livraison de V1.

## A passer en revue quand Robert a 30 min

### Admin CMS (`cms.staging.veridian.site/admin`)

- [ ] **Verifier le rendu du dashboard** (BeforeDashboard) sur mobile / tablet
  Le widget de bienvenue est en bloc fixe width — voir si responsive.

- [ ] **Favicon SVG inline** dans Payload.config.ts → tester rendu dans
  tabs Chrome/Firefox/Safari. Probablement trop simpliste (juste une
  coche verte), voir si on met un vrai logo PNG/SVG avec charte.

- [ ] **Light mode** : verifier que tous les composants rendent bien en
  light (boutons, tables, richtext editor).

- [ ] **Dropdown tenant** en haut a gauche : test rapide avec 5+ tenants
  (scroll, recherche ?).

- [ ] **Page login** : le BeforeLogin a un bandeau vert pastel. Voir si
  le contraste passe WCAG AA.

### Sites clients

- [ ] **template-artisan.veridian.site** : voir si les icones Lucide
  rendent bien (services : hammer, home, etc.). Parfois les `selector`
  Lucide manquent avec Next.js static.

- [ ] **Footer horaires** : l'alignement `flex justify-between` n'a pas
  ete teste avec des textes longs type "Fermeture exceptionnelle le 1er mai".

- [ ] **Hero sans image** : quand le client n'a pas encore uploade
  d'image, on utilise un placeholder Unsplash. Verifier que le fallback
  est assez neutre pour un client artisan (pas une plage tropicale).

## Bugs visuels a investiguer

- [ ] La preview iframe dans l'admin affiche parfois "Demo CMS" au lieu
  du bon tenant (voir conversation 2026-04-24) — le mapping
  `SITE_URL_BY_TENANT_ID` doit rester a jour quand on cree un nouveau
  tenant.

## Idees d'amelioration UX (non bloquant)

- Badge "Brouillon" / "Publie" plus visible dans la liste des pages
- Preview iframe qui s'ouvre automatiquement a l'ouverture d'une page
  (necessiterait un override de l'Edit View, risque de casser aux
  updates Payload — a evaluer cout/benefice plus tard)
- Indicateur "derniere modification par X il y a 5 min" dans le header
  du document
