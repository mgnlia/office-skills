#!/usr/bin/env bun
// Fix project settings and redeploy

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
  // Step 1: Update dashboard project - set rootDirectory to "dashboard"
  console.log("🔧 Updating solshield-dashboard project settings...");
  const update = await api("PATCH", "/v9/projects/solshield-dashboard", {
    rootDirectory: "dashboard",
    framework: "nextjs",
    buildCommand: "npm run build",
    installCommand: "npm install"
  });
  console.log(`   Update status: ${update.status}`);
  console.log(`   Root dir: ${update.data?.rootDirectory}`);
  console.log(`   Framework: ${update.data?.framework}`);

  // Step 2: Update backend project - set it as Other (not nextjs)
  console.log("\n🔧 Updating solshield-backend project settings...");
  const updateBackend = await api("PATCH", "/v9/projects/solshield-backend", {
    rootDirectory: null,
    framework: null,
    buildCommand: "echo 'No build needed'",
    installCommand: "pip install -r requirements.txt || echo 'No requirements'"
  });
  console.log(`   Update status: ${updateBackend.status}`);
  console.log(`   Root dir: ${updateBackend.data?.rootDirectory}`);
  console.log(`   Framework: ${updateBackend.data?.framework}`);

  // Step 3: Redeploy dashboard
  console.log("\n🚀 Redeploying solshield-dashboard...");
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
  
  const dashId = dashDep.data?.id;
  console.log(`   Dashboard deploy: ${dashDep.status} - ID: ${dashId}`);
  console.log(`   URL: https://${dashDep.data?.url}`);
  console.log(`   State: ${dashDep.data?.readyState}`);

  // Step 4: Redeploy backend
  console.log("\n🚀 Redeploying solshield-backend...");
  const backDep = await api("POST", "/v13/deployments", {
    name: "solshield-backend",
    project: "solshield-backend",
    gitSource: {
      type: "github",
      org: "mgnlia",
      repo: "colosseum-agent-hackathon",
      ref: "main"
    },
    target: "production"
  });
  
  const backId = backDep.data?.id;
  console.log(`   Backend deploy: ${backDep.status} - ID: ${backId}`);
  console.log(`   URL: https://${backDep.data?.url}`);
  console.log(`   State: ${backDep.data?.readyState}`);

  // Step 5: Wait and check
  console.log("\n⏳ Waiting 30s for builds...");
  await new Promise(r => setTimeout(r, 30000));

  if (dashId) {
    const d = await api("GET", `/v13/deployments/${dashId}`);
    console.log(`\n📊 Dashboard: ${d.data?.readyState} — https://${d.data?.url}`);
    if (d.data?.readyState === "ERROR") {
      console.log(`   Error: ${d.data?.errorMessage || "unknown"}`);
    }
  }
  
  if (backId) {
    const b = await api("GET", `/v13/deployments/${backId}`);
    console.log(`📊 Backend: ${b.data?.readyState} — https://${b.data?.url}`);
    if (b.data?.readyState === "ERROR") {
      console.log(`   Error: ${b.data?.errorMessage || "unknown"}`);
    }
  }

  console.log("\n=== EXPECTED LIVE URLS ===");
  console.log("Dashboard: https://solshield-dashboard.vercel.app");
  console.log("Backend:   https://solshield-backend.vercel.app");
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
