# 🔒 Veille CVE automatique — veridian-cms

> **Généré par** : `veridian-infra/.github/workflows/cron-trivy.yml`
> **Dernier run** : 2026-08-01 04:21 UTC
> **Run URL** : local-cron@mail.mybigserveur.local:2026-08-01
> **CVE bruts détectés** : 35 (avant filtrage)
> **Scoring** : `veridian-infra/ci/trivy-scoring.yml`

## TL;DR

- 🚨 **0 RED** — fix prioritaire
- 🔴 **0 HIGH** — action recommandée cette semaine
- 🟡 **6 MEDIUM** — récap, pas urgent
- 🟢 **27 NOISE** — annexe collapse

✅ **Rien d'urgent.** Quelques items MEDIUM à voir quand t'as 5 min.


---

## 🟡 MEDIUM — 6 CVE en 3 groupes

### 1. `fast-uri` — 3.1.2 → **4.1.1**

- **CVE** : `CVE-2026-16221` (HIGH/SSRF)
- **Type** : SSRF
- **Score max** : 15
- **Title** : Impact: fast-uri versions from 2.3.1 through 4.1.0 (including the 3.x  ...
- **Source** : `pnpm-lock.yaml`
- **Fix** : `pnpm up fast-uri` (jusqu'à >= `4.1.1`)

### 2. `next` — 16.2.10 → **16.2.11**

- **CVE** : `CVE-2026-64642` (HIGH/Auth bypass), `CVE-2026-64645` (HIGH/SSRF), `CVE-2026-64649` (HIGH/SSRF)
- **Type** : Auth bypass, SSRF
- **Score max** : 15
- **Title** : next: Next.js: Authentication bypass leading to unauthorized access
- **Source** : `pnpm-lock.yaml`
- **Fix** : `pnpm up next` (jusqu'à >= `16.2.11`)

### 3. `postcss` — 8.4.31 → **8.5.18**

- **CVE** : `CVE-2026-45623` (HIGH/Data leak), `GHSA-r28c-9q8g-f849` (HIGH/Data leak)
- **Type** : Data leak
- **Score max** : 10
- **Title** : postcss: PostCSS: Information disclosure and denial of service via crafted CSS input
- **Source** : `pnpm-lock.yaml`
- **Fix** : `pnpm up postcss` (jusqu'à >= `8.5.18`)


---

## 🟢 NOISE filtré (27 CVE)

<details>
<summary>Liste complète (8 groupes — clique pour déplier)</summary>

| Package | Installed | Fix | CVE count | Max score |
|---|---|---|---|---|
| `fast-uri` | 3.1.2 | 4.0.1 | 1 | 5 |
| `immutable` | 4.3.8 | 5.1.8 | 2 | 5 |
| `js-yaml` | 4.1.1 | 4.3.0 | 2 | 5 |
| `next` | 16.2.10 | 16.2.11 | 6 | 5 |
| `sharp` | 0.34.2 | 0.35.0 | 1 | 5 |
| `dompurify` | 3.2.7 | 3.4.11 | 13 | 4 |
| `postcss` | 8.4.31 | 8.5.10 | 1 | 4 |
| `uuid` | 10.0.0 | 13.0.1 | 1 | 4 |

</details>


---

## Comment réagir

1. **Tu fixes** → bump la dep / la base image, push sur `staging`. Le prochain tick (24h) confirme.
2. **Tu acks le risque** → ajoute un override dans [`veridian-infra/ci/trivy-overrides.yml`](https://github.com/Christ-Roy/veridian-infra/blob/main/ci/trivy-overrides.yml) avec date d'expiration + raison.
3. **Tu ignores** → ne fais rien, le tick recréera ce fichier demain à l'identique.

> Tu peux **supprimer ce fichier librement**. Il sera recréé au prochain tick s'il reste des items à signaler. C'est l'idempotence qui garantit qu'on ne perd rien.

*Pour ajuster les règles : [`veridian-infra/ci/trivy-scoring.yml`](https://github.com/Christ-Roy/veridian-infra/blob/main/ci/trivy-scoring.yml). Ping infra-agent.*
