#!/usr/bin/env bun
// Deploy SolShield to Vercel using REST API v13 (Git-based deployment)
// Uses Bun's native fetch — no curl/npx needed

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
if (!VERCEL_TOKEN) {
  console.error("❌ VERCEL_TOKEN not set");
  process.exit(1);
}

const headers = {
  "Authorization": `Bearer ${VERCEL_TOKEN}`,
  "Content-Type": "application/json"
};

const GITHUB_REPO = "mgnlia/colosseum-agent-hackathon";
const GITHUB_BRANCH = "main";

async function api(method, path, body) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.vercel.com${path}`, opts);
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

async function getUser() {
  const r = await api("GET", "/v2/user");
  console.log("👤 User:", r.data?.user?.username || r.data?.user?.name || "unknown");
  return r.data?.user;
}

async function listProjects() {
  const r = await api("GET", "/v9/projects?limit=20");
  if (r.data?.projects) {
    console.log(`📋 Found ${r.data.projects.length} projects:`);
    r.data.projects.forEach(p => console.log(`   - ${p.name} (${p.id}) framework=${p.framework}`));
  }
  return r.data?.projects || [];
}

async function createProject(name, rootDir) {
  console.log(`\n🔨 Creating project: ${name} (rootDir: ${rootDir || "/"})`);
  
  const body = {
    name: name,
    framework: rootDir === "dashboard" ? "nextjs" : null,
    gitRepository: {
      type: "github",
      repo: GITHUB_REPO
    },
    rootDirectory: rootDir || null,
    buildCommand: rootDir === "dashboard" ? "npm run build" : null,
    installCommand: rootDir === "dashboard" ? "npm install" : null
  };
  
  const r = await api("POST", "/v10/projects", body);
  if (r.status >= 200 && r.status < 300) {
    console.log(`✅ Project created: ${r.data?.name} (${r.data?.id})`);
    console.log(`   URL: https://${r.data?.name}.vercel.app`);
    return r.data;
  } else {
    console.log(`⚠️ Create response (${r.status}):`, JSON.stringify(r.data).substring(0, 500));
    return r.data;
  }
}

async function createDeployment(projectName, gitSource) {
  console.log(`\n🚀 Creating deployment for: ${projectName}`);
  
  const body = {
    name: projectName,
    project: projectName,
    gitSource: {
      type: "github",
      org: "mgnlia",
      repo: "colosseum-agent-hackathon",
      ref: GITHUB_BRANCH
    },
    target: "production"
  };
  
  const r = await api("POST", "/v13/deployments", body);
  if (r.status >= 200 && r.status < 300) {
    console.log(`✅ Deployment created!`);
    console.log(`   ID: ${r.data?.id}`);
    console.log(`   URL: https://${r.data?.url}`);
    console.log(`   State: ${r.data?.readyState || r.data?.status}`);
    return r.data;
  } else {
    console.log(`⚠️ Deploy response (${r.status}):`, JSON.stringify(r.data).substring(0, 800));
    return r.data;
  }
}

async function checkDeployment(deploymentId) {
  const r = await api("GET", `/v13/deployments/${deploymentId}`);
  console.log(`📊 Deployment ${deploymentId}: ${r.data?.readyState || r.data?.status}`);
  if (r.data?.url) console.log(`   URL: https://${r.data.url}`);
  return r.data;
}

async function main() {
  console.log("=== SolShield Vercel Deployment ===\n");
  
  // Step 1: Verify auth
  const user = await getUser();
  if (!user) {
    console.error("❌ Auth failed");
    process.exit(1);
  }
  
  // Step 2: List existing projects
  const projects = await listProjects();
  
  // Step 3: Create dashboard project (Next.js frontend)
  const dashboardProject = await createProject("solshield-dashboard", "dashboard");
  
  // Step 4: Create deployment for dashboard
  if (dashboardProject?.id || dashboardProject?.name) {
    const dep = await createDeployment("solshield-dashboard");
    if (dep?.id) {
      // Wait and check status
      console.log("\n⏳ Waiting 15s for build to start...");
      await new Promise(r => setTimeout(r, 15000));
      await checkDeployment(dep.id);
    }
  }
  
  // Step 5: Create backend project
  const backendProject = await createProject("solshield-backend", null);
  
  // Step 6: Deploy backend
  if (backendProject?.id || backendProject?.name) {
    const dep = await createDeployment("solshield-backend");
    if (dep?.id) {
      console.log("\n⏳ Waiting 10s for build to start...");
      await new Promise(r => setTimeout(r, 10000));
      await checkDeployment(dep.id);
    }
  }
  
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("Dashboard: https://solshield-dashboard.vercel.app");
  console.log("Backend:   https://solshield-backend.vercel.app");
  console.log("GitHub:    https://github.com/mgnlia/colosseum-agent-hackathon");
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
