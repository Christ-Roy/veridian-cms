# [BLOQUANT CI] Transférer le package GHCR `veridian-cms` au bon repo

> Déposé 2026-05-17.
> **À faire manuellement** côté GitHub UI — l'API REST ne permet pas le
> transfert de package.

## Problème

Le package `ghcr.io/christ-roy/veridian-cms` est actuellement lié au repo
`Christ-Roy/veridian-infra` (héritage de l'ancien monorepo). Du coup, le
`GITHUB_TOKEN` du repo `Christ-Roy/veridian-cms` n'a pas `write_package`
dessus, et le job `docker` de `ci.yml` échoue.

Vérif :
```bash
gh api "/user/packages/container/veridian-cms" --jq '.repository.full_name'
# → "Christ-Roy/veridian-infra"   ← devrait être "Christ-Roy/veridian-cms"
```

## Solution (1 minute via UI)

1. Aller sur https://github.com/users/Christ-Roy/packages/container/veridian-cms/settings
2. **Manage Actions access** → "Add Repository" → sélectionner
   `Christ-Roy/veridian-cms` → role **Write**
3. Optionnel mais propre : "Change repository" → `Christ-Roy/veridian-cms`
   pour aligner l'ownership.

Idem pour `veridian-cms-builder` si encore utilisé (sinon supprimer le
package, le nouveau workflow ne le build plus).

## Vérification

Une fois fait, push sur `main` → le job `docker` doit réussir le push GHCR.

## Alternative (si l'UI ne marche pas)

Créer un PAT user-level (scope `write:packages`) et l'ajouter en secret
`CR_PAT` du repo `Christ-Roy/veridian-cms`, puis modifier le job `docker`
de `ci.yml` pour l'utiliser :

```yaml
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.CR_PAT }}   # au lieu de GITHUB_TOKEN
```

Pas recommandé (rotation manuelle), à n'utiliser que si l'UI bloque.
