/**
 * regenerate-media-sizes.ts — Régénère les imageSizes pour tous les médias
 * existants après changement de config (cf Media.ts:167-171 passé en
 * width-only le 2026-05-30).
 *
 * Pourquoi : les sizes anciennes (thumbnail 400x300, card 768x512) ont été
 * générées par Sharp avec width+height fixes + position:centre = crop
 * physique sur disque. Pour des images paysage (TPE, alim...) le bas et les
 * côtés sont coupés en dur. Le nouveau code admin lit doc.url (l'original,
 * intact) donc l'affichage CMS est OK. Mais le site AVSE consomme les
 * sizes via l'API (`/api/media/file/<name>-400x300.webp`) → si tu veux
 * que le site reçoive les images entières, il faut régénérer les sizes.
 *
 * Comment : pour chaque media, on lit le fichier original sur disque, on
 * crée un Blob/File JS, et on appelle payload.update({ id, file }) qui
 * relance la pipeline Sharp + écrit les nouveaux fichiers width-only.
 *
 * Usage (à exécuter dans le container avec accès Payload + volume monté) :
 *   tsx scripts/regenerate-media-sizes.ts                 # tous les médias
 *   tsx scripts/regenerate-media-sizes.ts --tenant=<id>   # 1 seul tenant
 *   tsx scripts/regenerate-media-sizes.ts --limit=10      # smoke test
 *   tsx scripts/regenerate-media-sizes.ts --dry-run       # liste, ne touche pas
 *
 * Le filename change PAS — Payload retient le nom original et regénère
 * juste les variantes <name>-<width>w.webp. Les anciens fichiers
 * <name>-400x300.webp restent sur disque (orphelins) — script de cleanup
 * séparé si on veut libérer l'espace.
 */
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Le volume médias est monté sur /app/media en runtime (cf docker-compose.yml).
// En dev local sans Docker : chemin via env STATIC_DIR.
const STATIC_DIR = process.env.STATIC_DIR || '/app/media'

interface Args {
  tenant?: number
  limit?: number
  dryRun: boolean
}

function parseArgs(): Args {
  const args: Args = { dryRun: false }
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true
    else if (arg.startsWith('--tenant=')) args.tenant = parseInt(arg.slice(9), 10)
    else if (arg.startsWith('--limit=')) args.limit = parseInt(arg.slice(8), 10)
  }
  return args
}

async function main() {
  const args = parseArgs()
  // Import dynamique de la config pour respecter le pattern Payload v3
  const config = (await import('../src/payload.config.ts')).default
  const payload = await getPayload({ config: await config })

  const where: Record<string, unknown> = {}
  if (args.tenant) where.tenant = { equals: args.tenant }

  payload.logger.info(
    `[regen-media] Démarrage — tenant=${args.tenant ?? 'tous'} limit=${args.limit ?? '∞'} dryRun=${args.dryRun}`,
  )

  const docs = await payload.find({
    collection: 'media',
    where,
    limit: args.limit ?? 1000,
    depth: 0,
  })

  payload.logger.info(`[regen-media] ${docs.totalDocs} média(s) à traiter`)

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const [i, doc] of docs.docs.entries()) {
    const filename = (doc as { filename?: string }).filename
    const id = doc.id as number | string
    const mimeType = (doc as { mimeType?: string }).mimeType ?? 'image/webp'

    if (!filename) {
      payload.logger.warn(`[regen-media] (${i + 1}/${docs.docs.length}) #${id} : filename manquant, skip`)
      skipped++
      continue
    }

    const filePath = path.join(STATIC_DIR, filename)
    let fileBuffer: Buffer
    try {
      fileBuffer = await fs.readFile(filePath)
    } catch (err) {
      payload.logger.warn(
        `[regen-media] (${i + 1}/${docs.docs.length}) #${id} (${filename}) : fichier introuvable sur disque, skip — ${
          err instanceof Error ? err.message : err
        }`,
      )
      skipped++
      continue
    }

    if (args.dryRun) {
      payload.logger.info(
        `[regen-media] (${i + 1}/${docs.docs.length}) #${id} (${filename}) : ${fileBuffer.length} bytes — DRY RUN, pas d'écriture`,
      )
      ok++
      continue
    }

    try {
      await payload.update({
        collection: 'media',
        id,
        data: {},
        file: {
          data: fileBuffer,
          mimetype: mimeType,
          name: filename,
          size: fileBuffer.length,
        },
        overwriteExistingFiles: true,
        overrideAccess: true,
      })
      payload.logger.info(
        `[regen-media] (${i + 1}/${docs.docs.length}) #${id} (${filename}) : régénéré ✓`,
      )
      ok++
    } catch (err) {
      payload.logger.error(
        `[regen-media] (${i + 1}/${docs.docs.length}) #${id} (${filename}) : ÉCHEC — ${err instanceof Error ? err.message : err}`,
      )
      failed++
    }
  }

  payload.logger.info(`[regen-media] Terminé : ${ok} OK, ${skipped} skipped, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[regen-media] Crash :', err)
  process.exit(1)
})
