# Veridian CMS — Payload 3 multi-tenant

CMS partagé pour tous les sites clients Veridian (AVSE, FGMC, Demo, etc.).
Stack : Next.js 16 + Payload 3 + Postgres + Plugin multi-tenant.

## Mode dev — refine UI sans builds prod

Pour itérer sur l'UI admin (custom.scss, components Payload override) avec
hot reload + vraies données prod.

### Setup en 3 étapes

```bash
# 1. Container Postgres dev (déjà présent dans verger-postgres sur :5433)
docker ps | grep verger-postgres

# 2. Sync DB prod → DB locale (à refaire quand on veut le contenu à jour)
ssh prod-pub "docker exec veridian-cms-postgres-prod \
  pg_dump -U cms -d veridian_cms --clean --if-exists --no-owner --no-acl \
  > /tmp/cms_prod_dump.sql"
scp -i ~/.ssh/id_rsa_ovh ubuntu@51.210.7.44:/tmp/cms_prod_dump.sql /tmp/
docker exec verger-postgres psql -U verger -d postgres \
  -c "DROP DATABASE IF EXISTS cms_dev; CREATE DATABASE cms_dev;"
docker cp /tmp/cms_prod_dump.sql verger-postgres:/tmp/
docker exec verger-postgres psql -U verger -d cms_dev -f /tmp/cms_prod_dump.sql

# 3. Lancer le mode dev
cd /home/brunon5/Bureau/veridian-platform/cms
PORT=3001 npm run dev
```

→ http://localhost:3001/admin (login avec les vrais credentials prod, ex : `avse.monetique@gmail.com` / mot de passe Didier)

### Ce qui hot-reload

- ✅ `src/app/(payload)/custom.scss` — styles admin (sidebar, formulaires, boutons…) — ~165ms
- ✅ Components React dans `src/collections/`, `src/blocks/`, `src/components/`
- ✅ `src/payload.config.ts` (rebuild plus long mais auto)
- ⚠️ DB schema : redémarrer si on change les collections + lancer `payload migrate` ensuite

### Ce qu'on NE TOUCHE PAS en mode dev

- La DB prod (on travaille sur la copie locale `cms_dev`)
- Les médias prod (uploads vont en local dans `/media/` du container CMS local)

## Workflow refine UI → push prod

```bash
# 1. Faire les modifs UI dans src/app/(payload)/custom.scss et autres
# 2. Vérifier en live sur localhost:3001
# 3. Une fois content :
git add -A
git commit -m "ui(cms): polish sidebar + preview pane"
git push
# → Dokploy détecte le push, rebuild et redéploie veridian-cms-prod (~2-3 min)
```

## Variables d'env

- `.env.development` — committé, dev local (DB locale, secrets factices)
- `.env.production` — sur Dokploy uniquement, jamais en local
- `.env.example` — template pour onboarding

## Fichiers clés

- `src/payload.config.ts` — config globale, livePreview, plugins, CORS
- `src/app/(payload)/custom.scss` — tout le style admin custom Veridian
- `src/collections/` — Pages, Tenants, Users, Media, Products, Header, Footer
- `src/blocks/` — Hero, Cards, SplitImageText, LogoWall, etc.

## Commandes utiles

```bash
npm run dev              # mode dev avec turbopack + HMR
npm run devsafe          # idem mais wipe .next d'abord
npm run build            # build prod (vérifie que ça compile avant push)
npm run generate:types   # régénère payload-types.ts après changement collection
```
