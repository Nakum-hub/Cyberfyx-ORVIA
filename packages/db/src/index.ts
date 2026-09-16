import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';

// A00 infrastructure identity only. Business/tenant/auth tables belong to A01+.
export const bootstrapProfile = pgTable('bootstrap_profile', {
  singleton: integer('singleton').primaryKey(), installationId: uuid('installation_id').notNull(),
  profile: text('profile').notNull(), fixtureId: text('fixture_id').notNull(),
});
export const bootstrapProbes = pgTable('bootstrap_probes', {
  id: uuid('id').primaryKey(), marker: text('marker').notNull(),
  createdAt: timestamp('created_at', { withTimezone:true }).notNull().defaultNow(),
});
export type DatabaseConfig={postgres_port:number;database:string;password:string};
export function connectDatabase(config:DatabaseConfig){
  const pool=new pg.Pool({host:'127.0.0.1',port:config.postgres_port,database:config.database,user:'orvia_migrator',password:config.password,max:2,connectionTimeoutMillis:5000,query_timeout:10000,application_name:'orvia-a00-local-operator'});
  return {pool,db:drizzle(pool,{schema:{bootstrapProfile,bootstrapProbes}})};
}
