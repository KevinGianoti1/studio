// src/app/api/attributes/route.ts
import type { NextRequest } from 'next/server';
import { fetchMeetingsData } from '@/ai/flows/fetch-meetings-flow';
import type { Meeting } from '@/types';
import { isAuthorizedRequest } from '@/lib/api-auth';
import { fail, ok } from '@/lib/api-response';

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
  if (!isAuthorizedRequest(request)) {
    return fail('Não autorizado', 401);
  }

  try {
    const meetingsResult = await fetchMeetingsData();

    if (meetingsResult.error) {
      return fail(meetingsResult.error, 500);
    }

    const meetings = meetingsResult.data || [];
    const attributeData = calculateAttributeAverages(meetings);
    const sellers = [...new Set(meetings.map(m => m.seller))];

    const response = {
      sellers,
      attributeData,
    };

    return ok(response);
  } catch (error: any) {
    return fail('Erro interno do servidor', 500, error.message);
  }
}
