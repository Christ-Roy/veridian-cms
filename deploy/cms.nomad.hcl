# Déploiement GitOps Nomad — CMS Payload (SSH-bastion).
#
# Source de vérité du job prod `cms` (remplace l'ancien deploy Dokploy
# décommissionné le 2026-07-10). La CI (cms-ci.yml → deploy-prod) copie ce
# fichier sur le bastion et lance `nomad job run -var image_tag=<version>`.
#
# Palier 2026-08-12 : le job `cms` ne porte plus Postgres. L'état vit dans
# `deploy/cms-state.nomad.hcl` (job `cms-state`) pour éviter qu'un rightsizing
# ou un changement d'image Payload redémarre la DB. L'app monte encore
# `/opt/veridian-lab/cms/media:/app/media`, donc elle reste épinglée à ovh-prod
# et non reschedulable jusqu'à migration médias vers objet/CSI.

variable "image_tag" {
  type        = string
  description = "Tag de l'image ghcr.io/christ-roy/veridian-cms promue en prod (injecté par la CI ; défaut latest)."
  default     = "latest"
}

job "cms" {
  datacenters = ["veridian-eu"]
  type        = "service"
  priority    = 80

  group "cms" {
    count = 1

    restart {
      attempts = 10
      interval = "15m"
      delay    = "20s"
      mode     = "delay"
    }

    # Media bind local sur ovh-prod : app non portable tant que /app/media n'est
    # pas migré vers objet/CSI.
    constraint {
      attribute = "${meta.provider}"
      value     = "ovh-prod"
    }

    reschedule {
      attempts  = 0
      unlimited = false
    }

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
        type     = "http"
        path     = "/api/health"
        interval = "15s"
        timeout  = "5s"
      }
    }

    task "cms" {
      driver         = "docker"
      shutdown_delay = "10s"
      kill_timeout   = "30s"

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
{{ $postgresUser := .POSTGRES_USER }}
{{ $postgresPassword := .POSTGRES_PASSWORD }}
{{ $postgresDatabase := .POSTGRES_DB }}
{{ range nomadService "cms-postgres" }}
DATABASE_URL=postgresql://{{ $postgresUser }}:{{ $postgresPassword }}@{{ .Address }}:{{ .Port }}/{{ $postgresDatabase }}
{{ end }}
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
        change_mode = "restart"
      }
      resources {
        cpu        = 500
        memory     = 384
        memory_max = 512
      }
    }

    update {
      max_parallel      = 1
      min_healthy_time  = "15s"
      healthy_deadline  = "3m"
      progress_deadline = "5m"
      auto_revert       = true
    }
  }
}
