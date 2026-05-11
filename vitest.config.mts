import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
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
