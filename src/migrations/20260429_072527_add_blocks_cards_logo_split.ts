import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_cards4_with_icons_cards_icon" AS ENUM('phone', 'check', 'settings', 'tools', 'mail', 'shield', 'award', 'star', 'package', 'globe', 'map-pin', 'truck');
  CREATE TYPE "public"."enum_pages_blocks_split_image_text_ctas_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum_pages_blocks_split_image_text_image_position" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__pages_v_blocks_cards4_with_icons_cards_icon" AS ENUM('phone', 'check', 'settings', 'tools', 'mail', 'shield', 'award', 'star', 'package', 'globe', 'map-pin', 'truck');
  CREATE TYPE "public"."enum__pages_v_blocks_split_image_text_ctas_variant" AS ENUM('primary', 'secondary');
  CREATE TYPE "public"."enum__pages_v_blocks_split_image_text_image_position" AS ENUM('left', 'right');
  CREATE TABLE "pages_blocks_cards2_cards_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_cards2_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"image_id" integer
  );
  
  CREATE TABLE "pages_blocks_cards2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cards4_with_icons_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_pages_blocks_cards4_with_icons_cards_icon" DEFAULT 'check',
  	"title" varchar,
  	"description" varchar,
  	"link_url" varchar,
  	"link_label" varchar
  );
  
  CREATE TABLE "pages_blocks_cards4_with_icons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_split_image_text_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_split_image_text_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"variant" "enum_pages_blocks_split_image_text_ctas_variant" DEFAULT 'primary'
  );
  
  CREATE TABLE "pages_blocks_split_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"image_id" integer,
  	"image_position" "enum_pages_blocks_split_image_text_image_position" DEFAULT 'left',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_logo_wall_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"link_url" varchar
  );
  
  CREATE TABLE "pages_blocks_logo_wall" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards2_cards_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards2_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards2" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards4_with_icons_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__pages_v_blocks_cards4_with_icons_cards_icon" DEFAULT 'check',
  	"title" varchar,
  	"description" varchar,
  	"link_url" varchar,
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cards4_with_icons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_split_image_text_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_split_image_text_ctas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"variant" "enum__pages_v_blocks_split_image_text_ctas_variant" DEFAULT 'primary',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_split_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"image_id" integer,
  	"image_position" "enum__pages_v_blocks_split_image_text_image_position" DEFAULT 'left',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_wall_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_wall" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_cards2_cards_points" ADD CONSTRAINT "pages_blocks_cards2_cards_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards2_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards2_cards" ADD CONSTRAINT "pages_blocks_cards2_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards2_cards" ADD CONSTRAINT "pages_blocks_cards2_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards2" ADD CONSTRAINT "pages_blocks_cards2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards4_with_icons_cards" ADD CONSTRAINT "pages_blocks_cards4_with_icons_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cards4_with_icons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cards4_with_icons" ADD CONSTRAINT "pages_blocks_cards4_with_icons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_split_image_text_paragraphs" ADD CONSTRAINT "pages_blocks_split_image_text_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_split_image_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_split_image_text_ctas" ADD CONSTRAINT "pages_blocks_split_image_text_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_split_image_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_split_image_text" ADD CONSTRAINT "pages_blocks_split_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_split_image_text" ADD CONSTRAINT "pages_blocks_split_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_wall_logos" ADD CONSTRAINT "pages_blocks_logo_wall_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_wall_logos" ADD CONSTRAINT "pages_blocks_logo_wall_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_logo_wall"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_wall" ADD CONSTRAINT "pages_blocks_logo_wall_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards2_cards_points" ADD CONSTRAINT "_pages_v_blocks_cards2_cards_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards2_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards2_cards" ADD CONSTRAINT "_pages_v_blocks_cards2_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards2_cards" ADD CONSTRAINT "_pages_v_blocks_cards2_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards2"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards2" ADD CONSTRAINT "_pages_v_blocks_cards2_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards4_with_icons_cards" ADD CONSTRAINT "_pages_v_blocks_cards4_with_icons_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cards4_with_icons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cards4_with_icons" ADD CONSTRAINT "_pages_v_blocks_cards4_with_icons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_split_image_text_paragraphs" ADD CONSTRAINT "_pages_v_blocks_split_image_text_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_split_image_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_split_image_text_ctas" ADD CONSTRAINT "_pages_v_blocks_split_image_text_ctas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_split_image_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_split_image_text" ADD CONSTRAINT "_pages_v_blocks_split_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_split_image_text" ADD CONSTRAINT "_pages_v_blocks_split_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_wall_logos" ADD CONSTRAINT "_pages_v_blocks_logo_wall_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_wall_logos" ADD CONSTRAINT "_pages_v_blocks_logo_wall_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_logo_wall"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_wall" ADD CONSTRAINT "_pages_v_blocks_logo_wall_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_cards2_cards_points_order_idx" ON "pages_blocks_cards2_cards_points" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards2_cards_points_parent_id_idx" ON "pages_blocks_cards2_cards_points" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards2_cards_order_idx" ON "pages_blocks_cards2_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards2_cards_parent_id_idx" ON "pages_blocks_cards2_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards2_cards_image_idx" ON "pages_blocks_cards2_cards" USING btree ("image_id");
  CREATE INDEX "pages_blocks_cards2_order_idx" ON "pages_blocks_cards2" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards2_parent_id_idx" ON "pages_blocks_cards2" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards2_path_idx" ON "pages_blocks_cards2" USING btree ("_path");
  CREATE INDEX "pages_blocks_cards4_with_icons_cards_order_idx" ON "pages_blocks_cards4_with_icons_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards4_with_icons_cards_parent_id_idx" ON "pages_blocks_cards4_with_icons_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards4_with_icons_order_idx" ON "pages_blocks_cards4_with_icons" USING btree ("_order");
  CREATE INDEX "pages_blocks_cards4_with_icons_parent_id_idx" ON "pages_blocks_cards4_with_icons" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cards4_with_icons_path_idx" ON "pages_blocks_cards4_with_icons" USING btree ("_path");
  CREATE INDEX "pages_blocks_split_image_text_paragraphs_order_idx" ON "pages_blocks_split_image_text_paragraphs" USING btree ("_order");
  CREATE INDEX "pages_blocks_split_image_text_paragraphs_parent_id_idx" ON "pages_blocks_split_image_text_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_split_image_text_ctas_order_idx" ON "pages_blocks_split_image_text_ctas" USING btree ("_order");
  CREATE INDEX "pages_blocks_split_image_text_ctas_parent_id_idx" ON "pages_blocks_split_image_text_ctas" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_split_image_text_order_idx" ON "pages_blocks_split_image_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_split_image_text_parent_id_idx" ON "pages_blocks_split_image_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_split_image_text_path_idx" ON "pages_blocks_split_image_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_split_image_text_image_idx" ON "pages_blocks_split_image_text" USING btree ("image_id");
  CREATE INDEX "pages_blocks_logo_wall_logos_order_idx" ON "pages_blocks_logo_wall_logos" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_wall_logos_parent_id_idx" ON "pages_blocks_logo_wall_logos" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_wall_logos_image_idx" ON "pages_blocks_logo_wall_logos" USING btree ("image_id");
  CREATE INDEX "pages_blocks_logo_wall_order_idx" ON "pages_blocks_logo_wall" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_wall_parent_id_idx" ON "pages_blocks_logo_wall" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_wall_path_idx" ON "pages_blocks_logo_wall" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_cards2_cards_points_order_idx" ON "_pages_v_blocks_cards2_cards_points" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards2_cards_points_parent_id_idx" ON "_pages_v_blocks_cards2_cards_points" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards2_cards_order_idx" ON "_pages_v_blocks_cards2_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards2_cards_parent_id_idx" ON "_pages_v_blocks_cards2_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards2_cards_image_idx" ON "_pages_v_blocks_cards2_cards" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_cards2_order_idx" ON "_pages_v_blocks_cards2" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards2_parent_id_idx" ON "_pages_v_blocks_cards2" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards2_path_idx" ON "_pages_v_blocks_cards2" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_cards4_with_icons_cards_order_idx" ON "_pages_v_blocks_cards4_with_icons_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards4_with_icons_cards_parent_id_idx" ON "_pages_v_blocks_cards4_with_icons_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards4_with_icons_order_idx" ON "_pages_v_blocks_cards4_with_icons" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cards4_with_icons_parent_id_idx" ON "_pages_v_blocks_cards4_with_icons" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cards4_with_icons_path_idx" ON "_pages_v_blocks_cards4_with_icons" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_split_image_text_paragraphs_order_idx" ON "_pages_v_blocks_split_image_text_paragraphs" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_split_image_text_paragraphs_parent_id_idx" ON "_pages_v_blocks_split_image_text_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_split_image_text_ctas_order_idx" ON "_pages_v_blocks_split_image_text_ctas" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_split_image_text_ctas_parent_id_idx" ON "_pages_v_blocks_split_image_text_ctas" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_split_image_text_order_idx" ON "_pages_v_blocks_split_image_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_split_image_text_parent_id_idx" ON "_pages_v_blocks_split_image_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_split_image_text_path_idx" ON "_pages_v_blocks_split_image_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_split_image_text_image_idx" ON "_pages_v_blocks_split_image_text" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_logo_wall_logos_order_idx" ON "_pages_v_blocks_logo_wall_logos" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logo_wall_logos_parent_id_idx" ON "_pages_v_blocks_logo_wall_logos" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_wall_logos_image_idx" ON "_pages_v_blocks_logo_wall_logos" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_logo_wall_order_idx" ON "_pages_v_blocks_logo_wall" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logo_wall_parent_id_idx" ON "_pages_v_blocks_logo_wall" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_wall_path_idx" ON "_pages_v_blocks_logo_wall" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_cards2_cards_points" CASCADE;
  DROP TABLE "pages_blocks_cards2_cards" CASCADE;
  DROP TABLE "pages_blocks_cards2" CASCADE;
  DROP TABLE "pages_blocks_cards4_with_icons_cards" CASCADE;
  DROP TABLE "pages_blocks_cards4_with_icons" CASCADE;
  DROP TABLE "pages_blocks_split_image_text_paragraphs" CASCADE;
  DROP TABLE "pages_blocks_split_image_text_ctas" CASCADE;
  DROP TABLE "pages_blocks_split_image_text" CASCADE;
  DROP TABLE "pages_blocks_logo_wall_logos" CASCADE;
  DROP TABLE "pages_blocks_logo_wall" CASCADE;
  DROP TABLE "_pages_v_blocks_cards2_cards_points" CASCADE;
  DROP TABLE "_pages_v_blocks_cards2_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_cards2" CASCADE;
  DROP TABLE "_pages_v_blocks_cards4_with_icons_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_cards4_with_icons" CASCADE;
  DROP TABLE "_pages_v_blocks_split_image_text_paragraphs" CASCADE;
  DROP TABLE "_pages_v_blocks_split_image_text_ctas" CASCADE;
  DROP TABLE "_pages_v_blocks_split_image_text" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_wall_logos" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_wall" CASCADE;
  DROP TYPE "public"."enum_pages_blocks_cards4_with_icons_cards_icon";
  DROP TYPE "public"."enum_pages_blocks_split_image_text_ctas_variant";
  DROP TYPE "public"."enum_pages_blocks_split_image_text_image_position";
  DROP TYPE "public"."enum__pages_v_blocks_cards4_with_icons_cards_icon";
  DROP TYPE "public"."enum__pages_v_blocks_split_image_text_ctas_variant";
  DROP TYPE "public"."enum__pages_v_blocks_split_image_text_image_position";`)
}
