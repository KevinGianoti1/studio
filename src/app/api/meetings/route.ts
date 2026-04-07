// src/app/api/meetings/route.ts
import type { NextRequest } from 'next/server';
import { fetchMeetingsData } from '@/ai/flows/fetch-meetings-flow';
import { isAuthorizedRequest } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { logEvent } from '@/lib/observability';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic'; // Garante que a função seja executada a cada requisição

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || randomUUID();
  const route = '/api/meetings';
  const startedAt = Date.now();

  if (!isAuthorizedRequest(request)) {
    logEvent('warn', { event: 'api_unauthorized', requestId, route, status: 401 });
    return fail('Não autorizado', 401, undefined, { 'x-request-id': requestId });
  }

  try {
    const meetingsResult = await fetchMeetingsData();

    if (meetingsResult.error) {
      const durationMs = Date.now() - startedAt;
      logEvent('error', { event: 'api_meetings_fetch_error', requestId, route, status: 500, durationMs, details: meetingsResult.error });
      return fail(meetingsResult.error, 500, undefined, { 'x-request-id': requestId });
    }

    const durationMs = Date.now() - startedAt;
    logEvent('info', { event: 'api_meetings_success', requestId, route, status: 200, durationMs });
    return ok(meetingsResult.data || [], 200, { 'x-request-id': requestId });
  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    logEvent('error', { event: 'api_meetings_unhandled_error', requestId, route, status: 500, durationMs, details: error.message });
    return fail('Erro interno do servidor', 500, error.message, { 'x-request-id': requestId });
  }
}
