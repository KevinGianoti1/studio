import { NextResponse } from 'next/server';

type HeaderRecord = Record<string, string>;

export function ok<T>(data: T, status: number = 200, headers?: HeaderRecord) {
  return NextResponse.json(data, { status, headers });
}

export function fail(message: string, status: number, details?: string, headers?: HeaderRecord) {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
    },
    { status, headers }
  );
}
