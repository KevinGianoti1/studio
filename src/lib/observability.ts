type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = {
  event: string;
  requestId?: string;
  route?: string;
  durationMs?: number;
  status?: number;
  details?: string;
};

export function logEvent(level: LogLevel, payload: LogPayload) {
  const base = {
    ts: new Date().toISOString(),
    ...payload,
  };

  if (level === 'error') {
    console.error(JSON.stringify(base));
    return;
  }
  if (level === 'warn') {
    console.warn(JSON.stringify(base));
    return;
  }
  console.info(JSON.stringify(base));
}
