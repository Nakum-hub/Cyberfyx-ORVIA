import { pgSchema, uuid, text, timestamp, boolean, integer, bigint } from 'drizzle-orm/pg-core';

// Better Auth 1.7.5 core + two-factor + database rate-limit schema. Each instance
// gets a disjoint schema, even when the same synthetic email exists in both.
export function authSchema(domain: 'staff_auth' | 'principal_auth') {
  const schema = pgSchema(domain);
  const date = (name: string) => timestamp(name, { withTimezone: true });
  const user = schema.table('user', {
    id: uuid('id').primaryKey(), name: text('name').notNull(), email: text('email').notNull().unique(),
    emailVerified: boolean('emailVerified').notNull().default(false), image: text('image'),
    createdAt: date('createdAt').notNull().defaultNow(), updatedAt: date('updatedAt').notNull().defaultNow(),
    twoFactorEnabled: boolean('twoFactorEnabled').notNull().default(false),
  });
  const session = schema.table('session', {
    id: uuid('id').primaryKey(), expiresAt: date('expiresAt').notNull(), token: text('token').notNull().unique(),
    createdAt: date('createdAt').notNull().defaultNow(), updatedAt: date('updatedAt').notNull().defaultNow(),
    ipAddress: text('ipAddress'), userAgent: text('userAgent'), userId: uuid('userId').notNull().references(() => user.id),
  });
  const account = schema.table('account', {
    id: uuid('id').primaryKey(), accountId: text('accountId').notNull(), providerId: text('providerId').notNull(),
    userId: uuid('userId').notNull().references(() => user.id), accessToken: text('accessToken'), refreshToken: text('refreshToken'),
    idToken: text('idToken'), accessTokenExpiresAt: date('accessTokenExpiresAt'), refreshTokenExpiresAt: date('refreshTokenExpiresAt'),
    scope: text('scope'), password: text('password'), createdAt: date('createdAt').notNull().defaultNow(), updatedAt: date('updatedAt').notNull().defaultNow(),
  });
  const verification = schema.table('verification', {
    id: uuid('id').primaryKey(), identifier: text('identifier').notNull().unique(), value: text('value').notNull(),
    expiresAt: date('expiresAt').notNull(), createdAt: date('createdAt').notNull().defaultNow(), updatedAt: date('updatedAt').notNull().defaultNow(),
  });
  const twoFactor = schema.table('twoFactor', {
    id: uuid('id').primaryKey(), secret: text('secret').notNull(), backupCodes: text('backupCodes').notNull(),
    userId: uuid('userId').notNull().unique().references(() => user.id), verified: boolean('verified').notNull().default(false),
    failedVerificationCount: integer('failedVerificationCount').notNull().default(0), lockedUntil: date('lockedUntil'),
  });
  const rateLimit = schema.table('rateLimit', {
    id: uuid('id').primaryKey(), key: text('key').notNull().unique(), count: integer('count').notNull(), lastRequest: bigint('lastRequest', { mode: 'number' }).notNull(),
  });
  return { user, session, account, verification, twoFactor, rateLimit };
}
