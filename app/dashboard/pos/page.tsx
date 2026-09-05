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
    <div className="animate-[fadeInUp_0.3s_ease-out_forwards]">
      <Suspense
        fallback={
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 h-[calc(100vh-7.5rem)] min-h-[600px]">
            <div className="w-full lg:w-[60%] h-full bg-[#121215] border border-[#222227] rounded-2xl animate-pulse"></div>
            <div className="w-full lg:w-[40%] h-full bg-[#121215] border border-[#222227] rounded-2xl animate-pulse"></div>
          </div>
        }
      >
        <POSData />
      </Suspense>
    </div>
  );
}
