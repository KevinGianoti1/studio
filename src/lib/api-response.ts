import { NextResponse } from 'next/server';

type HeaderRecord = Record<string, string>;

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

type ApiErrorResponse = {
  success: false;
  error: string;
  details?: string;
};

export function ok<T>(data: T, status: number = 200, headers?: HeaderRecord) {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  return NextResponse.json(payload, { status, headers });
}

export function fail(message: string, status: number, details?: string, headers?: HeaderRecord) {
  const payload: ApiErrorResponse = {
    success: false,
    error: message,
    ...(details ? { details } : {}),
  };

  return NextResponse.json(payload, { status, headers });
}
