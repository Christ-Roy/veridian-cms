# CMS Prod — Sanity Check

> À lancer **après chaque deploy structurel** (Dockerfile, compose, payload.config, migrations) et **1× par semaine** en routine.
> AVSE est un vrai client. Ne PAS skipper.

## 1. Smoke API (≤30s)

```bash
KEY=$(grep -E '^CMS_ADMIN_API_KEY_PROD=' ~/credentials/.all-creds.env | cut -d= -f2)

# Health
curl -sf https://cms.veridian.site/api/health | grep -q '"status":"ok","tenants":3'

# Tenant AVSE complet (SIRET + dirigeant)
curl -s -H "Authorization: users API-Key $KEY" \
  "https://cms.veridian.site/api/tenants?where%5Bslug%5D%5Bequals%5D=avse" \
  | python3 -c "import sys,json;t=json.load(sys.stdin)['docs'][0];assert t['company']['siret']=='48535721400033';assert t['company']['directorName']=='Didier Bollard';print('AVSE OK')"

# 47 partners AVSE
curl -s -H "Authorization: users API-Key $KEY" \
  "https://cms.veridian.site/api/partners?where%5Btenant%5D%5Bequals%5D=1&limit=0" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);assert d['totalDocs']==47,f'PARTNERS NOK {d[\"totalDocs\"]}/47';print('Partners 47/47')"

# 6 pages publiées (home, services, contact, partenaires, mentions, politique)
curl -s -H "Authorization: users API-Key $KEY" \
  "https://cms.veridian.site/api/pages?where%5Btenant%5D%5Bequals%5D=1&limit=100" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);assert d['totalDocs']==6,f'PAGES NOK {d[\"totalDocs\"]}/6';print('Pages 6/6')"

# Logo AVSE servi
curl -sf -o /dev/null -w 'logo=%{http_code}\n' \
  https://cms.veridian.site/api/media/file/used__logo-avse.webp
```

## 2. Site live

```bash
for path in / /services /contact /partenaires; do
  curl -s -o /dev/null -w "%{http_code} $path\n" --max-time 10 \
    https://avse-monetique.veridian.site$path
done
# Tous doivent retourner 200
```

## 3. Container healthcheck Docker

```bash
ssh prod-pub "docker inspect compose-copy-wireless-bus-e9xlnn-cms-1 \
  --format '{{.State.Health.Status}}'"
# Doit afficher : healthy
```

## 4. Backup R2

```bash
ssh prod-pub "rclone lsf r2:veridian-backups/cms/ | sort | tail -3"
# Le plus récent doit avoir la date d'aujourd'hui ou hier (cron 04:00 UTC).
# Si écart > 48h → backup cassé, investiguer /var/log/cms-backup.log
```

## 5. Healthcheck systemd dev-pub

```bash
ssh dev-pub "systemctl is-active veridian-prod-healthcheck && \
  journalctl -u veridian-prod-healthcheck --since '5 minutes ago' --no-pager \
  | grep -E 'CHECK OK: HTTPS cms'"
# Doit montrer au moins un CHECK OK: HTTPS cms.veridian.site
```

## Pièges connus (qui sont déjà arrivés)

1. **Container renommé après extraction polyrepo** (2026-05-13)
   - Avant : `veridian-cms-prod` / `veridian-cms-postgres-prod`
   - Après : `compose-copy-wireless-bus-e9xlnn-cms-1` / `compose-copy-wireless-bus-e9xlnn-cms-postgres-1`
   - Conséquence : tout script qui hardcode l'ancien nom casse en silence.
   - Fix : `docker ps --filter name=cms` pour récupérer le nom courant si bascule.

2. **Backup cassé sans alerte** (2026-05-13 → 2026-05-18)
   - Cron pointait sur `/home/ubuntu/veridian-cms-prod/scripts/backup-cms-postgres.sh` après que le dossier soit renommé `.deprecated-20260513-extraction`.
   - 5 jours sans backup, aucune alerte (cron stderr → /var/log/cms-backup.log non monitoré).
   - Fix : script relogé dans `/opt/veridian/backup/cms-postgres.sh`. Le script alerte Telegram en cas d'erreur ; il faudrait aussi alerter si le log n'a pas progressé depuis >26h (TODO).

3. **HEALTHCHECK Docker manquant** (2026-05-13 → 2026-05-18)
   - Dockerfile post-extraction n'avait plus de directive `HEALTHCHECK`.
   - Conséquence : `docker ps` montre `Up X hours` sans health status, donc Dokploy/Docker ne sait pas si CMS est vivant. Pas de restart auto.
   - Fix : HEALTHCHECK wget /api/health, retries 3, start-period 60s.

4. **prod-healthcheck.sh ne surveillait pas CMS** (depuis création service le 2026-05-14)
   - Le script systemd `veridian-prod-healthcheck` sur dev-pub surveille app.veridian.site, SSH, ping. Pas le CMS.
   - Conséquence : si cms.veridian.site tombe, aucune alerte Telegram (sauf si le container crash et docker-monitor le voit, ce qui n'est pas le cas si Next bloque sur la DB).
   - Fix : ajout `check_cms_https` + handle_check dans le script.

## En cas de fail

- **Pages AVSE manquantes** : restaurer depuis `r2:veridian-backups/cms/cms_<latest>.sql.gz`
  ```bash
  rclone copy r2:veridian-backups/cms/cms_2026-05-18_1710.sql.gz /tmp/
  gunzip /tmp/cms_2026-05-18_1710.sql.gz
  docker exec -i compose-copy-wireless-bus-e9xlnn-cms-postgres-1 \
    psql -U cms -d veridian_cms < /tmp/cms_2026-05-18_1710.sql
  ```

- **Site AVSE 5xx mais CMS OK** : c'est probablement Cloudflare Pages. Vérifier
  ```bash
  KEY=$(grep ^CMS_ADMIN_API_KEY_PROD= ~/credentials/.all-creds.env | cut -d= -f2)
  curl -X POST "$(curl -s -H "Authorization: users API-Key $KEY" \
    'https://cms.veridian.site/api/tenants?where%5Bslug%5D%5Bequals%5D=avse' \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)[\"docs\"][0][\"cfDeployHook\"])')"
  # Retrigger le deploy CF Pages
  ```

- **Tout cassé** : `emergency-rollback.yml` (workflow_dispatch sur GitHub Actions) → retag `:rollback` → redeploy Dokploy.
