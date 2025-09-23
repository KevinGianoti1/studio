// src/app/api/meetings/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { fetchMeetingsData } from '@/ai/flows/fetch-meetings-flow';

export const dynamic = 'force-dynamic'; // Garante que a função seja executada a cada requisição

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

    return NextResponse.json(meetingsResult.data || []);
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: 'Erro interno do servidor', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
