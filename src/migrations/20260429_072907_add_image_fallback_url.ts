import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_split_image_text" ADD COLUMN "image_fallback_url" varchar;
  ALTER TABLE "pages_blocks_split_image_text" ADD COLUMN "image_alt" varchar;
  ALTER TABLE "_pages_v_blocks_split_image_text" ADD COLUMN "image_fallback_url" varchar;
  ALTER TABLE "_pages_v_blocks_split_image_text" ADD COLUMN "image_alt" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_split_image_text" DROP COLUMN "image_fallback_url";
  ALTER TABLE "pages_blocks_split_image_text" DROP COLUMN "image_alt";
  ALTER TABLE "_pages_v_blocks_split_image_text" DROP COLUMN "image_fallback_url";
  ALTER TABLE "_pages_v_blocks_split_image_text" DROP COLUMN "image_alt";`)
}
