import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { syncAllToOpenSearch } from '../lib/sync-opensearch';

// Ensure .env.local variables are loaded if using ts-node or tsx
async function main() {
  console.log("Environment OPENSEARCH_URL:", process.env.OPENSEARCH_URL ? "Set" : "Not Set");
  console.log("Environment NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not Set");
  
  try {
    await syncAllToOpenSearch();
    console.log("Success.");
  } catch (err) {
    console.error("Error during sync:", err);
  }
}

main();
