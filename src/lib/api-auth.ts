import type { NextRequest } from 'next/server';

export function isAuthorizedRequest(request: NextRequest): boolean {
  const sessionCookie = request.cookies.get('auth_token')?.value;
  const isAuthenticatedSession = sessionCookie === 'user-is-authenticated';

  const authHeader = request.headers.get('Authorization');
  const serverApiKey = process.env.VENDASCONTROL_API_KEY;
  const isValidBearerToken = !!serverApiKey && authHeader === `Bearer ${serverApiKey}`;

  return isAuthenticatedSession || isValidBearerToken;
}
