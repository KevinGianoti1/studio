// src/app/api/login/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const loginPassword = process.env.LOGIN_PASSWORD;

    if (!loginPassword) {
      return NextResponse.json({ error: 'A senha de login não está configurada no servidor.' }, { status: 500 });
    }

    if (password === loginPassword) {
      const response = NextResponse.json({ success: true });
      cookies().set('auth_token', 'user-is-authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 dia
        path: '/',
      });
      return response;
    } else {
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Ocorreu um erro no servidor.' }, { status: 500 });
  }
}
