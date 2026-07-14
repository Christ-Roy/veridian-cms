# 🔒 Veille CVE automatique — veridian-cms

> **Généré par** : `veridian-infra/.github/workflows/cron-trivy.yml`
> **Dernier run** : 2026-07-14 04:20 UTC
> **Run URL** : local-cron@mail.mybigserveur.local:2026-07-14
> **CVE bruts détectés** : 28 (avant filtrage)
> **Scoring** : `veridian-infra/ci/trivy-scoring.yml`

## TL;DR

- 🚨 **0 RED** — fix prioritaire
- 🔴 **0 HIGH** — action recommandée cette semaine
- 🟡 **2 MEDIUM** — récap, pas urgent
- 🟢 **25 NOISE** — annexe collapse

✅ **Rien d'urgent.** Quelques items MEDIUM à voir quand t'as 5 min.


---

## 🟡 MEDIUM — 2 CVE en 2 groupes

### 1. `nodemailer` — 8.0.6 → **9.0.1**

- **CVE** : `GHSA-p6gq-j5cr-w38f` (HIGH/SSRF)
- **Type** : SSRF
- **Score max** : 15
- **Title** : Nodemailer: Message-level raw option bypasses disableFileAccess/disableUrlAccess, enabling arbitrary file read and full-response SSRF in the delivered message
- **Source** : `pnpm-lock.yaml`
- **Fix** : `pnpm up nodemailer` (jusqu'à >= `9.0.1`)

### 2. `undici` — 7.24.4 → **8.2.0**

- **CVE** : `CVE-2026-6734` (HIGH/Data leak)
- **Type** : Data leak
- **Score max** : 10
- **Title** : undici: undici: Information disclosure and data integrity issues due to incorrect Socks5ProxyAgent connection routing
- **Source** : `pnpm-lock.yaml`
- **Fix** : `pnpm up undici` (jusqu'à >= `8.2.0`)


---

## 🟢 NOISE filtré (25 CVE)

<details>
<summary>Liste complète (7 groupes — clique pour déplier)</summary>

| Package | Installed | Fix | CVE count | Max score |
|---|---|---|---|---|
| `undici` | 7.24.4 | 8.5.0 | 4 | 5 |
| `ws` | 8.20.0 | 8.21.0 | 2 | 5 |
| `dompurify` | 3.2.7 | 3.4.11 | 13 | 4 |
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
