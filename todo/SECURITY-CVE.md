# 🔒 Veille CVE automatique — veridian-cms

> **Généré par** : `veridian-infra/.github/workflows/cron-trivy.yml`
> **Dernier run** : 2026-06-18 04:20 UTC
> **Run URL** : local-cron@mail.mybigserveur.local:2026-06-18
> **CVE bruts détectés** : 21 (avant filtrage)
> **Scoring** : `veridian-infra/ci/trivy-scoring.yml`

## TL;DR

- 🚨 **0 RED** — fix prioritaire
- 🔴 **0 HIGH** — action recommandée cette semaine
- 🟡 **0 MEDIUM** — récap, pas urgent
- 🟢 **20 NOISE** — annexe collapse

✅ **Aucune action requise.** Rapport régénéré quotidiennement.


---

## 🟢 NOISE filtré (20 CVE)

<details>
<summary>Liste complète (6 groupes — clique pour déplier)</summary>

| Package | Installed | Fix | CVE count | Max score |
|---|---|---|---|---|
| `ws` | 8.20.0 | 8.21.0 | 2 | 5 |
| `dompurify` | 3.2.7 | 3.4.7 | 12 | 4 |
| `postcss` | 8.4.31 | 8.5.10 | 1 | 4 |
| `uuid` | 10.0.0 | 13.0.1 | 1 | 4 |
| `js-yaml` | 4.1.1 | 4.2.0 | 1 | 2 |
| `nodemailer` | 8.0.6 | 8.0.9 | 3 | 2 |

</details>


---

## Comment réagir

1. **Tu fixes** → bump la dep / la base image, push sur `staging`. Le prochain tick (24h) confirme.
2. **Tu acks le risque** → ajoute un override dans [`veridian-infra/ci/trivy-overrides.yml`](https://github.com/Christ-Roy/veridian-infra/blob/main/ci/trivy-overrides.yml) avec date d'expiration + raison.
3. **Tu ignores** → ne fais rien, le tick recréera ce fichier demain à l'identique.

> Tu peux **supprimer ce fichier librement**. Il sera recréé au prochain tick s'il reste des items à signaler. C'est l'idempotence qui garantit qu'on ne perd rien.

*Pour ajuster les règles : [`veridian-infra/ci/trivy-scoring.yml`](https://github.com/Christ-Roy/veridian-infra/blob/main/ci/trivy-scoring.yml). Ping infra-agent.*
