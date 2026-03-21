/**
 * Module-level store for the driver login pending token.
 * Holds the token between login.tsx and otp.tsx (login flow).
 * Call clearAuth() after successful OTP verification or on logout.
 */

let pendingToken: string | null = null;

export function setPendingToken(token: string): void {
  pendingToken = token;
}

export function getPendingToken(): string | null {
  return pendingToken;
}

export function clearAuth(): void {
  pendingToken = null;
}