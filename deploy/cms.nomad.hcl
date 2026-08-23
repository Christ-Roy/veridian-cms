# Déploiement GitOps Nomad — CMS Payload (SSH-bastion).
#
# Source de vérité du job prod `cms` (remplace l'ancien deploy Dokploy
# décommissionné le 2026-07-10). La CI (cms-ci.yml → deploy-prod) copie ce
# fichier sur le bastion et lance `nomad job run -var image_tag=<version>`.
# Canon de référence : veridian-hub/deploy/ + veridian-prospection/deploy/README.md.
#
# Job STATEFUL (Postgres co-localisé, volumes bind sur ovh-prod, count=1) →
# un deploy recrée l'alloc (bref restart DB attendu, pas zéro-downtime). Les
# sites clients fetchent le CMS au BUILD, pas au runtime : un blip n'impacte
# que l'admin, pas les sites live.

variable "image_tag" {
  type        = string
  description = "Tag de l'image ghcr.io/christ-roy/veridian-cms promue en prod (injecté par la CI)."
  # Le defaut valait `latest` : un deploiement hors CI aurait
  # embarque n'importe quelle image. On epingle ce qui tourne reellement.
  default     = "v0.1.7"
}

job "cms" {
  datacenters = ["veridian-eu"]
  type        = "service"
  priority    = 80

  group "cms" {
    count = 1

    # Les pannes transitoires sont absorbées par Nomad. Le mode delay évite
    # une boucle de crash agressive tout en laissant dix tentatives sur 15 min.
    restart {
      attempts = 10
      interval = "15m"
      delay    = "20s"
      mode     = "delay"
    }

    # Épinglé à ovh-prod : volumes bind (pgdata/media) sur /opt/veridian-lab/cms
    # de ce nœud uniquement → un stateful à volume local ne se reschedule pas.
    constraint {
      attribute = "${meta.provider}"
      value     = "ovh-prod"
    }

    # bridge => les 2 tasks partagent le netns : cms joint postgres via 127.0.0.1:5432
    network {
      mode = "bridge"
      # Le provider Nomad annonce cette adresse aux deux ingress HA. Utiliser
      # le réseau public rend le backend joignable uniquement depuis l'ingress
      # co-localisé sur ovh-prod ; l'autre origine finit en 504. Le tailnet est
      # la route privée commune aux nœuds du cluster.
      port "http" {
        to           = 3000
        host_network = "tailscale"
      }
    }

    service {
      name     = "cms"
      provider = "nomad"
      port     = "http"
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.cms.rule=Host(`cms-lab.veridian.site`)",
        "traefik.http.routers.cms.entrypoints=web",
        "traefik.http.routers.cms.middlewares=internal-only@nomad",
        "traefik.http.routers.cmssec.rule=Host(`cms-lab.veridian.site`)",
        "traefik.http.routers.cmssec.entrypoints=websecure",
        "traefik.http.routers.cmssec.middlewares=internal-only@nomad",
        "traefik.http.routers.cmssec.tls=true",
        "traefik.http.routers.cmssec.tls.certresolver=letsencrypt",
        "traefik.http.routers.cmssec.tls.domains[0].main=veridian.site",
        "traefik.http.routers.cmssec.tls.domains[0].sans=*.veridian.site",
        "traefik.http.routers.cmsprod.rule=Host(`cms.veridian.site`)",
        "traefik.http.routers.cmsprod.entrypoints=websecure",
        "traefik.http.routers.cmsprod.tls=true",
        "traefik.http.routers.cmsprod.tls.certresolver=letsencrypt",
      ]
      check {
        type     = "tcp"
        interval = "15s"
        timeout  = "3s"
      }
    }

    # --- Postgres (Payload migre au boot) ---
    task "postgres" {
      driver = "docker"
      config {
        # Image officielle postgres:16-alpine + pgBackRest epingle. La BASE est
        # identique au bit pres : changer d'image de base changerait la
        # collation (musl/glibc) et fausserait silencieusement les index.
        image = "ghcr.io/christ-roy/veridian-postgres-pgbackrest:16-alpine@sha256:ca672c3127d4e9e1fef42e813ecd751a6759ed4e7916e44a6ae7fb3a6862716e"
        args = [
          # --- Archivage continu des WAL vers le depot pgBackRest ---
          # C'est CE reglage, et non la sauvegarde nocturne, qui borne la perte
          # de donnees : chaque segment de journal part vers R2 des qu'il est
          # clos. archive_timeout force cette cloture toutes les 5 minutes quand
          # il y a eu de l'ecriture, donc RPO = 5 min.
          # Modifier archive_mode exige un REDEMARRAGE de PostgreSQL (ce n'est
          # pas rechargeable a chaud) : c'est la seule interruption qu'impose la
          # mise en place.
          # pgBackRest ne joint le cluster QUE par socket Unix ; il n'a aucune
          # option de connexion TCP pour un cluster local. La tache annexe vit
          # dans un autre espace de montage et ne voit donc pas
          # /var/run/postgresql. On publie une seconde socket dans /alloc, le
          # repertoire que Nomad partage entre les taches d'un meme groupe.
          # L'ancienne reste en place : `docker exec ... psql` continue de marcher.
          "-c", "unix_socket_directories=/var/run/postgresql,/alloc",
          "-c", "archive_mode=on",
          "-c", "archive_command=pgbackrest --stanza=cms archive-push %p",
          "-c", "archive_timeout=300",
          "-c", "wal_level=replica",
        ]
        volumes = [
          "/opt/veridian-lab/cms/pgdata:/var/lib/postgresql/data",
        ]
      }
      template {
        data        = <<EOH
{{ with nomadVar "nomad/jobs/cms" }}
POSTGRES_USER={{ .POSTGRES_USER }}
POSTGRES_PASSWORD={{ .POSTGRES_PASSWORD }}
POSTGRES_DB={{ .POSTGRES_DB }}
{{ end }}
# --- pgBackRest : configuration par variables d'environnement ---
# Aucun fichier de configuration : les identifiants R2 et la phrase de
# chiffrement ne sont jamais ecrits sur le disque de l'allocation. pgBackRest
# lit toute option sous la forme PGBACKREST_<OPTION>.
PGBACKREST_REPO1_TYPE=s3
PGBACKREST_REPO1_PATH=/pgbackrest/cms
PGBACKREST_REPO1_S3_REGION=auto
# path : R2 accepte les deux styles, celui-ci ne depend pas d'un DNS par bucket.
PGBACKREST_REPO1_S3_URI_STYLE=path
PGBACKREST_REPO1_CIPHER_TYPE=aes-256-cbc
PGBACKREST_COMPRESS_TYPE=zst
PGBACKREST_COMPRESS_LEVEL=6
PGBACKREST_REPO1_BUNDLE=y
PGBACKREST_REPO1_BLOCK=y
PGBACKREST_LOG_LEVEL_CONSOLE=info
PGBACKREST_LOG_LEVEL_FILE=off
PGBACKREST_PG1_PATH=/var/lib/postgresql/data
PGBACKREST_PG1_PORT=5432
{{ with nomadVar "nomad/jobs/cms" }}
PGBACKREST_REPO1_S3_BUCKET={{ .R2_BUCKET }}
PGBACKREST_REPO1_S3_ENDPOINT={{ .R2_ENDPOINT }}
PGBACKREST_REPO1_S3_KEY={{ .R2_ACCESS_KEY_ID }}
PGBACKREST_REPO1_S3_KEY_SECRET={{ .R2_SECRET_ACCESS_KEY }}
# Utilisateur et base lus dans la MEME Variable que PostgreSQL lui-meme :
# les recopier en dur ici les ferait deriver en silence le jour ou ils changent.
PGBACKREST_PG1_USER={{ .POSTGRES_USER }}
PGBACKREST_PG1_DATABASE={{ .POSTGRES_DB }}
# ATTENTION : PERDRE CETTE PHRASE = PERDRE TOUTES LES SAUVEGARDES. Copie de
# secours dans ~/credentials/.all-creds.env (PGBACKREST_CIPHER_CMS).
PGBACKREST_REPO1_CIPHER_PASS={{ .PGBACKREST_CIPHER_PASS }}
{{ end }}
EOH
        destination = "secrets/pg.env"
        env         = true
      }
      resources {
        cpu        = 300
        memory     = 256
        memory_max = 7000
      }
    }

    # ---- pgBackRest : sauvegarde continue vers R2 ----
    # Tache annexe du MEME groupe, donc : meme espace reseau (elle joint
    # PostgreSQL par la socket publiee dans /alloc, authentification `trust`
    # locale, aucun mot de passe a promener) et meme bind mount de PGDATA (elle
    # lit les pages directement). Elle SUIT l'allocation : si Nomad replace le
    # groupe, la sauvegarde repart sans qu'on touche a un script.
    task "pgbackrest" {
      driver = "docker"
      config {
        image      = "ghcr.io/christ-roy/veridian-postgres-pgbackrest:16-alpine@sha256:ca672c3127d4e9e1fef42e813ecd751a6759ed4e7916e44a6ae7fb3a6862716e"
        entrypoint = ["/usr/local/bin/pgbackrest-scheduler"]
        command    = ""
        volumes = [
          "/opt/veridian-lab/cms/pgdata:/var/lib/postgresql/data",
        ]
      }
      user = "postgres"

      template {
        destination = "secrets/pgbackrest.env"
        env         = true
        data        = <<EOH
TZ=UTC
PGBR_STANZA=cms
# Socket partagee avec la tache postgres via le repertoire d'allocation.
PGBACKREST_PG1_SOCKET_PATH=/alloc
# Complete le dimanche, differentielle les autres jours, incrementale toutes les
# 6 h. 25 : creneau propre a cette stanza pour ne pas taper R2 en meme
# temps que les autres bases du parc.
PGBR_FULL_DOW=0
PGBR_DAILY_HOUR=3
PGBR_DAILY_MINUTE=25
PGBR_INCR_EVERY_H=6
# Base de PRODUCTION cliente : 8 semaines de completes conservees. Les WAL
# retenus couvrent la meme profondeur, donc on peut viser n'importe quelle
# seconde des deux derniers mois.
PGBACKREST_REPO1_RETENTION_FULL=8
PGBACKREST_REPO1_RETENTION_DIFF=7
PGBACKREST_PROCESS_MAX=2
PGBACKREST_START_FAST=y
# --- pgBackRest : configuration par variables d'environnement ---
# Aucun fichier de configuration : les identifiants R2 et la phrase de
# chiffrement ne sont jamais ecrits sur le disque de l'allocation. pgBackRest
# lit toute option sous la forme PGBACKREST_<OPTION>.
PGBACKREST_REPO1_TYPE=s3
PGBACKREST_REPO1_PATH=/pgbackrest/cms
PGBACKREST_REPO1_S3_REGION=auto
# path : R2 accepte les deux styles, celui-ci ne depend pas d'un DNS par bucket.
PGBACKREST_REPO1_S3_URI_STYLE=path
PGBACKREST_REPO1_CIPHER_TYPE=aes-256-cbc
PGBACKREST_COMPRESS_TYPE=zst
PGBACKREST_COMPRESS_LEVEL=6
PGBACKREST_REPO1_BUNDLE=y
PGBACKREST_REPO1_BLOCK=y
PGBACKREST_LOG_LEVEL_CONSOLE=info
PGBACKREST_LOG_LEVEL_FILE=off
PGBACKREST_PG1_PATH=/var/lib/postgresql/data
PGBACKREST_PG1_PORT=5432
{{ with nomadVar "nomad/jobs/cms" }}
PGBACKREST_REPO1_S3_BUCKET={{ .R2_BUCKET }}
PGBACKREST_REPO1_S3_ENDPOINT={{ .R2_ENDPOINT }}
PGBACKREST_REPO1_S3_KEY={{ .R2_ACCESS_KEY_ID }}
PGBACKREST_REPO1_S3_KEY_SECRET={{ .R2_SECRET_ACCESS_KEY }}
# Utilisateur et base lus dans la MEME Variable que PostgreSQL lui-meme :
# les recopier en dur ici les ferait deriver en silence le jour ou ils changent.
PGBACKREST_PG1_USER={{ .POSTGRES_USER }}
PGBACKREST_PG1_DATABASE={{ .POSTGRES_DB }}
# ATTENTION : PERDRE CETTE PHRASE = PERDRE TOUTES LES SAUVEGARDES. Copie de
# secours dans ~/credentials/.all-creds.env (PGBACKREST_CIPHER_CMS).
PGBACKREST_REPO1_CIPHER_PASS={{ .PGBACKREST_CIPHER_PASS }}
{{ end }}
EOH
      }

      resources {
        cpu        = 100
        memory     = 64
        memory_max = 512
      }
    }

    # --- App Payload 3 (image GHCR CI, tag injecté par la CI) ---
    task "cms" {
      driver         = "docker"
      shutdown_delay = "10s"
      kill_timeout   = "30s"

      # Le check d'ingress TCP protège le routage. Ce check applicatif séparé
      # redémarre uniquement Payload si son endpoint de santé reste en échec.
      service {
        name     = "cms-selfheal"
        provider = "nomad"
        port     = "http"
        tags     = ["traefik.enable=false"]
        check {
          type     = "http"
          path     = "/api/health"
          interval = "15s"
          timeout  = "5s"
          check_restart {
            limit           = 4
            grace           = "180s"
            ignore_warnings = false
          }
        }
      }

      config {
        image = "ghcr.io/christ-roy/veridian-cms:${var.image_tag}"
        init  = true
        ports = ["http"]
        volumes = [
          "/opt/veridian-lab/cms/media:/app/media",
        ]
      }
      env {
        NODE_ENV                = "production"
        PORT                    = "3000"
        SERVER_URL              = "https://cms.veridian.site"
        NODE_OPTIONS            = "--max-old-space-size=1024"
        PAYLOAD_DB_PUSH         = "true"
        NEXT_TELEMETRY_DISABLED = "1"
        AUTH_COOKIE_DOMAIN      = ".veridian.site"
        AUTH_COOKIE_SAMESITE    = "None"
        AUTH_COOKIE_SECURE      = "true"
        CORS_ORIGINS            = "https://cms.veridian.site"
        CSRF_ORIGINS            = "https://cms.veridian.site"
      }
      template {
        data        = <<EOH
{{ with nomadVar "nomad/jobs/cms" }}
PAYLOAD_SECRET={{ .PAYLOAD_SECRET }}
DATABASE_URL={{ .DATABASE_URL }}
SMTP_HOST={{ .SMTP_HOST }}
SMTP_PORT={{ .SMTP_PORT }}
SMTP_USER={{ .SMTP_USER }}
SMTP_PASSWORD={{ .SMTP_PASSWORD }}
SMTP_FROM={{ .SMTP_FROM }}
GITHUB_TOKEN={{ .GITHUB_TOKEN }}
GITHUB_REPO={{ .GITHUB_REPO }}
GITHUB_WORKFLOW={{ .GITHUB_WORKFLOW }}
{{ end }}
EOH
        destination = "secrets/cms.env"
        env         = true
      }
      resources {
        cpu        = 500
        # Pic RSS du groupe observé autour de 243 MB. La réservation gouverne
        # le placement ; le plafond de 7 GB laisse absorber les pics ponctuels.
        memory     = 384
        memory_max = 7000
      }
    }

    update {
      max_parallel     = 1
      min_healthy_time = "15s"
      healthy_deadline = "3m"
      auto_revert      = true
    }
  }
}
