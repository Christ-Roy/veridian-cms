# Déploiement GitOps Nomad — CMS Payload STAGING (SSH-bastion).
#
# Env PROCHE DE LA PROD : même image/Dockerfile, même config Payload, Postgres
# co-localisé (comme la prod) — seuls changent le nœud (ovh-dev), l'exposition
# (privée Tailscale) et les secrets/DB (staging). Sert cms.staging.veridian.site.
#
# Privé Tailscale : `host_network=tailscale` (port bind IP tailnet only) +
# middleware `internal-only@nomad` (ipAllowList 100.64/10) → 403 hors tailnet.
# Source de vérité GitOps (dans CE repo) ; la CI injecte var image_tag.

variable "image_tag" {
  type        = string
  description = "Tag de l'image ghcr.io/christ-roy/veridian-cms staging (injecté par la CI ; défaut staging-latest)."
  default     = "staging-latest"
}

job "cms-staging" {
  datacenters = ["veridian-eu"]
  type        = "service"

  group "cms" {
    count = 1

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
      port "http" {
        to           = 3000
        host_network = "tailscale"
      }
    }

    service {
      name     = "cms-staging"
      provider = "nomad"
      port     = "http"
      tags = [
        "traefik.enable=true",
        "traefik.http.middlewares.internal-only.ipallowlist.sourcerange=100.64.0.0/10,127.0.0.1/32",
        "traefik.http.routers.cms-staging.rule=Host(`cms.staging.veridian.site`)",
        "traefik.http.routers.cms-staging.entrypoints=web",
        "traefik.http.routers.cms-staging.middlewares=internal-only@nomad",
        "traefik.http.routers.cms-stagingsec.rule=Host(`cms.staging.veridian.site`)",
        "traefik.http.routers.cms-stagingsec.entrypoints=websecure",
        "traefik.http.routers.cms-stagingsec.tls=true",
        "traefik.http.routers.cms-stagingsec.tls.certresolver=letsencrypt",
        "traefik.http.routers.cms-stagingsec.middlewares=internal-only@nomad",
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
      driver = "docker"
      config {
        image = "ghcr.io/christ-roy/veridian-cms:${var.image_tag}"
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
        memory     = 1024
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
