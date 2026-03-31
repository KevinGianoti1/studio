#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const steps = [
  { name: 'typecheck', cmd: ['npm', ['run', 'typecheck']] },
  { name: 'build', cmd: ['npm', ['run', 'build']] },
];

for (const step of steps) {
  console.log(`\n▶ Running ${step.name}...`);
  const [command, args] = step.cmd;
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`\n❌ ${step.name} failed`);
    process.exit(result.status || 1);
  }
  console.log(`✅ ${step.name} passed`);
}

if (process.env.VENDASCONTROL_API_KEY) {
  console.log('\n▶ Running smoke:api...');
  const smoke = spawnSync('npm', ['run', 'smoke:api'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (smoke.status !== 0) {
    console.error('\n❌ smoke:api failed');
    process.exit(smoke.status || 1);
  }
  console.log('✅ smoke:api passed');
} else {
  console.log('\n⚠️ Skipping smoke:api (VENDASCONTROL_API_KEY not set)');
}

console.log('\n🎉 validate:all completed successfully');
