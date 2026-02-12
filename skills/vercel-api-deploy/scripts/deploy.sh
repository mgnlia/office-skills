#!/bin/bash
set -e
VERCEL_TOKEN="${VERCEL_TOKEN:-1rzNjBUZLOAKORAXpSsZqEUI}"
echo "🚀 Deploying SolShield Dashboard to Vercel..."
node --version || { echo "❌ node not found"; exit 1; }

cat > /tmp/vdeploy.mjs << 'EOF'
import https from 'https';
import fs from 'fs';
import path from 'path';

const TOKEN = process.env.VERCEL_TOKEN;
const DIR = '/app/workspace/colosseum-agent-hackathon/dashboard';

function req(opts, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({s:res.statusCode,d:JSON.parse(d)}); } catch(e) { resolve({s:res.statusCode,d}); }});
    });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

function scan(dir, base='') {
  const out = [];
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    if (['node_modules','.next','.git','.vercel'].includes(e.name)) continue;
    const rel = base ? `${base}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...scan(full, rel));
    else {
      const stat = fs.statSync(full);
      if (stat.size > 5*1024*1024) continue; // skip files > 5MB
      out.push({file:rel, data:fs.readFileSync(full).toString('base64'), encoding:'base64'});
    }
  }
  return out;
}

async function main() {
  console.log('📁 Scanning', DIR);
  if (!fs.existsSync(DIR)) { console.error('❌ Not found:', DIR); process.exit(1); }
  const files = scan(DIR);
  console.log(`📦 ${files.length} files`);
  
  const payload = {
    name: 'solshield-dashboard',
    files,
    projectSettings: { framework: 'nextjs' },
    target: 'production'
  };
  
  const size = JSON.stringify(payload).length;
  console.log(`📊 Payload: ${(size/1024/1024).toFixed(1)}MB`);
  
  if (size > 100*1024*1024) {
    console.error('❌ Payload too large');
    process.exit(1);
  }
  
  console.log('🚀 Deploying...');
  const res = await req({
    hostname: 'api.vercel.com',
    path: '/v13/deployments',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  }, payload);
  
  if (res.s >= 200 && res.s < 300) {
    console.log('✅ DEPLOYED!');
    console.log(`🔗 https://${res.d.url}`);
    console.log(`🆔 ${res.d.id}`);
  } else {
    console.log('❌ Failed:', res.s);
    console.log(JSON.stringify(res.d, null, 2));
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
EOF

VERCEL_TOKEN="$VERCEL_TOKEN" node /tmp/vdeploy.mjs
