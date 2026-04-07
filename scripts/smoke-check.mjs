#!/usr/bin/env node

import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env' });
loadDotenv({ path: '.env.local', override: true });

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const apiKey = process.env.VENDASCONTROL_API_KEY;
const endpoints = (process.env.SMOKE_ENDPOINTS || '/api/health')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (!apiKey) {
  console.error('❌ Missing VENDASCONTROL_API_KEY for smoke checks.');
  process.exit(1);
}

if (endpoints.length === 0) {
  console.error('❌ No endpoints configured for smoke checks.');
  process.exit(1);
}

async function fetchWithRetry(url, options, attempts = 3, delayMs = 400) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}

async function run() {
  const requestId = `smoke-${Date.now()}`;
  let hasFailure = false;

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    const started = Date.now();

    try {
      const response = await fetchWithRetry(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'x-request-id': requestId,
        },
      });

      const duration = Date.now() - started;
      const responseRequestId = response.headers.get('x-request-id');
      const payload = await response.json().catch(() => ({}));

      const hasEnvelope = typeof payload === 'object' && payload !== null && 'success' in payload;
      if (!response.ok || !hasEnvelope || !responseRequestId) {
        hasFailure = true;
        console.error(`❌ ${endpoint} -> ${response.status} (${duration}ms)`, {
          hasEnvelope,
          hasRequestIdHeader: Boolean(responseRequestId),
          payload,
        });
        continue;
      }

      console.log(`✅ ${endpoint} -> ${response.status} (${duration}ms) [request-id=${responseRequestId}]`);
    } catch (error) {
      hasFailure = true;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ ${endpoint} -> request failed`, message);
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('❌ Smoke check crashed:', message);
  process.exit(1);
});
