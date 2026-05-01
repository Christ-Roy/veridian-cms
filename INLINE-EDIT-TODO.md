# Inline Edit / Live Preview — TODO source de vérité

> Source unique de la session "Live Edit AVSE + admin polish + CI/CD".
> Mise à jour à chaque itération du /loop. Statuts : ⬜ pending · 🔵 in-progress · ✅ done · ❌ blocked.

## Contexte

AVSE prod en `output: export` Cloudflare Pages. CMS Payload sur `cms.veridian.site`. Iframe Live Preview sur sous-domaine `avse-monetique.veridian.site`. La V1.4 a câblé HomePreview/HideWhenPreview + cookie `Domain=.veridian.site`. 16:50 → live edit fonctionnel end-to-end après fix du déploiement Docker (drift entre compose CI et compose prod).

## P0 — Live Edit AVSE end-to-end

- ✅ Code AVSE shippé (commit 04f6c6e) — HomePreview/HideWhenPreview/HomeView en prod CF Pages
- ✅ CMS commit shippé (8fa8412) — auth.cookies + csrf — CI verte
- ✅ Drift CI/Docker fixé manuellement : `docker tag ghcr.io/christ-roy/veridian-cms:8fa8412... veridian/cms-prod:latest && compose up -d --force-recreate cms`
- ✅ Cookie shape vérifié : `Domain=.veridian.site; Secure=true; SameSite=None; HttpOnly=true`
- ✅ Test cross-origin browser : `fetch('cms/api/users/me', {credentials:'include'})` depuis `avse-monetique.veridian.site` retourne le user
- ✅ Live Edit testé end-to-end : titre tapé dans admin → iframe AVSE re-render à la volée
- ✅ Network : POST `/api/pages/5` retourne 200 (mergeData OK)

## P0 — UX Admin : preview plus grande, sidebar rétractable

### Iframe trop petite

Observation visuelle (screenshot 17:08) : iframe `959×790` sur viewport `1568×732`, hero coupé à droite. Wrapper `.live-preview-window` à 959px de large alors qu'on a ~700px de marge à droite et 280px de sidebar gauche réductible.

- 🔵 Override CSS `.live-preview-window__wrapper` pour utiliser 100% width disponible (au lieu de 959px par défaut)
- 🔵 Réduire la sidebar admin en mode preview (collapse to icon-only ou hide complète)
- ⬜ Tester en breakpoints Responsive vs custom — pas de coupe

### Patch CSS admin

- 🔵 Créer `cms/src/app/(payload)/custom.scss` ou équivalent override
- 🔵 Sidebar collapsed en mode preview : `aside.template-default-nav { width: 60px }` puis hide labels
- 🔵 Étendre la zone preview pour compenser

## P1 — CI/CD optimisations

- 🔵 **BUG TROUVÉ** : workflow `cms-ci.yml` cible `cms/docker-compose.ovh-prod.yml` mais le container live tourne sur `docker-compose.prod.yml` à la racine. → image taggée `veridian/cms-prod:latest` (compose racine) n'est jamais retaggée par la CI qui pousse `ghcr.io/christ-roy/veridian-cms:SHA`. Aujourd'hui c'était à l'admin de retag manuellement.
- ⬜ Fixer le workflow deploy : retag automatiquement `ghcr.io/.../veridian-cms:SHA → veridian/cms-prod:latest` puis `up -d --force-recreate cms` sur le compose racine
- ⬜ Vérifier que le path compose dans le workflow correspond bien au compose live
- ⬜ Tester le rollback en simulant un health fail
- ⬜ Health check post-deploy avec rollback auto si 5xx (déjà partiel)

## P2 — Cleanup post-session

- ⬜ Supprimer le test user `test-live-edit@veridian.site`
- ⬜ Commit final + push (CSS sidebar/preview + workflow fix)
- ⬜ Update memory `session_2026-05-01_live_edit.md`
- ⬜ Update skill `cms-provision` V1.5 avec retour d'expérience CI drift

## Détails techniques validés

- Iframe URL : `https://avse-monetique.veridian.site/?preview=1`
- L'admin envoie postMessage type=`payload-live-preview` debounced ~250ms
- Le hook avse fait POST `cms.veridian.site/api/pages/5` avec credentials
- mergeData renvoie le doc en draft mode merged → React re-render avec data live
- HideWhenPreview masque le SSG, HomePreview rend HomeView avec data fraîche
- Test super-admin : `test-live-edit@veridian.site` / `7ec55488fd54a9716c22e137b10d1951` (à supprimer après session)
