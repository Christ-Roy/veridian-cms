import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_quote_card_ctas_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum_pages_blocks_cta_ctas_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum__pages_v_blocks_quote_card_ctas_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum__pages_v_blocks_cta_ctas_variant" AS ENUM('primary', 'secondary');
  CREATE TABLE "pages_blocks_hero_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_quote_card_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"sublabel" varchar
  );
  
  CREATE TABLE "pages_blocks_quote_card_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_quote_card_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"variant" "enum_pages_blocks_quote_card_ctas_variant" DEFAULT 'primary'
  );
  
  CREATE TABLE "pages_blocks_quote_card" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"image_fallback_url" varchar,
  	"image_alt" varchar,
  	"quote" varchar,
  	"author_name" varchar,
  	"author_role" varchar,
  	"eyebrow" varchar,
  	"title" varchar,
  	"footnote" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cta_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"variant" "enum_pages_blocks_cta_ctas_variant" DEFAULT 'primary'
  );
  
  CREATE TABLE "_pages_v_blocks_hero_bullets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_quote_card_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"sublabel" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_quote_card_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_quote_card_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"variant" "enum__pages_v_blocks_quote_card_ctas_variant" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_quote_card" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"image_fallback_url" varchar,
  	"image_alt" varchar,
  	"quote" varchar,
  	"author_name" varchar,
  	"author_role" varchar,
  	"eyebrow" varchar,
  	"title" varchar,
  	"footnote" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"variant" "enum__pages_v_blocks_cta_ctas_variant" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  ALTER TABLE "pages_blocks_hero_bullets" ADD CONSTRAINT "pages_blocks_hero_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_quote_card_stats" ADD CONSTRAINT "pages_blocks_quote_card_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_quote_card"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_quote_card_paragraphs" ADD CONSTRAINT "pages_blocks_quote_card_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_quote_card"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_quote_card_ctas" ADD CONSTRAINT "pages_blocks_quote_card_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_quote_card"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_quote_card" ADD CONSTRAINT "pages_blocks_quote_card_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_quote_card" ADD CONSTRAINT "pages_blocks_quote_card_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta_ctas" ADD CONSTRAINT "pages_blocks_cta_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_bullets" ADD CONSTRAINT "_pages_v_blocks_hero_bullets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_quote_card_stats" ADD CONSTRAINT "_pages_v_blocks_quote_card_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_quote_card"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_quote_card_paragraphs" ADD CONSTRAINT "_pages_v_blocks_quote_card_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_quote_card"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_quote_card_ctas" ADD CONSTRAINT "_pages_v_blocks_quote_card_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_quote_card"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_quote_card" ADD CONSTRAINT "_pages_v_blocks_quote_card_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_quote_card" ADD CONSTRAINT "_pages_v_blocks_quote_card_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta_ctas" ADD CONSTRAINT "_pages_v_blocks_cta_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_bullets_order_idx" ON "pages_blocks_hero_bullets" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_bullets_parent_id_idx" ON "pages_blocks_hero_bullets" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_quote_card_stats_order_idx" ON "pages_blocks_quote_card_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_quote_card_stats_parent_id_idx" ON "pages_blocks_quote_card_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_quote_card_paragraphs_order_idx" ON "pages_blocks_quote_card_paragraphs" USING btree ("_order");
  CREATE INDEX "pages_blocks_quote_card_paragraphs_parent_id_idx" ON "pages_blocks_quote_card_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_quote_card_ctas_order_idx" ON "pages_blocks_quote_card_ctas" USING btree ("_order");
  CREATE INDEX "pages_blocks_quote_card_ctas_parent_id_idx" ON "pages_blocks_quote_card_ctas" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_quote_card_order_idx" ON "pages_blocks_quote_card" USING btree ("_order");
  CREATE INDEX "pages_blocks_quote_card_parent_id_idx" ON "pages_blocks_quote_card" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_quote_card_path_idx" ON "pages_blocks_quote_card" USING btree ("_path");
  CREATE INDEX "pages_blocks_quote_card_image_idx" ON "pages_blocks_quote_card" USING btree ("image_id");
  CREATE INDEX "pages_blocks_cta_ctas_order_idx" ON "pages_blocks_cta_ctas" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_ctas_parent_id_idx" ON "pages_blocks_cta_ctas" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_bullets_order_idx" ON "_pages_v_blocks_hero_bullets" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_bullets_parent_id_idx" ON "_pages_v_blocks_hero_bullets" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_quote_card_stats_order_idx" ON "_pages_v_blocks_quote_card_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_quote_card_stats_parent_id_idx" ON "_pages_v_blocks_quote_card_stats" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_quote_card_paragraphs_order_idx" ON "_pages_v_blocks_quote_card_paragraphs" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_quote_card_paragraphs_parent_id_idx" ON "_pages_v_blocks_quote_card_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_quote_card_ctas_order_idx" ON "_pages_v_blocks_quote_card_ctas" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_quote_card_ctas_parent_id_idx" ON "_pages_v_blocks_quote_card_ctas" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_quote_card_order_idx" ON "_pages_v_blocks_quote_card" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_quote_card_parent_id_idx" ON "_pages_v_blocks_quote_card" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_quote_card_path_idx" ON "_pages_v_blocks_quote_card" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_quote_card_image_idx" ON "_pages_v_blocks_quote_card" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_cta_ctas_order_idx" ON "_pages_v_blocks_cta_ctas" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_ctas_parent_id_idx" ON "_pages_v_blocks_cta_ctas" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_hero_bullets" CASCADE;
  DROP TABLE "pages_blocks_quote_card_stats" CASCADE;
  DROP TABLE "pages_blocks_quote_card_paragraphs" CASCADE;
  DROP TABLE "pages_blocks_quote_card_ctas" CASCADE;
  DROP TABLE "pages_blocks_quote_card" CASCADE;
  DROP TABLE "pages_blocks_cta_ctas" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_bullets" CASCADE;
  DROP TABLE "_pages_v_blocks_quote_card_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_quote_card_paragraphs" CASCADE;
  DROP TABLE "_pages_v_blocks_quote_card_ctas" CASCADE;
  DROP TABLE "_pages_v_blocks_quote_card" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_ctas" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_quote_card_ctas_variant";
  DROP TYPE "public"."enum_pages_blocks_cta_ctas_variant";
  DROP TYPE "public"."enum__pages_v_blocks_quote_card_ctas_variant";
  DROP TYPE "public"."enum__pages_v_blocks_cta_ctas_variant";`)
}
