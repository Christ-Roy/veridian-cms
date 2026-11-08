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
  # Mesuré sur le job Nomad live avant ce commit : v0.1.8.
  # Recale le 2026-08-29 : mesure sur le job Nomad vivant = v0.1.10, deux
  # promotions devant ce defaut. Aucun effet sur le deploiement, la CI injecte
  # -var image_tag ; l'effet est sur la VERITE des plans hors CI, ou le defaut
  # affichait une retrogradation qui n'existait pas et bloquait le chantier
  # perms des secrets.
  # Recale le 2026-09-24 (chantier durcissement conteneurs) : mesure sur le
  # job Nomad vivant = v0.1.12, juste avant ce commit — un defaut perime
  # aurait fait reculer l'image en meme temps que le durcissement.
  default     = "v0.1.12"
}

job "cms" {
  datacenters = ["veridian-eu"]
  type        = "service"
  priority    = 80

# veridian-contract:start
# veridian.contract.version=1
# veridian.managed_by=repo
# veridian.environment=production
# veridian.tier=saas-prod
# veridian.criticality=B
# veridian.owner=platform
# veridian.objective=availability-99.9
# veridian.rto_minutes=5
# veridian.rpo_minutes=15
# veridian.state=local-state
# veridian.mobility=local-gap
# veridian.preemptible=false
# veridian.staging_job=cms-staging
# veridian.promotion_policy=staging-required
# veridian-contract:end

  group "cms" {
    count = 1

    # Les pannes transitoires sont absorbées par Nomad. Le mode delay évite
    # une boucle de crash agressive tout en laissant dix tentatives sur 15 min.
    restart {
      attempts = 10
      interval = "15m"
      delay    = "2s"
      mode     = "delay"
    }

    # Épinglé à ovh-prod : volume bind media sur /opt/veridian-lab/cms ; la base vit dans le job cms-db depuis le 08/11
    # de ce nœud uniquement → un stateful à volume local ne se reschedule pas.
    constraint {
      attribute = "${meta.provider}"
      value     = "ovh-prod"
    }

    # La base est jointe par le catalogue Nomad (service cms-postgres, job cms-db), plus par 127.0.0.1
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

    # --- App Payload 3 (image GHCR CI, tag injecté par la CI) ---
    task "cms" {
      driver         = "docker"
      user           = "nextjs"
      # Traefik relit le catalogue toutes les 15 s : l'allocation sortante sert encore pendant qu'il l'oublie.
      shutdown_delay = "30s"
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
        # Durcissement Unix : empeche un processus non privilegie d'elever ses
        # droits via un binaire setuid. C'est le maillon entre « shell dans le
        # conteneur » et « root sur l'hote ». N'affecte PAS un processus qui
        # ABANDONNE ses droits au demarrage, seulement celui qui en gagne.
        security_opt    = ["no-new-privileges:true"]
        readonly_rootfs = true
        cap_drop        = ["ALL"]

        # Identification lisible du conteneur (2026-09-07). Nomad ne pose que
        # `com.hashicorp.nomad.alloc_id` : rien ne disait a quelle application
        # appartenait un conteneur. Les quatre premieres valeurs sont
        # interpolees par Nomad a l'execution, les deux dernieres sont des
        # proprietes du fichier (dossier jobs/<tier>/ et table du script
        # scripts/poser-labels-conteneurs.py).
        labels = {
          "site.veridian.job"   = "${NOMAD_JOB_NAME}"
          "site.veridian.group" = "${NOMAD_GROUP_NAME}"
          "site.veridian.task"  = "${NOMAD_TASK_NAME}"
          "site.veridian.node"  = "${node.unique.name}"
          "site.veridian.tier"  = "saas-prod"
          "site.veridian.app"   = "cms"
        }
        image = "ghcr.io/christ-roy/veridian-cms:${var.image_tag}"
        init  = true
        ports = ["http"]
        volumes = [
          "/opt/veridian-lab/cms/media:/app/media",
        ]

        # Next.js standalone : le cache d'optimisation d'images (.next/cache)
        # ecrit sur disque a la demande. Rootfs en lecture seule => tmpfs
        # dedie, comme /tmp pour le reste de l'ecriture temporaire du
        # process node. Meme configuration deja verifiee en prod sur `hub`
        # (meme base d'image nextjs standalone) le 2026-09-24.
        mount {
          type     = "tmpfs"
          target   = "/tmp"
          readonly = false
          tmpfs_options { size = 67108864 }
        }
        mount {
          type     = "tmpfs"
          target   = "/app/.next/cache"
          readonly = false
          tmpfs_options { size = 134217728 }
        }
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
SMTP_HOST={{ .SMTP_HOST }}
SMTP_PORT={{ .SMTP_PORT }}
SMTP_USER={{ .SMTP_USER }}
SMTP_PASSWORD={{ .SMTP_PASSWORD }}
SMTP_FROM={{ .SMTP_FROM }}
GITHUB_TOKEN={{ .GITHUB_TOKEN }}
GITHUB_REPO={{ .GITHUB_REPO }}
GITHUB_WORKFLOW={{ .GITHUB_WORKFLOW }}
{{ end }}
{{ range nomadService "cms-postgres" }}{{ $a := .Address }}{{ $p := .Port }}{{ with nomadVar "nomad/jobs/cms" }}DATABASE_URL=postgresql://{{ .POSTGRES_USER }}:{{ .POSTGRES_PASSWORD }}@{{ $a }}:{{ $p }}/{{ .POSTGRES_DB }}{{ end }}{{ end }}
EOH
        destination = "secrets/cms.env"
        perms       = "600"   # secret: lisible du seul proprietaire
        env         = true
      }
      resources {
        cpu        = 500
        # Pic RSS du groupe observé autour de 243 MB. La réservation gouverne
        # le placement ; le plafond de 7 GB laisse absorber les pics ponctuels.
        # 08/11 : reserve = memoire non reprenable mesuree (89 Mio) + 80 %, plafond coherent avec le tas Node de 1 024 Mio
        # (NODE_OPTIONS) : en dessous, Node serait tue avant sa propre limite. Avant : 7000 Mio, une fuite avalait ovh-prod.
        memory     = 160
        memory_max = 1280
      }
    }

    # Bleu-vert (08/11/2026) : la base vit dans le job cms-db, le canari demarre a cote de l'ancienne allocation, sans
    # couper. Ne pas changer les tags Traefik dans un deploiement ordinaire : deux versions aux tags differents donnent a
    # Traefik deux definitions du meme routeur, il l'ecarte (404).
    update {
      max_parallel     = 1
      canary           = 1
      auto_promote     = true
      min_healthy_time = "15s"
      healthy_deadline = "3m"
      auto_revert      = true
    }
  }
}
