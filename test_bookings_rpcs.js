const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

const { createClient } = require('@supabase/supabase-js');
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log("=== 1. Testing get_bookings_kpi_summary ===");
  const kpiRes = await adminClient.rpc("get_bookings_kpi_summary");
  console.log("KPI Result:", kpiRes);

  console.log("\n=== 2. Testing get_booked_products_summary ===");
  const prodRes = await adminClient.rpc("get_booked_products_summary");
  if (prodRes.error) {
    console.log("Prod Error:", prodRes.error);
  } else {
    console.log("Prod Count:", prodRes.data?.length);
    console.log("First item:", prodRes.data?.[0]);
  }
}

  console.log("\n=== 3. Checking actual orders in DB where order_type = 'BOOKING' or status = 'PENDING' ===");
  const ordersCheck = await adminClient
    .from("orders")
    .select("id, order_no, status, order_type, sale_type, total_amount, created_at")
    .or("order_type.eq.BOOKING,status.eq.PENDING")
    .limit(10);
  console.log("Orders sample:", ordersCheck.data);
  const { count } = await adminClient
    .from("orders")
    .select("*", { count: "exact", head: true })
    .or("order_type.eq.BOOKING,status.eq.PENDING");
  console.log("Total matching orders in DB:", count);
}

test();
