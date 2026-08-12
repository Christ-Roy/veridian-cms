# Déploiement GitOps Nomad — CMS Payload state.
#
# Déployer uniquement pendant le cutover contrôlé décrit dans
# runbooks/2026-08-12-cms-stateful-stateless-cutover.md. Ne jamais lancer ce job
# pendant que l'ancien job `cms` monolithique utilise déjà
# /opt/veridian-lab/cms/pgdata.
#
# Secrets inchangés : Nomad var nomad/jobs/cms.
job "cms-state" {
  datacenters = ["veridian-eu"]
  type        = "service"
  priority    = 80

  group "state" {
    count = 1

    # Volume bind local sur ovh-prod. Le state ne suit pas une replanification.
    constraint {
      attribute = "${meta.provider}"
      value     = "ovh-prod"
    }

    reschedule {
      attempts  = 0
      unlimited = false
    }

    restart {
      attempts = 10
      interval = "15m"
      delay    = "20s"
      mode     = "delay"
    }

    network {
      mode = "bridge"
      port "pg" {
        to           = 5432
        host_network = "tailscale"
      }
    }

    service {
      name     = "cms-postgres"
      provider = "nomad"
      port     = "pg"
      tags     = ["traefik.enable=false", "veridian.tier=saas-prod", "veridian.access=private"]
      check {
        type     = "tcp"
        interval = "10s"
        timeout  = "3s"
      }
    }

    task "postgres" {
      driver         = "docker"
      shutdown_delay = "5s"
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
        # Recalibré depuis le miroir live 2026-08-07 : p99 CPU 30 j = 10 MHz ;
        # pic mémoire = 89 MiB.
        cpu        = 100
        memory     = 256
        memory_max = 512
      }
    }
  }
}
