// src/app/api/attributes/route.ts
import type { NextRequest } from 'next/server';
import { fetchMeetingsData } from '@/ai/flows/fetch-meetings-flow';
import type { Meeting } from '@/types';
import { isAuthorizedRequest } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';
import { logEvent } from '@/lib/observability';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

type SellerAttributeData = {
  seller: string;
  attributes: {
    subject: string;
    score: number;
    fullMark: number;
  }[];
  meetingCount: number;
};

function calculateAttributeAverages(meetings: Meeting[]): SellerAttributeData[] {
  if (!meetings || meetings.length === 0) return [];

  const sellers = [...new Set(meetings.map((m) => m.seller))];

  return sellers.map((seller) => {
    const sellerMeetings = meetings.filter((m) => m.seller === seller);
    const meetingCount = sellerMeetings.length;

    const avgProspeccao = sellerMeetings.reduce((sum, m) => sum + m.prospeccao, 0) / meetingCount;
    const avgQualificacao = sellerMeetings.reduce((sum, m) => sum + m.qualificacao, 0) / meetingCount;
    const avgApresentacao = sellerMeetings.reduce((sum, m) => sum + m.apresentacao, 0) / meetingCount;
    const avgObjecoes = sellerMeetings.reduce((sum, m) => sum + m.objecoes, 0) / meetingCount;
    const avgFechamento = sellerMeetings.reduce((sum, m) => sum + m.fechamento, 0) / meetingCount;
    const avgFollowUp = sellerMeetings.reduce((sum, m) => sum + m.followUp, 0) / meetingCount;

    return {
      seller,
      attributes: [
        { subject: 'Prospecção', score: avgProspeccao, fullMark: 10 },
        { subject: 'Qualificação', score: avgQualificacao, fullMark: 10 },
        { subject: 'Apresentação', score: avgApresentacao, fullMark: 10 },
        { subject: 'Objeções', score: avgObjecoes, fullMark: 10 },
        { subject: 'Fechamento', score: avgFechamento, fullMark: 10 },
        { subject: 'Follow-up', score: avgFollowUp, fullMark: 10 },
      ],
      meetingCount,
    };
  });
}


export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || randomUUID();
  const route = '/api/attributes';
  const startedAt = Date.now();

  if (!isAuthorizedRequest(request)) {
    logEvent('warn', { event: 'api_unauthorized', requestId, route, status: 401 });
    return fail('Não autorizado', 401, undefined, { 'x-request-id': requestId });
  }

  try {
    const meetingsResult = await fetchMeetingsData();

    if (meetingsResult.error) {
      const durationMs = Date.now() - startedAt;
      logEvent('error', { event: 'api_attributes_fetch_error', requestId, route, status: 500, durationMs, details: meetingsResult.error });
      return fail(meetingsResult.error, 500, undefined, { 'x-request-id': requestId });
    }

    const meetings = meetingsResult.data || [];
    const attributeData = calculateAttributeAverages(meetings);
    const sellers = [...new Set(meetings.map(m => m.seller))];

    const response = {
      sellers,
      attributeData,
    };

    const durationMs = Date.now() - startedAt;
    logEvent('info', { event: 'api_attributes_success', requestId, route, status: 200, durationMs });
    return ok(response, 200, { 'x-request-id': requestId });
  } catch (error: any) {
    const durationMs = Date.now() - startedAt;
    logEvent('error', { event: 'api_attributes_unhandled_error', requestId, route, status: 500, durationMs, details: error.message });
    return fail('Erro interno do servidor', 500, error.message, { 'x-request-id': requestId });
  }
}
