'use client';
import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { AUTH } from '../../../shared/contracts/src/index.ts';
export const staffAuthClient=createAuthClient({basePath:AUTH.staff.base_path,plugins:[twoFactorClient()]});
export const principalAuthClient=createAuthClient({basePath:AUTH.principal.base_path});
// Vendor installation only (revision 1.5 addendum): vendor staff, and client vendor-account uploaders.
export const vendorAuthClient=createAuthClient({basePath:AUTH.vendor.base_path,plugins:[twoFactorClient()]});
export const accountAuthClient=createAuthClient({basePath:AUTH.account.base_path,plugins:[twoFactorClient()]});
// A00 freezes mounting/client bindings. Real server identity/MFA/session tests are A01.
