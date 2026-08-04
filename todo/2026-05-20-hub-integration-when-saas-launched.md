# [CROSS-APP] Intégration Hub OAuth + provisioning quand CMS passe en SaaS public

> **Type** : Ticket cross-app dormant
> **Sévérité** : 🟦 P5 (réveille quand CMS passe en SaaS multi-tenant public)
> **Owner principal** : agent CMS
> **Owner secondaire** : agent Hub
> **Créé** : 2026-05-20

## Contexte

CMS est aujourd'hui en mode **provisioning via Robert** (le skill
`cms-provision` crée tenant + invite client par magic link Payload direct,
sans passer par le Hub). Pas de SSO Hub global, pas de billing Stripe
centralisé, pas de OAuth Sign-in pour les users tenant CMS.

Quand CMS passera en SaaS multi-tenant public (signup self-serve), il faudra
le câbler au Hub comme les autres apps :
- Implémenter les 5 endpoints du contrat HMAC (`provision`, `attach-owner`,
  `suspend`, `resume`, `health`)
- Implémenter les webhooks app → Hub
- Câbler le flow d'invitation multi-membre via Hub (cf. ticket Prospection)
- Câbler OAuth Sign-in propagation (auto-login HMAC depuis Hub)
- Câbler Stripe metered si pricing par site/page/utilisateur

## Pré-requis

- Décision business : CMS multi-tenant SaaS public (pas tranchée 2026-05-20)
- Aujourd'hui : skill `cms-provision` couvre les besoins Veridian-as-agency
- Hub doit avoir livré le flow d'invitation cross-app

## Effort estimé

- 5-7j câblage initial contrat HMAC (Payload 3 a déjà du multi-tenant)
- 3-4j flow invitation + autologin
- 2-3j tests d'intégration

## Référence

- `CONTRAT-HUB.md` §1, §3, §5 (provisioning + invitation)
- `docs/CONTRAT-HUB.md` §6bis (autologin 3 couches)
- Skill `cms-provision` actuel : `~/.claude/skills/cms-provision/`
- Ticket dormant Analytics similaire
