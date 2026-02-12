// Check what environment variables are available for Vercel
const token = process.env.VERCEL_TOKEN;
const orgId = process.env.VERCEL_ORG_ID;
const projectId = process.env.VERCEL_PROJECT_ID;

console.log("VERCEL_TOKEN:", token ? `${token.substring(0, 8)}...` : "NOT SET");
console.log("VERCEL_ORG_ID:", orgId || "NOT SET");
console.log("VERCEL_PROJECT_ID:", projectId || "NOT SET");
