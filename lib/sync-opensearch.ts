import { createAdminClient } from "./supabase/admin";
import { getOpenSearchClient, bulkIndexDocuments, extractForIndex } from "./opensearch";

export async function syncAllToOpenSearch() {
  const osClient = getOpenSearchClient();
  if (!osClient) {
    console.error("OpenSearch client not configured. Skipping sync.");
    return;
  }

  const supabase = createAdminClient();

  console.log("Starting OpenSearch sync...");

  // 1. Sync Products
  console.log("Syncing products...");
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, product_code, name, category:categories(name)");
  
  if (productsError) {
    console.error("Error fetching products:", productsError);
  } else if (products) {
    const productDocs = products.map((p: any) => ({
      id: p.id,
      body: {
        product_code: extractForIndex(p.product_code),
        name: extractForIndex(p.name),
        category_name: extractForIndex(Array.isArray(p.category) ? p.category[0]?.name : p.category?.name),
      }
    }));
    await bulkIndexDocuments("products", productDocs);
    console.log(`Indexed ${productDocs.length} products.`);
  }

  // 2. Sync Customers
  console.log("Syncing customers...");
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, name, phone, email, address");

  if (customersError) {
    console.error("Error fetching customers:", customersError);
  } else if (customers) {
    const customerDocs = customers.map((c: any) => ({
      id: c.id,
      body: {
        name: extractForIndex(c.name),
        phone: extractForIndex(c.phone),
        email: extractForIndex(c.email),
        address: extractForIndex(c.address),
      }
    }));
    await bulkIndexDocuments("customers", customerDocs);
    console.log(`Indexed ${customerDocs.length} customers.`);
  }

  // 3. Sync Orders
  console.log("Syncing orders...");
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(`
      id, 
      order_no, 
      status, 
      fulfillment_status,
      customer:customers(name, phone)
    `);

  if (ordersError) {
    console.error("Error fetching orders:", ordersError);
  } else if (orders) {
    const orderDocs = orders.map((o: any) => {
      const cust = Array.isArray(o.customer) ? o.customer[0] : o.customer;
      return {
        id: o.id,
        body: {
          order_no: extractForIndex(o.order_no),
          customer_name: extractForIndex(cust?.name),
          customer_phone: extractForIndex(cust?.phone),
          status: extractForIndex(o.status),
          fulfillment_status: extractForIndex(o.fulfillment_status),
        }
      };
    });
    await bulkIndexDocuments("orders", orderDocs);
    console.log(`Indexed ${orderDocs.length} orders.`);
  }

  console.log("OpenSearch sync complete.");
}
