import { NextResponse } from 'next/server';

export function ok<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status: number, details?: string) {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}
