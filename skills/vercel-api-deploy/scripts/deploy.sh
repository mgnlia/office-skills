#!/bin/bash
set -e
VERCEL_TOKEN="${VERCEL_TOKEN:-1rzNjBUZLOAKORAXpSsZqEUI}"
echo "🚀 Deploying SolShield Dashboard to Vercel..."
echo "🔧 Bun version: $(bun --version)"

cat > /tmp/vdeploy.ts << 'EOF'
const TOKEN = Bun.env.VERCEL_TOKEN || '1rzNjBUZLOAKORAXpSsZqEUI';
const DIR = '/app/workspace/colosseum-agent-hackathon/dashboard';

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

function scan(dir: string, base = ''): any[] {
  const out: any[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', '.vercel', '__pycache__'].includes(e.name)) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...scan(full, rel));
    } else {
      const stat = statSync(full);
      if (stat.size > 5 * 1024 * 1024) continue;
      const data = readFileSync(full).toString('base64');
      out.push({ file: rel, data, encoding: 'base64' });
    }
  }
  return out;
}

async function main() {
  console.log('📁 Scanning', DIR);
  if (!existsSync(DIR)) {
    console.error('❌ Not found:', DIR);
    process.exit(1);
  }

  const files = scan(DIR);
  console.log(`📦 ${files.length} files collected`);

  const payload = {
    name: 'solshield-dashboard',
    files,
    projectSettings: { framework: 'nextjs' },
    target: 'production'
  };

  const payloadStr = JSON.stringify(payload);
  console.log(`📊 Payload: ${(payloadStr.length / 1024 / 1024).toFixed(2)}MB`);

  console.log('🚀 Sending to Vercel API...');
  const resp = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: payloadStr
  });

  const data = await resp.json();

  if (resp.ok) {
    console.log('✅ DEPLOYED SUCCESSFULLY!');
    console.log(`🔗 URL: https://${data.url}`);
    console.log(`🆔 Deployment ID: ${data.id}`);
    if (data.alias?.length) {
      console.log(`🌐 Aliases: ${data.alias.join(', ')}`);
    }
    console.log(`📋 Status: ${data.readyState || data.status}`);
  } else {
    console.log(`❌ Deployment failed (${resp.status}):`);
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
EOF

VERCEL_TOKEN="$VERCEL_TOKEN" bun run /tmp/vdeploy.ts
