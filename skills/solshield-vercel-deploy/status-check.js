#!/usr/bin/env bun
// Final status check for all deployments

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const headers = { "Authorization": `Bearer ${VERCEL_TOKEN}` };

async function api(path) {
  const res = await fetch(`https://api.vercel.com${path}`, { headers });
  return res.json();
}

async function main() {
  const dashId = "dpl_EzejSJrasGUGBB7qozd1omJwnTcB";
  const backId = "dpl_5ZJnRCNL751QA9CNaFDoLfx32Lpj";

  console.log("=== DEPLOYMENT STATUS CHECK ===\n");

  // Dashboard
  const dash = await api(`/v13/deployments/${dashId}`);
  console.log(`📊 Dashboard: ${dash.readyState}`);
  console.log(`   URL: https://${dash.url}`);
  if (dash.readyState === "ERROR") {
    console.log(`   Error: ${dash.errorMessage}`);
    // Get build logs
    const events = await api(`/v3/deployments/${dashId}/events?limit=30&direction=backward`);
    if (Array.isArray(events)) {
      console.log("   Last build logs:");
      events.slice(-15).forEach(e => { if (e.text) console.log(`     ${e.text}`); });
    }
  }
  if (dash.readyState === "READY") {
    console.log(`   ✅ LIVE at: https://solshield-dashboard.vercel.app`);
  }

  // Backend
  const back = await api(`/v13/deployments/${backId}`);
  console.log(`\n📊 Backend: ${back.readyState}`);
  console.log(`   URL: https://${back.url}`);
  if (back.readyState === "ERROR") {
    console.log(`   Error: ${back.errorMessage}`);
    const events = await api(`/v3/deployments/${backId}/events?limit=30&direction=backward`);
    if (Array.isArray(events)) {
      console.log("   Last build logs:");
      events.slice(-15).forEach(e => { if (e.text) console.log(`     ${e.text}`); });
    }
  }
  if (back.readyState === "READY") {
    console.log(`   ✅ LIVE at: https://solshield-backend.vercel.app`);
  }

  // Also check latest deployments for each project
  console.log("\n=== LATEST DEPLOYMENTS ===");
  for (const proj of ["solshield-dashboard", "solshield-backend"]) {
    const deps = await api(`/v6/deployments?projectId=${proj}&limit=2&target=production`);
    if (deps.deployments) {
      deps.deployments.forEach(d => {
        console.log(`  ${proj}: ${d.readyState} — https://${d.url} (${d.created ? new Date(d.created).toISOString() : ""})`);
      });
    }
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
