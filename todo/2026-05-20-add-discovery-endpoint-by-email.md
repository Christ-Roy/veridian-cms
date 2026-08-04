# [CMS] Endpoint `GET /api/users/by-email` pour Hub discovery

> **Type** : Endpoint contrat HMAC Hub
> **Sévérité** : 🔴 P1 — débloque l'affichage card CMS dans Hub pour clients
>   provisionnés via skill `cms-provision` (mode service)
> **Owner** : agent CMS
> **Spec parent** : `veridian-hub/todo/2026-05-20-hub-discovery-by-email-pattern.md`
> **Créé** : 2026-05-20

## Use case business

Robert provisionne des clients CMS via le skill `cms-provision` (mode service,
hors flow self-service Hub). Aujourd'hui le Hub ne sait rien de ces clients
→ ils ne voient pas leur carte CMS sur le dashboard `app.veridian.site/dashboard`.

Exemple concret : **AVSE Monétique** (`avse.monetique@gmail.com`) existe
côté CMS depuis qu'on a provisionné le tenant, mais le user ne voit aucune
carte CMS dans son dashboard Hub.

## Endpoint à livrer

### `GET /api/users/by-email?email=<email>`

**Auth** : HMAC Hub (cf. `CONTRAT-HUB.md` §3 Pattern A)
- Headers `X-Veridian-Timestamp` + `X-Veridian-Hub-Signature`
- Secret partagé `HUB_API_SECRET` (déjà en place pour les autres endpoints)

**Response 200** (user CMS trouvé) :
```json
{
  "found": true,
  "user_email": "avse.monetique@gmail.com",
  "workspaces": [
    {
      "workspace_id": 1,
      "workspace_slug": "avse",
      "workspace_name": "AVSE Monétique",
      "role": "admin",
      "plan": "complimentary",
      "magic_link_capable": false,
      "fallback_url": "https://cms.veridian.site/admin",
      "provisioned_at": "2026-XX-XX"
    }
  ]
}
```

**Response 404** (user inconnu côté CMS) :
```json
{ "found": false }
```

**Response 401** : signature HMAC invalide / timestamp drift > 5min

## Implementation

### Query Payload

```ts
// app/api/users/by-email/route.ts (Payload custom endpoint)
import { verifyHubSignature } from '@/lib/hub-auth';

export async function GET(req: NextRequest) {
  await verifyHubSignature(req); // throw 401 sinon

  const email = req.nextUrl.searchParams.get('email');
  if (!email) return Response.json({ error: 'email required' }, { status: 400 });

  const user = await payload.find({
    collection: 'users',
    where: { email: { equals: email.toLowerCase() } },
    depth: 2, // pour récupérer le tenant lié
  });

  if (user.docs.length === 0) {
    return Response.json({ found: false });
  }

  const workspaces = user.docs.flatMap((u) =>
    (u.tenants || []).map((t) => ({
      workspace_id: t.id,
      workspace_slug: t.slug,
      workspace_name: t.name,
      role: u.role || 'admin',
      plan: t.plan || 'freemium',
      magic_link_capable: false, // Payload admin login pas en magic link pour l'instant
      fallback_url: `https://cms.veridian.site/admin`,
      provisioned_at: t.createdAt,
    })),
  );

  return Response.json({
    found: workspaces.length > 0,
    user_email: email,
    workspaces,
  });
}
```

### Tests

- HMAC valid → 200 avec data
- HMAC invalide → 401
- Email inexistant → `{found: false}` (pas 404, juste body)
- Email avec plusieurs tenants → liste complète
- Timestamp > 5min → 401

## Idempotence + cache friendly

GET-only, idempotent, sans état → cacheable côté Hub (TTL 5 min).
Pas d'effet de bord.

## Effort estimé

- 1j : endpoint + verify HMAC + tests
- 0.5j : doc dans CONTRAT-HUB.md §3.5

## Bloque (côté Hub)

`veridian-hub/todo/2026-05-20-hub-discovery-by-email-pattern.md` — sans cet
endpoint CMS, le Hub ne peut pas afficher les cards CMS pour les clients
provisionnés en service.

## Référence

- Spec discovery cross-app : `veridian-hub/todo/2026-05-20-hub-discovery-by-email-pattern.md`
- Contrat HMAC : `docs/CONTRAT-HUB.md` §3
- Skill `cms-provision` : `~/.claude/skills/cms-provision/SKILL.md`
- Pattern Notifuse équivalent (futur) : `notifuse-veridian/todo/2026-05-20-add-discovery-endpoint.md` (à créer)
