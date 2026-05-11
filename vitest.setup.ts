// Any setup scripts you might need go here

// Load .env files (sans dépendre de la lib dotenv qui n'est pas installée)
import fs from 'node:fs'
import path from 'node:path'

const envFile = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}
