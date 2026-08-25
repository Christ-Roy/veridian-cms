# Déploiement GitOps Nomad — CMS Payload STAGING (SSH-bastion).
#
# Env PROCHE DE LA PROD : même image/Dockerfile, même config Payload, Postgres
# co-localisé (comme la prod) — seuls changent le nœud (ovh-dev), l'exposition
# (privée Tailscale) et les secrets/DB (staging). Sert cms.staging.veridian.site.
#
# Privé Tailscale : `host_network=tailscale` (port bind IP tailnet only) +
# middleware `cmsstg-internal-only@nomad` (ipAllowList tailnet) → 403 hors tailnet.
# Source de vérité GitOps (dans CE repo) ; la CI injecte var image_tag.

variable "image_tag" {
  type        = string
  description = "Tag immuable de l'image ghcr.io/christ-roy/veridian-cms staging (injecté par la CI)."
  default     = "staging-4c5939b"
}

job "cms-staging" {
  datacenters = ["veridian-eu"]
  type        = "service"
  priority    = 50

# veridian-contract:start
  meta = {
    "veridian.contract.version"  = "1"
    "veridian.managed_by"        = "repo"
    "veridian.environment"       = "staging"
    "veridian.tier"              = "saas-staging"
    "veridian.criticality"       = "C"
    "veridian.owner"             = "platform"
    "veridian.objective"         = "internal-99.0"
    "veridian.rto_minutes"       = "30"
    "veridian.rpo_minutes"       = "1440"
    "veridian.state"             = "local-state"
    "veridian.mobility"          = "sablier"
    "veridian.preemptible"       = "true"
    "veridian.production_job"    = "cms"
    "veridian.promotion_policy"  = "non-production"
  }
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
      tags = [
        "traefik.enable=true",
        # Middleware NOMMÉ PAR JOB, jamais partagé. Traefik invalide un middleware
        # déclaré plusieurs fois avec des valeurs divergentes : ce job déclarait
        # `internal-only` avec une allowlist réduite (sans l'IPv6 Tailscale), alors
        # qu'asset-bank/linkedin le déclaraient en version complète. Chaque
        # resoumission de cms-staging mettait donc en 404 les services internes
        # qui partageaient ce nom (incident du 2026-08-04).
        # Portée identique aux autres jobs internes, seul le nom est propre à celui-ci.
        "traefik.http.middlewares.cmsstg-internal-only.ipallowlist.sourcerange=100.64.0.0/10,fd7a:115c:a1e0::/48,172.26.64.0/20,127.0.0.1/32,::1/128",
        "traefik.http.routers.cms-staging.rule=Host(`cms.staging.veridian.site`)",
        "traefik.http.routers.cms-staging.entrypoints=web",
        "traefik.http.routers.cms-staging.middlewares=cmsstg-internal-only@nomad",
        "traefik.http.routers.cms-stagingsec.rule=Host(`cms.staging.veridian.site`)",
        "traefik.http.routers.cms-stagingsec.entrypoints=websecure",
        "traefik.http.routers.cms-stagingsec.tls=true",
        "traefik.http.routers.cms-stagingsec.tls.certresolver=letsencrypt",
        "traefik.http.routers.cms-stagingsec.middlewares=cmsstg-internal-only@nomad",
      ]
      check {
        type     = "http"
        path     = "/api/health"
        interval = "15s"
        timeout  = "5s"
      }
    }

    # --- Postgres staging (Payload migre au boot) ---
    task "postgres" {
      driver = "docker"
      config {
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
    task "cms" {
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
