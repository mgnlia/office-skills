#!/usr/bin/env bun
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const headers = { "Authorization": `Bearer ${VERCEL_TOKEN}` };

async function api(path) {
  const res = await fetch(`https://api.vercel.com${path}`, { headers });
  return res.json();
}

async function checkAll() {
  const dashId = "dpl_EzejSJrasGUGBB7qozd1omJwnTcB";
  const backId = "dpl_5ZJnRCNL751QA9CNaFDoLfx32Lpj";
  
  const dash = await api(`/v13/deployments/${dashId}`);
  const back = await api(`/v13/deployments/${backId}`);
  
  console.log(`Dashboard: ${dash.readyState} — https://${dash.url}`);
  console.log(`Backend:   ${back.readyState} — https://${back.url}`);
  
  if (dash.readyState === "ERROR") {
    console.log(`\nDashboard error: ${dash.errorMessage}`);
    const events = await api(`/v3/deployments/${dashId}/events?limit=50&direction=backward`);
    if (Array.isArray(events)) {
      events.slice(-25).forEach(e => { if (e.text) console.log(`  ${e.text}`); });
    }
  }
  
  if (back.readyState === "ERROR") {
    console.log(`\nBackend error: ${back.errorMessage}`);
    const events = await api(`/v3/deployments/${backId}/events?limit=50&direction=backward`);
    if (Array.isArray(events)) {
      events.slice(-25).forEach(e => { if (e.text) console.log(`  ${e.text}`); });
    }
  }
  
  if (dash.readyState === "READY") console.log(`\n✅ DASHBOARD LIVE: https://solshield-dashboard.vercel.app`);
  if (back.readyState === "READY") console.log(`✅ BACKEND LIVE: https://solshield-backend.vercel.app`);
  
  return { dashReady: dash.readyState, backReady: back.readyState };
}

async function main() {
  // Poll every 15s for up to 90s
  for (let i = 0; i < 6; i++) {
    console.log(`\n--- Check ${i+1}/6 (${i*15}s elapsed) ---`);
    const result = await checkAll();
    if ((result.dashReady === "READY" || result.dashReady === "ERROR") && 
        (result.backReady === "READY" || result.backReady === "ERROR")) {
      console.log("\nBoth deployments finished.");
      break;
    }
    if (i < 5) {
      console.log("⏳ Waiting 15s...");
      await new Promise(r => setTimeout(r, 15000));
    }
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
