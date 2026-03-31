#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const apiKey = process.env.VENDASCONTROL_API_KEY;

if (!apiKey) {
  console.error('❌ Missing VENDASCONTROL_API_KEY for smoke checks.');
  process.exit(1);
}

const endpoints = ['/api/health', '/api/meetings', '/api/attributes'];

async function run() {
  const requestId = `smoke-${Date.now()}`;
  let hasFailure = false;

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    const started = Date.now();
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'x-request-id': requestId,
        },
      });

      const duration = Date.now() - started;
      if (!response.ok) {
        hasFailure = true;
        const payload = await response.json().catch(() => ({}));
        console.error(`❌ ${endpoint} -> ${response.status} (${duration}ms)`, payload);
        continue;
      }

      console.log(`✅ ${endpoint} -> ${response.status} (${duration}ms)`);
    } catch (error) {
      hasFailure = true;
      console.error(`❌ ${endpoint} -> request failed`, error.message);
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('❌ Smoke check crashed:', error.message);
  process.exit(1);
});
