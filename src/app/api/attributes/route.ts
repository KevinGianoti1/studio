// src/app/api/attributes/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { fetchMeetingsData } from '@/ai/flows/fetch-meetings-flow';
import type { Meeting } from '@/types';

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
  const authHeader = request.headers.get('Authorization');
  const expectedApiKey = `Bearer ${process.env.NEXT_PUBLIC_VENDASCONTROL_API_KEY}`;

  if (!process.env.NEXT_PUBLIC_VENDASCONTROL_API_KEY || authHeader !== expectedApiKey) {
    return new NextResponse(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const meetingsResult = await fetchMeetingsData();

    if (meetingsResult.error) {
      return new NextResponse(JSON.stringify({ error: meetingsResult.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const meetings = meetingsResult.data || [];
    const attributeData = calculateAttributeAverages(meetings);
    const sellers = [...new Set(meetings.map(m => m.seller))];

    const response = {
      sellers,
      attributeData,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: 'Erro interno do servidor', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
