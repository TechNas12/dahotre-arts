import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ITERATIONS = 300;
let testUserId: number;
let testCustomerId: number;
type BenchmarkProduct = { id: number; stock_qty: number };
let testProducts: BenchmarkProduct[] = [];
const TEST_CUSTOMER_NAME = '__BENCHMARK_TEST__';
const testOrderIds: number[] = [];
const initialStocks = new Map<number, number>();

async function setup() {
  console.log('Setting up benchmark...');

  // 1. Get a user
  const { data: users, error: userErr } = await adminClient.from('users').select('id').limit(1);
  if (userErr || !users.length) throw new Error('No user found to run tests: ' + userErr?.message);
  testUserId = users[0].id;

  // 2. Get some products
  const { data: products, error: prodErr } = await adminClient.from('products').select('id, stock_qty').limit(3);
  if (prodErr || !products.length) throw new Error('No products found: ' + prodErr?.message);
  testProducts = products;

  // Store initial stocks to restore later
  for (const p of products) {
    initialStocks.set(p.id, p.stock_qty);
  }

  // 3. Create test customer
  const { data: customer, error: custErr } = await adminClient
    .from('customers')
    .insert({ name: TEST_CUSTOMER_NAME, phone: '0000000000' })
    .select('id')
    .single();

  if (custErr) throw new Error('Failed to create test customer: ' + custErr.message);
  testCustomerId = customer.id;

  console.log(`Setup complete. Iterations: ${ITERATIONS}. Items per cart: ${testProducts.length}`);
}

async function cleanup() {
  console.log('\nCleaning up test data...');

  if (testOrderIds.length > 0) {
    // Activity logs
    await adminClient.from('activity_logs').delete().in('entity_id', testOrderIds.map(String)).eq('entity_type', 'order');
    // Payments
    await adminClient.from('payments').delete().in('order_id', testOrderIds);
    // Order items
    await adminClient.from('order_items').delete().in('order_id', testOrderIds);
    // Orders
    await adminClient.from('orders').delete().in('id', testOrderIds);
  }

  // Restore stocks
  for (const [id, originalStock] of initialStocks.entries()) {
    await adminClient.from('products').update({ stock_qty: originalStock }).eq('id', id);
  }

  // Customer
  if (testCustomerId) {
    await adminClient.from('customers').delete().eq('id', testCustomerId);
  }

  console.log('Cleanup complete.');
}

// ------------------------------------------------------------
// METHOD A: Sequential (The old way)
// ------------------------------------------------------------
async function generateOrderNumberOld() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `ORD-${dateStr}-`;
  const { data } = await adminClient
    .from("orders")
    .select("order_no")
    .ilike("order_no", `${prefix}%`)
    .order("order_no", { ascending: false })
    .limit(1);
  if (data && data.length > 0) {
    const lastSequenceStr = data[0].order_no.replace(prefix, "");
    return `${prefix}${(parseInt(lastSequenceStr, 10) + 1).toString().padStart(3, "0")}`;
  }
  return `${prefix}001`;
}

async function runSequentialOrder() {
  // Generate order no
  const orderNo = await generateOrderNumberOld();

  const orderItemsData = testProducts.map(p => ({
    product_id: p.id,
    quantity: 1,
    selling_price: 333.33,
    subtotal: 333.33
  }));
  const totalAmount = orderItemsData.reduce((sum, item) => sum + item.subtotal, 0);

  // Create order
  const { data: newOrder, error: orderErr } = await adminClient
    .from("orders")
    .insert({
      order_no: orderNo,
      customer_id: testCustomerId,
      user_id: testUserId,
      status: "COMPLETED",
      fulfillment_status: "FULFILLED",
      discount: 0,
      total_amount: totalAmount
    })
    .select("id")
    .single();
  if (orderErr) throw orderErr;
  testOrderIds.push(newOrder.id);

  // Order Items
  const itemsToInsert = orderItemsData.map(item => ({ ...item, order_id: newOrder.id }));
  const { error: itemsErr } = await adminClient.from("order_items").insert(itemsToInsert);
  if (itemsErr) throw new Error("Order items error: " + itemsErr.message);

  // Deduct Stock sequentially
  for (const item of itemsToInsert) {
    const { data: prod, error: getStockErr } = await adminClient.from("products").select("stock_qty").eq("id", item.product_id).single();
    if (getStockErr) throw new Error("Stock select error: " + getStockErr.message);
    if (prod) {
      const { error: updErr } = await adminClient.from("products").update({ stock_qty: Math.max(0, prod.stock_qty - item.quantity) }).eq("id", item.product_id);
      if (updErr) throw new Error("Stock update error: " + updErr.message);
    }
  }

  // Record Payment
  const { error: payErr } = await adminClient.from("payments").insert({
    order_id: newOrder.id,
    amount: totalAmount,
    payment_mode: "CASH",
    payment_type: "FULL"
  });
  if (payErr) throw new Error("Payment error: " + payErr.message);

  // Log Activity
  const { error: logErr } = await adminClient.from("activity_logs").insert({
    user_id: testUserId,
    action: 'ORDER_CREATED',
    entity_type: 'order',
    entity_id: String(newOrder.id),
    details: 'Order #' + orderNo
  });
  if (logErr) throw new Error("Log error: " + logErr.message);
}

// ------------------------------------------------------------
// METHOD B: RPC (The new way)
// ------------------------------------------------------------
async function runRPCOrder() {
  const items = testProducts.map(p => ({
    product_id: p.id,
    variant_index: null,
    quantity: 1,
    selling_price: 333.33,
  }));
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);

  const { data, error } = await adminClient.rpc('create_order_atomic', {
    p: {
      user_id: testUserId,
      customer_id: testCustomerId,
      order_type: "PURCHASE",
      discount: 0,
      total_amount: totalAmount,
      payment_mode: "CASH",
      payment_type: "FULL",
      payment_amount: totalAmount,
      items: items,
    },
  });

  if (error) throw error;
  if (data?.order_id) {
    testOrderIds.push(data.order_id);
  }
}

function calculateStats(times: number[]) {
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.floor(times.length * 0.95)];
  return {
    avg: avg.toFixed(2),
    min: times[0].toFixed(2),
    max: times[times.length - 1].toFixed(2),
    p95: p95.toFixed(2)
  };
}

async function main() {
  try {
    await setup();

    console.log(`\nStarting Benchmark (Iterations: ${ITERATIONS})...`);

    // Warmup
    console.log('Running warmup...');
    await runRPCOrder();
    await runSequentialOrder();

    const seqTimes: number[] = [];
    const rpcTimes: number[] = [];

    console.log('Testing methods (Interleaved)...');
    for (let i = 0; i < ITERATIONS; i++) {
      if (Math.random() > 0.5) {
        let start = performance.now();
        await runSequentialOrder();
        seqTimes.push(performance.now() - start);

        start = performance.now();
        await runRPCOrder();
        rpcTimes.push(performance.now() - start);
      } else {
        let start = performance.now();
        await runRPCOrder();
        rpcTimes.push(performance.now() - start);

        start = performance.now();
        await runSequentialOrder();
        seqTimes.push(performance.now() - start);
      }
    }

    const seqStats = calculateStats(seqTimes);
    const rpcStats = calculateStats(rpcTimes);

    const speedup = (parseFloat(seqStats.avg) / parseFloat(rpcStats.avg)).toFixed(1);

    console.log('\n┌───────────────────────────────────────┐');
    console.log(`│   Order Creation A/B Benchmark        │`);
    console.log(`│   ${ITERATIONS} iterations, ${testProducts.length} items per order  │`);
    console.log('├──────────────┬────────────┬───────────┤');
    console.log('│ Metric       │ Seq (ms)   │ RPC (ms)  │');
    console.log('├──────────────┼────────────┼───────────┤');
    console.log(`│ Average      │ ${seqStats.avg.padStart(10)} │ ${rpcStats.avg.padStart(9)} │`);
    console.log(`│ Min          │ ${seqStats.min.padStart(10)} │ ${rpcStats.min.padStart(9)} │`);
    console.log(`│ Max          │ ${seqStats.max.padStart(10)} │ ${rpcStats.max.padStart(9)} │`);
    console.log(`│ P95          │ ${seqStats.p95.padStart(10)} │ ${rpcStats.p95.padStart(9)} │`);
    console.log(`│ Speedup      │          — │ ${speedup.padStart(8)}x │`);
    console.log('└──────────────┴────────────┴───────────┘\n');

  } catch (err) {
    console.error('Benchmark failed:', err);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

main();
