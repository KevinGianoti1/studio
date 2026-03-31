// src/app/api/meetings/route.ts
import type { NextRequest } from 'next/server';
import { fetchMeetingsData } from '@/ai/flows/fetch-meetings-flow';
import { isAuthorizedRequest } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';

export const dynamic = 'force-dynamic'; // Garante que a função seja executada a cada requisição

export async function GET(request: NextRequest) {
  if (!isAuthorizedRequest(request)) {
    return fail('Não autorizado', 401);
  }

  try {
    const meetingsResult = await fetchMeetingsData();

    if (meetingsResult.error) {
      return fail(meetingsResult.error, 500);
    }

    return ok(meetingsResult.data || []);
  } catch (error: any) {
    return fail('Erro interno do servidor', 500, error.message);
  }
}
