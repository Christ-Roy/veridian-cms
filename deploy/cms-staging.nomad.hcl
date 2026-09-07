# Déploiement GitOps Nomad — CMS Payload STAGING (SSH-bastion).
#
# Env PROCHE DE LA PROD : même image/Dockerfile, même config Payload, Postgres
# co-localisé (comme la prod) — seuls changent le nœud (ovh-dev), l'exposition
# (privée Tailscale) et les secrets/DB (staging). Sert cms.staging.veridian.site.
#
# Privé Tailscale : `host_network=tailscale` (port bind IP tailnet only) +
# middleware `s2z-internal-only@file` (ipAllowList 100.64/10), porté par les
# routes @file de l'ingress → 403 hors tailnet. Ce job ne déclare PLUS de
# router ni de middleware Traefik lui-même : voir le pavé sur le bloc `tags`,
# c'est ce qui cassait l'endormissement Sablier.
# Source de vérité GitOps (dans CE repo) ; la CI injecte var image_tag.

variable "image_tag" {
  type        = string
  description = "Tag immuable de l'image ghcr.io/christ-roy/veridian-cms staging (injecté par la CI)."
  # Recale le 2026-08-29 : mesure sur le job Nomad vivant = staging-a8fc60e,
  # dont 4c5939b est un ancetre. Sans effet sur le deploiement (la CI injecte
  # -var image_tag) ; l'effet est sur la verite des plans hors CI, ou le defaut
  # affichait une retrogradation qui n'existait pas.
  default     = "staging-a8fc60e"
}

job "cms-staging" {
  datacenters = ["veridian-eu"]
  type        = "service"
  priority    = 30 # bande 30 : staging, jetable sous contention. cf plan/POLICY-PRIORITES.md (nomad-veridian).
  # 50 = valeur du defaut Nomad, donc le niveau d'un client payant : a 50 ce banc
  # d'essai n'etait jamais preempte par la prod (Nomad ne preempte qu'a 10 points
  # d'ecart). Corrige le 2026-09-07 (ROB-60).

# veridian-contract:start
# veridian.contract.version=1
# veridian.managed_by=repo
# veridian.environment=staging
# veridian.tier=saas-staging
# veridian.criticality=C
# veridian.owner=platform
# veridian.objective=internal-99.0
# veridian.rto_minutes=30
# veridian.rpo_minutes=1440
# veridian.state=local-state
# veridian.mobility=sablier
# veridian.preemptible=true
# veridian.production_job=cms
# veridian.promotion_policy=non-production
# veridian-contract:end

  group "cms" {
    count = 1

    meta = {
      "sablier.enable" = "true"
    }

    # Épinglé à ovh-dev : volumes bind (pgdata/media) sur /opt/veridian-staging/cms.
    constraint {
      attribute = "${meta.provider}"
      value     = "ovh-dev"
    }

    restart {
      attempts = 10
      interval = "10m"
      delay    = "15s"
      mode     = "delay"
    }

    network {
      mode = "bridge"
      # host_network tailscale : le port CNI bind sur l'IP Tailscale du nœud
      # uniquement → app injoignable en public, Traefik route via Tailscale.
      # Le port doit rester stable : le routeur Sablier scale-to-zero l'utilise
      # aussi quand le job est à count=0 et qu'aucun service Nomad n'existe.
      port "http" {
        to           = 3000
        static       = 19094
        host_network = "tailscale"
      }
    }

    service {
      name     = "cms-staging"
      provider = "nomad"
      port     = "http"
      # 🔴 NE PAS REMETTRE DE ROUTERS `@nomad` ICI : ils MASQUENT la route
      # Sablier et cassent l'endormissement. Mesure du 2026-09-07.
      #
      # Le mecanisme, parce qu'il est invisible et qu'il se repose. Ce bloc
      # declarait `traefik.enable=true` et DEUX routers portant exactement la
      # meme regle `Host(`cms.staging.veridian.site`)` que les routes @file
      # `cms-staging-s2z[-sec]` de l'ingress (nomad-veridian, jobs/infra/
      # ingress.nomad.hcl). Regles identiques = priorites identiques (33, la
      # longueur de la regle), donc l'un des deux gagne, et c'etait le @nomad.
      # Or seul le @file porte le middleware `sablier-cms-staging`, celui qui
      # OUVRE ET RENOUVELLE la session Sablier.
      #
      # D'ou un comportement qui a l'air de marcher et qui ne marche pas :
      #   · a count=0 le service Nomad est deregistre, le router @nomad
      #     disparait, la route @file prend la main : le REVEIL fonctionne ;
      #   · des que la tache tourne, le router @nomad reapparait, capte tout le
      #     trafic, et Sablier ne voit plus passer personne.
      # Consequence : l'environnement est endormi au bout de 5 minutes SOUS LES
      # PIEDS de celui qui s'en sert. Sur un banc d'essai qu'on ouvre justement
      # pour regarder l'ecran, c'est le pire endroit possible — meme famille de
      # panne que la course Sablier documentee dans l'ingress.
      # Trace du 2026-09-07 : reveil a 12:31:08 par `cms-staging-s2z-sec@file`,
      # puis TOUTES les requetes suivantes par `cms-stagingsec@nomad`.
      #
      # Les 4 autres bancs d'essai (hub, crm, notifuse, prospection) portent
      # `traefik.enable=false` et dorment correctement : c'est le temoin.
      #
      # ⚠️ CE QUE CE CHANGEMENT RETRECIT, a savoir avant de l'imiter ailleurs.
      # Le middleware `cmsstg-internal-only` supprime ici autorisait une plage
      # plus large que le `s2z-internal-only@file` qui le remplace (lequel ne
      # porte que 100.64.0.0/10 et 127.0.0.1/32) : partent le bridge Docker
      # 172.26.64.0/20 et l'IPv6 tailnet fd7a:115c:a1e0::/48. Verifie AVANT de
      # basculer, sur 7 jours de journaux d'acces de l'ingress : 23 requetes en
      # tout sur cms.staging, toutes depuis 100.108.136.89, zero depuis le
      # bridge, zero en IPv6. Si un appelant conteneur-a-conteneur apparait un
      # jour, c'est `s2z-internal-only` qu'il faudra elargir — et ce bloc-la
      # redemarre Traefik, donc ca se decide, ca ne se subit pas.
      #
      # Le middleware nommé par job disparait avec les routers qui l'utilisaient.
      # L'incident du 2026-08-04 qu'il evitait (collision de nom `internal-only`
      # avec asset-bank/linkedin, qui mettait les services internes en 404)
      # reste evite : ce job ne declare plus AUCUN middleware Traefik.
      tags = ["traefik.enable=false"]
      check {
        type     = "http"
        path     = "/api/health"
        interval = "15s"
        timeout  = "5s"
      }
    }

    # --- Postgres staging (Payload migre au boot) ---
    task "cms-staging-postgres" {
      driver = "docker"
      config {
        # Durcissement Unix : empeche un processus non privilegie d'elever ses
        # droits via un binaire setuid. C'est le maillon entre « shell dans le
        # conteneur » et « root sur l'hote ». N'affecte PAS un processus qui
        # ABANDONNE ses droits au demarrage, seulement celui qui en gagne.
        security_opt = ["no-new-privileges:true"]

        image = "postgres:16-alpine"
        volumes = [
          "/opt/veridian-staging/cms/pgdata:/var/lib/postgresql/data",
        ]
      }
      template {
        data        = <<EOH
{{ with nomadVar "nomad/jobs/cms-staging" }}
POSTGRES_USER={{ .POSTGRES_USER }}
POSTGRES_PASSWORD={{ .POSTGRES_PASSWORD }}
POSTGRES_DB={{ .POSTGRES_DB }}
{{ end }}
EOH
        destination = "secrets/pg.env"
        env         = true
      }
      resources {
        cpu        = 300
        memory     = 256
        memory_max = 2000
      }
    }

    # --- App Payload 3 (image GHCR staging, tag injecté par la CI) ---
    task "cms-staging" {
      driver         = "docker"
      shutdown_delay = "10s"
      kill_timeout   = "30s"
      # Check lié à la tâche : Nomad redémarre l'app seule après quatre échecs,
      # jamais la tâche PostgreSQL voisine.
      service {
        name     = "cms-staging-selfheal"
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
        # Durcissement Unix : empeche un processus non privilegie d'elever ses
        # droits via un binaire setuid. C'est le maillon entre « shell dans le
        # conteneur » et « root sur l'hote ». N'affecte PAS un processus qui
        # ABANDONNE ses droits au demarrage, seulement celui qui en gagne.
        security_opt = ["no-new-privileges:true"]

        image = "ghcr.io/christ-roy/veridian-cms:${var.image_tag}"
        init  = true
        ports = ["http"]
        volumes = [
          "/opt/veridian-staging/cms/media:/app/media",
        ]
      }
      env {
        NODE_ENV                = "production"
        PORT                    = "3000"
        SERVER_URL              = "https://cms.staging.veridian.site"
        NODE_OPTIONS            = "--max-old-space-size=1024"
        PAYLOAD_DB_PUSH         = "true"
        NEXT_TELEMETRY_DISABLED = "1"
        AUTH_COOKIE_DOMAIN      = ".veridian.site"
        AUTH_COOKIE_SAMESITE    = "None"
        AUTH_COOKIE_SECURE      = "true"
        CORS_ORIGINS            = "https://cms.staging.veridian.site"
        CSRF_ORIGINS            = "https://cms.staging.veridian.site"
      }
      template {
        data        = <<EOH
{{ with nomadVar "nomad/jobs/cms-staging" }}
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
        # Mesuré live le 2026-08-01 : 47 Mio RSS / 72 Mio avec cache.
        # 128 Mio réserve correctement le scheduler ; memory_max garde le pic.
        memory     = 128
        memory_max = 3000
      }
    }

    update {
      max_parallel     = 1
      min_healthy_time = "15s"
      healthy_deadline = "5m"
      auto_revert      = true
    }
  }
}
