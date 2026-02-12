#!/usr/bin/env bun
// Check deployment errors and build logs

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const headers = { "Authorization": `Bearer ${VERCEL_TOKEN}` };

async function api(path) {
  const res = await fetch(`https://api.vercel.com${path}`, { headers });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  // Check backend error
  console.log("=== BACKEND DEPLOYMENT DETAILS ===");
  const backendDep = await api("/v13/deployments/dpl_FrTEg3GcLTTUquibqR6eFZt1jfdn");
  console.log("State:", backendDep.readyState);
  console.log("Error:", JSON.stringify(backendDep.errorMessage || backendDep.errorCode || "none").substring(0, 500));
  
  // Get build logs for backend
  console.log("\n--- Backend Build Events ---");
  const backendEvents = await api("/v3/deployments/dpl_FrTEg3GcLTTUquibqR6eFZt1jfdn/events?limit=50&direction=backward");
  if (Array.isArray(backendEvents)) {
    backendEvents.slice(-20).forEach(e => {
      if (e.text) console.log(`  ${e.text}`);
    });
  } else {
    console.log("Events:", JSON.stringify(backendEvents).substring(0, 1000));
  }

  // Check dashboard error
  console.log("\n=== DASHBOARD DEPLOYMENT DETAILS ===");
  const dashDep = await api("/v13/deployments/dpl_6Fgo5EcV5rbjP7dT5bHmi7p4uQFS");
  console.log("State:", dashDep.readyState);
  console.log("Error:", JSON.stringify(dashDep.errorMessage || dashDep.errorCode || "none").substring(0, 500));

  // Wait a bit then check dashboard again
  console.log("\n⏳ Waiting 20s for dashboard build...");
  await new Promise(r => setTimeout(r, 20000));
  
  const dashDep2 = await api("/v13/deployments/dpl_6Fgo5EcV5rbjP7dT5bHmi7p4uQFS");
  console.log("\nDashboard state:", dashDep2.readyState);
  
  const dashEvents = await api("/v3/deployments/dpl_6Fgo5EcV5rbjP7dT5bHmi7p4uQFS/events?limit=50&direction=backward");
  if (Array.isArray(dashEvents)) {
    dashEvents.slice(-20).forEach(e => {
      if (e.text) console.log(`  ${e.text}`);
    });
  } else {
    console.log("Events:", JSON.stringify(dashEvents).substring(0, 1000));
  }

  // Check project settings
  console.log("\n=== DASHBOARD PROJECT SETTINGS ===");
  const dashProj = await api("/v9/projects/solshield-dashboard");
  console.log("Root dir:", dashProj.rootDirectory);
  console.log("Build cmd:", dashProj.buildCommand);
  console.log("Framework:", dashProj.framework);
  console.log("Git repo:", JSON.stringify(dashProj.link));
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
