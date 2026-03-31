// src/app/api/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { fail, ok } from '@/lib/api-response';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const loginPassword = process.env.LOGIN_PASSWORD;

    if (!loginPassword) {
      return fail('A senha de login não está configurada no servidor.', 500);
    }

    if (password === loginPassword) {
      const response = ok({ success: true });
      const cookieStore = await cookies();
      cookieStore.set('auth_token', 'user-is-authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 dia
        path: '/',
      });
      return response;
    } else {
      return fail('Senha incorreta.', 401);
    }
  } catch (error) {
    return fail('Ocorreu um erro no servidor.', 500);
  }
}
