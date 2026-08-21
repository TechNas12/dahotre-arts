import { createAdminClient } from "./supabase/admin";
import { getOpenSearchClient, bulkIndexDocuments, indexDocument, extractForIndex } from "./opensearch";

export function buildProductSearchDoc(p: any) {
  const cat = Array.isArray(p.category) ? p.category[0] : p.category;
  const user = Array.isArray(p.created_by_user) ? p.created_by_user[0] : p.created_by_user;
  
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const variantLabels = variants.map((v: any) => v.label || "").filter(Boolean);
  const variantPrices = variants.flatMap((v: any) => [
    v.selling_price != null ? v.selling_price.toString() : "",
    v.cost_price != null ? v.cost_price.toString() : ""
  ]).filter(Boolean);

  const dimensions = [
    p.base != null ? `${p.base}ft` : "",
    p.height != null ? `${p.height}ft` : "",
    (p.base != null && p.height != null) ? `${p.height}x${p.base}` : "",
    (p.base != null && p.height != null) ? `${p.base}x${p.height}` : "",
    (p.base != null && p.height != null) ? `H-${p.height} B-${p.base}` : "",
  ].filter(Boolean);

  const prices = [
    p.default_selling_price != null ? p.default_selling_price.toString() : "",
    p.cost_price != null ? p.cost_price.toString() : "",
    ...variantPrices
  ].filter(Boolean);

  const searchText = [
    p.product_code,
    p.name,
    cat?.name,
    user?.name,
    ...variantLabels,
    ...dimensions,
    ...prices,
    p.stock_qty != null ? p.stock_qty.toString() : ""
  ]
    .filter(Boolean)
    .join(" ");

  return {
    product_code: extractForIndex(p.product_code),
    name: extractForIndex(p.name),
    category_name: extractForIndex(cat?.name),
    staff_name: extractForIndex(user?.name),
    variant_labels: variantLabels.join(" "),
    dimensions: dimensions.join(" "),
    prices: prices.join(" "),
    stock_qty: p.stock_qty != null ? p.stock_qty.toString() : "",
    search_text: searchText,
  };
}

export async function indexProductInOpenSearch(adminClient: any, productId: number) {
  try {
    const { data: product, error } = await adminClient
      .from("products")
      .select(`
        id,
        product_code,
        name,
        cost_price,
        default_selling_price,
        stock_qty,
        base,
        height,
        variants,
        category:categories(name),
        created_by_user:users!created_by(name)
      `)
      .eq("id", productId)
      .single();

    if (error || !product) {
      console.error(`Error fetching product ${productId} for indexing:`, error);
      return false;
    }

    const doc = buildProductSearchDoc(product);
    return await indexDocument("products", productId, doc);
  } catch (err) {
    console.error(`Failed to index product ${productId} in OpenSearch:`, err);
    return false;
  }
}

export function buildOrderSearchDoc(o: any) {
  const cust = Array.isArray(o.customer) ? o.customer[0] : o.customer;
  const user = Array.isArray(o.user) ? o.user[0] : o.user;

  const productNames = (o.items || [])
    .map((i: any) => {
      const p = Array.isArray(i.product) ? i.product[0] : i.product;
      return p?.name || "";
    })
    .filter(Boolean);

  const productCodes = (o.items || [])
    .map((i: any) => {
      const p = Array.isArray(i.product) ? i.product[0] : i.product;
      return p?.product_code || "";
    })
    .filter(Boolean);

  const categories = (o.items || [])
    .map((i: any) => {
      const p = Array.isArray(i.product) ? i.product[0] : i.product;
      const cat = Array.isArray(p?.category) ? p.category[0] : p?.category;
      return cat?.name || "";
    })
    .filter(Boolean);

  const variantLabels = (o.items || [])
    .map((i: any) => {
      const p = Array.isArray(i.product) ? i.product[0] : i.product;
      if (i.variant_index != null && p?.variants && p.variants[i.variant_index]) {
        return p.variants[i.variant_index]?.label || "";
      }
      return "";
    })
    .filter(Boolean);

  const paymentModes = (o.payments || []).map((p: any) => p.payment_mode).filter(Boolean);

  const amounts = [
    o.total_amount != null ? o.total_amount.toString() : "",
    o.discount != null && o.discount > 0 ? o.discount.toString() : "",
    ...(o.payments || []).map((p: any) => p.amount != null ? p.amount.toString() : ""),
    ...(o.items || []).flatMap((i: any) => [
      i.selling_price != null ? i.selling_price.toString() : "",
      i.subtotal != null ? i.subtotal.toString() : ""
    ]),
  ].filter(Boolean);

  const searchText = [
    o.order_no,
    cust?.name,
    cust?.phone,
    cust?.email,
    cust?.address,
    user?.name,
    ...productNames,
    ...productCodes,
    ...categories,
    ...variantLabels,
    ...paymentModes,
    ...amounts,
    o.status,
    o.fulfillment_status,
    o.order_type,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    order_no: extractForIndex(o.order_no),
    customer_name: extractForIndex(cust?.name),
    customer_phone: extractForIndex(cust?.phone),
    customer_email: extractForIndex(cust?.email),
    customer_address: extractForIndex(cust?.address),
    staff_name: extractForIndex(user?.name),
    product_names: productNames.join(" "),
    product_codes: productCodes.join(" "),
    category_names: categories.join(" "),
    variant_labels: variantLabels.join(" "),
    payment_modes: paymentModes.join(" "),
    amounts: amounts.join(" "),
    status: extractForIndex(o.status),
    fulfillment_status: extractForIndex(o.fulfillment_status),
    order_type: extractForIndex(o.order_type),
    search_text: searchText,
  };
}

export async function indexOrderInOpenSearch(adminClient: any, orderId: number) {
  try {
    const { data: order, error } = await adminClient
      .from("orders")
      .select(`
        id, 
        order_no, 
        status, 
        fulfillment_status,
        order_type,
        total_amount,
        discount,
        customer:customers(name, phone, email, address),
        user:users(name),
        items:order_items(
          selling_price,
          subtotal,
          variant_index,
          product:products(
            product_code,
            name,
            variants,
            category:categories(name)
          )
        ),
        payments(
          amount,
          payment_mode,
          payment_type
        )
      `)
      .eq("id", orderId)
      .single();

    if (error || !order) {
      console.error(`Error fetching order ${orderId} for indexing:`, error);
      return false;
    }

    const doc = buildOrderSearchDoc(order);
    return await indexDocument("orders", orderId, doc);
  } catch (err) {
    console.error(`Failed to index order ${orderId} in OpenSearch:`, err);
    return false;
  }
}

export async function syncAllToOpenSearch() {
  const osClient = getOpenSearchClient();
  if (!osClient) {
    console.error("OpenSearch client not configured. Skipping sync.");
    return;
  }

  const supabase = createAdminClient();

  console.log("Starting OpenSearch sync...");

  // 1. Sync Products with full variants and category details
  console.log("Syncing products...");
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(`
      id,
      product_code,
      name,
      cost_price,
      default_selling_price,
      stock_qty,
      base,
      height,
      variants,
      category:categories(name),
      created_by_user:users!created_by(name)
    `);
  
  if (productsError) {
    console.error("Error fetching products:", productsError);
  } else if (products) {
    const productDocs = products.map((p: any) => ({
      id: p.id,
      body: buildProductSearchDoc(p)
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

  // 3. Sync Orders with full products and customer details
  console.log("Syncing orders...");
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(`
      id, 
      order_no, 
      status, 
      fulfillment_status,
      order_type,
      total_amount,
      discount,
      customer:customers(name, phone, email, address),
      user:users(name),
      items:order_items(
        selling_price,
        subtotal,
        variant_index,
        product:products(
          product_code,
          name,
          variants,
          category:categories(name)
        )
      ),
      payments(
        amount,
        payment_mode,
        payment_type
      )
    `);

  if (ordersError) {
    console.error("Error fetching orders:", ordersError);
  } else if (orders) {
    const orderDocs = orders.map((o: any) => ({
      id: o.id,
      body: buildOrderSearchDoc(o)
    }));
    await bulkIndexDocuments("orders", orderDocs);
    console.log(`Indexed ${orderDocs.length} orders.`);
  }

  console.log("OpenSearch sync complete.");
}
