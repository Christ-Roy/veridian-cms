# 🔒 Veille CVE automatique — veridian-cms

> **Généré par** : `veridian-infra/.github/workflows/cron-trivy.yml`
> **Dernier run** : 2026-08-18 04:20 UTC
> **Run URL** : local-cron@mail.mybigserveur.local:2026-08-18
> **CVE bruts détectés** : 6 (avant filtrage)
> **Scoring** : `veridian-infra/ci/trivy-scoring.yml`

## TL;DR

- 🚨 **0 RED** — fix prioritaire
- 🔴 **0 HIGH** — action recommandée cette semaine
- 🟡 **0 MEDIUM** — récap, pas urgent
- 🟢 **6 NOISE** — annexe collapse

✅ **Aucune action requise.** Rapport régénéré quotidiennement.


---

## 🟢 NOISE filtré (6 CVE)

<details>
<summary>Liste complète (5 groupes — clique pour déplier)</summary>

| Package | Installed | Fix | CVE count | Max score |
|---|---|---|---|---|
| `js-yaml` | 4.3.0 | 4.3.1 | 1 | 5 |
| `nanoid` | 3.3.16 | 5.1.6 | 1 | 5 |
| `dompurify` | 3.4.12 | 3.4.13 | 1 | 4 |
| `postcss` | 8.5.18 | 8.5.23 | 1 | 4 |
| `image-size` | 2.0.2 | no-fix | 2 | 1.5 |

</details>


---

## Comment réagir

1. **Tu fixes** → bump la dep / la base image, push sur `staging`. Le prochain tick (24h) confirme.
2. **Tu acks le risque** → ajoute un override dans [`veridian-infra/ci/trivy-overrides.yml`](https://github.com/Christ-Roy/veridian-infra/blob/main/ci/trivy-overrides.yml) avec date d'expiration + raison.
3. **Tu ignores** → ne fais rien, le tick recréera ce fichier demain à l'identique.

> Tu peux **supprimer ce fichier librement**. Il sera recréé au prochain tick s'il reste des items à signaler. C'est l'idempotence qui garantit qu'on ne perd rien.

*Pour ajuster les règles : [`veridian-infra/ci/trivy-scoring.yml`](https://github.com/Christ-Roy/veridian-infra/blob/main/ci/trivy-scoring.yml). Ping infra-agent.*
