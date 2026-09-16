'use client';
import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { AUTH } from '../../contracts/src/index.ts';
export const staffAuthClient=createAuthClient({basePath:AUTH.staff.base_path,plugins:[twoFactorClient()]});
export const principalAuthClient=createAuthClient({basePath:AUTH.principal.base_path});
// A00 freezes mounting/client bindings. Real server identity/MFA/session tests are A01.
