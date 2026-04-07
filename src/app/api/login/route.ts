// src/app/api/login/route.ts
import { cookies } from 'next/headers';
import { fail, ok } from '@/lib/api-response';
import { logEvent } from '@/lib/observability';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || randomUUID();
  const route = '/api/login';
  const startedAt = Date.now();

  try {
    const { password } = await request.json();
    const loginPassword = process.env.LOGIN_PASSWORD;

    if (!loginPassword) {
      const durationMs = Date.now() - startedAt;
      logEvent('error', { event: 'api_login_missing_password_env', requestId, route, status: 500, durationMs });
      return fail('A senha de login não está configurada no servidor.', 500, undefined, { 'x-request-id': requestId });
    }

    if (password === loginPassword) {
      const response = ok({ success: true }, 200, { 'x-request-id': requestId });
      const cookieStore = await cookies();
      cookieStore.set('auth_token', 'user-is-authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 dia
        path: '/',
      });
      const durationMs = Date.now() - startedAt;
      logEvent('info', { event: 'api_login_success', requestId, route, status: 200, durationMs });
      return response;
    } else {
      const durationMs = Date.now() - startedAt;
      logEvent('warn', { event: 'api_login_invalid_password', requestId, route, status: 401, durationMs });
      return fail('Senha incorreta.', 401, undefined, { 'x-request-id': requestId });
    }
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    logEvent('error', { event: 'api_login_unhandled_error', requestId, route, status: 500, durationMs, details: message });
    return fail('Ocorreu um erro no servidor.', 500, undefined, { 'x-request-id': requestId });
  }
}
