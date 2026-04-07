import type { NextRequest } from 'next/server';
import { isAuthorizedRequest } from '@/lib/api-auth';
import { ok, fail } from '@/lib/api-response';
import { logEvent } from '@/lib/observability';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const REQUIRED_ENV_VARS = [
  'GOOGLE_SHEET_ID',
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'LOGIN_PASSWORD',
];

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || randomUUID();
  const route = '/api/health';
  const startedAt = Date.now();

  if (!isAuthorizedRequest(request)) {
    logEvent('warn', { event: 'api_unauthorized', requestId, route, status: 401 });
    return fail('Não autorizado', 401, undefined, { 'x-request-id': requestId });
  }

  try {
    const checks = REQUIRED_ENV_VARS.map((name) => ({
      name,
      ok: Boolean(process.env[name]),
    }));

    const failedChecks = checks.filter((c) => !c.ok);
    const durationMs = Date.now() - startedAt;
    const status = failedChecks.length > 0 ? 503 : 200;

    const payload = {
      status: failedChecks.length > 0 ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      checks,
      failedChecks: failedChecks.map((c) => c.name),
    };

    logEvent(failedChecks.length > 0 ? 'warn' : 'info', {
      event: 'api_health_status',
      requestId,
      route,
      status,
      durationMs,
      details: failedChecks.length > 0 ? `missing_env: ${payload.failedChecks.join(',')}` : 'all_checks_passed',
    });

    return ok(payload, status, { 'x-request-id': requestId });
  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    logEvent('error', {
      event: 'api_health_unhandled_error',
      requestId,
      route,
      status: 500,
      durationMs,
      details: error.message,
    });
    return fail('Erro interno do servidor', 500, error.message, { 'x-request-id': requestId });
  }
}
