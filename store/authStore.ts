/**
 * Module-level store for the driver login pending token.
 * Holds the token between login.tsx and otp.tsx (login flow).
 * Call clearAuth() after successful OTP verification or on logout.
 */

let pendingToken: string | null = null;
let appealToken: string | null = null;
let suspensionData: any = null;

export function setPendingToken(token: string): void {
  pendingToken = token;
}

export function getPendingToken(): string | null {
  return pendingToken;
}

export function setAppealSession(token: string, suspension: any): void {
  appealToken = token;
  suspensionData = suspension;
}

export function getAppealToken(): string | null {
  return appealToken;
}

export function getSuspensionData(): any {
  return suspensionData;
}

export function clearAppealSession(): void {
  appealToken = null;
  suspensionData = null;
}

export function clearAuth(): void {
  pendingToken = null;
  appealToken = null;
  suspensionData = null;
}