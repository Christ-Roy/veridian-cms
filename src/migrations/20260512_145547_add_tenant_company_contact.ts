import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tenants_company_legal_form" AS ENUM('SARL', 'SAS', 'SASU', 'EURL', 'SA', 'EI', 'AE', 'ASSO');
  CREATE TABLE "tenants_contact_phones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"number" varchar NOT NULL,
  	"primary" boolean
  );
  
  CREATE TABLE "tenants_contact_hours" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" varchar NOT NULL,
  	"time" varchar NOT NULL
  );
  
  ALTER TABLE "tenants" ADD COLUMN "company_legal_name" varchar;
  ALTER TABLE "tenants" ADD COLUMN "company_legal_form" "enum_tenants_company_legal_form";
  ALTER TABLE "tenants" ADD COLUMN "company_capital" varchar;
  ALTER TABLE "tenants" ADD COLUMN "company_siren" varchar;
  ALTER TABLE "tenants" ADD COLUMN "company_siret" varchar;
  ALTER TABLE "tenants" ADD COLUMN "company_tva_intra" varchar;
  ALTER TABLE "tenants" ADD COLUMN "company_naf" varchar;
  ALTER TABLE "tenants" ADD COLUMN "company_rcs" varchar;
  ALTER TABLE "tenants" ADD COLUMN "company_director_name" varchar;
  ALTER TABLE "tenants" ADD COLUMN "company_founded_year" numeric;
  ALTER TABLE "tenants" ADD COLUMN "contact_email" varchar;
  ALTER TABLE "tenants" ADD COLUMN "contact_address_street" varchar;
  ALTER TABLE "tenants" ADD COLUMN "contact_address_zip" varchar;
  ALTER TABLE "tenants" ADD COLUMN "contact_address_city" varchar;
  ALTER TABLE "tenants" ADD COLUMN "contact_address_country" varchar DEFAULT 'France';
  ALTER TABLE "tenants" ADD COLUMN "contact_service_zone" varchar;
  ALTER TABLE "tenants_contact_phones" ADD CONSTRAINT "tenants_contact_phones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tenants_contact_hours" ADD CONSTRAINT "tenants_contact_hours_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tenants_contact_phones_order_idx" ON "tenants_contact_phones" USING btree ("_order");
  CREATE INDEX "tenants_contact_phones_parent_id_idx" ON "tenants_contact_phones" USING btree ("_parent_id");
  CREATE INDEX "tenants_contact_hours_order_idx" ON "tenants_contact_hours" USING btree ("_order");
  CREATE INDEX "tenants_contact_hours_parent_id_idx" ON "tenants_contact_hours" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "tenants_contact_phones" CASCADE;
  DROP TABLE "tenants_contact_hours" CASCADE;
  ALTER TABLE "tenants" DROP COLUMN "company_legal_name";
  ALTER TABLE "tenants" DROP COLUMN "company_legal_form";
  ALTER TABLE "tenants" DROP COLUMN "company_capital";
  ALTER TABLE "tenants" DROP COLUMN "company_siren";
  ALTER TABLE "tenants" DROP COLUMN "company_siret";
  ALTER TABLE "tenants" DROP COLUMN "company_tva_intra";
  ALTER TABLE "tenants" DROP COLUMN "company_naf";
  ALTER TABLE "tenants" DROP COLUMN "company_rcs";
  ALTER TABLE "tenants" DROP COLUMN "company_director_name";
  ALTER TABLE "tenants" DROP COLUMN "company_founded_year";
  ALTER TABLE "tenants" DROP COLUMN "contact_email";
  ALTER TABLE "tenants" DROP COLUMN "contact_address_street";
  ALTER TABLE "tenants" DROP COLUMN "contact_address_zip";
  ALTER TABLE "tenants" DROP COLUMN "contact_address_city";
  ALTER TABLE "tenants" DROP COLUMN "contact_address_country";
  ALTER TABLE "tenants" DROP COLUMN "contact_service_zone";
  DROP TYPE "public"."enum_tenants_company_legal_form";`)
}
