#!/usr/bin/env bun
// Deploy dashboard and check all deployment statuses

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const headers = {
  "Authorization": `Bearer ${VERCEL_TOKEN}`,
  "Content-Type": "application/json"
};

async function api(method, path, body) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.vercel.com${path}`, opts);
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

async function main() {
  // 1. Trigger dashboard deployment
  console.log("🚀 Triggering solshield-dashboard deployment...\n");
  const dashDep = await api("POST", "/v13/deployments", {
    name: "solshield-dashboard",
    project: "solshield-dashboard",
    gitSource: {
      type: "github",
      org: "mgnlia",
      repo: "colosseum-agent-hackathon",
      ref: "main"
    },
    target: "production"
  });
  
  if (dashDep.status >= 200 && dashDep.status < 300) {
    console.log(`✅ Dashboard deployment created!`);
    console.log(`   ID: ${dashDep.data?.id}`);
    console.log(`   URL: https://${dashDep.data?.url}`);
    console.log(`   State: ${dashDep.data?.readyState}`);
  } else {
    console.log(`⚠️ Dashboard deploy (${dashDep.status}):`, JSON.stringify(dashDep.data).substring(0, 500));
  }

  // 2. Check backend deployment status
  console.log("\n📊 Checking backend deployment status...");
  const backendDeps = await api("GET", "/v6/deployments?projectId=prj_uqLlbZWW6iluYnIL5exuekA6gui6&limit=1");
  if (backendDeps.data?.deployments?.[0]) {
    const d = backendDeps.data.deployments[0];
    console.log(`   Backend: ${d.readyState || d.state} — https://${d.url}`);
  }

  // 3. Check dashboard deployment status  
  console.log("\n📊 Checking dashboard deployment status...");
  const dashDeps = await api("GET", "/v6/deployments?projectId=prj_AhFBtKpAkXxuVwI33BXAabKXGVtI&limit=3");
  if (dashDeps.data?.deployments) {
    dashDeps.data.deployments.forEach(d => {
      console.log(`   Dashboard: ${d.readyState || d.state} — https://${d.url}`);
    });
  }

  // 4. Check all project domains
  console.log("\n🌐 Project URLs:");
  for (const proj of ["solshield-dashboard", "solshield-backend"]) {
    const r = await api("GET", `/v9/projects/${proj}`);
    if (r.data?.alias) {
      console.log(`   ${proj}: ${r.data.alias.map(a => `https://${a.domain}`).join(", ")}`);
    }
    if (r.data?.targets?.production?.url) {
      console.log(`   ${proj} production: https://${r.data.targets.production.url}`);
    }
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
