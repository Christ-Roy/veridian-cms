# 🔒 Veille CVE automatique — veridian-cms

> **Généré par** : `veridian-infra/.github/workflows/cron-trivy.yml`
> **Dernier run** : 2026-05-21 04:20 UTC
> **Run URL** : local-cron@mail.mybigserveur.local:2026-05-21
> **CVE bruts détectés** : 12 (avant filtrage)
> **Scoring** : `veridian-infra/ci/trivy-scoring.yml`

## TL;DR

- 🚨 **0 RED** — fix prioritaire
- 🔴 **0 HIGH** — action recommandée cette semaine
- 🟡 **1 MEDIUM** — récap, pas urgent
- 🟢 **11 NOISE** — annexe collapse

✅ **Rien d'urgent.** Quelques items MEDIUM à voir quand t'as 5 min.


---

## 🟡 MEDIUM — 1 CVE en 1 groupe

### 1. `nodemailer` — 7.0.12 → **8.0.5**

- **CVE** : `GHSA-vvjj-xcjg-gr5g` (MEDIUM/RCE)
- **Type** : RCE
- **Score max** : 10
- **Title** : Nodemailer Vulnerable to SMTP Command Injection via CRLF in Transport name Option (EHLO/HELO) 
- **Source** : `pnpm-lock.yaml`
- **Fix** : `pnpm up nodemailer` (jusqu'à >= `8.0.5`)


---

## 🟢 NOISE filtré (11 CVE)

<details>
<summary>Liste complète (4 groupes — clique pour déplier)</summary>

| Package | Installed | Fix | CVE count | Max score |
|---|---|---|---|---|
| `dompurify` | 3.2.7 | 3.4.0 | 8 | 4 |
| `postcss` | 8.4.31 | 8.5.10 | 1 | 4 |
| `esbuild` | 0.18.20 | 0.25.0 | 1 | 2 |
| `ws` | 8.20.0 | 8.20.1 | 1 | 2 |

</details>


---

## Comment réagir

1. **Tu fixes** → bump la dep / la base image, push sur `staging`. Le prochain tick (24h) confirme.
2. **Tu acks le risque** → ajoute un override dans [`veridian-infra/ci/trivy-overrides.yml`](https://github.com/Christ-Roy/veridian-infra/blob/main/ci/trivy-overrides.yml) avec date d'expiration + raison.
3. **Tu ignores** → ne fais rien, le tick recréera ce fichier demain à l'identique.

> Tu peux **supprimer ce fichier librement**. Il sera recréé au prochain tick s'il reste des items à signaler. C'est l'idempotence qui garantit qu'on ne perd rien.

*Pour ajuster les règles : [`veridian-infra/ci/trivy-scoring.yml`](https://github.com/Christ-Roy/veridian-infra/blob/main/ci/trivy-scoring.yml). Ping infra-agent.*
