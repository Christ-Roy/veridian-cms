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
  description = "Tag de l'image ghcr.io/christ-roy/veridian-cms promue en prod (injecté par la CI ; défaut latest)."
  default     = "latest"
}

job "cms" {
  datacenters = ["veridian-eu"]
  type        = "service"

  group "cms" {
    count = 1

    # Épinglé à ovh-prod : volumes bind (pgdata/media) sur /opt/veridian-lab/cms
    # de ce nœud uniquement → un stateful à volume local ne se reschedule pas.
    constraint {
      attribute = "${meta.provider}"
      value     = "ovh-prod"
    }

    # bridge => les 2 tasks partagent le netns : cms joint postgres via 127.0.0.1:5432
    network {
      mode = "bridge"
      port "http" { to = 3000 }
    }

    service {
      name     = "cms"
      provider = "nomad"
      port     = "http"
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.cms.rule=Host(`cms-lab.veridian.site`)",
        "traefik.http.routers.cms.entrypoints=web",
        "traefik.http.routers.cmssec.rule=Host(`cms-lab.veridian.site`)",
        "traefik.http.routers.cmssec.entrypoints=websecure",
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
        image = "postgres:16-alpine"
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

    # --- App Payload 3 (image GHCR CI, tag injecté par la CI) ---
    task "cms" {
      driver = "docker"
      config {
        image = "ghcr.io/christ-roy/veridian-cms:${var.image_tag}"
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
        memory     = 1024
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
