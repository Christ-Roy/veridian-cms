import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * Tests d'intégration Payload — environnement **`node`** par défaut.
 *
 * Pourquoi pas jsdom : tous les specs qui touchent `payload.create` / `update`
 * / `delete` passent par `file-type` v21 (validation upload, mimetype, etc.).
 * Cette lib check `instanceof Uint8Array` sur le Buffer, ce qui foire dans le
 * realm jsdom (le Buffer Node n'est pas un Uint8Array du realm jsdom). Ça
 * rend l'API locale `payload.create` inutilisable côté tests, alors même
 * qu'elle fonctionne en prod.
 *
 * Solution : tests int en `environment: 'node'` (le default ici). Pour un
 * spec UI futur qui aurait besoin de jsdom (composant React isolé), ajouter
 * `// @vitest-environment jsdom` au top du fichier — override par-fichier.
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    // Payload schema push runs on getPayload() — two concurrent pushes against
    // the same Postgres race on pg_type. Force a single fork so int specs
    // share one Payload instance / one push. (Vitest 4 top-level pool fields.)
    pool: 'forks',
    forks: {
      singleFork: true,
    },
  },
})
