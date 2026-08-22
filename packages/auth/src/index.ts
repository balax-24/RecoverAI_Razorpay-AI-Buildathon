import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { UserRole } from '@recoverai/domain';

// -------------------------------------------------------------
// Password Hashing (Argon2id)
// -------------------------------------------------------------

export async function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  plainText: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// Session Token Generation & Verification
// -------------------------------------------------------------

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

// -------------------------------------------------------------
// TOTP MFA Management
// -------------------------------------------------------------

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export function verifyTotpCode(token: string, secret: string): boolean {
  return authenticator.check(token, secret);
}

// -------------------------------------------------------------
// RBAC Hierarchy & Permissions
// -------------------------------------------------------------

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 50,
  ADMIN: 40,
  OPERATOR: 30,
  ANALYST: 20,
  VIEWER: 10,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export function isPrivilegedRole(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'OWNER';
}
