export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { listProducts, listCategories } from "@/app/actions/products";
import { listCustomers } from "@/app/actions/customers";
import POSTerminal from "./POSTerminal";

async function POSData() {
  const [products, categories, customers] = await Promise.all([
    listProducts({ limit: 10000 }),
    listCategories(),
    listCustomers({ limit: 10000 }),
  ]);

  return (
    <POSTerminal 
      initialProducts={products.data} 
      categories={categories} 
      initialCustomers={customers.data} 
    />
  );
}

export default function POSPage() {
  return (
    <div className="animate-[fadeInUp_0.4s_ease-out_forwards]">
      <Suspense fallback={
        <div className="w-full h-[800px] bg-[#111111] border border-[#1F1F1F] rounded-xl animate-pulse"></div>
      }>
        <POSData />
      </Suspense>
    </div>
  );
}
