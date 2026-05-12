import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tenants_branding_border_radius" AS ENUM('none', 'sm', 'md', 'lg', 'pill');
  CREATE TYPE "public"."enum_tenants_branding_font_family" AS ENUM('inter', 'playfair', 'cormorant', 'lora', 'system');
  ALTER TABLE "tenants" ADD COLUMN "branding_primary_color" varchar;
  ALTER TABLE "tenants" ADD COLUMN "branding_accent_color" varchar;
  ALTER TABLE "tenants" ADD COLUMN "branding_border_radius" "enum_tenants_branding_border_radius" DEFAULT 'md';
  ALTER TABLE "tenants" ADD COLUMN "branding_font_family" "enum_tenants_branding_font_family" DEFAULT 'inter';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tenants" DROP COLUMN "branding_primary_color";
  ALTER TABLE "tenants" DROP COLUMN "branding_accent_color";
  ALTER TABLE "tenants" DROP COLUMN "branding_border_radius";
  ALTER TABLE "tenants" DROP COLUMN "branding_font_family";
  DROP TYPE "public"."enum_tenants_branding_border_radius";
  DROP TYPE "public"."enum_tenants_branding_font_family";`)
}
