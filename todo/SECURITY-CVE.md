# 🔒 Veille CVE automatique — veridian-cms

> **Généré par** : `veridian-infra/.github/workflows/cron-trivy.yml`
> **Dernier run** : 2026-06-13 04:20 UTC
> **Run URL** : local-cron@mail.mybigserveur.local:2026-06-13
> **CVE bruts détectés** : 14 (avant filtrage)
> **Scoring** : `veridian-infra/ci/trivy-scoring.yml`

## TL;DR

- 🚨 **0 RED** — fix prioritaire
- 🔴 **0 HIGH** — action recommandée cette semaine
- 🟡 **1 MEDIUM** — récap, pas urgent
- 🟢 **11 NOISE** — annexe collapse

✅ **Rien d'urgent.** Quelques items MEDIUM à voir quand t'as 5 min.


---

## 🟡 MEDIUM — 1 CVE en 1 groupe

### 1. `esbuild` — 0.25.12 → **0.28.1**

- **CVE** : `GHSA-gv7w-rqvm-qjhr` (HIGH/RCE)
- **Type** : RCE
- **Score max** : 25
- **Title** : esbuild: Missing binary integrity verification in Deno module enables remote code execution via NPM_CONFIG_REGISTRY
- **Source** : `pnpm-lock.yaml`
- **Fix** : `pnpm up esbuild` (jusqu'à >= `0.28.1`)


---

## 🟢 NOISE filtré (11 CVE)

<details>
<summary>Liste complète (4 groupes — clique pour déplier)</summary>

| Package | Installed | Fix | CVE count | Max score |
|---|---|---|---|---|
| `dompurify` | 3.2.7 | 3.4.0 | 8 | 4 |
| `postcss` | 8.4.31 | 8.5.10 | 1 | 4 |
| `uuid` | 10.0.0 | 13.0.1 | 1 | 4 |
| `ws` | 8.20.0 | 8.20.1 | 1 | 2 |

</details>


---

## Comment réagir

1. **Tu fixes** → bump la dep / la base image, push sur `staging`. Le prochain tick (24h) confirme.
2. **Tu acks le risque** → ajoute un override dans [`veridian-infra/ci/trivy-overrides.yml`](https://github.com/Christ-Roy/veridian-infra/blob/main/ci/trivy-overrides.yml) avec date d'expiration + raison.
3. **Tu ignores** → ne fais rien, le tick recréera ce fichier demain à l'identique.

> Tu peux **supprimer ce fichier librement**. Il sera recréé au prochain tick s'il reste des items à signaler. C'est l'idempotence qui garantit qu'on ne perd rien.

*Pour ajuster les règles : [`veridian-infra/ci/trivy-scoring.yml`](https://github.com/Christ-Roy/veridian-infra/blob/main/ci/trivy-scoring.yml). Ping infra-agent.*
